import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UmlModel } from '../diagrams/uml.types.js';
import type { EditDiagramResult } from './operations.types.js';
import type { AiProvider } from './providers/ai-provider.interface.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

/**
 * Fachada: elige el proveedor de IA segun AI_PROVIDER ("gemini" por
 * defecto, "ollama" para el Plan B local sin internet — ver
 * docs/Plan-B-Local.md). El controller y el frontend no cambian: mismo
 * contrato de entrada/salida sin importar cual proveedor responda.
 */
@Injectable()
export class AiService {
  private readonly provider: AiProvider;

  constructor(private readonly configService: ConfigService) {
    const providerName = (this.configService.get<string>('AI_PROVIDER') ?? 'gemini').toLowerCase();
    this.provider =
      providerName === 'ollama'
        ? new OllamaProvider(this.configService)
        : new GeminiProvider(this.configService);
  }

  editDiagram(message: string, model: UmlModel): Promise<EditDiagramResult> {
    return this.provider.editDiagram(message, model);
  }

  interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel> {
    return this.provider.interpretDiagramPhoto(imageBase64, mediaType);
  }
}
