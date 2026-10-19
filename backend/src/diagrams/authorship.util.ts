import type {
  AuthorStamp,
  UmlAttribute,
  UmlClass,
  UmlModel,
  UmlRelation,
} from './uml.types.js';
import type { ActivityAction, ActivityEntityType } from './schemas/activity-log.schema.js';
import { RELATION_LABELS } from './relation-labels.js';

/** One structured change between two versions of a model, ready to become an activity log entry. */
export interface ModelChange {
  action: ActivityAction;
  target: { entityType: ActivityEntityType; entityId?: string; entityName?: string };
  details: Record<string, unknown>;
  summary: string;
}

const EMPTY_MODEL: UmlModel = { classes: [], relations: [] };

// --- Comparison keys: what counts as a "real" change -----------------------
// Canvas position and the authorship stamps themselves are excluded, so
// dragging a class around (autosave) neither logs activity nor steals
// authorship.

function classContentKey(c: UmlClass): string {
  return JSON.stringify([c.name, c.stereotype ?? null, c.description ?? '', c.operations ?? []]);
}

function attributeKey(a: UmlAttribute): string {
  return JSON.stringify([a.type, a.visibility, a.isPrimaryKey ?? false]);
}

function relationKey(r: UmlRelation): string {
  return JSON.stringify([
    r.type,
    r.sourceClassId,
    r.targetClassId,
    r.sourceRole ?? '',
    r.targetRole ?? '',
  ]);
}

function attributesByName(c: UmlClass | undefined): Map<string, UmlAttribute> {
  return new Map((c?.attributes ?? []).map((a) => [a.name, a]));
}

function classChanged(prev: UmlClass, next: UmlClass): boolean {
  if (classContentKey(prev) !== classContentKey(next)) return true;
  const prevAttrs = attributesByName(prev);
  if (prevAttrs.size !== next.attributes.length) return true;
  return next.attributes.some((a) => {
    const old = prevAttrs.get(a.name);
    return !old || attributeKey(old) !== attributeKey(a);
  });
}

// --- Structured diff --------------------------------------------------------

/**
 * Field-level diff between two versions of a diagram's model, as structured
 * activity entries (CLASS_CREATED, ATTRIBUTE_ADDED, RELATION_DELETED, ...).
 * Attributes have no id, so they're matched by name within their class: a
 * renamed attribute shows up as removed + added.
 */
export function diffModel(prevModel: UmlModel | undefined, nextModel: UmlModel): ModelChange[] {
  const prev = prevModel ?? EMPTY_MODEL;
  const changes: ModelChange[] = [];
  const prevById = new Map(prev.classes.map((c) => [c.id, c]));
  const nextById = new Map(nextModel.classes.map((c) => [c.id, c]));
  const className = (id: string) => nextById.get(id)?.name ?? prevById.get(id)?.name ?? id;

  for (const cls of nextModel.classes) {
    const old = prevById.get(cls.id);
    const target = { entityType: 'CLASS' as const, entityId: cls.id, entityName: cls.name };

    if (!old) {
      changes.push({
        action: 'CLASS_CREATED',
        target,
        details: { attributes: cls.attributes.map((a) => `${a.name}: ${a.type}`) },
        summary: `Creó la clase ${cls.name}`,
      });
      continue;
    }

    if (old.name !== cls.name) {
      changes.push({
        action: 'CLASS_RENAMED',
        target,
        details: { from: old.name, to: cls.name },
        summary: `Renombró la clase ${old.name} a ${cls.name}`,
      });
    }

    const otherFieldsChanged =
      old.stereotype !== cls.stereotype ||
      (old.description ?? '') !== (cls.description ?? '') ||
      JSON.stringify(old.operations ?? []) !== JSON.stringify(cls.operations ?? []);
    if (otherFieldsChanged) {
      changes.push({
        action: 'CLASS_UPDATED',
        target,
        details: {
          stereotype: cls.stereotype ?? null,
          operations: (cls.operations ?? []).map((o) => o.name),
        },
        summary: `Modificó estereotipo/descripción/operaciones de ${cls.name}`,
      });
    }

    const oldAttrs = attributesByName(old);
    const newAttrs = attributesByName(cls);
    for (const attr of cls.attributes) {
      const oldAttr = oldAttrs.get(attr.name);
      const attrTarget = {
        entityType: 'ATTRIBUTE' as const,
        entityId: `${cls.id}#${attr.name}`,
        entityName: `${cls.name}.${attr.name}`,
      };
      if (!oldAttr) {
        changes.push({
          action: 'ATTRIBUTE_ADDED',
          target: attrTarget,
          details: { classId: cls.id, type: attr.type, visibility: attr.visibility },
          summary: `Agregó el atributo ${attr.name}: ${attr.type} a ${cls.name}`,
        });
      } else if (attributeKey(oldAttr) !== attributeKey(attr)) {
        changes.push({
          action: 'ATTRIBUTE_UPDATED',
          target: attrTarget,
          details: {
            classId: cls.id,
            from: { type: oldAttr.type, visibility: oldAttr.visibility },
            to: { type: attr.type, visibility: attr.visibility },
          },
          summary: `Modificó el atributo ${attr.name} de ${cls.name} (${oldAttr.type} → ${attr.type})`,
        });
      }
    }
    for (const oldAttr of old.attributes) {
      if (newAttrs.has(oldAttr.name)) continue;
      changes.push({
        action: 'ATTRIBUTE_REMOVED',
        target: {
          entityType: 'ATTRIBUTE',
          entityId: `${cls.id}#${oldAttr.name}`,
          entityName: `${cls.name}.${oldAttr.name}`,
        },
        details: { classId: cls.id },
        summary: `Eliminó el atributo ${oldAttr.name} de ${cls.name}`,
      });
    }
  }

  for (const old of prev.classes) {
    if (nextById.has(old.id)) continue;
    changes.push({
      action: 'CLASS_DELETED',
      target: { entityType: 'CLASS', entityId: old.id, entityName: old.name },
      details: {},
      summary: `Eliminó la clase ${old.name}`,
    });
  }

  const prevRels = new Map(prev.relations.map((r) => [r.id, r]));
  const nextRelIds = new Set(nextModel.relations.map((r) => r.id));
  const describe = (r: UmlRelation) =>
    `${RELATION_LABELS[r.type] ?? r.type} ${className(r.sourceClassId)} → ${className(r.targetClassId)}`;

  for (const rel of nextModel.relations) {
    const old = prevRels.get(rel.id);
    const target = { entityType: 'RELATION' as const, entityId: rel.id, entityName: describe(rel) };
    if (!old) {
      changes.push({
        action: 'RELATION_CREATED',
        target,
        details: { type: rel.type, sourceClassId: rel.sourceClassId, targetClassId: rel.targetClassId },
        summary: `Creó la relación ${describe(rel)}`,
      });
    } else if (relationKey(old) !== relationKey(rel)) {
      changes.push({
        action: 'RELATION_UPDATED',
        target,
        details: { fromType: old.type, toType: rel.type },
        summary: `Modificó la relación ${describe(rel)}`,
      });
    }
  }
  for (const old of prev.relations) {
    if (nextRelIds.has(old.id)) continue;
    changes.push({
      action: 'RELATION_DELETED',
      target: { entityType: 'RELATION', entityId: old.id, entityName: describe(old) },
      details: { type: old.type },
      summary: `Eliminó la relación ${describe(old)}`,
    });
  }

  return changes;
}

