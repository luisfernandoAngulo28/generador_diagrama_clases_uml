import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';

/**
 * Contract both the cloud (Gemini) and local (Ollama) AI providers must
 * satisfy. AiService picks one at construction time based on AI_PROVIDER —
 * the controller and the frontend never know which one answered.
 */
export interface AiProvider {
  editDiagram(message: string, model: UmlModel): Promise<EditDiagramResult>;

  interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel>;
}
