import { LITE_STATIC } from './moderator/moderator-prompt.js';

/** Name of the team's own Ollama model (2do Parcial: "modelo personalizado por el equipo"). */
export const CUSTOM_MODEL_NAME = 'moderador-uml';
export const BASE_MODEL = 'qwen2.5:1.5b-instruct';

/**
 * Modelfile of `moderador-uml`: qwen2.5 configured by the team.
 * - SYSTEM: the moderator's fixed rules and glossary (LITE_STATIC, the same
 *   text the backend sends), so `ollama run moderador-uml` already behaves as
 *   the moderator in the defense. Generated from the code so both never drift.
 * - PARAMETER: deterministic sampling (small models invent classes at the
 *   default temperature 0.8) and a context window that fits the full prompt.
 * The backend still sends its per-question system prompt (diagram, bitácora,
 * hilo), which takes precedence over this SYSTEM on each call.
 */
export function buildModelfile(base = BASE_MODEL, system = LITE_STATIC): string {
  return [
    '# Generado por: npm run ollama:modelo (no editar a mano)',
    `FROM ${base}`,
    '',
    'PARAMETER temperature 0',
    'PARAMETER top_p 0.1',
    'PARAMETER num_ctx 4096',
    'PARAMETER num_predict 256',
    'PARAMETER repeat_penalty 1.1',
    '',
    `SYSTEM """${system}"""`,
    '',
  ].join('\n');
}
