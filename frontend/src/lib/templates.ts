import type { RelationType, UmlAttribute, Visibility } from '../types/uml';

const priv = (name: string, type: string, isPrimaryKey?: boolean): UmlAttribute => ({
  name,
  type,
  visibility: 'private' as Visibility,
  isPrimaryKey,
});

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  classes: { name: string; attributes: UmlAttribute[] }[];
  relations: { source: number; target: number; type: RelationType }[];
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'herencia',
    name: 'Herencia básica',
    description: 'Una clase base y dos subclases que heredan de ella (Empleado → Gerente, Vendedor).',
    classes: [
      { name: 'Empleado', attributes: [priv('id', 'Long', true), priv('nombre', 'String')] },
      { name: 'Gerente', attributes: [priv('id', 'Long', true), priv('departamento', 'String')] },
      { name: 'Vendedor', attributes: [priv('id', 'Long', true), priv('comision', 'BigDecimal')] },
    ],
    relations: [
      { source: 1, target: 0, type: 'INHERITANCE' },
      { source: 2, target: 0, type: 'INHERITANCE' },
    ],
  },
  {
    id: 'composicion',
    name: 'Composición (todo-parte)',
    description: 'Una clase "todo" formada por partes que no existen sin ella (Pedido → LineaPedido).',
    classes: [
      { name: 'Pedido', attributes: [priv('id', 'Long', true), priv('fecha', 'LocalDate')] },
      {
        name: 'LineaPedido',
        attributes: [priv('id', 'Long', true), priv('cantidad', 'Integer'), priv('precioUnitario', 'BigDecimal')],
      },
    ],
    relations: [{ source: 0, target: 1, type: 'COMPOSITION' }],
  },
  {
    id: 'muchos-a-muchos',
    name: 'Muchos a muchos',
    description: 'Dos clases relacionadas N:M, con tabla intermedia generada automáticamente (Estudiante ↔ Curso).',
    classes: [
      { name: 'Estudiante', attributes: [priv('id', 'Long', true), priv('nombre', 'String')] },
      { name: 'Curso', attributes: [priv('id', 'Long', true), priv('nombre', 'String')] },
    ],
    relations: [{ source: 0, target: 1, type: 'MANY_TO_MANY' }],
  },
  {
    id: 'asociacion-simple',
    name: 'Asociación 1:N',
    description: 'Patrón clásico "cabecera-detalle": una clase padre con muchos hijos (Cliente → Pedido).',
    classes: [
      { name: 'Cliente', attributes: [priv('id', 'Long', true), priv('nombre', 'String'), priv('email', 'String')] },
      { name: 'Pedido', attributes: [priv('id', 'Long', true), priv('fecha', 'LocalDate'), priv('total', 'BigDecimal')] },
    ],
    relations: [{ source: 0, target: 1, type: 'ONE_TO_MANY' }],
  },
];
