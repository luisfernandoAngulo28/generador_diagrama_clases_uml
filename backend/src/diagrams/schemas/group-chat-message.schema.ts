import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Actor, ActorSchema } from './author.schema.js';

export type AiProviderUsed = 'OLLAMA_LOCAL' | 'GEMINI_CLOUD';

/**
 * Public group chat of a diagram's room (2do Parcial): every participant
 * sees every question and every AI answer. The per-user thread the AI
 * remembers is just this collection filtered by sender / addressedTo.
 */
@Schema({ collection: 'group_chat_messages', versionKey: false })
export class GroupChatMessageDocument {
  @Prop({ required: true })
  diagramId: string;

  @Prop({ type: ActorSchema, required: true })
  sender: Actor;

  @Prop({ required: true })
  text: string;

  @Prop({ default: false })
  isAiResponse: boolean;

  /** For AI answers: the user the answer is addressed to. */
  @Prop({ type: ActorSchema })
  addressedTo?: Actor;

  @Prop({ default: 0 })
  appliedOperationsCount: number;

  @Prop({ type: String, enum: ['OLLAMA_LOCAL', 'GEMINI_CLOUD'] })
  providerUsed?: AiProviderUsed;

  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const GroupChatMessageSchema = SchemaFactory.createForClass(GroupChatMessageDocument);
GroupChatMessageSchema.index({ diagramId: 1, timestamp: 1 });
GroupChatMessageSchema.index({ diagramId: 1, 'sender.userId': 1, timestamp: -1 });
