import { describe, expect, it } from 'vitest';
import { providerReason } from './moderator.service.js';

describe('providerReason (por qué respondió Gemini, para la etiqueta del chat)', () => {
  it('no da motivo cuando respondió la IA local', () => {
    expect(providerReason('OLLAMA_LOCAL', false, true)).toBeUndefined();
    expect(providerReason('OLLAMA_LOCAL', true, true)).toBeUndefined();
  });

  it('un proyecto completo va a Gemini aunque la IA local vaya primero', () => {
    expect(providerReason('GEMINI_CLOUD', true, true)).toBe('PROJECT');
  });

  it('con la IA local primero, Gemini en un pedido normal es el respaldo', () => {
    expect(providerReason('GEMINI_CLOUD', false, true)).toBe('FALLBACK');
  });

  it('en el servidor (Gemini primero) lo dice así, no como respaldo', () => {
    expect(providerReason('GEMINI_CLOUD', false, false)).toBe('CLOUD_PRIMARY');
  });
});
