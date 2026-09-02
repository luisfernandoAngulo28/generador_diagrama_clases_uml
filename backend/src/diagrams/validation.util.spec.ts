import { describe, expect, it } from 'vitest';
import { validateModel } from './validation.util.js';
import type { UmlModel } from './uml.types.js';

function model(overrides: Partial<UmlModel>): UmlModel {
  return { classes: [], relations: [], ...overrides };
}

function codes(issues: { code: string }[]): string[] {
  return issues.map((i) => i.code);
}

describe('validateModel — modelo limpio', () => {
  it('no reporta errores ni advertencias en un modelo bien formado', () => {
    const clean = model({
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'nombre', type: 'String', visibility: 'private' },
          ],
        },
        {
          id: 'c2',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'fecha', type: 'LocalDate', visibility: 'private' },
          ],
        },
      ],
      relations: [
        {
          id: 'r1',
          type: 'ONE_TO_MANY',
          sourceClassId: 'c1',
          targetClassId: 'c2',
        },
      ],
    });

    const result = validateModel(clean);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('un modelo vacío es válido (sin clases, sin problemas que reportar)', () => {
    const result = validateModel(model({}));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateModel — integridad estructural', () => {
  it('detecta una clase sin nombre', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: '',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
        ],
      }),
    );
    expect(codes(result.errors)).toContain('EMPTY_CLASS_NAME');
  });

  it('detecta una clase sin clave primaria', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Empleado',
            attributes: [{ name: 'nombre', type: 'String', visibility: 'private' }],
          },
        ],
      }),
    );
    expect(codes(result.errors)).toContain('NO_PRIMARY_KEY');
    expect(result.valid).toBe(false);
  });

  it('detecta un atributo duplicado dentro de la misma clase', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'nombre', type: 'String', visibility: 'private' },
              { name: 'nombre', type: 'String', visibility: 'private' },
            ],
          },
        ],
      }),
    );
    expect(codes(result.errors)).toContain('DUPLICATE_ATTRIBUTE');
  });

  it('detecta dos clases con el mismo nombre (normalizado, sin importar mayúsculas/espacios)', () => {
    const attrs = [{ name: 'id', type: 'Long', visibility: 'private' as const, isPrimaryKey: true }];
    const result = validateModel(
      model({
        classes: [
          { id: 'c1', name: 'Cliente', attributes: attrs },
          { id: 'c2', name: 'cliente', attributes: attrs },
        ],
      }),
    );
    expect(codes(result.errors)).toContain('DUPLICATE_CLASS_NAME');
  });

  it('detecta una relación que apunta a una clase inexistente', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
        ],
        relations: [
          { id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'no-existe' },
        ],
      }),
    );
    expect(codes(result.errors)).toContain('INVALID_RELATION');
  });
});

describe('validateModel — redundancia por desnormalización (3FN)', () => {
  it('detecta un atributo que copia un dato de la clase relacionada', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'nombre', type: 'String', visibility: 'private' },
            ],
          },
          {
            id: 'c2',
            name: 'Pedido',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'clienteNombre', type: 'String', visibility: 'private' },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' },
        ],
      }),
    );
    expect(codes(result.warnings)).toContain('DENORMALIZED_ATTRIBUTE');
    expect(result.valid).toBe(true); // es warning, no error: el modelo sigue siendo generable
  });

  it('no reporta desnormalización si el atributo no coincide con ningún atributo de la clase referenciada', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
          {
            id: 'c2',
            name: 'Pedido',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'clienteEstado', type: 'String', visibility: 'private' },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' },
        ],
      }),
    );
    expect(codes(result.warnings)).not.toContain('DENORMALIZED_ATTRIBUTE');
  });
});

describe('validateModel — claves foráneas manuales redundantes', () => {
  it('detecta un atributo "<clase>Id" cuando ya existe la relación real', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
          {
            id: 'c2',
            name: 'Pedido',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'clienteId', type: 'Long', visibility: 'private' },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' },
        ],
      }),
    );
    expect(codes(result.warnings)).toContain('REDUNDANT_MANUAL_FK');
  });

  it('no marca la propia PK como FK redundante aunque su nombre coincida', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Cliente',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
          {
            id: 'c2',
            name: 'Pedido',
            attributes: [
              { name: 'clienteId', type: 'Long', visibility: 'private', isPrimaryKey: true },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'ONE_TO_ONE', sourceClassId: 'c1', targetClassId: 'c2' },
        ],
      }),
    );
    expect(codes(result.warnings)).not.toContain('REDUNDANT_MANUAL_FK');
  });

  it('en MANY_TO_MANY revisa ambos extremos de la relación', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Estudiante',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'cursoId', type: 'Long', visibility: 'private' },
            ],
          },
          {
            id: 'c2',
            name: 'Curso',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'estudianteId', type: 'Long', visibility: 'private' },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'MANY_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' },
        ],
      }),
    );
    expect(codes(result.warnings)).toContain('REDUNDANT_MANUAL_FK');
    expect(result.warnings.filter((w) => w.code === 'REDUNDANT_MANUAL_FK')).toHaveLength(2);
  });
});

describe('validateModel — INHERITANCE queda fuera del análisis de FK/desnormalización', () => {
  it('no genera falsos positivos de FK/desnormalización sobre una relación de herencia', () => {
    const result = validateModel(
      model({
        classes: [
          {
            id: 'c1',
            name: 'Persona',
            attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
          },
          {
            id: 'c2',
            name: 'Empleado',
            attributes: [
              { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
              { name: 'salario', type: 'Double', visibility: 'private' },
            ],
          },
        ],
        relations: [
          { id: 'r1', type: 'INHERITANCE', sourceClassId: 'c2', targetClassId: 'c1' },
        ],
      }),
    );
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
