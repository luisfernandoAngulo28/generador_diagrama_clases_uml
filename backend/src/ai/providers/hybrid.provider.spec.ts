import { describe, expect, it, vi } from 'vitest';
import { HybridAiProvider, type HybridOptions } from './hybrid.provider.js';
import type { AiCallOptions, AiProvider, AiProviderId } from './ai-provider.interface.js';
import type { UmlModel } from '../../diagrams/uml.types.js';

const MODEL: UmlModel = { classes: [], relations: [] };
const OPTS: HybridOptions = { mode: 'hybrid', localTimeoutMs: 50, localRetryAfterMs: 30_000 };

function fakeProvider(
  id: AiProviderId,
  behavior: (options?: AiCallOptions) => Promise<string>,
): AiProvider & { calls: number } {
  const p = {
    id,
    calls: 0,
    async editDiagram(_m: string, _model: UmlModel, options?: AiCallOptions) {
      p.calls++;
      return { reply: await behavior(options), operations: [] };
    },
    async interpretDiagramPhoto() {
      p.calls++;
      await behavior();
      return MODEL;
    },
  };
  return p;
}

const ok = (text: string) => () => Promise.resolve(text);
const fail = (msg: string) => () => Promise.reject(new Error(msg));
/** Never resolves until aborted, like a model that is still thinking. */
const hang = (options?: AiCallOptions) =>
  new Promise<string>((_, reject) =>
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
  );

describe('HybridAiProvider', () => {
  it('answers with the local model when it responds in time', async () => {
    const local = fakeProvider('OLLAMA_LOCAL', ok('local'));
    const cloud = fakeProvider('GEMINI_CLOUD', ok('cloud'));
    const engine = new HybridAiProvider({ provider: local }, { provider: cloud }, OPTS);

    const result = await engine.editDiagram('hola', MODEL);
    expect(result).toMatchObject({ reply: 'local', providerUsed: 'OLLAMA_LOCAL' });
    expect(cloud.calls).toBe(0);
  });

  it('falls back to the cloud when the local model times out, and aborts it', async () => {
    let aborted = false;
    const local = fakeProvider('OLLAMA_LOCAL', (o) => {
      o?.signal?.addEventListener('abort', () => (aborted = true));
      return hang(o);
    });
    const cloud = fakeProvider('GEMINI_CLOUD', ok('cloud'));
    const engine = new HybridAiProvider({ provider: local }, { provider: cloud }, OPTS);

    const result = await engine.editDiagram('hola', MODEL);
    expect(result).toMatchObject({ reply: 'cloud', providerUsed: 'GEMINI_CLOUD' });
    expect(aborted).toBe(true);

    // A timeout does not open the breaker: the next question tries local again.
    await engine.editDiagram('otra', MODEL);
    expect(local.calls).toBe(2);
  });

  it('skips a local engine that is down until the retry window passes', async () => {
    let now = 1_000;
    const local = fakeProvider('OLLAMA_LOCAL', fail('ECONNREFUSED'));
    const cloud = fakeProvider('GEMINI_CLOUD', ok('cloud'));
    const engine = new HybridAiProvider({ provider: local }, { provider: cloud }, OPTS, () => now);

    await engine.editDiagram('1', MODEL);
    await engine.editDiagram('2', MODEL);
    expect(local.calls).toBe(1);
    expect(cloud.calls).toBe(2);

    now += 30_001;
    await engine.editDiagram('3', MODEL);
    expect(local.calls).toBe(2);
  });

  it('does not try the cloud when it is not configured', async () => {
    const local = fakeProvider('OLLAMA_LOCAL', fail('model not found'));
    const cloud = fakeProvider('GEMINI_CLOUD', ok('cloud'));
    const engine = new HybridAiProvider(
      { provider: local },
      { provider: cloud, isAvailable: () => false },
      OPTS,
    );

    await expect(engine.editDiagram('hola', MODEL)).rejects.toThrow(/Ningún proveedor/);
    expect(cloud.calls).toBe(0);
  });

  it('respects a forced single provider and gives it no timeout', async () => {
    vi.useFakeTimers();
    try {
      const local = fakeProvider(
        'OLLAMA_LOCAL',
        () => new Promise((resolve) => setTimeout(() => resolve('lento'), 10_000)),
      );
      const cloud = fakeProvider('GEMINI_CLOUD', ok('cloud'));
      const engine = new HybridAiProvider(
        { provider: local },
        { provider: cloud },
        { ...OPTS, mode: 'ollama' },
      );

      const pending = engine.editDiagram('hola', MODEL);
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toMatchObject({ reply: 'lento', providerUsed: 'OLLAMA_LOCAL' });
      expect(cloud.calls).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads photos cloud-first and falls back to local', async () => {
    const local = fakeProvider('OLLAMA_LOCAL', ok('local'));
    const cloud = fakeProvider('GEMINI_CLOUD', fail('503'));
    const engine = new HybridAiProvider({ provider: local }, { provider: cloud }, OPTS);

    const result = await engine.interpretDiagramPhoto('b64', 'image/png');
    expect(result.providerUsed).toBe('OLLAMA_LOCAL');
    expect(cloud.calls).toBe(1);
  });
});
