import { describe, expect, it } from 'vitest';
import { applyAuthorship, diffModel } from './authorship.util.js';
import type { AuthorStamp, UmlModel } from './uml.types.js';

const marco: AuthorStamp = { userId: 'u1', userName: 'Marco', timestamp: '2026-10-20T10:15:00.000Z', source: 'MANUAL' };
const luis: AuthorStamp = { userId: 'u2', userName: 'Luis', timestamp: '2026-10-20T10:20:00.000Z', source: 'MANUAL' };

function baseModel(): UmlModel {
  return {
    classes: [
      {
        id: 'c1',
        name: 'Pedido',
        attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        position: { x: 0, y: 0 },
      },
      {
        id: 'c2',
        name: 'Cliente',
        attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
      },
    ],
    relations: [{ id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c2', targetClassId: 'c1' }],
  };
}

describe('diffModel', () => {
  it('reports every element as created when there is no previous model', () => {
    const actions = diffModel(undefined, baseModel()).map((c) => c.action);
    expect(actions).toEqual(['CLASS_CREATED', 'CLASS_CREATED', 'RELATION_CREATED']);
  });

  it('reports nothing for an identical model or a position-only move', () => {
    const before = baseModel();
    const after = baseModel();
    after.classes[0].position = { x: 300, y: 120 };
    expect(diffModel(before, after)).toEqual([]);
  });

  it('detects added, changed and removed attributes', () => {
    const before = baseModel();
    before.classes[0].attributes.push({ name: 'fecha', type: 'Date', visibility: 'private' });
    const after = baseModel();
    after.classes[0].attributes = [
      { name: 'id', type: 'Integer', visibility: 'private', isPrimaryKey: true },
      { name: 'total', type: 'Double', visibility: 'private' },
    ];

    const changes = diffModel(before, after);
    expect(changes.map((c) => c.action)).toEqual([
      'ATTRIBUTE_UPDATED',
      'ATTRIBUTE_ADDED',
      'ATTRIBUTE_REMOVED',
    ]);
    expect(changes[1].summary).toBe('Agregó el atributo total: Double a Pedido');
    expect(changes[1].target).toEqual({ entityType: 'ATTRIBUTE', entityId: 'c1#total', entityName: 'Pedido.total' });
  });

  it('detects renamed and deleted classes and relation changes', () => {
    const before = baseModel();
    const after = baseModel();
    after.classes[0].name = 'Orden';
    after.classes.splice(1, 1);
    after.relations = [{ id: 'r2', type: 'DEPENDENCY', sourceClassId: 'c1', targetClassId: 'c1' }];

    const changes = diffModel(before, after);
    expect(changes.map((c) => c.action)).toEqual([
      'CLASS_RENAMED',
      'CLASS_DELETED',
      'RELATION_CREATED',
      'RELATION_DELETED',
    ]);
    expect(changes[0].details).toEqual({ from: 'Pedido', to: 'Orden' });
    expect(changes[3].summary).toBe('Eliminó la relación 1 : N Cliente → Orden');
  });
});

describe('applyAuthorship', () => {
  it('stamps every element of a brand-new model with the author', () => {
    const result = applyAuthorship(undefined, baseModel(), marco);
    expect(result.classes[0].author).toEqual(marco);
    expect(result.classes[0].attributes[0].author).toEqual(marco);
    expect(result.relations[0].author).toEqual(marco);
    expect(result.classes[0].lastModifiedBy).toBeUndefined();
  });

  it('keeps the original author and records who modified it', () => {
    const stored = applyAuthorship(undefined, baseModel(), marco);
    const edited = baseModel();
    edited.classes[0].attributes.push({ name: 'total', type: 'Double', visibility: 'private' });

    const result = applyAuthorship(stored, edited, luis);
    const pedido = result.classes[0];
    expect(pedido.author).toEqual(marco);
    expect(pedido.lastModifiedBy).toEqual(luis);
    expect(pedido.attributes[0].author).toEqual(marco);
    expect(pedido.attributes[1].author).toEqual(luis);
    // Untouched class keeps its stamps untouched.
    expect(result.classes[1].author).toEqual(marco);
    expect(result.classes[1].lastModifiedBy).toBeUndefined();
  });

  it('ignores stamps sent by the client and position-only moves', () => {
    const stored = applyAuthorship(undefined, baseModel(), marco);
    const moved = baseModel();
    moved.classes[0].position = { x: 999, y: 999 };
    moved.classes[0].author = luis; // forged

    const result = applyAuthorship(stored, moved, luis);
    expect(result.classes[0].author).toEqual(marco);
    expect(result.classes[0].lastModifiedBy).toBeUndefined();
    expect(result.classes[0].position).toEqual({ x: 999, y: 999 });
  });
});
