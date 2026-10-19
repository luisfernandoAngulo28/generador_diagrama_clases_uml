/**
 * Crea (o actualiza) el modelo propio del equipo en el Ollama local:
 *   npm run ollama:modelo
 * Escribe backend/ollama/Modelfile y ejecuta `ollama create moderador-uml`.
 * Después, el backend lo usa con OLLAMA_TEXT_MODEL=moderador-uml.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CUSTOM_MODEL_NAME, buildModelfile } from '../ai/ollama-modelfile.js';

const dir = join(process.cwd(), 'ollama');
const file = join(dir, 'Modelfile');
mkdirSync(dir, { recursive: true });
writeFileSync(file, buildModelfile(), 'utf8');
console.log(`Modelfile escrito en ${file}`);

execFileSync('ollama', ['create', CUSTOM_MODEL_NAME, '-f', file], { stdio: 'inherit' });
console.log(`Listo: el modelo "${CUSTOM_MODEL_NAME}" está disponible en Ollama.`);
