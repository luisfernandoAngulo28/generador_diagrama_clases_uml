import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import { EDIT_SYSTEM_PROMPT, VISION_SYSTEM_PROMPT, stripJsonFences } from '../prompts.js';
import type { AiProvider } from './ai-provider.interface.js';

interface OllamaGenerateResponse {
  response: string;
}

/**
 * Plan B / sin internet: mismo contrato que GeminiProvider (mismos prompts,
 * mismo esquema de operaciones atomicas), pero habla con un Ollama local
 * (http://localhost:11434 por defecto) en vez de la nube de Google. Usado
 * cuando AI_PROVIDER=ollama — pensado para el escenario de "cero internet"
 * durante la defensa, corriendo con docker-compose.local.yml.
 */
@Injectable()
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly textModel: string;
  private readonly visionModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434';
    this.textModel = this.configService.get<string>('OLLAMA_TEXT_MODEL') ?? 'qwen2.5:1.5b-instruct';
    this.visionModel = this.configService.get<string>('OLLAMA_VISION_MODEL') ?? 'moondream';
  }

  private async generate(params: {
    model: string;
    system: string;
    prompt: string;
    images?: string[];
  }): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.model,
          system: params.system,
          prompt: params.prompt,
          images: params.images,
          format: 'json',
          stream: false,
          // temperature 0 (greedy, determinista): en pruebas, la temperatura
          // por defecto de Ollama (0.8) hacía que modelos pequeños
          // inventaran clases/relaciones que nadie pidió.
          options: { temperature: 0, top_p: 0.1 },
        }),
      });
    } catch (err) {
      throw new BadRequestException(
        `No se pudo conectar con Ollama en ${this.baseUrl}. ¿Está corriendo ("ollama serve") y el modelo "${params.model}" descargado?`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`Ollama respondió ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response ?? '';
  }

  async editDiagram(message: string, model: UmlModel): Promise<EditDiagramResult> {
    // Los modelos pequeños siguen un ejemplo concreto mucho mejor que una
    // regla abstracta. Este ejemplo vive solo aqui (no en prompts.ts) para
    // no arriesgar el comportamiento ya probado de Gemini.
    const fewShotExample =
      'Ejemplo — mensaje del usuario: "Crea una clase Producto con nombre y precio" con modelo actual {"classes":[],"relations":[]} ' +
      '-> respuesta correcta: {"reply":"Cree la clase Producto.","operations":[{"op":"CREATE_CLASS","name":"Producto","attributes":[{"name":"nombre","type":"String","visibility":"private"},{"name":"precio","type":"Double","visibility":"private"}]}]}\n' +
      'Nota: "reply" es SIEMPRE un string, nunca un objeto. NUNCA agregues una clase o relación que el usuario no haya pedido explícitamente.\n\n';
    const prompt = `${fewShotExample}Modelo actual del diagrama:\n${JSON.stringify(model)}\n\nMensaje del usuario:\n${message}`;
    const raw = await this.generate({ model: this.textModel, system: EDIT_SYSTEM_PROMPT, prompt });
    const jsonText = stripJsonFences(raw);

    try {
      const parsed = JSON.parse(jsonText) as { reply?: unknown; operations?: unknown };
      return {
        reply: typeof parsed.reply === 'string' ? parsed.reply : '',
        operations: Array.isArray(parsed.operations) ? (parsed.operations as EditDiagramResult['operations']) : [],
      };
    } catch {
      this.logger.warn(`Ollama (${this.textModel}) no devolvió JSON válido, usando texto crudo como reply.`);
      return { reply: raw, operations: [] };
    }
  }

  async interpretDiagramPhoto(
    imageBase64: string,
    _mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel> {
    const raw = await this.generate({
      model: this.visionModel,
      system: VISION_SYSTEM_PROMPT,
      prompt: 'Interpreta este diagrama de clases UML dibujado a mano y devuelve el JSON del modelo.',
      images: [imageBase64],
    });
    const jsonText = stripJsonFences(raw);

    try {
      const parsed = JSON.parse(jsonText) as UmlModel;
      return {
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      };
    } catch {
      throw new BadRequestException(
        'No se pudo interpretar la foto como un diagrama de clases con el modelo local. Intenta con una imagen más clara.',
      );
    }
  }
}
