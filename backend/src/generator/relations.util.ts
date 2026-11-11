import type { UmlClass, UmlModel, UmlRelation } from '../diagrams/uml.types.js';
import { capitalize, decapitalize, pluralize } from './java-type.util.js';

export interface RelationField {
  fieldName: string;
  javaType: string;
  annotations: string[];
  imports: string[];
  /** Name of the field on the referenced type that points back to this
   * entity, if any. Used to break Jackson's infinite-recursion loop on
   * bidirectional JPA relations (e.g. Cliente.pedidos <-> Pedido.cliente). */
  pairFieldName?: string;
}

function toSnakeColumn(name: string): string {
  return `${name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()}_id`;
}

/** The "one" side of a 1..* relation. `composite` adds the lifecycle of a UML composition. */
function oneToManyField(
  fieldName: string,
  elementType: string,
  mappedBy: string,
  composite: boolean,
): RelationField {
  return {
    fieldName,
    javaType: `List<${elementType}>`,
    annotations: [
      composite
        ? `@OneToMany(mappedBy = "${mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)`
        : `@OneToMany(mappedBy = "${mappedBy}")`,
    ],
    imports: [
      'java.util.List',
      'jakarta.persistence.OneToMany',
      ...(composite ? ['jakarta.persistence.CascadeType'] : []),
    ],
    pairFieldName: mappedBy,
  };
}

function findClass(model: UmlModel, id: string): UmlClass {
  const found = model.classes.find((c) => c.id === id);
  if (!found) throw new Error(`Referenced class ${id} not found in model`);
  return found;
}

/**
 * Resolves the JPA fields a given class needs to render, covering both
 * sides (owning/inverse) of every relation it participates in.
 */
export function resolveRelationFields(
  cls: UmlClass,
  model: UmlModel,
): RelationField[] {
  const fields: RelationField[] = [];

  for (const rel of model.relations) {
    if (rel.sourceClassId === cls.id) {
      fields.push(...fieldsForOwner(rel, cls, model));
    } else if (rel.targetClassId === cls.id) {
      fields.push(...fieldsForInverse(rel, cls, model));
    }
  }

  return fields;
}

function fieldsForOwner(
  rel: UmlRelation,
  source: UmlClass,
  model: UmlModel,
): RelationField[] {
  const target = findClass(model, rel.targetClassId);

  switch (rel.type) {
    case 'ONE_TO_MANY':
    case 'AGGREGATION':
    case 'COMPOSITION': {
      // Source owns the collection (for aggregation/composition the source is
      // the whole: the diamond is drawn at the source end); target holds the
      // FK back to source. Only composition ties the parts' lifecycle to the
      // whole (UML): deleting the whole deletes its parts.
      const fieldName =
        rel.targetRole ?? decapitalize(pluralize(target.name));
      const mappedBy = rel.sourceRole ?? decapitalize(source.name);
      return [oneToManyField(fieldName, target.name, mappedBy, rel.type === 'COMPOSITION')];
    }
    case 'MANY_TO_ONE': {
      const fieldName = rel.targetRole ?? decapitalize(target.name);
      const pairFieldName =
        rel.sourceRole ?? decapitalize(pluralize(source.name));
      return [
        {
          fieldName,
          javaType: target.name,
          annotations: [
            '@ManyToOne(fetch = FetchType.LAZY)',
            `@JoinColumn(name = "${toSnakeColumn(fieldName)}")`,
          ],
          imports: [
            'jakarta.persistence.ManyToOne',
            'jakarta.persistence.FetchType',
            'jakarta.persistence.JoinColumn',
          ],
          pairFieldName,
        },
      ];
    }
    case 'ASSOCIATION': {
      const fieldName = rel.targetRole ?? decapitalize(target.name);
      return [
        {
          fieldName,
          javaType: target.name,
          annotations: [
            '@ManyToOne(fetch = FetchType.LAZY)',
            `@JoinColumn(name = "${toSnakeColumn(fieldName)}")`,
          ],
          imports: [
            'jakarta.persistence.ManyToOne',
            'jakarta.persistence.FetchType',
            'jakarta.persistence.JoinColumn',
          ],
        },
      ];
    }
    case 'ONE_TO_ONE': {
      const fieldName = rel.targetRole ?? decapitalize(target.name);
      const pairFieldName = rel.sourceRole ?? decapitalize(source.name);
      return [
        {
          fieldName,
          javaType: target.name,
          annotations: [
            '@OneToOne(fetch = FetchType.LAZY)',
            `@JoinColumn(name = "${toSnakeColumn(fieldName)}")`,
          ],
          imports: [
            'jakarta.persistence.OneToOne',
            'jakarta.persistence.FetchType',
            'jakarta.persistence.JoinColumn',
          ],
          pairFieldName,
        },
      ];
    }
    case 'MANY_TO_MANY': {
      const fieldName =
        rel.targetRole ?? decapitalize(pluralize(target.name));
      const pairFieldName =
        rel.sourceRole ?? decapitalize(pluralize(source.name));
      const sourceColumn = toSnakeColumn(source.name);
      const targetColumn = toSnakeColumn(target.name);
      const joinTableName = `${sourceColumn.replace(/_id$/, '')}_${targetColumn.replace(/_id$/, '')}s`;
      return [
        {
          fieldName,
          javaType: `List<${target.name}>`,
          annotations: [
            '@ManyToMany',
            `@JoinTable(name = "${joinTableName}",`,
            `    joinColumns = @JoinColumn(name = "${sourceColumn}"),`,
            `    inverseJoinColumns = @JoinColumn(name = "${targetColumn}"))`,
          ],
          imports: [
            'java.util.List',
            'jakarta.persistence.ManyToMany',
            'jakarta.persistence.JoinTable',
            'jakarta.persistence.JoinColumn',
          ],
          pairFieldName,
        },
      ];
    }
    case 'INHERITANCE':
      return [];
    default:
      return [];
  }
}

