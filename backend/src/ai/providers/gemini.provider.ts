import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';
import { EDIT_SYSTEM_PROMPT, VISION_SYSTEM_PROMPT, stripJsonFences } from '../prompts.js';
import type { AiProvider } from './ai-provider.interface.js';

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
    const result = await genModel.generateContent(prompt);
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

    const result = await model.generateContent([
      { inlineData: { mimeType: mediaType, data: imageBase64 } },
      { text: 'Interpreta este diagrama de clases UML dibujado a mano y devuelve el JSON del modelo.' },
    ]);

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
