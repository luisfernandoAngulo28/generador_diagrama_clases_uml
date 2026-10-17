import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import { EDIT_SYSTEM_PROMPT, VISION_SYSTEM_PROMPT, stripJsonFences } from '../prompts.js';
import type { AiCallOptions, AiProvider } from './ai-provider.interface.js';

interface OllamaGenerateResponse {
  response: string;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
}

const ms = (ns: number | undefined) => Math.round((ns ?? 0) / 1e6);

/**
 * Plan B / sin internet: mismo contrato que GeminiProvider (mismos prompts,
 * mismo esquema de operaciones atomicas), pero habla con un Ollama local
 * (http://localhost:11434 por defecto) en vez de la nube de Google. Usado
 * cuando AI_PROVIDER=ollama — pensado para el escenario de "cero internet"
 * durante la defensa, corriendo con docker-compose.local.yml.
 */
@Injectable()
export class OllamaProvider implements AiProvider {
  readonly id = 'OLLAMA_LOCAL' as const;
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
    signal?: AbortSignal;
  }): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: params.signal,
        body: JSON.stringify({
          model: params.model,
          system: params.system,
          prompt: params.prompt,
          images: params.images,
          format: 'json',
          stream: false,
          // Keep the model loaded between questions: the cold start (loading
          // weights into RAM) is what usually blows the hybrid timeout.
          keep_alive: '30m',
          // temperature 0 (greedy, determinista): en pruebas, la temperatura
          // por defecto de Ollama (0.8) hacía que modelos pequeños
          // inventaran clases/relaciones que nadie pidió.
          // num_predict: a CPU generates ~6 tok/s, so cap text answers
          // (a reply plus a few operations fits comfortably in 256 tokens).
          options: { temperature: 0, top_p: 0.1, num_predict: params.images ? undefined : 256 },
        }),
      });
    } catch (err) {
      if (params.signal?.aborted) throw err;
      throw new BadRequestException(
        `No se pudo conectar con Ollama en ${this.baseUrl}. ¿Está corriendo ("ollama serve") y el modelo "${params.model}" descargado?`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`Ollama respondió ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    // Latency breakdown, useful to tune OLLAMA_TIMEOUT_MS and prompt size.
    this.logger.log(
      `${params.model}: total ${ms(data.total_duration)} ms | carga ${ms(data.load_duration)} ms | ` +
        `prompt ${data.prompt_eval_count ?? '?'} tok en ${ms(data.prompt_eval_duration)} ms | ` +
        `respuesta ${data.eval_count ?? '?'} tok en ${ms(data.eval_duration)} ms`,
    );
    return data.response ?? '';
  }

  async editDiagram(
    message: string,
    model: UmlModel,
    options: AiCallOptions = {},
  ): Promise<EditDiagramResult> {
    const raw = await this.generate({
      model: this.textModel,
      ...this.buildTextPrompt(message, model, options),
      signal: options.signal,
    });
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

  private buildTextPrompt(
    message: string,
    model: UmlModel,
    options: AiCallOptions,
  ): { system: string; prompt: string } {
    // Lite prompt (moderator): it already contains the diagram, the context
    // and its own few-shot examples; only the question goes in the prompt.
    if (options.localSystemPrompt) {
      return { system: options.localSystemPrompt, prompt: message };
    }
    // Los modelos pequeños siguen un ejemplo concreto mucho mejor que una
    // regla abstracta. Este ejemplo es del asistente de edición: no se usa con
    // otros prompts (el moderador lo copiaba y creaba "Producto" sin pedido).
    const fewShotExample = options.systemPrompt
      ? ''
      : 'Ejemplo — mensaje del usuario: "Crea una clase Producto con nombre y precio" con modelo actual {"classes":[],"relations":[]} ' +
        '-> respuesta correcta: {"reply":"Cree la clase Producto.","operations":[{"op":"CREATE_CLASS","name":"Producto","attributes":[{"name":"nombre","type":"String","visibility":"private"},{"name":"precio","type":"Double","visibility":"private"}]}]}\n' +
        'Nota: "reply" es SIEMPRE un string, nunca un objeto. NUNCA agregues una clase o relación que el usuario no haya pedido explícitamente.\n\n';
    return {
      system: options.systemPrompt ?? EDIT_SYSTEM_PROMPT,
      prompt: `${fewShotExample}Modelo actual del diagrama:\n${JSON.stringify(model)}\n\nMensaje del usuario:\n${message}`,
    };
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
