import { describe, expect, it } from 'vitest';
import { renderDocumentationHtml } from './documentation.util.js';
import type { UmlModel } from './uml.types.js';

describe('renderDocumentationHtml — Extended documentation report', () => {
  it('generates HTML report containing Data Dictionary and CRUD matrix', () => {
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

    const html = renderDocumentationHtml('Sistema Ventas', model);
    expect(html).toContain('Documentación de Ingeniería de Software — Sistema Ventas');
    expect(html).toContain('Diccionario de Datos Relacional');
    expect(html).toContain('Matriz de Trazabilidad de Servicios CRUD');
    expect(html).toContain('Tabla: <code>cliente</code>');
    expect(html).toContain('/api/clientes');
    expect(html).toContain('window.print()');
  });
});
