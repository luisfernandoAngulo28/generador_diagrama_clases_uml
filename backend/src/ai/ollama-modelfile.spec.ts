import { describe, expect, it } from 'vitest';
import { BASE_MODEL, buildModelfile } from './ollama-modelfile.js';
import { LITE_STATIC } from './moderator/moderator-prompt.js';

describe('buildModelfile', () => {
  const modelfile = buildModelfile();

  it('builds on the open-source base model with deterministic sampling', () => {
    expect(modelfile).toContain(`FROM ${BASE_MODEL}`);
    expect(modelfile).toContain('PARAMETER temperature 0');
    expect(modelfile).toContain('PARAMETER num_ctx 4096');
  });

  it('bakes in the same fixed moderator rules the backend sends', () => {
    expect(modelfile).toContain(`SYSTEM """${LITE_STATIC}"""`);
  });
});
