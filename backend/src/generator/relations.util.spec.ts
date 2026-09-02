import { describe, expect, it } from 'vitest';
import { findSuperclass, resolveRelationFields } from './relations.util.js';
import type { UmlClass, UmlModel } from '../diagrams/uml.types.js';

function cls(id: string, name: string): UmlClass {
  return { id, name, attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }] };
}

function fieldNames(fields: { fieldName: string }[]): string[] {
  return fields.map((f) => f.fieldName);
}

describe('resolveRelationFields — ONE_TO_MANY / MANY_TO_ONE', () => {
  const cliente = cls('c1', 'Cliente');
  const pedido = cls('c2', 'Pedido');
  const model: UmlModel = {
    classes: [cliente, pedido],
    relations: [{ id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' }],
  };

  it('genera List<Pedido> con @OneToMany en el lado dueño (Cliente)', () => {
    const fields = resolveRelationFields(cliente, model);
    expect(fields).toHaveLength(1);
    expect(fields[0].javaType).toBe('List<Pedido>');
    expect(fields[0].annotations[0]).toContain('@OneToMany(mappedBy = "cliente"');
    expect(fields[0].imports).toContain('jakarta.persistence.OneToMany');
  });

  it('genera Cliente con @ManyToOne + @JoinColumn en el lado inverso (Pedido)', () => {
    const fields = resolveRelationFields(pedido, model);
    expect(fields).toHaveLength(1);
    expect(fields[0].javaType).toBe('Cliente');
    expect(fields[0].annotations).toContain('@ManyToOne(fetch = FetchType.LAZY)');
    expect(fields[0].annotations.some((a) => a.includes('@JoinColumn'))).toBe(true);
  });

  it('los nombres de campo se emparejan (pairFieldName) para romper la recursión de Jackson', () => {
    const [ownerField] = resolveRelationFields(cliente, model);
    const [inverseField] = resolveRelationFields(pedido, model);
    expect(ownerField.pairFieldName).toBe(inverseField.fieldName);
    expect(inverseField.pairFieldName).toBe(ownerField.fieldName);
  });

  it('respeta sourceRole/targetRole explícitos en vez de inferir el nombre', () => {
    const withRoles: UmlModel = {
      classes: [cliente, pedido],
      relations: [
        {
          id: 'r1',
          type: 'ONE_TO_MANY',
          sourceClassId: 'c1',
          targetClassId: 'c2',
          sourceRole: 'comprador',
          targetRole: 'ordenes',
        },
      ],
    };
    const [ownerField] = resolveRelationFields(cliente, withRoles);
    const [inverseField] = resolveRelationFields(pedido, withRoles);
    expect(ownerField.fieldName).toBe('ordenes');
    expect(ownerField.annotations[0]).toContain('mappedBy = "comprador"');
    expect(inverseField.fieldName).toBe('comprador');
  });
});

describe('resolveRelationFields — ONE_TO_ONE', () => {
  const persona = cls('c1', 'Persona');
  const pasaporte = cls('c2', 'Pasaporte');
  const model: UmlModel = {
    classes: [persona, pasaporte],
    relations: [{ id: 'r1', type: 'ONE_TO_ONE', sourceClassId: 'c1', targetClassId: 'c2' }],
  };

  it('el lado dueño lleva @OneToOne + @JoinColumn', () => {
    const [field] = resolveRelationFields(persona, model);
    expect(field.annotations).toContain('@OneToOne(fetch = FetchType.LAZY)');
    expect(field.annotations.some((a) => a.includes('@JoinColumn'))).toBe(true);
  });

  it('el lado inverso lleva @OneToOne(mappedBy=...) sin columna propia', () => {
    const [field] = resolveRelationFields(pasaporte, model);
    expect(field.annotations).toEqual(['@OneToOne(mappedBy = "pasaporte")']);
  });
});

describe('resolveRelationFields — MANY_TO_MANY', () => {
  const estudiante = cls('c1', 'Estudiante');
  const curso = cls('c2', 'Curso');
  const model: UmlModel = {
    classes: [estudiante, curso],
    relations: [{ id: 'r1', type: 'MANY_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' }],
  };

  it('el lado dueño genera @JoinTable con nombre de tabla intermedia derivado de ambas clases', () => {
    const [field] = resolveRelationFields(estudiante, model);
    expect(field.javaType).toBe('List<Curso>');
    expect(field.annotations).toContain('@ManyToMany');
    expect(field.annotations.some((a) => a.includes('@JoinTable(name = "estudiante_curso'))).toBe(
      true,
    );
  });

  it('el lado inverso usa @ManyToMany(mappedBy=...) sin @JoinTable propia', () => {
    const [field] = resolveRelationFields(curso, model);
    expect(field.javaType).toBe('List<Estudiante>');
    expect(field.annotations).toEqual(['@ManyToMany(mappedBy = "cursos")']);
  });

  it('los campos son plurales de forma consistente en ambos lados', () => {
    const [ownerField] = resolveRelationFields(estudiante, model);
    const [inverseField] = resolveRelationFields(curso, model);
    expect(ownerField.fieldName).toBe('cursos');
    expect(inverseField.fieldName).toBe('estudiantes');
  });
});

describe('resolveRelationFields — ASSOCIATION / AGGREGATION (unidireccionales)', () => {
  it('ASSOCIATION genera @ManyToOne en el origen y ningún campo en el destino', () => {
    const a = cls('c1', 'Factura');
    const b = cls('c2', 'Vendedor');
    const model: UmlModel = {
      classes: [a, b],
      relations: [{ id: 'r1', type: 'ASSOCIATION', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    expect(resolveRelationFields(a, model)).toHaveLength(1);
    expect(resolveRelationFields(a, model)[0].annotations).toContain(
      '@ManyToOne(fetch = FetchType.LAZY)',
    );
    expect(resolveRelationFields(b, model)).toHaveLength(0);
  });

  it('AGGREGATION se comporta igual que ASSOCIATION (unidireccional)', () => {
    const a = cls('c1', 'Equipo');
    const b = cls('c2', 'Jugador');
    const model: UmlModel = {
      classes: [a, b],
      relations: [{ id: 'r1', type: 'AGGREGATION', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    expect(resolveRelationFields(a, model)).toHaveLength(1);
    expect(resolveRelationFields(b, model)).toHaveLength(0);
  });
});

describe('resolveRelationFields — COMPOSITION', () => {
  it('se comporta igual que ONE_TO_MANY (dueño con la colección, cascade ALL + orphanRemoval)', () => {
    const casa = cls('c1', 'Casa');
    const habitacion = cls('c2', 'Habitacion');
    const model: UmlModel = {
      classes: [casa, habitacion],
      relations: [{ id: 'r1', type: 'COMPOSITION', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    const [field] = resolveRelationFields(casa, model);
    expect(field.javaType).toBe('List<Habitacion>');
    expect(field.annotations[0]).toContain('cascade = CascadeType.ALL');
    expect(field.annotations[0]).toContain('orphanRemoval = true');
  });
});

describe('resolveRelationFields — INHERITANCE', () => {
  it('no genera campos JPA para la relación de herencia en ninguno de los dos lados', () => {
    const empleado = cls('c1', 'Empleado');
    const persona = cls('c2', 'Persona');
    const model: UmlModel = {
      classes: [empleado, persona],
      relations: [{ id: 'r1', type: 'INHERITANCE', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    expect(resolveRelationFields(empleado, model)).toHaveLength(0);
    expect(resolveRelationFields(persona, model)).toHaveLength(0);
  });

  it('findSuperclass resuelve la superclase de una subclase', () => {
    const empleado = cls('c1', 'Empleado');
    const persona = cls('c2', 'Persona');
    const model: UmlModel = {
      classes: [empleado, persona],
      relations: [{ id: 'r1', type: 'INHERITANCE', sourceClassId: 'c1', targetClassId: 'c2' }],
    };
    expect(findSuperclass(empleado, model)?.name).toBe('Persona');
    expect(findSuperclass(persona, model)).toBeUndefined();
  });
});

describe('resolveRelationFields — clase con múltiples relaciones combinadas', () => {
  it('acumula campos de todas las relaciones en las que participa (herencia + 1:N + N:M)', () => {
    const persona = cls('base', 'Persona');
    const alumno = cls('c1', 'Alumno');
    const curso = cls('c2', 'Curso');
    const matricula = cls('c3', 'Matricula');
    const model: UmlModel = {
      classes: [persona, alumno, curso, matricula],
      relations: [
        { id: 'r1', type: 'INHERITANCE', sourceClassId: 'c1', targetClassId: 'base' },
        { id: 'r2', type: 'MANY_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' },
        { id: 'r3', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c3' },
      ],
    };
    const fields = resolveRelationFields(alumno, model);
    expect(fieldNames(fields)).toEqual(['cursos', 'matriculas']);
  });
});
