import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UmlModel } from '../diagrams/uml.types.js';
import type { EditDiagramResult } from './operations.types.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import {
  HybridAiProvider,
  type HybridMode,
  type HybridOrder,
} from './providers/hybrid.provider.js';
import type { AiCallOptions } from './providers/ai-provider.interface.js';
import { validateOperations } from './validate-operations.js';

const DEFAULT_LOCAL_TIMEOUT_MS = 20_000;
const DEFAULT_LOCAL_FALLBACK_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_AFTER_MS = 30_000;

/**
 * Fachada del motor de IA. Por defecto usa el motor HÍBRIDO (AI_PROVIDER=hybrid):
 * - AI_HYBRID_ORDER=cloud-first (defecto): Gemini primero y Ollama local como
 *   respaldo automático cuando no hay internet o Gemini falla.
 * - AI_HYBRID_ORDER=local-first: Ollama primero (para mostrarlo en la demo) y
 *   Gemini si no responde en OLLAMA_TIMEOUT_MS.
 * AI_PROVIDER=gemini u ollama fuerzan un solo proveedor (ver docs/Plan-B-Local.md).
 * El controller y el frontend no cambian: mismo contrato, más `providerUsed`
 * para mostrar el badge.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly engine: HybridAiProvider;
  private readonly ollama: OllamaProvider;
  /** True when Ollama answers first (AI_PROVIDER=ollama, or hybrid + local-first). */
  private readonly localLeads: boolean;

  constructor(private readonly configService: ConfigService) {
    const mode = parseMode(this.configService.get<string>('AI_PROVIDER'));
    const order = parseOrder(this.configService.get<string>('AI_HYBRID_ORDER'));
    const ms = (key: string, fallback: number) =>
      Number(this.configService.get<string>(key) ?? fallback) || fallback;
    const gemini = new GeminiProvider(this.configService);
    const ollama = new OllamaProvider(this.configService);
    this.ollama = ollama;
    this.localLeads = mode === 'ollama' || (mode === 'hybrid' && order === 'local-first');

    this.engine = new HybridAiProvider(
      { provider: ollama },
      { provider: gemini, isAvailable: () => gemini.isConfigured() },
      {
        mode,
        order,
        localTimeoutMs: ms('OLLAMA_TIMEOUT_MS', DEFAULT_LOCAL_TIMEOUT_MS),
        localFallbackTimeoutMs: ms('OLLAMA_FALLBACK_TIMEOUT_MS', DEFAULT_LOCAL_FALLBACK_TIMEOUT_MS),
        retryAfterMs: DEFAULT_RETRY_AFTER_MS,
      },
    );
  }

  async editDiagram(
    message: string,
    model: UmlModel,
    prompts: Pick<AiCallOptions, 'systemPrompt' | 'localSystemPrompt'> = {},
  ): Promise<EditDiagramResult> {
    const result = await this.engine.editDiagram(message, model, prompts);
    return { ...validateOperations(result, model), providerUsed: result.providerUsed };
  }

  /**
   * Fire-and-forget warm-up of the local model when it answers first, so the
   * first question of the demo doesn't pay the cold start. Failures are only
   * logged: the hybrid engine falls back to Gemini anyway.
   */
  warmUpLocal(systemPrefix: string): void {
    if (!this.localLeads) return;
    this.ollama
      .warmUp(systemPrefix)
      .catch((err: unknown) =>
        this.logger.warn(`No se pudo precalentar Ollama: ${err instanceof Error ? err.message : String(err)}`),
      );
  }

  interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ) {
    return this.engine.interpretDiagramPhoto(imageBase64, mediaType);
  }
}

function parseMode(value: string | undefined): HybridMode {
  const mode = (value ?? 'hybrid').toLowerCase();
  return mode === 'gemini' || mode === 'ollama' ? mode : 'hybrid';
}

function parseOrder(value: string | undefined): HybridOrder {
  return (value ?? '').toLowerCase() === 'local-first' ? 'local-first' : 'cloud-first';
}
