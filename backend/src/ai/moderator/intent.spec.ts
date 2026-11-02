import { describe, expect, it } from 'vitest';
import { classifyRequest, isExplicitChangeRequest } from './intent.js';

describe('isExplicitChangeRequest', () => {
  it.each([
    'Agrega una clase Producto con nombre y precio',
    'Crea la clase Factura',
    'relaciónala muchos a muchos con Pedido',
    '¿Puedes eliminar la clase Cliente?',
    'Quiero que renombres... no, renombra Pedido a Orden',
    'Ordena el diagrama por favor',
    'Añade el atributo total a Pedido',
    'Avancemos con el modelo de la cafetería',
    'Transforma NuevaClase en Cliente',
    'Sí, hazlo',
    'si porfavor',
    'si, adelante',
    'dale',
    'Ok, perfecto',
  ])('detects a change request: %s', (msg) => {
    expect(isExplicitChangeRequest(msg)).toBe(true);
  });

  it.each([
    '¿Qué es un atributo derivado?',
    '¿Quién creó la clase Pedido y qué le agregó después?',
    '¿Y cómo se representaría eso que me explicaste antes en nuestro diagrama?',
    '¿Es correcta la relación entre Cliente y Pedido?',
    'Explícame la diferencia entre agregación y composición',
    'si quito la clase Pago, ¿qué relaciones se pierden?',
    'Sigo sin entender la herencia',
  ])('treats as a question: %s', (msg) => {
    expect(isExplicitChangeRequest(msg)).toBe(false);
  });
});

describe('classifyRequest', () => {
  it.each([
    'hola crea un diagrama de clases para una cafeteria',
    'Crea el diagrama de clases completo para un sistema de biblioteca',
    'hazme un proyecto de ventas',
    'Modela un sistema de hospital',
  ])('whole project: %s', (msg) => {
    expect(classifyRequest(msg)).toBe('PROJECT');
  });

  it.each(['Revisa nuestro diagrama: dime qué problemas de modelado ves', '¿Qué errores tiene el diagrama?', 'analiza el modelo'])(
    'review: %s',
    (msg) => {
      expect(classifyRequest(msg)).toBe('REVIEW');
    },
  );

  it.each(['Crea la clase Sistema', 'Agrega la clase Factura al diagrama', 'Ordena el diagrama', 'corrige el nombre de Pedido'])(
    'single change, not a project: %s',
    (msg) => {
      expect(classifyRequest(msg)).toBe('CHANGE');
    },
  );

  it('a plain question stays a question', () => {
    expect(classifyRequest('¿Qué es un atributo derivado?')).toBe('QUESTION');
    expect(classifyRequest('¿Qué hizo cada integrante del equipo en este diagrama últimamente?')).toBe('QUESTION');
  });
});
