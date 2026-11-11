import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { DiagramsService } from '../../diagrams/diagrams.service.js';
import { SessionsService } from '../../diagrams/sessions.service.js';
import { ActivityLogDocument } from '../../diagrams/schemas/activity-log.schema.js';
import {
  GroupChatMessageDocument,
  type AiProviderReason,
} from '../../diagrams/schemas/group-chat-message.schema.js';
import type { Actor } from '../../diagrams/schemas/author.schema.js';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { JwtPayload } from '../../auth/auth.service.js';
import { AiService } from '../ai.service.js';
import { applyCanvasPolicy } from './canvas-policy.js';
import { classifyRequest, isExplicitChangeRequest } from './intent.js';
import { droppedOperationsNote } from '../validate-operations.js';
import { validateModel } from '../../diagrams/validation.util.js';
import type { DiagramOperation } from '../operations.types.js';
import {
  LITE_STATIC,
  buildModeratorLitePrompt,
  buildModeratorPrompt,
  ensureAddressed,
  type ModeratorChatLine,
} from './moderator-prompt.js';

const ACTIVITY_WINDOW = 25;
const ROOM_CHAT_WINDOW = 8;
const ASKER_THREAD_WINDOW = 8;

export const AI_ACTOR: Actor = { userId: 'ai', userName: 'Moderador IA', type: 'AI' };

export interface ChatMessage {
  id: string;
  diagramId: string;
  sender: Actor;
  text: string;
  isAiResponse: boolean;
  addressedTo?: Actor;
  appliedOperationsCount: number;
  providerUsed?: 'OLLAMA_LOCAL' | 'GEMINI_CLOUD';
  providerReason?: AiProviderReason;
  timestamp: Date;
}

export interface ModeratorAnswer {
  question: ChatMessage;
  answer: ChatMessage;
  /** Canvas operations the AI proposes; empty unless the user explicitly asked for a change. */
  operations: DiagramOperation[];
}

/**
 * The group moderator: answers a question asked in a diagram's public chat
 * with dual context — group (diagram state, who did what, room chat) and
 * individual (the asker's own thread) — and stores both messages in
 * `group_chat_messages` so everyone in the room (and the next question) sees them.
 */
@Injectable()
export class ModeratorService implements OnModuleInit {
  private readonly logger = new Logger(ModeratorService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly diagramsService: DiagramsService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
    @InjectModel(ActivityLogDocument.name)
    private readonly activityModel: Model<ActivityLogDocument>,
    @InjectModel(GroupChatMessageDocument.name)
    private readonly chatModel: Model<GroupChatMessageDocument>,
  ) {}

  onModuleInit() {
    this.aiService.warmUpLocal(LITE_STATIC);
  }

  /** HTTP flow: store the question and answer it in one call. */
  async ask(diagramId: string, user: JwtPayload, text: string): Promise<ModeratorAnswer> {
    const question = await this.storeUserMessage(diagramId, user, text);
    const { answer, operations } = await this.answer(diagramId, user, question);
    return { question, answer, operations };
  }

  /** Stores a human message of the public chat (with or without a question for the AI). */
  async storeUserMessage(diagramId: string, user: JwtPayload, text: string): Promise<ChatMessage> {
    const question = await this.chatModel.create({
      diagramId,
      sender: toActor(user),
      text,
      isAiResponse: false,
      timestamp: new Date(),
    });
    return toChatMessage(question.toObject());
  }

