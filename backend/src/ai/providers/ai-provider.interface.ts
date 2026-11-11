import type { UmlModel } from '../../diagrams/uml.types.js';
import type { EditDiagramResult } from '../operations.types.js';

/** Which engine produced an answer; shown as a badge in the chat ("🏠 IA local" / "☁️ Gemini · <motivo>"). */
export type AiProviderId = 'OLLAMA_LOCAL' | 'GEMINI_CLOUD';

export interface AiCallOptions {
  /** Replaces the default EDIT_SYSTEM_PROMPT (e.g. the group moderator prompt). */
  systemPrompt?: string;
  /**
   * Shorter variant for small local models (Ollama on CPU reads ~50 prompt
   * tokens/s). When set, the local provider uses it INSTEAD of systemPrompt
   * and doesn't append the model JSON: the lite prompt already describes it.
   */
  localSystemPrompt?: string;
  /**
   * A long answer (a whole project): the local CPU model needs far more tokens
   * and time, so the hybrid engine tries the cloud first and waits longer locally.
   */
  heavy?: boolean;
  /** Lets the caller cancel a slow request (HybridAiProvider's timeout). */
  signal?: AbortSignal;
  /**
   * An image attached to the chat question (image → text). Only the cloud (Gemini) can read
   * images: the hybrid engine sends these questions to Gemini only.
   */
  image?: ChatImage;
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface ChatImage {
  /** Base64 without the "data:...;base64," prefix. */
  data: string;
  mediaType: ImageMediaType;
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
