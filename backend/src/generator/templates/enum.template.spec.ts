import { describe, expect, it } from 'vitest';
import { renderEnum } from './enum.template.js';
import type { UmlClass } from '../../diagrams/uml.types.js';

function enumClass(names: string[]): UmlClass {
  return {
    id: 'c1',
    name: 'EstadoTramite',
    stereotype: 'enum',
    attributes: names.map((name) => ({
      name,
      type: 'String',
      visibility: 'public' as const,
    })),
  };
}

describe('renderEnum', () => {
  it('renders a valid Java enum with one literal per attribute', () => {
    const java = renderEnum(enumClass(['pendiente', 'aprobado', 'rechazado']), 'com.example.demo');

    expect(java).toContain('package com.example.demo.model;');
    expect(java).toContain('public enum EstadoTramite {');
    expect(java).toContain('    PENDIENTE,');
    expect(java).toContain('    APROBADO,');
    expect(java).toContain('    RECHAZADO');
    expect(java).not.toContain('RECHAZADO,');
  });

  it('converts camelCase attribute names to UPPER_SNAKE_CASE literals', () => {
    const java = renderEnum(enumClass(['enEspera', 'enProceso']), 'com.example.demo');
    expect(java).toContain('EN_ESPERA');
    expect(java).toContain('EN_PROCESO');
  });

  it('sanitizes characters that are invalid in a Java identifier', () => {
    const java = renderEnum(enumClass(['rechazado avión']), 'com.example.demo');
    expect(java).toMatch(/RECHAZADO_AVI_N/);
    expect(java).not.toMatch(/[^\x00-\x7F]/); // no non-ASCII survives into the identifier
  });

  it('renders an empty enum body for a class with no literals', () => {
    const java = renderEnum(enumClass([]), 'com.example.demo');
    expect(java).toContain('public enum EstadoTramite {\n\n}');
  });
});
