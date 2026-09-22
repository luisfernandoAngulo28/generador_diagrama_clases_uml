import type { UmlClass, UmlModel, UmlRelation } from '../../diagrams/uml.types.js';
import { decapitalize, toJavaType } from '../java-type.util.js';

function toTableName(className: string): string {
  return className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toColumnName(attrName: string): string {
  return attrName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toFkColumn(fieldName: string): string {
  return `${fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_id`;
}

const PERSON_NAMES = ['Carlos Mendoza', 'María González', 'Alejandro Pérez'];
const LAST_NAMES = ['Mendoza', 'González', 'Pérez'];
const EMAILS = [
  'carlos.mendoza@example.com',
  'maria.gonzalez@example.com',
  'alejandro.perez@example.com',
];
const PHONES = ['+591 71234567', '+591 72345678', '+591 73456789'];
const ADDRESSES = [
  'Av. Principal #123, Zona Central',
  'Calle Las Palmas #45, Edif. Roble',
  'Av. San Martín #890, Piso 2',
];
const CI_NUMBERS = ['4892104', '6102839', '5938102'];

const PRODUCT_NAMES = [
  'Pizza Margherita Especial',
  'Hamburguesa Doble Gourmet',
  'Lasaña Bolognesa al Horno',
];
const PRODUCT_DESCS = [
  'Preparado con salsa pomodoro e ingredientes frescos',
  'Carne premium con queso cheddar y tocino crocante',
  'Receta tradicional italiana horneada a la leña',
];
const PRICES = [55.0, 42.5, 48.0];
const ORDER_CODES = ['PED-001', 'PED-002', 'PED-003'];
const DATES = ['2026-09-20', '2026-09-21', '2026-09-22'];
const STATUSES = ['ACTIVO', 'CONFIRMADO', 'COMPLETADO'];
const LOCATIONS = ['Terraza Oeste', 'Salón Central', 'Área VIP'];

function getSampleValue(
  cls: UmlClass,
  attrName: string,
  type: string,
  rowIndex: number,
  enumNames: Set<string>,
): string {
  const name = attrName.toLowerCase();
  const clsName = cls.name.toLowerCase();

  // Si es un Enum definido en el modelo
  if (enumNames.has(type)) {
    return `'${type}_OPCION_${rowIndex + 1}'`;
  }

  // Nombres personales
  if (name === 'nombre' || name === 'name') {
    if (
      clsName.includes('cliente') ||
      clsName.includes('usuario') ||
      clsName.includes('persona') ||
      clsName.includes('paciente') ||
      clsName.includes('medico') ||
      clsName.includes('estudiante') ||
      clsName.includes('profesor')
    ) {
      return `'${PERSON_NAMES[rowIndex % PERSON_NAMES.length]}'`;
    }
    if (
      clsName.includes('producto') ||
      clsName.includes('plato') ||
      clsName.includes('item') ||
      clsName.includes('articulo')
    ) {
      return `'${PRODUCT_NAMES[rowIndex % PRODUCT_NAMES.length]}'`;
    }
    if (clsName.includes('mesa') || clsName.includes('aula') || clsName.includes('habitacion')) {
      return `'${cls.name} ${rowIndex + 1}'`;
    }
    return `'${cls.name} ${rowIndex + 1}'`;
  }

  if (name.includes('apellido') || name.includes('lastname')) {
    return `'${LAST_NAMES[rowIndex % LAST_NAMES.length]}'`;
  }

  if (name.includes('email') || name.includes('correo')) {
    return `'${EMAILS[rowIndex % EMAILS.length]}'`;
  }

  if (name.includes('telefono') || name.includes('phone') || name.includes('celular')) {
    return `'${PHONES[rowIndex % PHONES.length]}'`;
  }

  if (name.includes('direccion') || name.includes('address')) {
    return `'${ADDRESSES[rowIndex % ADDRESSES.length]}'`;
  }

  if (name.includes('ci') || name.includes('dni') || name.includes('documento')) {
    return `'${CI_NUMBERS[rowIndex % CI_NUMBERS.length]}'`;
  }

  if (name.includes('descripcion') || name.includes('detalle') || name.includes('observacion')) {
    return `'${PRODUCT_DESCS[rowIndex % PRODUCT_DESCS.length]}'`;
  }

  if (
    name.includes('precio') ||
    name.includes('price') ||
    name.includes('monto') ||
    name.includes('total') ||
    name.includes('subtotal')
  ) {
    return `${PRICES[rowIndex % PRICES.length]}`;
  }

  if (name.includes('codigo') || name.includes('code')) {
    return `'${ORDER_CODES[rowIndex % ORDER_CODES.length]}'`;
  }

  if (name.includes('stock') || name.includes('cantidad') || name.includes('units')) {
    return `${(rowIndex + 1) * 12}`;
  }

  if (name.includes('capacidad') || name.includes('capacity')) {
    return `${(rowIndex + 2) * 2}`;
  }

  if (name.includes('numero') || name.includes('number')) {
    return `${rowIndex + 1}`;
  }

  if (name.includes('ubicacion') || name.includes('zona') || name.includes('area')) {
    return `'${LOCATIONS[rowIndex % LOCATIONS.length]}'`;
  }

  if (name.includes('estado') || name.includes('status')) {
    return `'${STATUSES[rowIndex % STATUSES.length]}'`;
  }

  if (name.includes('fecha') || name.includes('date')) {
    return `'${DATES[rowIndex % DATES.length]}'`;
  }

  const javaType = toJavaType(type);
  if (javaType === 'Boolean') {
    return rowIndex !== 2 ? 'true' : 'false';
  }
  if (javaType === 'Integer' || javaType === 'Long') {
    return `${(rowIndex + 1) * 10}`;
  }
  if (javaType === 'Double' || javaType === 'Float' || javaType === 'BigDecimal') {
    return `${((rowIndex + 1) * 15.5).toFixed(2)}`;
  }
  if (javaType === 'LocalDate' || javaType === 'LocalDateTime') {
    return `'${DATES[rowIndex % DATES.length]}'`;
  }

  return `'${cls.name} ${attrName} ${rowIndex + 1}'`;
}

/**
 * Ordena las entidades de forma que las que son padre (sin FK o con menos dependencias)
 * se inserten antes que las hijas (evita violación de Foreign Key al ejecutar data.sql).
 */
function sortEntitiesTopologically(entities: UmlClass[], model: UmlModel): UmlClass[] {
  const entityIds = new Set(entities.map((e) => e.id));

  // Mapa de id -> conjunto de entidades de las cuales depende (hacia las cuales tiene ManyToOne o OneToOne)
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
 * Genera el archivo data.sql con datos de prueba realistas para Spring Boot.
 * Incluye ON CONFLICT (id) DO NOTHING para re-ejecuciones seguras y sincronización de secuencias en PostgreSQL.
 */
export function renderDataSql(model: UmlModel): string {
  const enumNames = new Set(
    model.classes.filter((c) => c.stereotype === 'enum').map((c) => c.name),
  );

  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );

  if (entities.length === 0) {
    return '-- No hay entidades definidas para generar datos de prueba.\n';
  }

  const sortedEntities = sortEntitiesTopologically(entities, model);

  const sqlLines: string[] = [
    '--',
    '-- DATOS DE PRUEBA INICIALES (SEED DATA)',
    '-- Generado automáticamente para pruebas y presentación de examen',
    '-- Arquitectura Spring Boot 4 Capas',
    '--',
    '',
  ];

  for (const cls of sortedEntities) {
    const tableName = toTableName(cls.name);
    const idAttr = cls.attributes.find((a) => a.isPrimaryKey);
    const scalarAttrs = cls.attributes.filter((a) => !a.isPrimaryKey);

    // Relaciones de salida que representan Foreign Keys en esta tabla
    const fkRelations = model.relations.filter(
      (r) =>
        (r.type === 'MANY_TO_ONE' ||
          r.type === 'ASSOCIATION' ||
          r.type === 'AGGREGATION' ||
          r.type === 'COMPOSITION' ||
          r.type === 'ONE_TO_ONE') &&
        r.sourceClassId === cls.id,
    );

    const columns: string[] = [];
    if (idAttr) columns.push('id');
    for (const a of scalarAttrs) columns.push(toColumnName(a.name));
    for (const rel of fkRelations) {
      const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
      if (targetCls) {
        const role = rel.targetRole ?? decapitalize(targetCls.name);
        columns.push(toFkColumn(role));
      }
    }

    if (columns.length === 0) continue;

    sqlLines.push(`-- =========================================================================`);
    sqlLines.push(`-- Datos para la tabla: ${tableName} (${cls.name})`);
    sqlLines.push(`-- =========================================================================`);

    // 3 registros de prueba por tabla
    for (let i = 0; i < 3; i++) {
      const rowId = i + 1;
      const values: string[] = [];

      if (idAttr) values.push(`${rowId}`);

      for (const a of scalarAttrs) {
        values.push(getSampleValue(cls, a.name, a.type, i, enumNames));
      }

      for (const rel of fkRelations) {
        const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
        if (targetCls) {
          // Asigna a un ID existente (1, 2 o 3)
          values.push(`${(i % 3) + 1}`);
        }
      }

      sqlLines.push(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`,
      );
    }

    // Sincronizar la secuencia del ID en PostgreSQL para evitar errores de clave duplicada en posteriores POST
    sqlLines.push(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1), true);`,
    );
    sqlLines.push('');
  }

  return sqlLines.join('\n');
}
