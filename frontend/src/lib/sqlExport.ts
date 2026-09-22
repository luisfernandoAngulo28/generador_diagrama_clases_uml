import type { UmlClass, UmlModel } from '../types/uml';

function toTableName(className: string): string {
  return className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toColumnName(attrName: string): string {
  return attrName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toFkColumn(fieldName: string): string {
  return `${fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_id`;
}

function decapitalize(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function toSqlType(attrName: string, umlType: string): string {
  const lowerName = attrName.toLowerCase();
  const lowerType = umlType.toLowerCase();

  if (
    lowerName.includes('descripcion') ||
    lowerName.includes('notas') ||
    lowerName.includes('detalle') ||
    lowerName.includes('contenido')
  ) {
    return 'TEXT';
  }

  if (lowerType.includes('string') || lowerType.includes('text')) return 'VARCHAR(255)';
  if (lowerType.includes('long')) return 'BIGINT';
  if (lowerType.includes('int')) return 'INTEGER';
  if (lowerType.includes('double') || lowerType.includes('float')) return 'DOUBLE PRECISION';
  if (lowerType.includes('bigdecimal') || lowerType.includes('decimal')) return 'NUMERIC(12, 2)';
  if (lowerType.includes('bool')) return 'BOOLEAN';
  if (lowerType.includes('localdatetime') || lowerType.includes('timestamp')) return 'TIMESTAMP';
  if (lowerType.includes('date')) return 'DATE';
  if (lowerType.includes('uuid')) return 'UUID';
  return 'VARCHAR(100)';
}

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

export function exportSqlSchema(model: UmlModel, projectName: string): void {
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );

  if (entities.length === 0) {
    alert('No hay entidades en el diagrama para exportar.');
    return;
  }

  const sortedEntities = sortEntitiesTopologically(entities, model);

  const lines: string[] = [
    '--',
    `-- ESQUEMA DE BASE DE DATOS DDL (PostgreSQL / Relacional ANSI)`,
    `-- Proyecto: ${projectName}`,
    `-- Generado automáticamente desde Diagrama de Clases UML`,
    '--',
    '',
  ];

  lines.push('-- 1. Eliminación en cascada previa de tablas si existen');
  for (let i = sortedEntities.length - 1; i >= 0; i--) {
    lines.push(`DROP TABLE IF EXISTS ${toTableName(sortedEntities[i].name)} CASCADE;`);
  }

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

  lines.push('-- 2. Creación de tablas de entidades');
  for (const cls of sortedEntities) {
    const tableName = toTableName(cls.name);
    const idAttr = cls.attributes.find((a) => a.isPrimaryKey);
    const scalarAttrs = cls.attributes.filter((a) => !a.isPrimaryKey);

    const fkRelations = model.relations.filter(
      (r) =>
        (r.type === 'MANY_TO_ONE' ||
          r.type === 'ASSOCIATION' ||
          r.type === 'AGGREGATION' ||
          r.type === 'COMPOSITION' ||
          r.type === 'ONE_TO_ONE') &&
        r.sourceClassId === cls.id,
    );

    lines.push(`-- Entidad: ${cls.name}`);
    lines.push(`CREATE TABLE ${tableName} (`);

    const columnDefs: string[] = [];

    if (idAttr) {
      columnDefs.push(`    id BIGSERIAL PRIMARY KEY`);
    } else {
      columnDefs.push(`    id BIGSERIAL PRIMARY KEY`);
    }

    for (const a of scalarAttrs) {
      const colName = toColumnName(a.name);
      const sqlType = toSqlType(a.name, a.type);
      columnDefs.push(`    ${colName} ${sqlType}`);
    }

    for (const rel of fkRelations) {
      const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
      if (targetCls) {
        const role = rel.targetRole ?? decapitalize(targetCls.name);
        const fkCol = toFkColumn(role);
        const isUnique = rel.type === 'ONE_TO_ONE' ? ' UNIQUE' : '';
        columnDefs.push(`    ${fkCol} BIGINT${isUnique}`);
      }
    }

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

  if (manyToManys.length > 0) {
    lines.push('-- 3. Tablas intermedias para relaciones Muchos a Muchos (N : M)');
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

  const sqlStr = lines.join('\n');
  const blob = new Blob([sqlStr], { type: 'text/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'diagrama';
  a.download = `${safeName}_schema.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
