import { describe, expect, it } from 'vitest';
import { summarizeModelDiff } from './model-diff.util.js';
import type { UmlModel } from './uml.types.js';

function baseModel(): UmlModel {
  return {
    classes: [
      {
        id: 'c1',
        name: 'Pedido',
        attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
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

describe('summarizeModelDiff', () => {
  it('reports no changes for an identical model', () => {
    const model = baseModel();
    expect(summarizeModelDiff(model, model)).toBe('Guardó el diagrama sin cambios detectados en el modelo');
  });

  it('detects an added class', () => {
    const before = baseModel();
    const after: UmlModel = {
      ...before,
      classes: [
        ...before.classes,
        { id: 'c3', name: 'Producto', attributes: [] },
      ],
    };
    expect(summarizeModelDiff(before, after)).toMatch(/agregó la clase Producto/i);
  });

  it('detects a removed class', () => {
    const before = baseModel();
    const after: UmlModel = { ...before, classes: before.classes.filter((c) => c.id !== 'c2') };
    expect(summarizeModelDiff(before, after)).toMatch(/eliminó la clase Cliente/i);
  });

  it('detects a renamed class', () => {
    const before = baseModel();
    const after: UmlModel = {
      ...before,
      classes: before.classes.map((c) => (c.id === 'c1' ? { ...c, name: 'Orden' } : c)),
    };
    expect(summarizeModelDiff(before, after)).toMatch(/renombró 1 clase/i);
  });

  it('detects modified attributes on an existing class', () => {
    const before = baseModel();
    const after: UmlModel = {
      ...before,
      classes: before.classes.map((c) =>
        c.id === 'c1'
          ? { ...c, attributes: [...c.attributes, { name: 'total', type: 'Double', visibility: 'private' as const }] }
          : c,
      ),
    };
    expect(summarizeModelDiff(before, after)).toMatch(/modificó atributos\/operaciones en 1 clase/i);
  });

  it('detects added and removed relations', () => {
    const before = baseModel();
    const after: UmlModel = {
      ...before,
      relations: [{ id: 'r2', type: 'DEPENDENCY', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    const summary = summarizeModelDiff(before, after);
    expect(summary).toMatch(/agregó 1 relación/i);
    expect(summary).toMatch(/eliminó 1 relación/i);
  });

  it('detects a relation whose type changed', () => {
    const before = baseModel();
    const after: UmlModel = {
      ...before,
      relations: [{ ...before.relations[0], type: 'MANY_TO_MANY' }],
    };
    expect(summarizeModelDiff(before, after)).toMatch(/cambió 1 relación/i);
  });
});
