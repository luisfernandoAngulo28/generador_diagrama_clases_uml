import { describe, expect, it } from 'vitest';
import { validateOperations } from './validate-operations.js';
import type { UmlModel } from '../diagrams/uml.types.js';

const MODEL: UmlModel = {
  classes: [{ id: 'c1', name: 'Pedido', attributes: [] }],
  relations: [],
};

describe('validateOperations', () => {
  it('drops CREATE_CLASS for a class that already exists', () => {
    const result = validateOperations(
      { reply: 'ok', operations: [{ op: 'CREATE_CLASS', name: 'Pedido' }] },
      MODEL,
    );
    expect(result.operations).toEqual([]);
    expect(result.reply).toContain('CREATE_CLASS "Pedido" (esa clase ya existe)');
  });

  it('keeps a new class and a relation to it created in the same batch', () => {
    const result = validateOperations(
      {
        reply: 'ok',
        operations: [
          { op: 'CREATE_CLASS', name: 'Producto' },
          { op: 'CREATE_RELATION', sourceClassName: 'Producto', targetClassName: 'Pedido', type: 'MANY_TO_MANY' },
        ],
      },
      MODEL,
    );
    expect(result.operations).toHaveLength(2);
    expect(result.reply).toBe('ok');
  });
});
