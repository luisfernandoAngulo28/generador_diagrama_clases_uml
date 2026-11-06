import type { UmlClass, UmlModel } from '../types/uml';

/** Same table name as the generated entity's @Table. */
function toTableName(className: string): string {
  return `${className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}s`;
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

interface ForeignKey {
  column: string;
  target: UmlClass;
  unique: boolean;
  /** UML composition: the part disappears with its whole. */
  cascade: boolean;
  /** UML aggregation: the part survives its whole (the reference is cleared). */
  setNull?: boolean;
}

function findSuperclass(cls: UmlClass, model: UmlModel): UmlClass | undefined {
  const rel = model.relations.find((r) => r.type === 'INHERITANCE' && r.sourceClassId === cls.id);
  return rel ? model.classes.find((c) => c.id === rel.targetClassId) : undefined;
}

/**
 * Which table holds the foreign key of each relation — the same rules the
 * backend generator uses for the JPA entities (OMT):
 *   - MANY_TO_ONE / ASSOCIATION / ONE_TO_ONE: the source points at the target.
 *   - ONE_TO_MANY / AGGREGATION / COMPOSITION: the source is the "one" side
 *     (the whole, for the diamond relations), so the target holds the FK.
 */
function foreignKeysOf(cls: UmlClass, model: UmlModel): ForeignKey[] {
  const out: ForeignKey[] = [];
  for (const rel of model.relations) {
    const source = model.classes.find((c) => c.id === rel.sourceClassId);
    const target = model.classes.find((c) => c.id === rel.targetClassId);
    if (!source || !target) continue;
    if (
      (rel.type === 'MANY_TO_ONE' || rel.type === 'ASSOCIATION' || rel.type === 'ONE_TO_ONE') &&
      source.id === cls.id
    ) {
      out.push({
        column: toFkColumn(rel.targetRole ?? decapitalize(target.name)),
        target,
        unique: rel.type === 'ONE_TO_ONE',
        cascade: false,
      });
    }
    if (
      (rel.type === 'ONE_TO_MANY' || rel.type === 'AGGREGATION' || rel.type === 'COMPOSITION') &&
      target.id === cls.id
    ) {
      out.push({
        column: toFkColumn(rel.sourceRole ?? decapitalize(source.name)),
        target: source,
        unique: false,
        cascade: rel.type === 'COMPOSITION',
        setNull: rel.type === 'AGGREGATION',
      });
    }
  }
  return out;
}

function sortEntitiesTopologically(entities: UmlClass[], model: UmlModel): UmlClass[] {
  const sorted: UmlClass[] = [];
  const visiting = new Set<string>();
  const visit = (cls: UmlClass) => {
    if (sorted.includes(cls) || visiting.has(cls.id)) return;
    visiting.add(cls.id);
    const parent = findSuperclass(cls, model);
    if (parent) visit(parent);
    for (const fk of foreignKeysOf(cls, model)) {
      if (fk.target.id !== cls.id) visit(fk.target);
    }
    visiting.delete(cls.id);
    sorted.push(cls);
  };
  entities.forEach(visit);
  return sorted;
}

/**
 * Reference DDL of the database that the generated Spring Boot backend
 * creates through Hibernate (the backend does NOT run this script: the ORM
 * creates the tables from the entities). Same table names (@Table), same
 * foreign-key columns (@JoinColumn), JOINED inheritance and N:M join tables.
 */
export function buildSqlSchema(model: UmlModel, projectName: string): string | null {
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );
  if (entities.length === 0) return null;

  const sortedEntities = sortEntitiesTopologically(entities, model);
  const manyToManys = model.relations.filter((r) => r.type === 'MANY_TO_MANY');
  const joinTableName = (source: UmlClass, target: UmlClass) =>
    `${toColumnName(source.name)}_${toColumnName(target.name)}s`;

  const lines: string[] = [
    '--',
    '-- ESQUEMA DE BASE DE DATOS (PostgreSQL), DE REFERENCIA',
    `-- Proyecto: ${projectName}`,
    '-- Es el mismo esquema que Hibernate crea a partir de las entidades JPA del',
    '-- backend generado (el backend no ejecuta este script: lo crea el ORM).',
    '-- Mapeo OMT: una tabla por clase, FK del lado "muchos" (o de la parte),',
    '-- tabla intermedia para N:M y herencia JOINED (la subclase comparte el id).',
    '--',
    '',
    '-- 1. Eliminación previa (orden inverso)',
  ];
  for (const rel of manyToManys) {
    const s = model.classes.find((c) => c.id === rel.sourceClassId);
    const t = model.classes.find((c) => c.id === rel.targetClassId);
    if (s && t) lines.push(`DROP TABLE IF EXISTS ${joinTableName(s, t)} CASCADE;`);
  }
  for (let i = sortedEntities.length - 1; i >= 0; i--) {
    lines.push(`DROP TABLE IF EXISTS ${toTableName(sortedEntities[i].name)} CASCADE;`);
  }
  lines.push('');

  lines.push('-- 2. Tablas de las entidades');
  for (const cls of sortedEntities) {
    const tableName = toTableName(cls.name);
    const parent = findSuperclass(cls, model);
    const columnDefs: string[] = [];
    const constraints: string[] = [];

    if (parent) {
      // JOINED: the subclass row shares the id of its parent row.
      columnDefs.push('    id BIGINT PRIMARY KEY');
      constraints.push(
        `    CONSTRAINT fk_${tableName}_id FOREIGN KEY (id) REFERENCES ${toTableName(parent.name)}(id) ON DELETE CASCADE`,
      );
    } else {
      columnDefs.push('    id BIGSERIAL PRIMARY KEY');
    }
    for (const a of cls.attributes.filter((x) => !x.isPrimaryKey)) {
      columnDefs.push(`    ${toColumnName(a.name)} ${toSqlType(a.name, a.type)}`);
    }
    for (const fk of foreignKeysOf(cls, model)) {
      columnDefs.push(`    ${fk.column} BIGINT${fk.unique ? ' UNIQUE' : ''}`);
      constraints.push(
        `    CONSTRAINT fk_${tableName}_${fk.column} FOREIGN KEY (${fk.column}) REFERENCES ${toTableName(fk.target.name)}(id)` +
          (fk.cascade ? ' ON DELETE CASCADE' : fk.setNull ? ' ON DELETE SET NULL' : ''),
      );
    }

    lines.push(`-- Entidad: ${cls.name}${parent ? ` (subclase de ${parent.name})` : ''}`);
    lines.push(`CREATE TABLE ${tableName} (`);
    lines.push([...columnDefs, ...constraints].join(',\n'));
    lines.push(');');
    lines.push('');
  }

  if (manyToManys.length > 0) {
    lines.push('-- 3. Tablas intermedias de las relaciones muchos a muchos (N:M)');
    for (const rel of manyToManys) {
      const source = model.classes.find((c) => c.id === rel.sourceClassId);
      const target = model.classes.find((c) => c.id === rel.targetClassId);
      if (!source || !target) continue;
      const joinTable = joinTableName(source, target);
      const sourceFk = toFkColumn(source.name);
      const targetFk = toFkColumn(target.name);
      lines.push(`CREATE TABLE ${joinTable} (`);
      lines.push(`    ${sourceFk} BIGINT NOT NULL,`);
      lines.push(`    ${targetFk} BIGINT NOT NULL,`);
      lines.push(`    PRIMARY KEY (${sourceFk}, ${targetFk}),`);
      lines.push(
        `    CONSTRAINT fk_${joinTable}_${sourceFk} FOREIGN KEY (${sourceFk}) REFERENCES ${toTableName(source.name)}(id) ON DELETE CASCADE,`,
      );
      lines.push(
        `    CONSTRAINT fk_${joinTable}_${targetFk} FOREIGN KEY (${targetFk}) REFERENCES ${toTableName(target.name)}(id) ON DELETE CASCADE`,
      );
      lines.push(');');
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function exportSqlSchema(model: UmlModel, projectName: string): void {
  const sqlStr = buildSqlSchema(model, projectName);
  if (sqlStr === null) {
    alert('No hay entidades en el diagrama para exportar.');
    return;
  }
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
