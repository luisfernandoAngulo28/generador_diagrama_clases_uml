import type { UmlClass, UmlModel, UmlRelation } from '../diagrams/uml.types.js';
import { capitalize, decapitalize, pluralize } from './java-type.util.js';

export interface RelationField {
  fieldName: string;
  javaType: string;
  annotations: string[];
  imports: string[];
}

function toSnakeColumn(name: string): string {
  return `${name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()}_id`;
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
    case 'COMPOSITION': {
      // Source owns the collection; target holds the FK back to source.
      const fieldName =
        rel.targetRole ?? decapitalize(pluralize(target.name));
      const mappedBy = rel.sourceRole ?? decapitalize(source.name);
      return [
        {
          fieldName,
          javaType: `List<${target.name}>`,
          annotations: [
            `@OneToMany(mappedBy = "${mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)`,
          ],
          imports: [
            'java.util.List',
            'jakarta.persistence.OneToMany',
            'jakarta.persistence.CascadeType',
          ],
        },
      ];
    }
    case 'MANY_TO_ONE':
    case 'ASSOCIATION':
    case 'AGGREGATION': {
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
        },
      ];
    }
    case 'MANY_TO_MANY': {
      const fieldName =
        rel.targetRole ?? decapitalize(pluralize(target.name));
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
    case 'COMPOSITION': {
      const fieldName = rel.sourceRole ?? decapitalize(source.name);
      return [
        {
          fieldName,
          javaType: source.name,
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
    case 'MANY_TO_ONE': {
      const fieldName = rel.sourceRole ?? decapitalize(pluralize(source.name));
      const mappedBy = rel.targetRole ?? decapitalize(target.name);
      return [
        {
          fieldName,
          javaType: `List<${source.name}>`,
          annotations: [
            `@OneToMany(mappedBy = "${mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)`,
          ],
          imports: [
            'java.util.List',
            'jakarta.persistence.OneToMany',
            'jakarta.persistence.CascadeType',
          ],
        },
      ];
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
        },
      ];
    }
    case 'ASSOCIATION':
    case 'AGGREGATION':
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
  const rel = model.relations.find(
    (r) => r.type === 'INHERITANCE' && r.sourceClassId === cls.id,
  );
  return rel ? findClass(model, rel.targetClassId) : undefined;
}

export { capitalize };
