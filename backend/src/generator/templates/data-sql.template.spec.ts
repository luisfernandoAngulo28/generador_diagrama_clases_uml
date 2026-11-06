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
    // Same table name as the entity's @Table, which Hibernate creates.
    expect(sql).toContain('INSERT INTO clientes (id, nombre, email, telefono) VALUES (1,');
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

  it('JOINED inheritance: one row in the parent table and one in the subclass table, with the same id', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'p',
          name: 'Persona',
          stereotype: 'abstract',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
          ],
        },
        { id: 'c', name: 'Cliente', attributes: [{ name: 'nit', type: 'String', visibility: 'private' }] },
        { id: 'e', name: 'Empleado', attributes: [{ name: 'cargo', type: 'String', visibility: 'private' }] },
      ],
      relations: [
        { id: 'r1', type: 'INHERITANCE', sourceClassId: 'c', targetClassId: 'p' },
        { id: 'r2', type: 'INHERITANCE', sourceClassId: 'e', targetClassId: 'p' },
      ],
    };
    const sql = renderDataSql(model);
    expect(sql).toContain("INSERT INTO personas (id, nombre) VALUES (1, 'Carlos Mendoza')");
    expect(sql).toContain("INSERT INTO clientes (id, nit) VALUES (1, 'Cliente nit 1')");
    // Empleado continues the shared sequence of the hierarchy.
    expect(sql).toContain('INSERT INTO personas (id, nombre) VALUES (4,');
    expect(sql).toContain("INSERT INTO empleados (id, cargo) VALUES (4,");
    expect(sql).not.toContain('INSERT INTO personas (id, nombre) VALUES (7,');
    expect(sql).toContain("pg_get_serial_sequence('personas', 'id')");
  });

  it('uses the real literals of a model enum and fills many-to-many join tables', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'estado',
          name: 'EstadoPedido',
          stereotype: 'enum',
          attributes: [
            { name: 'PENDIENTE', type: 'String', visibility: 'public' },
            { name: 'PAGADO', type: 'String', visibility: 'public' },
          ],
        },
        {
          id: 'p',
          name: 'Producto',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'estado', type: 'EstadoPedido', visibility: 'private' },
          ],
        },
        { id: 'c', name: 'Categoria', attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }] },
      ],
      relations: [{ id: 'r', type: 'MANY_TO_MANY', sourceClassId: 'p', targetClassId: 'c' }],
    };
    const sql = renderDataSql(model);
    expect(sql).toContain("'PENDIENTE'");
    expect(sql).toContain("'PAGADO'");
    expect(sql).not.toContain('OPCION');
    expect(sql).toContain('INSERT INTO producto_categorias (producto_id, categoria_id) SELECT 1, 1 WHERE NOT EXISTS');
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
