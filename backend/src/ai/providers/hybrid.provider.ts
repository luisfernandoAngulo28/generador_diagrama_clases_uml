import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import type { AiCallOptions, AiProvider, AiProviderId } from './ai-provider.interface.js';

export type HybridMode = 'hybrid' | 'gemini' | 'ollama';

export interface HybridOptions {
  mode: HybridMode;
  /** How long the local model gets before we fall back to the cloud. */
  localTimeoutMs: number;
  /** After the local engine is found down (not just slow), skip it for this long. */
  localRetryAfterMs: number;
}

/** A provider plus whether it can be used at all (e.g. Gemini without API key). */
export interface HybridMember {
  provider: AiProvider;
  isAvailable?: () => boolean;
}

/** Thrown internally when the local model didn't answer within the timeout. */
class LocalTimeoutError extends Error {}

/**
 * Hybrid AI engine (2do Parcial): local first, cloud as an invisible safety net.
 *
 *   question → Ollama (qwen2.5, local) answers within `localTimeoutMs`?
 *                ├─ yes → use it              → providerUsed = OLLAMA_LOCAL
 *                └─ no (timeout/offline/error) → Gemini (Google AI Studio)
 *                                              → providerUsed = GEMINI_CLOUD
 *
 * Circuit breaker: when Ollama is *down* (connection refused, model not
 * pulled) it is skipped for `localRetryAfterMs`, so users don't pay the
 * failed attempt on every message. A plain timeout doesn't open the breaker:
 * the model may just have been loading into RAM.
 *
 * Photo interpretation goes cloud-first instead: the local vision model
 * (moondream) is far weaker at reading handwriting, so Ollama is only the
 * offline fallback there.
 */
export class HybridAiProvider {
  private readonly logger = new Logger(HybridAiProvider.name);
  private localDownUntil = 0;

  constructor(
    private readonly local: HybridMember,
    private readonly cloud: HybridMember,
    private readonly options: HybridOptions,
    private readonly now: () => number = Date.now,
  ) {}

  async editDiagram(
    message: string,
    model: UmlModel,
    options: Omit<AiCallOptions, 'signal'> = {},
  ): Promise<EditDiagramResult & { providerUsed: AiProviderId }> {
    const chain = this.textChain();
    let lastError: unknown;

    for (const member of chain) {
      const isLocal = member === this.local;
      try {
        const result = isLocal && this.options.mode === 'hybrid'
          ? await this.withTimeout((signal) =>
              member.provider.editDiagram(message, model, { ...options, signal }),
            )
          : await member.provider.editDiagram(message, model, options);
        return { ...result, providerUsed: member.provider.id };
      } catch (err) {
        lastError = err;
        if (isLocal) this.onLocalFailure(err);
        else this.logger.warn(`Gemini falló: ${describe(err)}`);
      }
    }

    throw this.noProviderError(lastError);
  }

  async interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel & { providerUsed: AiProviderId }> {
    const chain = this.visionChain();
    let lastError: unknown;

    for (const member of chain) {
      try {
        const result = await member.provider.interpretDiagramPhoto(imageBase64, mediaType);
        return { ...result, providerUsed: member.provider.id };
      } catch (err) {
        lastError = err;
        this.logger.warn(`${member.provider.id} no pudo interpretar la foto: ${describe(err)}`);
      }
    }

    throw this.noProviderError(lastError);
  }

  /** Text: local → cloud (hybrid), or a single engine when forced by AI_PROVIDER. */
  private textChain(): HybridMember[] {
    if (this.options.mode === 'gemini') return [this.cloud];
    if (this.options.mode === 'ollama') return [this.local];
    const chain: HybridMember[] = [];
    if (this.now() >= this.localDownUntil) chain.push(this.local);
    if (this.cloud.isAvailable?.() ?? true) chain.push(this.cloud);
    // Breaker open and no cloud configured: try local anyway rather than fail outright.
    return chain.length ? chain : [this.local];
  }

  /** Vision: cloud → local (see class doc). */
  private visionChain(): HybridMember[] {
    if (this.options.mode === 'gemini') return [this.cloud];
    if (this.options.mode === 'ollama') return [this.local];
    const chain: HybridMember[] = [];
    if (this.cloud.isAvailable?.() ?? true) chain.push(this.cloud);
    chain.push(this.local);
    return chain;
  }

  private async withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new LocalTimeoutError(`sin respuesta en ${this.options.localTimeoutMs} ms`));
      }, this.options.localTimeoutMs);
    });
    try {
      return await Promise.race([run(controller.signal), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private onLocalFailure(err: unknown) {
    if (err instanceof LocalTimeoutError) {
      this.logger.warn(`Ollama ${err.message} → fallback a Gemini`);
      return;
    }
    this.localDownUntil = this.now() + this.options.localRetryAfterMs;
    this.logger.warn(
      `Ollama no disponible (${describe(err)}) → fallback a Gemini; se reintentará en ${Math.round(this.options.localRetryAfterMs / 1000)} s`,
    );
  }

  private noProviderError(lastError: unknown): Error {
    if (this.options.mode !== 'hybrid' && lastError instanceof Error) return lastError;
    return new ServiceUnavailableException(
      `Ningún proveedor de IA respondió (Ollama local ni Gemini). Último error: ${describe(lastError)}`,
    );
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
