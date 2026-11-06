import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';
import { toJavaType } from '../java-type.util.js';
import { findSuperclass, resolveRelationFields } from '../relations.util.js';
import { entityTableName } from './entity.template.js';

/** Hibernate's default naming in Spring Boot: camelCase -> snake_case. */
function toColumnName(attrName: string): string {
  return attrName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
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
  enumLiterals: Map<string, string[]>,
): string {
  const name = attrName.toLowerCase();
  const clsName = cls.name.toLowerCase();

  // Enum del modelo: uno de sus literales reales (con @Enumerated(STRING) se guarda el nombre)
  const literals = enumLiterals.get(type);
  if (literals) {
    return literals.length ? `'${literals[rowIndex % literals.length]}'` : 'NULL';
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

  // "ci" only as a whole word: "precio" or "preferencias" are not ID numbers
  if (/(^|_)(ci|dni)(_|$)|^nro_?ci$|documento/.test(toColumnName(attrName))) {
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

interface FkColumn {
  column: string;
  targetName: string;
}

interface JoinTableRows {
  table: string;
  ownerColumn: string;
  inverseColumn: string;
  ownerName: string;
  inverseName: string;
}

/** Foreign-key columns of the class's own table, read from the same JPA fields the entity declares. */
function foreignKeysOf(cls: UmlClass, model: UmlModel): FkColumn[] {
  return resolveRelationFields(cls, model).flatMap((field) => {
    if (field.annotations.some((a) => a.startsWith('@JoinTable'))) return [];
    const join = field.annotations.map((a) => /^@JoinColumn\(name = "([^"]+)"\)/.exec(a)).find(Boolean);
    return join ? [{ column: join[1], targetName: field.javaType }] : [];
  });
}

/** Join tables owned by the class (@ManyToMany with @JoinTable). */
function joinTablesOf(cls: UmlClass, model: UmlModel): JoinTableRows[] {
  return resolveRelationFields(cls, model).flatMap((field) => {
    const text = field.annotations.join(' ');
    const m = /@JoinTable\(name = "([^"]+)",\s*joinColumns = @JoinColumn\(name = "([^"]+)"\),\s*inverseJoinColumns = @JoinColumn\(name = "([^"]+)"\)\)/.exec(text);
    const inverse = /^List<(\w+)>$/.exec(field.javaType);
    return m && inverse
      ? [{ table: m[1], ownerColumn: m[2], inverseColumn: m[3], ownerName: cls.name, inverseName: inverse[1] }]
      : [];
  });
}

/**
 * Genera data.sql con datos de prueba sobre las MISMAS tablas que crea el ORM
 * (Hibernate, a partir de las entidades): mismos nombres de tabla, mismas
 * columnas de clave foránea y la herencia JOINED (una fila en la tabla de cada
 * clase de la jerarquía, con el mismo id). Spring lo ejecuta después de que
 * Hibernate crea el esquema (defer-datasource-initialization).
 * Es re-ejecutable: ON CONFLICT (id) DO NOTHING y NOT EXISTS en las tablas intermedias.
 */
export function renderDataSql(model: UmlModel): string {
  const enumLiterals = new Map(
    model.classes
      .filter((c) => c.stereotype === 'enum')
      .map((c) => [c.name, c.attributes.map((a) => a.name)] as [string, string[]]),
  );
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );
  if (entities.length === 0) {
    return '-- No hay entidades definidas para generar datos de prueba.\n';
  }

  const byName = new Map(entities.map((c) => [c.name, c]));
  const chainOf = (cls: UmlClass): UmlClass[] => {
    const chain = [cls];
    for (let s = findSuperclass(cls, model); s && !chain.includes(s); s = findSuperclass(s, model)) {
      chain.unshift(s);
    }
    return chain;
  };
  const concrete = entities.filter((c) => c.stereotype !== 'abstract');

  // ids: a hierarchy shares one id sequence (JOINED), so each concrete class gets its own range.
  const nextId = new Map<string, number>();
  const ids = new Map<string, number[]>();
  for (const cls of concrete) {
    const root = chainOf(cls)[0].name;
    const start = nextId.get(root) ?? 1;
    ids.set(cls.name, [start, start + 1, start + 2]);
    nextId.set(root, start + 3);
  }
  // A reference to a class may point at it or at any of its subclasses.
  const pool = (name: string, inserted: Set<string>): number[] =>
    concrete
      .filter((c) => inserted.has(c.name) && chainOf(c).some((k) => k.name === name))
      .flatMap((c) => ids.get(c.name) ?? []);

  // Order: a class goes after the classes its rows reference (cycles fall back to NULL).
  const order: UmlClass[] = [];
  const visiting = new Set<string>();
  const visit = (cls: UmlClass) => {
    if (order.includes(cls) || visiting.has(cls.name)) return;
    visiting.add(cls.name);
    for (const k of chainOf(cls)) {
      for (const fk of foreignKeysOf(k, model)) {
        for (const dep of concrete.filter((c) => chainOf(c).some((x) => x.name === fk.targetName))) {
          if (dep !== cls) visit(dep);
        }
      }
    }
    visiting.delete(cls.name);
    order.push(cls);
  };
  concrete.forEach(visit);

  const lines: string[] = [
    '--',
    '-- DATOS DE PRUEBA INICIALES (SEED DATA)',
    '-- Las tablas las crea Hibernate a partir de las entidades (spring.jpa.hibernate.ddl-auto);',
    '-- este archivo solo inserta filas de ejemplo en esas mismas tablas.',
    '--',
    '',
  ];
  const inserted = new Set<string>();
  for (const cls of order) {
    const chain = chainOf(cls);
    lines.push('-- =========================================================================');
    lines.push(
      `-- ${cls.name}` +
        (chain.length > 1 ? ` (herencia JOINED: ${chain.map((k) => entityTableName(k.name)).join(' + ')})` : ''),
    );
    lines.push('-- =========================================================================');
    ids.get(cls.name)!.forEach((rowId, i) => {
      for (const k of chain) {
        const columns = ['id'];
        const values = [`${rowId}`];
        for (const a of k.attributes.filter((x) => !x.isPrimaryKey)) {
          columns.push(toColumnName(a.name));
          values.push(getSampleValue(cls, a.name, a.type, i, enumLiterals));
        }
        for (const fk of foreignKeysOf(k, model)) {
          // A self-reference points at an earlier row of the same class.
          const candidates = fk.targetName === cls.name ? ids.get(cls.name)!.slice(0, i) : pool(fk.targetName, inserted);
          columns.push(fk.column);
          values.push(candidates.length ? `${candidates[i % candidates.length]}` : 'NULL');
        }
        lines.push(
          `INSERT INTO ${entityTableName(k.name)} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`,
        );
      }
    });
    inserted.add(cls.name);
    lines.push('');
  }

  // Many-to-many rows go last, when both sides exist.
  for (const cls of entities) {
    for (const jt of joinTablesOf(cls, model)) {
      const owners = pool(jt.ownerName, inserted);
      const inverses = pool(jt.inverseName, inserted);
      if (!owners.length || !inverses.length) continue;
      lines.push(`-- Tabla intermedia ${jt.table} (${jt.ownerName} *..* ${jt.inverseName})`);
      for (let i = 0; i < Math.min(3, owners.length); i++) {
        const o = owners[i];
        const v = inverses[i % inverses.length];
        lines.push(
          `INSERT INTO ${jt.table} (${jt.ownerColumn}, ${jt.inverseColumn}) SELECT ${o}, ${v} ` +
            `WHERE NOT EXISTS (SELECT 1 FROM ${jt.table} WHERE ${jt.ownerColumn} = ${o} AND ${jt.inverseColumn} = ${v});`,
        );
      }
      lines.push('');
    }
  }

  // The id sequence lives in each hierarchy's root table.
  for (const root of new Set(concrete.map((c) => chainOf(c)[0].name))) {
    const table = entityTableName(byName.get(root)!.name);
    lines.push(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);`,
    );
  }
  return lines.join('\n') + '\n';
}
