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

  it('follows a rename so later operations can use the new name (and not the old one)', () => {
    const result = validateOperations(
      {
        reply: 'ok',
        operations: [
          { op: 'RENAME_CLASS', className: 'Pedido', newName: 'Orden' },
          { op: 'ADD_ATTRIBUTE', className: 'Orden', attribute: { id: 'a1', name: 'total', type: 'Double' } },
          { op: 'CREATE_CLASS', name: 'Cliente' },
          { op: 'CREATE_RELATION', sourceClassName: 'Cliente', targetClassName: 'Orden', type: 'ONE_TO_MANY' },
          { op: 'ADD_ATTRIBUTE', className: 'Pedido', attribute: { id: 'a2', name: 'x', type: 'String' } },
        ],
      } as never,
      MODEL,
    );
    expect(result.operations).toHaveLength(4);
    expect(result.reply).toContain('ADD_ATTRIBUTE sobre "Pedido" (esa clase no existe)');
  });

  it('forgets a class deleted earlier in the batch', () => {
    const result = validateOperations(
      {
        reply: 'ok',
        operations: [
          { op: 'DELETE_CLASS', className: 'Pedido' },
          { op: 'ADD_ATTRIBUTE', className: 'Pedido', attribute: { id: 'a1', name: 'total', type: 'Double' } },
        ],
      } as never,
      MODEL,
    );
    expect(result.operations).toHaveLength(1);
  });
});
