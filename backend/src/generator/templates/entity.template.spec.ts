import { describe, expect, it } from 'vitest';
import { renderEntity } from './entity.template.js';
import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';

function model(classes: UmlClass[]): UmlModel {
  return { classes, relations: [] };
}

describe('renderEntity — stereotype «abstract»', () => {
  it('emits an abstract Java class', () => {
    const cls: UmlClass = {
      id: 'c1',
      name: 'Persona',
      stereotype: 'abstract',
      attributes: [
        { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
        { name: 'nombre', type: 'String', visibility: 'private' },
      ],
    };
    const java = renderEntity(cls, model([cls]), 'com.example.demo');

    expect(java).toContain('public abstract class Persona {');
    expect(java).toContain('@Entity');
  });

  it('a plain class (no stereotype) is not abstract', () => {
    const cls: UmlClass = {
      id: 'c1',
      name: 'Cliente',
      attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
    };
    const java = renderEntity(cls, model([cls]), 'com.example.demo');

    expect(java).toContain('public class Cliente {');
    expect(java).not.toContain('abstract');
  });

  it('an abstract superclass with a subclass still extends correctly', () => {
    const base: UmlClass = {
      id: 'c1',
      name: 'Persona',
      stereotype: 'abstract',
      attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
    };
    const sub: UmlClass = {
      id: 'c2',
      name: 'Empleado',
      attributes: [{ name: 'salario', type: 'Double', visibility: 'private' }],
    };
    const m: UmlModel = {
      classes: [base, sub],
      relations: [{ id: 'r1', type: 'INHERITANCE', sourceClassId: 'c2', targetClassId: 'c1' }],
    };

    const baseJava = renderEntity(base, m, 'com.example.demo');
    const subJava = renderEntity(sub, m, 'com.example.demo');

    expect(baseJava).toContain('public abstract class Persona {');
    expect(subJava).toContain('public class Empleado extends Persona {');
    expect(subJava).not.toContain('abstract');
  });
});
