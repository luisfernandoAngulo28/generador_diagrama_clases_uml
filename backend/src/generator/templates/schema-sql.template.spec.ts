import { describe, expect, it } from 'vitest';
import { renderSchemaSql } from './schema-sql.template.js';
import type { UmlModel } from '../../diagrams/uml.types.js';

describe('renderSchemaSql — SQL DDL schema generator', () => {
  it('generates CREATE TABLE statements with appropriate column types and primary key', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
            { name: 'email', type: 'String', visibility: 'private' },
            { name: 'activo', type: 'Boolean', visibility: 'private' },
            { name: 'descripcion', type: 'String', visibility: 'private' },
          ],
        },
      ],
      relations: [],
    };

    const sql = renderSchemaSql(model, 'SistemaTest');
    expect(sql).toContain('CREATE TABLE cliente (');
    expect(sql).toContain('id BIGSERIAL PRIMARY KEY');
    expect(sql).toContain('nombre VARCHAR(255)');
    expect(sql).toContain('activo BOOLEAN');
    expect(sql).toContain('descripcion TEXT');
    expect(sql).toContain('DROP TABLE IF EXISTS cliente CASCADE;');
  });

  it('generates Foreign Key constraints with ON DELETE CASCADE', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
          ],
        },
        {
          id: 'c2',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'total', type: 'Double', visibility: 'private' },
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

    const sql = renderSchemaSql(model, 'SistemaTest');
    expect(sql).toContain('cliente_id BIGINT');
    expect(sql).toContain('CONSTRAINT fk_pedido_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(id) ON DELETE CASCADE');
  });

  it('generates junction table for ManyToMany relations', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Estudiante',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
        {
          id: 'c2',
          name: 'Curso',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
      ],
      relations: [
        {
          id: 'r1',
          type: 'MANY_TO_MANY',
          sourceClassId: 'c1',
          targetClassId: 'c2',
        },
      ],
    };

    const sql = renderSchemaSql(model, 'Universidad');
    expect(sql).toContain('CREATE TABLE estudiante_cursos (');
    expect(sql).toContain('estudiante_id BIGINT NOT NULL');
    expect(sql).toContain('curso_id BIGINT NOT NULL');
    expect(sql).toContain('PRIMARY KEY (estudiante_id, curso_id)');
  });
});