// --- Authorship merge -------------------------------------------------------

/**
 * Returns `nextModel` with authorship stamps filled in server-side:
 * - new class / attribute / relation → `author = stamp`
 * - existing element whose content changed → keeps its `author`, `lastModifiedBy = stamp`
 * - unchanged element → keeps both stamps from `prevModel`
 *
 * Stamps always come from `prevModel` (what's stored), never from the
 * client, so the frontend can drop or forge them without effect.
 */
export function applyAuthorship(
  prevModel: UmlModel | undefined,
  nextModel: UmlModel,
  stamp: AuthorStamp,
): UmlModel {
  const prev = prevModel ?? EMPTY_MODEL;
  const prevById = new Map(prev.classes.map((c) => [c.id, c]));
  const prevRels = new Map(prev.relations.map((r) => [r.id, r]));

  const classes = nextModel.classes.map((cls): UmlClass => {
    const old = prevById.get(cls.id);
    const oldAttrs = attributesByName(old);

    const attributes = cls.attributes.map((attr): UmlAttribute => {
      const oldAttr = old ? oldAttrs.get(attr.name) : undefined;
      if (!oldAttr) return withStamps(attr, stamp, undefined);
      const changed = attributeKey(oldAttr) !== attributeKey(attr);
      return withStamps(attr, oldAttr.author, changed ? stamp : oldAttr.lastModifiedBy);
    });

    if (!old) return { ...withStamps(cls, stamp, undefined), attributes };
    const changed = classChanged(old, cls);
    return { ...withStamps(cls, old.author, changed ? stamp : old.lastModifiedBy), attributes };
  });

  const relations = nextModel.relations.map((rel): UmlRelation => {
    const old = prevRels.get(rel.id);
    if (!old) return withStamps(rel, stamp, undefined);
    const changed = relationKey(old) !== relationKey(rel);
    return withStamps(rel, old.author, changed ? stamp : old.lastModifiedBy);
  });

  return { ...nextModel, classes, relations };
}

function withStamps<T extends { author?: AuthorStamp; lastModifiedBy?: AuthorStamp }>(
  element: T,
  author: AuthorStamp | undefined,
  lastModifiedBy: AuthorStamp | undefined,
): T {
  const { author: _a, lastModifiedBy: _m, ...rest } = element;
  return {
    ...rest,
    ...(author ? { author } : {}),
    ...(lastModifiedBy ? { lastModifiedBy } : {}),
  } as T;
}

// --- Authorship index (what the UI shows) -----------------------------------

export interface ElementAuthorship {
  author?: AuthorStamp;
  lastModifiedBy?: AuthorStamp;
}

export interface ClassAuthorship extends ElementAuthorship {
  attributes: Record<string, ElementAuthorship>;
}

/** classId → who created/edited the class and each of its attributes (by name). */
export function authorshipIndex(model: UmlModel): Record<string, ClassAuthorship> {
  return Object.fromEntries(
    model.classes.map((c) => [
      c.id,
      {
        author: c.author,
        lastModifiedBy: c.lastModifiedBy,
        attributes: Object.fromEntries(
          c.attributes.map((a) => [a.name, { author: a.author, lastModifiedBy: a.lastModifiedBy }]),
        ),
      },
    ]),
  );
}
