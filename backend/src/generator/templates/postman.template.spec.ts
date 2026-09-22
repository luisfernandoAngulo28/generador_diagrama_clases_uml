import { describe, expect, it } from 'vitest';
import { renderPostmanCollection } from './postman.template.js';
import type { UmlModel } from '../../diagrams/uml.types.js';

describe('renderPostmanCollection — Postman v2.1 Collection generator', () => {
  it('generates a valid Postman v2.1 collection with CRUD items for entities', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
            { name: 'email', type: 'String', visibility: 'private' },
          ],
        },
      ],
      relations: [],
    };

    const json = renderPostmanCollection(model, 'Restaurante');
    const parsed = JSON.parse(json);

    expect(parsed.info.name).toBe('Restaurante API');
    expect(parsed.info.schema).toContain('collection/v2.1.0');
    expect(parsed.variable[0].key).toBe('baseUrl');
    expect(parsed.item).toHaveLength(1);

    const folder = parsed.item[0];
    expect(folder.name).toBe('Clientes');
    expect(folder.item).toHaveLength(5);

    const methods = folder.item.map((i: { request: { method: string } }) => i.request.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('DELETE');
  });

  it('excludes enums and interfaces from having direct CRUD endpoints', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'EstadoMesa',
          stereotype: 'enum',
          attributes: [{ name: 'LIBRE', type: 'String', visibility: 'public' }],
        },
      ],
      relations: [],
    };

    const json = renderPostmanCollection(model, 'Restaurante');
    const parsed = JSON.parse(json);
    expect(parsed.item).toHaveLength(0);
  });
});
