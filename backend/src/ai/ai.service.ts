import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UmlModel } from '../diagrams/uml.types.js';
import type { EditDiagramResult } from './operations.types.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { HybridAiProvider, type HybridMode } from './providers/hybrid.provider.js';
import type { AiCallOptions } from './providers/ai-provider.interface.js';
import { validateOperations } from './validate-operations.js';

const DEFAULT_LOCAL_TIMEOUT_MS = 4000;
const DEFAULT_LOCAL_RETRY_AFTER_MS = 30_000;

/**
 * Fachada del motor de IA. Por defecto usa el motor HÍBRIDO (AI_PROVIDER=hybrid):
 * Ollama local primero y Gemini como respaldo automático. AI_PROVIDER=gemini u
 * ollama fuerzan un solo proveedor (p. ej. Plan B sin internet, ver
 * docs/Plan-B-Local.md). El controller y el frontend no cambian: mismo
 * contrato de entrada/salida, más `providerUsed` para mostrar el badge.
 */
@Injectable()
export class AiService {
  private readonly engine: HybridAiProvider;

  constructor(private readonly configService: ConfigService) {
    const mode = parseMode(this.configService.get<string>('AI_PROVIDER'));
    const gemini = new GeminiProvider(this.configService);
    const ollama = new OllamaProvider(this.configService);

    this.engine = new HybridAiProvider(
      { provider: ollama },
      { provider: gemini, isAvailable: () => gemini.isConfigured() },
      {
        mode,
        localTimeoutMs: Number(
          this.configService.get<string>('OLLAMA_TIMEOUT_MS') ?? DEFAULT_LOCAL_TIMEOUT_MS,
        ),
        localRetryAfterMs: DEFAULT_LOCAL_RETRY_AFTER_MS,
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
