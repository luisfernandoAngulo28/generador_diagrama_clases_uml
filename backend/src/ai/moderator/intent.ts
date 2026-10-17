/**
 * Deterministic guard for the moderator's rule "solo modifica el lienzo si
 * te lo piden explícitamente". The prompt asks for it, but a small local
 * model doesn't always obey — so canvas operations are only kept when the
 * message contains an explicit change verb (imperative or "quiero/puedes ...").
 * Questions like "¿quién creó Pedido?" or "¿qué es una composición?" never
 * touch the shared diagram, whatever the model answers.
 */
const CHANGE_VERBS = [
  'crea', 'crear', 'creá', 'agrega', 'agregar', 'agregá', 'añade', 'añadir', 'anade', 'anadir',
  'elimina', 'eliminar', 'borra', 'borrar', 'quita', 'quitar', 'remueve', 'remover', 'saca', 'sacar',
  'renombra', 'renombrar', 'cambia', 'cambiar', 'modifica', 'modificar',
  'relaciona', 'relacionar', 'relaciónala', 'relaciónalo', 'relaciónalas', 'relaciónalos',
  'conecta', 'conectar', 'une', 'unir', 'asocia', 'asociar', 'vincula', 'vincular',
  'ordena', 'ordenar', 'organiza', 'organizar', 'reorganiza', 'reorganizar', 'acomoda', 'acomodar',
  'genera', 'generar', 'pon', 'poner', 'ponle', 'hereda', 'heredar', 'aplica', 'aplicar', 'haz', 'hacer',
];

const VERB_PATTERN = new RegExp(`(^|[^\\p{L}])(${CHANGE_VERBS.join('|')})([^\\p{L}]|$)`, 'iu');

export function isExplicitChangeRequest(message: string): boolean {
  return VERB_PATTERN.test(message.normalize('NFC'));
}
