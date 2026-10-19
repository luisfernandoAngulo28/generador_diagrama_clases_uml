import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import type { AiCallOptions, AiProvider, AiProviderId } from './ai-provider.interface.js';

export type HybridMode = 'hybrid' | 'gemini' | 'ollama';

/** Which engine answers first in hybrid mode (AI_HYBRID_ORDER). */
export type HybridOrder = 'cloud-first' | 'local-first';

export interface HybridOptions {
  mode: HybridMode;
  order: HybridOrder;
  /** local-first: how long Ollama gets before falling back to the cloud. */
  localTimeoutMs: number;
  /**
   * cloud-first: how long Ollama gets when it is the fallback (no internet).
   * Generous on purpose — a slow local answer beats no answer — but bounded
   * so a hung model can't block the room forever.
   */
  localFallbackTimeoutMs: number;
  /** After an engine is found down (not just slow), skip it for this long. */
  retryAfterMs: number;
}

/** A provider plus whether it can be used at all (e.g. Gemini without API key). */
export interface HybridMember {
  provider: AiProvider;
  isAvailable?: () => boolean;
}

/** Thrown internally when an engine didn't answer within its timeout. */
class EngineTimeoutError extends Error {}

const LABEL: Record<AiProviderId, string> = { OLLAMA_LOCAL: 'Ollama', GEMINI_CLOUD: 'Gemini' };

/**
 * Hybrid AI engine (2do Parcial). Two engines behind one contract, with
 * automatic, invisible fallback. The order is configurable:
 *
 *   cloud-first (default):  Gemini ──(sin internet / error)──▶ Ollama local
 *   local-first (demo):     Ollama ──(timeout / caído)──────▶ Gemini
 *
 * cloud-first is the default because, measured on the team's laptop (CPU),
 * qwen2.5:1.5b answers the moderator in 8–13 s with weaker theory, while
 * Gemini answers in 3–10 s; Ollama still guarantees an answer offline.
 * local-first exists to showcase the local model in the defense.
 *
 * Circuit breaker: an engine that is *down* (connection refused, model not
 * pulled, no network) is skipped for `retryAfterMs`, so users don't pay the
 * failed attempt on every message. A plain timeout doesn't open the breaker:
 * the model may just have been loading into RAM.
 *
 * Photo interpretation is always cloud-first: the local vision model
 * (moondream) is far weaker at reading handwriting.
 */
export class HybridAiProvider {
  private readonly logger = new Logger(HybridAiProvider.name);
  private readonly downUntil = new Map<AiProviderId, number>();

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

    for (const [index, member] of chain.entries()) {
      const timeoutMs = this.timeoutFor(member, index);
      try {
        const result = timeoutMs
          ? await this.withTimeout(timeoutMs, (signal) =>
              member.provider.editDiagram(message, model, { ...options, signal }),
            )
          : await member.provider.editDiagram(message, model, options);
        return { ...result, providerUsed: member.provider.id };
      } catch (err) {
        lastError = err;
        this.onFailure(member, err, chain[index + 1]);
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

    for (const [index, member] of chain.entries()) {
      try {
        const result = await member.provider.interpretDiagramPhoto(imageBase64, mediaType);
        return { ...result, providerUsed: member.provider.id };
      } catch (err) {
        lastError = err;
        this.onFailure(member, err, chain[index + 1]);
      }
    }

    throw this.noProviderError(lastError);
  }

  private textChain(): HybridMember[] {
    if (this.options.mode === 'gemini') return [this.cloud];
    if (this.options.mode === 'ollama') return [this.local];
    const ordered =
      this.options.order === 'local-first' ? [this.local, this.cloud] : [this.cloud, this.local];
    return this.usable(ordered);
  }

  private visionChain(): HybridMember[] {
    if (this.options.mode === 'gemini') return [this.cloud];
    if (this.options.mode === 'ollama') return [this.local];
    return this.usable([this.cloud, this.local]);
  }

  /** Drops unconfigured engines and those with an open breaker (unless that leaves none). */
  private usable(ordered: HybridMember[]): HybridMember[] {
    const configured = ordered.filter((m) => m.isAvailable?.() ?? true);
    const healthy = configured.filter(
      (m) => this.now() >= (this.downUntil.get(m.provider.id) ?? 0),
    );
    if (healthy.length) return healthy;
    // Every engine looks down: try them anyway rather than fail without trying.
    return configured.length ? configured : [this.local];
  }

  /** Only the local engine gets a timeout; it depends on whether it leads or backs up. */
  private timeoutFor(member: HybridMember, index: number): number | undefined {
    if (this.options.mode !== 'hybrid' || member !== this.local) return undefined;
    return index === 0 ? this.options.localTimeoutMs : this.options.localFallbackTimeoutMs;
  }

  private async withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new EngineTimeoutError(`sin respuesta en ${ms} ms`));
      }, ms);
    });
    try {
      return await Promise.race([run(controller.signal), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private onFailure(member: HybridMember, err: unknown, next: HybridMember | undefined) {
    const name = LABEL[member.provider.id];
    const then = next ? ` → fallback a ${LABEL[next.provider.id]}` : '';
    if (err instanceof EngineTimeoutError) {
      this.logger.warn(`${name} ${err.message}${then}`);
      return;
    }
    if (this.options.mode === 'hybrid') {
      this.downUntil.set(member.provider.id, this.now() + this.options.retryAfterMs);
    }
    this.logger.warn(
      `${name} no disponible (${describe(err)})${then}; se reintentará en ${Math.round(this.options.retryAfterMs / 1000)} s`,
    );
  }

  private noProviderError(lastError: unknown): Error {
    if (this.options.mode !== 'hybrid' && lastError instanceof Error) return lastError;
    return new ServiceUnavailableException(
      `Ningún proveedor de IA respondió (ni Gemini ni Ollama local). Último error: ${describe(lastError)}`,
    );
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
