import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';

/** Which engine produced an answer; shown as a badge in the UI ("Ollama Local 🏠" / "Gemini Cloud ☁️"). */
export type AiProviderId = 'OLLAMA_LOCAL' | 'GEMINI_CLOUD';

export interface AiCallOptions {
  /** Replaces the default EDIT_SYSTEM_PROMPT (e.g. the group moderator prompt). */
  systemPrompt?: string;
  /** Lets the caller cancel a slow request (HybridAiProvider's timeout). */
  signal?: AbortSignal;
}

/**
 * Contract both the cloud (Gemini) and local (Ollama) AI providers must
 * satisfy. HybridAiProvider composes them (local first, cloud fallback) —
 * the controller and the frontend never depend on a concrete provider.
 */
export interface AiProvider {
  readonly id: AiProviderId;

  editDiagram(message: string, model: UmlModel, options?: AiCallOptions): Promise<EditDiagramResult>;

  interpretDiagramPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  ): Promise<UmlModel>;
}
