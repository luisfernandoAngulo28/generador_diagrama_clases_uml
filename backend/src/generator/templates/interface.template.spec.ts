import { describe, expect, it } from 'vitest';
import { renderInterface } from './interface.template.js';
import type { UmlClass } from '../../diagrams/uml.types.js';

function interfaceClass(operations: UmlClass['operations']): UmlClass {
  return {
    id: 'c1',
    name: 'Notificador',
    stereotype: 'interface',
    attributes: [],
    operations,
  };
}

describe('renderInterface', () => {
  it('renders a Java interface with one method signature per operation', () => {
    const java = renderInterface(
      interfaceClass([
        { name: 'enviar', returnType: 'void', visibility: 'public', parameters: 'mensaje: String' },
        { name: 'estaActivo', returnType: 'boolean', visibility: 'public' },
      ]),
      'com.example.demo',
    );

    expect(java).toContain('package com.example.demo.model;');
    expect(java).toContain('public interface Notificador {');
    expect(java).toContain('void enviar(String mensaje);');
    expect(java).toContain('Boolean estaActivo();');
  });

  it('translates multiple free-text parameters into typed Java arguments', () => {
    const java = renderInterface(
      interfaceClass([
        { name: 'crear', returnType: 'Long', visibility: 'public', parameters: 'nombre: String, edad: int' },
      ]),
      'com.example.demo',
    );

    expect(java).toContain('Long crear(String nombre, Integer edad);');
  });

  it('renders an empty interface body when there are no operations', () => {
    const java = renderInterface(interfaceClass(undefined), 'com.example.demo');
    expect(java).toContain('public interface Notificador {\n\n}');
  });

  it('does not emit any JPA/entity boilerplate', () => {
    const java = renderInterface(interfaceClass([{ name: 'x', returnType: 'void', visibility: 'public' }]), 'com.example.demo');
    expect(java).not.toContain('@Entity');
    expect(java).not.toContain('@Id');
    expect(java).not.toContain('private');
  });
});
