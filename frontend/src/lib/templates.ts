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
  /** Para qué sirve el patrón y cuándo conviene usarlo. */
  purpose: string;
  /** Próximos pasos sugeridos, apuntando a funciones reales de esta herramienta. */
  nextSteps: string[];
  classes: { name: string; attributes: UmlAttribute[] }[];
  relations: { source: number; target: number; type: RelationType }[];
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'herencia',
    name: 'Herencia básica',
    description: 'Una clase base y dos subclases que heredan de ella (Empleado → Gerente, Vendedor).',
    purpose:
      'Úsalo cuando varias clases comparten atributos y comportamiento comunes, pero cada una agrega algo propio. ' +
      'La clase base concentra lo compartido (id, nombre) y cada subclase solo declara lo que la distingue. Es el ' +
      'patrón típico para modelar "tipos" de una misma entidad (empleados con distintos roles, usuarios con distintos ' +
      'permisos, productos con distintas categorías, etc.).',
    nextSteps: [
      'Cambia los nombres de las clases y atributos para que reflejen tu dominio real.',
      'Agrega más subclases si tu dominio tiene más de dos variantes de la clase base.',
      'Usa "Validar diagrama" para confirmar que no quedó ninguna clase sin clave primaria tras los cambios.',
      'Cuando esté listo, usa "Generar backend Spring Boot" — el generador crea automáticamente la jerarquía de herencia con JPA (@Inheritance).',
    ],
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
    purpose:
      'Úsalo cuando una clase "parte" no tiene sentido por sí sola fuera de su "todo": si se elimina el todo, las ' +
      'partes también deben eliminarse (a diferencia de una simple asociación, donde ambas clases pueden existir de ' +
      'forma independiente). Ejemplos típicos: un pedido y sus líneas, una factura y sus detalles, un formulario y ' +
      'sus campos.',
    nextSteps: [
      'Renombra las clases según tu dominio, manteniendo la relación de composición entre ellas.',
      'Agrega los atributos propios de cada línea/detalle en la clase "parte".',
      'El generador aplica cascade = ALL y orphanRemoval = true automáticamente en esta relación — revisa el código generado para entender esa garantía.',
      'Usa "Documentación" para generar un resumen del modelo y confirmar que la relación se interpretó como esperabas.',
    ],
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
    purpose:
      'Úsalo cuando cada instancia de una clase puede relacionarse con varias instancias de la otra, y viceversa: un ' +
      'estudiante toma varios cursos y cada curso tiene varios estudiantes, un producto aparece en varios pedidos y ' +
      'cada pedido tiene varios productos, etc.',
    nextSteps: [
      'Ajusta los nombres de clase a tu dominio; la relación N:M se conserva.',
      'Si necesitas guardar datos propios de la relación (ej. la nota de un estudiante en un curso), considera convertirla en una clase intermedia explícita en vez de dejarla como N:M pura.',
      'El generador crea la tabla intermedia (@JoinTable) automáticamente — no necesitas modelarla como una clase aparte.',
      'Prueba pedirle al asistente de IA "agrega otra clase relacionada a Curso" para extender el modelo sin dibujar a mano.',
    ],
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
    purpose:
      'Es el patrón más común de todos: una entidad "padre" que agrupa varias entidades "hijo" (un cliente con sus ' +
      'pedidos, un autor con sus libros, un departamento con sus empleados). A diferencia de la composición, aquí el ' +
      'hijo puede seguir existiendo sin el padre si así lo decides.',
    nextSteps: [
      'Cambia los nombres y atributos de ambas clases según tu dominio real.',
      'Agrega más clases "hijo" repitiendo este mismo patrón si el padre necesita varias relaciones 1:N distintas.',
      'Usa "Auto-organizar" si el diagrama crece y las clases empiezan a superponerse.',
      'Genera el backend y pruébalo en vivo conectando la plantilla Flutter antes del día de la defensa.',
    ],
    classes: [
      { name: 'Cliente', attributes: [priv('id', 'Long', true), priv('nombre', 'String'), priv('email', 'String')] },
      { name: 'Pedido', attributes: [priv('id', 'Long', true), priv('fecha', 'LocalDate'), priv('total', 'BigDecimal')] },
    ],
    relations: [{ source: 0, target: 1, type: 'ONE_TO_MANY' }],
  },
];
