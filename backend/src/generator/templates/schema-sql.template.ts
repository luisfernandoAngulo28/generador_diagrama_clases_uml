import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';
import { decapitalize, pluralize, toJavaType } from '../java-type.util.js';

function toTableName(className: string): string {
  return className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toColumnName(attrName: string): string {
  return attrName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toFkColumn(fieldName: string): string {
  return `${fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_id`;
}

function toSqlType(attrName: string, umlType: string): string {
  const javaType = toJavaType(umlType);
  const lowerName = attrName.toLowerCase();

  if (
    lowerName.includes('descripcion') ||
    lowerName.includes('notas') ||
    lowerName.includes('detalle') ||
    lowerName.includes('contenido')
  ) {
    return 'TEXT';
  }

  switch (javaType) {
    case 'String':
      return 'VARCHAR(255)';
    case 'Integer':
      return 'INTEGER';
    case 'Long':
      return 'BIGINT';
    case 'Double':
    case 'Float':
      return 'DOUBLE PRECISION';
    case 'BigDecimal':
      return 'NUMERIC(12, 2)';
    case 'Boolean':
      return 'BOOLEAN';
    case 'LocalDate':
      return 'DATE';
    case 'LocalDateTime':
      return 'TIMESTAMP';
    case 'UUID':
      return 'UUID';
    default:
      return 'VARCHAR(100)';
  }
}

/**
 * Ordena las tablas para que las tablas padre se creen antes que las dependientes.
 */
function sortEntitiesTopologically(entities: UmlClass[], model: UmlModel): UmlClass[] {
  const entityIds = new Set(entities.map((e) => e.id));
  const dependencies = new Map<string, Set<string>>();
  for (const e of entities) {
    dependencies.set(e.id, new Set<string>());
  }

  for (const rel of model.relations) {
    if (
      rel.type === 'MANY_TO_ONE' ||
      rel.type === 'ASSOCIATION' ||
      rel.type === 'AGGREGATION' ||
      rel.type === 'COMPOSITION' ||
      rel.type === 'ONE_TO_ONE'
    ) {
      if (entityIds.has(rel.sourceClassId) && entityIds.has(rel.targetClassId)) {
        if (rel.sourceClassId !== rel.targetClassId) {
          dependencies.get(rel.sourceClassId)?.add(rel.targetClassId);
        }
      }
    }
  }

  const sorted: UmlClass[] = [];
  const visited = new Set<string>();

  function visit(classId: string, stack = new Set<string>()) {
    if (visited.has(classId) || stack.has(classId)) return;
    stack.add(classId);

    const deps = dependencies.get(classId) ?? new Set();
    for (const depId of deps) {
      visit(depId, stack);
    }

    visited.add(classId);
    const cls = entities.find((e) => e.id === classId);
    if (cls) sorted.push(cls);
  }

  for (const e of entities) {
    visit(e.id);
  }

  return sorted;
}

/**
 * Genera el esquema DDL completo en SQL (compatible con PostgreSQL, H2, MySQL con sintaxis ANSI/Postgres).
 */
export function renderSchemaSql(model: UmlModel, projectName: string): string {
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );

  if (entities.length === 0) {
    return '-- No hay entidades definidas en el diagrama para generar esquema DDL.\n';
  }

  const sortedEntities = sortEntitiesTopologically(entities, model);

  const lines: string[] = [
    '--',
    `-- ESQUEMA DE BASE DE DATOS DDL (PostgreSQL / Relacional ANSI)`,
    `-- Proyecto: ${projectName}`,
    `-- Generado automáticamente a partir del Diagrama de Clases UML`,
    '--',
    '',
  ];

  // 1. Eliminación en cascada segura previa
  lines.push('-- Eliminación previa de tablas si existen (orden inverso)');
  for (let i = sortedEntities.length - 1; i >= 0; i--) {
    lines.push(`DROP TABLE IF EXISTS ${toTableName(sortedEntities[i].name)} CASCADE;`);
  }

  // Identificar relaciones ManyToMany para tablas intermedias
  const manyToManys = model.relations.filter((r) => r.type === 'MANY_TO_MANY');
  for (const rel of manyToManys) {
    const source = model.classes.find((c) => c.id === rel.sourceClassId);
    const target = model.classes.find((c) => c.id === rel.targetClassId);
    if (source && target) {
      const sourceCol = toTableName(source.name);
      const targetCol = toTableName(target.name);
      const joinTable = `${sourceCol}_${targetCol}s`;
      lines.push(`DROP TABLE IF EXISTS ${joinTable} CASCADE;`);
    }
  }
  lines.push('');

  // 2. Creación de tablas de entidades
  lines.push('-- Creación de tablas principales');
  for (const cls of sortedEntities) {
    const tableName = toTableName(cls.name);
    const idAttr = cls.attributes.find((a) => a.isPrimaryKey);
    const scalarAttrs = cls.attributes.filter((a) => !a.isPrimaryKey);

    // Relaciones ManyToOne / OneToOne salientes
    const fkRelations = model.relations.filter(
      (r) =>
        (r.type === 'MANY_TO_ONE' ||
          r.type === 'ASSOCIATION' ||
          r.type === 'AGGREGATION' ||
          r.type === 'COMPOSITION' ||
          r.type === 'ONE_TO_ONE') &&
        r.sourceClassId === cls.id,
    );

    lines.push(`-- Tabla para la entidad: ${cls.name}`);
    lines.push(`CREATE TABLE ${tableName} (`);

    const columnDefs: string[] = [];

    // Clave primaria
    if (idAttr) {
      columnDefs.push(`    id BIGSERIAL PRIMARY KEY`);
    } else {
      columnDefs.push(`    id BIGSERIAL PRIMARY KEY`);
    }

    // Atributos escalares
    for (const a of scalarAttrs) {
      const colName = toColumnName(a.name);
      const sqlType = toSqlType(a.name, a.type);
      columnDefs.push(`    ${colName} ${sqlType}`);
    }

    // Columnas de Foreign Key
    for (const rel of fkRelations) {
      const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
      if (targetCls) {
        const role = rel.targetRole ?? decapitalize(targetCls.name);
        const fkCol = toFkColumn(role);
        const isUnique = rel.type === 'ONE_TO_ONE' ? ' UNIQUE' : '';
        columnDefs.push(`    ${fkCol} BIGINT${isUnique}`);
      }
    }

    // Restricciones de Foreign Key
    for (const rel of fkRelations) {
      const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
      if (targetCls) {
        const role = rel.targetRole ?? decapitalize(targetCls.name);
        const fkCol = toFkColumn(role);
        const targetTable = toTableName(targetCls.name);
        columnDefs.push(
          `    CONSTRAINT fk_${tableName}_${fkCol} FOREIGN KEY (${fkCol}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`,
        );
      }
    }

    lines.push(columnDefs.join(',\n'));
    lines.push(`);`);
    lines.push('');
  }

  // 3. Creación de tablas intermedias ManyToMany
  if (manyToManys.length > 0) {
    lines.push('-- Tablas de unión para relaciones Muchos a Muchos (N : M)');
    for (const rel of manyToManys) {
      const source = model.classes.find((c) => c.id === rel.sourceClassId);
      const target = model.classes.find((c) => c.id === rel.targetClassId);
      if (source && target) {
        const sourceTable = toTableName(source.name);
        const targetTable = toTableName(target.name);
        const joinTable = `${sourceTable}_${targetTable}s`;
        const sourceFk = `${sourceTable}_id`;
        const targetFk = `${targetTable}_id`;

        lines.push(`CREATE TABLE ${joinTable} (`);
        lines.push(`    ${sourceFk} BIGINT NOT NULL,`);
        lines.push(`    ${targetFk} BIGINT NOT NULL,`);
        lines.push(`    PRIMARY KEY (${sourceFk}, ${targetFk}),`);
        lines.push(
          `    CONSTRAINT fk_${joinTable}_${sourceFk} FOREIGN KEY (${sourceFk}) REFERENCES ${sourceTable}(id) ON DELETE CASCADE,`,
        );
        lines.push(
          `    CONSTRAINT fk_${joinTable}_${targetFk} FOREIGN KEY (${targetFk}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`,
        );
        lines.push(`);`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
