import { describe, expect, it } from 'vitest';
import { renderDataSql } from './data-sql.template.js';
import type { UmlModel } from '../../diagrams/uml.types.js';

describe('renderDataSql — Seed data generator', () => {
  it('generates INSERT statements for plain entities with realistic sample values', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
            { name: 'email', type: 'String', visibility: 'private' },
            { name: 'telefono', type: 'String', visibility: 'private' },
          ],
        },
      ],
      relations: [],
    };

    const sql = renderDataSql(model);
    expect(sql).toContain('INSERT INTO cliente (id, nombre, email, telefono) VALUES (1,');
    expect(sql).toContain('Carlos Mendoza');
    expect(sql).toContain('carlos.mendoza@example.com');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING;');
    expect(sql).toContain('SELECT setval(pg_get_serial_sequence');
  });

  it('orders parent entities before child entities with Foreign Keys', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c2',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'total', type: 'Double', visibility: 'private' },
          ],
        },
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
          ],
        },
      ],
      relations: [
        {
          id: 'r1',
          type: 'MANY_TO_ONE',
          sourceClassId: 'c2',
          targetClassId: 'c1',
        },
      ],
    };

    const sql = renderDataSql(model);

    // Cliente (parent) must appear before Pedido (child)
    const clienteIdx = sql.indexOf('INSERT INTO cliente');
    const pedidoIdx = sql.indexOf('INSERT INTO pedido');
    expect(clienteIdx).toBeGreaterThan(-1);
    expect(pedidoIdx).toBeGreaterThan(-1);
    expect(clienteIdx).toBeLessThan(pedidoIdx);

    // Pedido should include cliente_id FK
    expect(sql).toContain('cliente_id');
  });

  it('ignores enums and interfaces for table insert statements', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'TipoPago',
          stereotype: 'enum',
          attributes: [{ name: 'EFECTIVO', type: 'String', visibility: 'public' }],
        },
        {
          id: 'c2',
          name: 'IPagable',
          stereotype: 'interface',
          attributes: [],
        },
      ],
      relations: [],
    };

    const sql = renderDataSql(model);
    expect(sql).not.toContain('INSERT INTO tipo_pago');
    expect(sql).not.toContain('INSERT INTO ipagable');
  });
});
