import { describe, expect, it } from 'vitest';
import { sanitizeModel } from './model-sanitize.util.js';
import { diffModel } from './authorship.util.js';
import type { UmlModel } from './uml.types.js';

describe('sanitizeModel', () => {
  it('drops null/undefined fields and invalid positions, keeps valid ones', () => {
    const dirty = {
      classes: [
        {
          id: 'c1',
          name: 'Pedido',
          stereotype: null,
          description: undefined,
          operations: null,
          position: { x: 10, y: 20 },
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: null }],
        },
        { id: 'c2', name: 'Cliente', attributes: [], position: {} },
      ],
      relations: [],
    } as unknown as UmlModel;

    expect(sanitizeModel(dirty)).toEqual({
      classes: [
        {
          id: 'c1',
          name: 'Pedido',
          position: { x: 10, y: 20 },
          attributes: [{ name: 'id', type: 'Long', visibility: 'private' }],
        },
        { id: 'c2', name: 'Cliente', attributes: [] },
      ],
      relations: [],
    });
  });

  it('removes the phantom "modified" diffs between stored nulls and client undefineds', () => {
    const stored = {
      classes: [{ id: 'c1', name: 'Pedido', stereotype: null, operations: null, attributes: [] }],
      relations: [],
    } as unknown as UmlModel;
    const fromClient: UmlModel = { classes: [{ id: 'c1', name: 'Pedido', attributes: [] }], relations: [] };

    expect(diffModel(sanitizeModel(stored), sanitizeModel(fromClient))).toEqual([]);
  });
});
