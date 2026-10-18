import type { DiagramOperation } from './uml';

export type AiProviderUsed = 'OLLAMA_LOCAL' | 'GEMINI_CLOUD';

export interface ChatActor {
  userId: string;
  userName: string;
  type: 'USER' | 'AI';
}

/** A message of the public group chat (`chat:new-message`, `session:init-state`). */
export interface GroupChatMessage {
  id: string;
  diagramId: string;
  sender: ChatActor;
  text: string;
  isAiResponse: boolean;
  /** For AI answers: who the answer is addressed to. */
  addressedTo?: ChatActor;
  appliedOperationsCount: number;
  providerUsed?: AiProviderUsed;
  timestamp: string;
  /** Only on live AI answers: canvas changes for the asker's client to apply. */
  operations?: DiagramOperation[];
}

export interface AiStatusEvent {
  requestId: string;
  isThinking: boolean;
  promptBy: string;
}

/** Room setting broadcast when someone toggles "IA edita el lienzo". */
export interface AiSettingsEvent {
  diagramId: string;
  canEditCanvas: boolean;
  changedBy: string;
}