  /**
   * Answers an already-stored question. The question itself is excluded from
   * the context queries so it isn't duplicated in the asker's thread.
   */
  async answer(
    diagramId: string,
    user: JwtPayload,
    question: ChatMessage,
  ): Promise<Omit<ModeratorAnswer, 'question'>> {
    const asker = toActor(user);
    const text = stripAiMention(question.text);
    const diagram = await this.diagramsService.findOne(diagramId);
    const notThisQuestion = { _id: { $ne: question.id } };

    const [activity, roomChat, askerThread, session] = await Promise.all([
      this.activityModel.find({ diagramId }).sort({ timestamp: -1 }).limit(ACTIVITY_WINDOW).lean(),
      this.chatModel
        .find({ diagramId, ...notThisQuestion })
        .sort({ timestamp: -1 })
        .limit(ROOM_CHAT_WINDOW)
        .lean(),
      this.chatModel
        .find({
          diagramId,
          ...notThisQuestion,
          $or: [{ 'sender.userId': asker.userId }, { 'addressedTo.userId': asker.userId }],
        })
        .sort({ timestamp: -1 })
        .limit(ASKER_THREAD_WINDOW)
        .lean(),
      this.sessionsService.getLatest(diagramId),
    ]);

    const requestKind = classifyRequest(text);
    const findings =
      requestKind === 'REVIEW' ? describeFindings(diagram.model) : [];

    const promptContext = {
      requestKind,
      validationFindings: findings,
      askerName: asker.userName,
      diagramName: diagram.name,
      model: diagram.model,
      participants: (session?.participants ?? []).filter((p) => p.online).map((p) => p.userName),
      recentActivity: activity
        .reverse()
        .map((a) => ({ userName: a.actor.userName, summary: a.summary, timestamp: a.timestamp })),
      roomChat: roomChat.reverse().map(toChatLine),
      askerThread: askerThread.reverse().map(toChatLine),
      canEditCanvas: diagram.aiCanEditCanvas,
      timeZone: this.configService.get<string>('APP_TIME_ZONE'),
    };

    const result = await this.aiService.editDiagram(text, compactModel(diagram.model), {
      systemPrompt: buildModeratorPrompt(promptContext),
      localSystemPrompt: buildModeratorLitePrompt(promptContext),
      heavy: requestKind === 'PROJECT',
    });

    // Room setting + "solo modifica el lienzo si te lo piden": enforced here, not trusted to the model.
    const { operations: allowed, reason, rewriteReply } = applyCanvasPolicy(
      result.operations,
      text,
      diagram.aiCanEditCanvas,
    );
    if (reason) {
      this.logger.warn(
        `Se descartaron ${result.operations.length} operación(es) de ${result.providerUsed} (${reason}): "${text}"`,
      );
    }
    // A whole project lands at random positions: always finish by ordering it.
    const operations =
      requestKind === 'PROJECT' && allowed.length && !allowed.some((op) => op.op === 'AUTO_LAYOUT')
        ? [...allowed, { op: 'AUTO_LAYOUT' as const }]
        : allowed;
    // Don't let the answer claim changes that were not applied.
    const reply = [
      rewriteReply ? rewriteReply(result.reply, asker.userName) : result.reply,
      ...(requestKind === 'REVIEW' ? [validatorSummary(findings)] : []),
      ...(result.droppedOperations && isExplicitChangeRequest(text)
        ? [droppedOperationsNote(result.droppedOperations)]
        : []),
    ].join('\n\n');

    const answer = await this.chatModel.create({
      diagramId,
      sender: AI_ACTOR,
      text: ensureAddressed(reply, asker.userName),
      isAiResponse: true,
      addressedTo: asker,
      appliedOperationsCount: operations.length,
      providerUsed: result.providerUsed,
      providerReason: providerReason(
        result.providerUsed,
        requestKind === 'PROJECT',
        this.aiService.isLocalFirst(),
      ),
      timestamp: new Date(),
    });

    return { answer: toChatMessage(answer.toObject()), operations };
  }
}

function describeFindings(model: UmlModel): string[] {
  const { errors, warnings } = validateModel(model);
  return [
    ...errors.map((i) => `Error: ${i.message}`),
    ...warnings.map((i) => `Advertencia: ${i.message}`),
  ];
}

/** Written by the server, not the model: the part of a review that can't be hallucinated. */
function validatorSummary(findings: string[]): string {
  return findings.length
    ? `Validador automático (${findings.length}):\n${findings.map((f) => `• ${f}`).join('\n')}`
    : 'Validador automático: sin errores ni advertencias.';
}

function toActor(user: JwtPayload): Actor {
  return { userId: user.sub, userName: user.name, type: 'USER' };
}

/** "@IA ¿qué es...?" → "¿qué es...?" (the mention only routes the message to the AI). */
export function stripAiMention(text: string): string {
  return text.replace(/@ia[:,]?\s*/gi, '').trim() || text;
}

/** The providers also receive the model as JSON: drop canvas positions and stamps (already in the prompt) to save tokens. */
function compactModel(model: UmlModel): UmlModel {
  return {
    classes: model.classes.map(({ position: _p, author: _a, lastModifiedBy: _m, ...cls }) => ({
      ...cls,
      attributes: cls.attributes.map(({ author: _aa, lastModifiedBy: _am, ...attr }) => attr),
    })),
    relations: model.relations.map(({ author: _a, lastModifiedBy: _m, ...rel }) => rel),
  };
}

function toChatLine(m: GroupChatMessageDocument): ModeratorChatLine {
  return {
    senderName: m.sender.userName,
    isAi: m.isAiResponse,
    addressedTo: m.addressedTo?.userName,
    text: m.text,
    timestamp: m.timestamp,
  };
}

/** Why the cloud answered (undefined when the local model did). */
export function providerReason(
  used: ChatMessage['providerUsed'],
  isProject: boolean,
  localFirst: boolean,
): AiProviderReason | undefined {
  if (used !== 'GEMINI_CLOUD') return undefined;
  if (isProject) return 'PROJECT';
  return localFirst ? 'FALLBACK' : 'CLOUD_PRIMARY';
}

function toChatMessage(m: GroupChatMessageDocument & { _id: unknown }): ChatMessage {
  return {
    id: String(m._id),
    diagramId: m.diagramId,
    sender: m.sender,
    text: m.text,
    isAiResponse: m.isAiResponse,
    addressedTo: m.addressedTo,
    appliedOperationsCount: m.appliedOperationsCount,
    providerUsed: m.providerUsed,
    providerReason: m.providerReason,
    timestamp: m.timestamp,
  };
}
