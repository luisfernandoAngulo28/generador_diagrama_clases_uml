import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './ollama.provider.js';

function provider(textModel?: string) {
  const config = { get: (key: string) => (key === 'OLLAMA_TEXT_MODEL' ? textModel : undefined) };
  return new OllamaProvider(config as unknown as ConfigService);
}

const ok = (body: object) => new Response(JSON.stringify(body), { status: 200 });

describe('OllamaProvider — modelo propio del equipo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses moderador-uml by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ response: '{"reply":"Ana, hola","operations":[]}' }));
    vi.stubGlobal('fetch', fetchMock);
    await provider().editDiagram('hola', { classes: [], relations: [] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('moderador-uml');
  });

  it('falls back to the base model when moderador-uml was not created yet', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('model "moderador-uml" not found', { status: 404 }))
      .mockResolvedValueOnce(ok({ response: '{"reply":"Ana, hola","operations":[]}' }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await provider().editDiagram('hola', { classes: [], relations: [] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('qwen2.5:1.5b-instruct');
    expect(result.reply).toBe('Ana, hola');
  });
});
