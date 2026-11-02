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
  'diseña', 'diseñar', 'dibuja', 'dibujar', 'procede', 'proceder', 'hazme', 'corrige', 'corrígelo', 'corrígela', 'arregla', 'arréglalo', 'mejora', 'mejóralo',
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

export type RequestKind = 'QUESTION' | 'CHANGE' | 'REVIEW' | 'PROJECT';

/** "crea un diagrama…", "hazme el proyecto…", "modela un sistema…" — not "crea la clase Sistema". */
const PROJECT_PATTERN =
  /(^|[^\p{L}])(crea|crear|créame|genera|generar|genérame|arma|armar|ármame|diseña|diseñar|diséñame|modela|modelar|haz|hacer|hazme|construye|construir)\s+(un|una|el|la|mi|nuestro|nuestra)?\s*(nuevo\s+)?(diagrama|proyecto|sistema|modelo)([^\p{L}]|$)/iu;

const REVIEW_PATTERN =
  /(^|[^\p{L}])(revisa|revisar|revísalo|revises|revisión|evalúa|evaluar|analiza|analizar|audita|auditar|qué problemas|qué errores|está bien)([^\p{L}]|$)/iu;

/** What the person wants from the moderator; decides the extra context and limits of the call. */
export function classifyRequest(message: string): RequestKind {
  const text = message.normalize('NFC').trim();
  if (PROJECT_PATTERN.test(text)) return 'PROJECT';
  if (REVIEW_PATTERN.test(text)) return 'REVIEW';
  return isExplicitChangeRequest(text) ? 'CHANGE' : 'QUESTION';
}
