import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import { EDIT_SYSTEM_PROMPT, VISION_SYSTEM_PROMPT, stripJsonFences } from '../prompts.js';
import type { AiProvider } from './ai-provider.interface.js';

function isTransientGeminiError(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  return status === 503 || status === 429;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gemini a veces devuelve 503 "high demand" por unos segundos (observado
 * en vivo el 2026-09-20, ver docs/Checklist_Examen_Final.md). Reintenta
 * un par de veces con backoff corto antes de darlo por fallido, para que
 * un bache momentaneo de Google no tumbe la demo.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientGeminiError(err) || i === attempts - 1) throw err;
      await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') ?? '',
    );
    this.modelName = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.6-flash';
  }

  async editDiagram(message: string, model: UmlModel): Promise<EditDiagramResult> {
    const genModel = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: EDIT_SYSTEM_PROMPT,
    });

    const prompt = `Modelo actual del diagrama:\n${JSON.stringify(model)}\n\nMensaje del usuario:\n${message}`;

    let result: Awaited<ReturnType<typeof genModel.generateContent>>;
    try {
      result = await withRetry(() => genModel.generateContent(prompt));
    } catch (err) {
      if (isTransientGeminiError(err)) {
        throw new ServiceUnavailableException(
          'El servicio de IA (Gemini) está temporalmente saturado. Intenta de nuevo en unos segundos, o sigue editando el diagrama manualmente mientras tanto.',
        );
      }
      throw err;
    }

    const jsonText = stripJsonFences(result.response.text());

    try {
      const parsed = JSON.parse(jsonText) as {
        reply?: unknown;
        operations?: unknown;
      };
      return {
        reply: typeof parsed.reply === 'string' ? parsed.reply : '',
        operations: Array.isArray(parsed.operations) ? (parsed.operations as EditDiagramResult['operations']) : [],
      };
    } catch {
      return { reply: result.response.text(), operations: [] };
    }
  }

  async interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: VISION_SYSTEM_PROMPT,
    });

    let result: Awaited<ReturnType<typeof model.generateContent>>;
    try {
      result = await withRetry(() =>
        model.generateContent([
          { inlineData: { mimeType: mediaType, data: imageBase64 } },
          { text: 'Interpreta este diagrama de clases UML dibujado a mano y devuelve el JSON del modelo.' },
        ]),
      );
    } catch (err) {
      if (isTransientGeminiError(err)) {
        throw new ServiceUnavailableException(
          'El servicio de IA (Gemini) está temporalmente saturado. Intenta de nuevo en unos segundos.',
        );
      }
      throw err;
    }

    const jsonText = stripJsonFences(result.response.text());

    try {
      const parsed = JSON.parse(jsonText) as UmlModel;
      return {
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      };
    } catch {
      throw new BadRequestException(
        'No se pudo interpretar la foto como un diagrama de clases. Intenta con una imagen más clara.',
      );
    }
  }
}
