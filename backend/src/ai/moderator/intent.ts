/**
 * Deterministic guard for the moderator's rule "solo modifica el lienzo si
 * te lo piden explícitamente". The prompt asks for it, but a model doesn't
 * always obey — so canvas operations are only kept when the message:
 *   - contains an explicit change verb ("agrega", "renombra", "avancemos"…), or
 *   - starts by confirming a change the moderator just proposed
 *     ("sí, hazlo", "dale", "ok, adelante").
 * Questions like "¿quién creó Pedido?" or "¿qué es una composición?" never
 * touch the shared diagram, whatever the model answers.
 */
const CHANGE_VERBS = [
  'crea', 'crear', 'creá', 'créala', 'créalo', 'créalas', 'créalos',
  'agrega', 'agregar', 'agregá', 'agrégale', 'agrégala', 'agrégalo', 'añade', 'añadir', 'añádele', 'anade', 'anadir',
  'elimina', 'eliminar', 'elimínala', 'elimínalo', 'borra', 'borrar', 'quita', 'quitar', 'remueve', 'remover', 'saca', 'sacar',
  'renombra', 'renombrar', 'renómbrala', 'renómbralo', 'cambia', 'cambiar', 'cámbiale', 'modifica', 'modificar',
  'transforma', 'transformar', 'transfórmala', 'convierte', 'convertir', 'conviértela',
  'relaciona', 'relacionar', 'relaciónala', 'relaciónalo', 'relaciónalas', 'relaciónalos',
  'conecta', 'conectar', 'une', 'unir', 'asocia', 'asociar', 'vincula', 'vincular',
  'ordena', 'ordenar', 'organiza', 'organizar', 'reorganiza', 'reorganizar', 'acomoda', 'acomodar',
  'genera', 'generar', 'pon', 'poner', 'ponle', 'hereda', 'heredar', 'aplica', 'aplicar', 'aplícalo', 'aplícalos',
  'haz', 'hacer', 'hazlo', 'hazla', 'implementa', 'implementar', 'impleméntalo', 'impleméntala',
  'completa', 'completar', 'complétalo', 'construye', 'construir', 'arma', 'armar', 'modela', 'modelar',
  'diseña', 'diseñar', 'dibuja', 'dibujar', 'procede', 'proceder',
  'avanza', 'avanzar', 'avancemos', 'empieza', 'empecemos', 'comienza', 'comencemos',
];

const VERB_PATTERN = new RegExp(`(^|[^\\p{L}])(${CHANGE_VERBS.join('|')})([^\\p{L}]|$)`, 'iu');

/**
 * "sí, hazlo" / "dale" / "ok, adelante" — answering a change the moderator proposed.
 * A bare "si …" without accent usually opens a conditional ("si agrego X, ¿qué
 * pasa?"), so it only counts as a confirmation when followed by punctuation,
 * "por favor"/"porfavor" or the end of the message.
 */
const CONFIRMATION_PATTERN =
  /^[\s¡!]*(sí|si(?=\s*([,.!]|por\s*favor|$))|ok(ay)?|dale|claro|de acuerdo|perfecto|confirmo|adelante|listo)(?=[\s,.!¡]|$)/iu;

export function isExplicitChangeRequest(message: string): boolean {
  const text = message.normalize('NFC').trim();
  return VERB_PATTERN.test(text) || CONFIRMATION_PATTERN.test(text);
}