function fieldsForInverse(
  rel: UmlRelation,
  target: UmlClass,
  model: UmlModel,
): RelationField[] {
  const source = findClass(model, rel.sourceClassId);

  switch (rel.type) {
    case 'ONE_TO_MANY':
    case 'AGGREGATION':
    case 'COMPOSITION': {
      const fieldName = rel.sourceRole ?? decapitalize(source.name);
      const pairFieldName =
        rel.targetRole ?? decapitalize(pluralize(target.name));
      // Aggregation: the part survives its whole, so the database clears the
      // reference (ON DELETE SET NULL) instead of blocking the delete.
      const shared = rel.type === 'AGGREGATION';
      return [
        {
          fieldName,
          javaType: source.name,
          annotations: [
            '@ManyToOne(fetch = FetchType.LAZY)',
            `@JoinColumn(name = "${toSnakeColumn(fieldName)}")`,
            ...(shared ? ['@OnDelete(action = OnDeleteAction.SET_NULL)'] : []),
          ],
          imports: [
            'jakarta.persistence.ManyToOne',
            'jakarta.persistence.FetchType',
            'jakarta.persistence.JoinColumn',
            ...(shared
              ? ['org.hibernate.annotations.OnDelete', 'org.hibernate.annotations.OnDeleteAction']
              : []),
          ],
          pairFieldName,
        },
      ];
    }
    case 'MANY_TO_ONE': {
      // A plain association: the "one" side lists the many, without cascade.
      const fieldName = rel.sourceRole ?? decapitalize(pluralize(source.name));
      const mappedBy = rel.targetRole ?? decapitalize(target.name);
      return [oneToManyField(fieldName, source.name, mappedBy, false)];
    }
    case 'ONE_TO_ONE': {
      const fieldName = rel.sourceRole ?? decapitalize(source.name);
      const mappedBy = rel.targetRole ?? decapitalize(target.name);
      return [
        {
          fieldName,
          javaType: source.name,
          annotations: [`@OneToOne(mappedBy = "${mappedBy}")`],
          imports: ['jakarta.persistence.OneToOne'],
          pairFieldName: mappedBy,
        },
      ];
    }
    case 'MANY_TO_MANY': {
      const fieldName =
        rel.sourceRole ?? decapitalize(pluralize(source.name));
      const mappedBy =
        rel.targetRole ?? decapitalize(pluralize(target.name));
      return [
        {
          fieldName,
          javaType: `List<${source.name}>`,
          annotations: [`@ManyToMany(mappedBy = "${mappedBy}")`],
          imports: ['java.util.List', 'jakarta.persistence.ManyToMany'],
          pairFieldName: mappedBy,
        },
      ];
    }
    case 'ASSOCIATION':
      // Unidirectional: no inverse field generated on the target side.
      return [];
    case 'INHERITANCE':
      return [];
    default:
      return [];
  }
}

/** For INHERITANCE relations, returns the superclass name for a subclass, if any. */
export function findSuperclass(
  cls: UmlClass,
  model: UmlModel,
): UmlClass | undefined {
  // An INHERITANCE towards an «interface» is a realization ("implements"), not a superclass.
  return model.relations
    .filter((r) => r.type === 'INHERITANCE' && r.sourceClassId === cls.id)
    .map((r) => findClass(model, r.targetClassId))
    .find((c) => c !== undefined && c.stereotype !== 'interface');
}

/** «interface» classes that `cls` realizes (UML InterfaceRealization → Java "implements"). */
export function findRealizedInterfaces(cls: UmlClass, model: UmlModel): UmlClass[] {
  return model.relations
    .filter((r) => r.type === 'INHERITANCE' && r.sourceClassId === cls.id)
    .map((r) => findClass(model, r.targetClassId))
    .filter((c): c is UmlClass => c !== undefined && c.stereotype === 'interface');
}

export { capitalize };
