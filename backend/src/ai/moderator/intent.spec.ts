import { describe, expect, it } from 'vitest';
import { isExplicitChangeRequest } from './intent.js';

describe('isExplicitChangeRequest', () => {
  it.each([
    'Agrega una clase Producto con nombre y precio',
    'Crea la clase Factura',
    'relaciónala muchos a muchos con Pedido',
    '¿Puedes eliminar la clase Cliente?',
    'Quiero que renombres... no, renombra Pedido a Orden',
    'Ordena el diagrama por favor',
    'Añade el atributo total a Pedido',
  ])('detects a change request: %s', (msg) => {
    expect(isExplicitChangeRequest(msg)).toBe(true);
  });

  it.each([
    '¿Qué es un atributo derivado?',
    '¿Quién creó la clase Pedido y qué le agregó después?',
    '¿Y cómo se representaría eso que me explicaste antes en nuestro diagrama?',
    '¿Es correcta la relación entre Cliente y Pedido?',
    'Explícame la diferencia entre agregación y composición',
  ])('treats as a question: %s', (msg) => {
    expect(isExplicitChangeRequest(msg)).toBe(false);
  });
});
