import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { DiagramsService } from '../../diagrams/diagrams.service.js';
import { SessionsService } from '../../diagrams/sessions.service.js';
import { ActivityLogDocument } from '../../diagrams/schemas/activity-log.schema.js';
import { GroupChatMessageDocument } from '../../diagrams/schemas/group-chat-message.schema.js';
import type { Actor } from '../../diagrams/schemas/author.schema.js';
import type { UmlModel } from '../../diagrams/uml.types.js';
import type { JwtPayload } from '../../auth/auth.service.js';
import { AiService } from '../ai.service.js';
import { isExplicitChangeRequest } from './intent.js';
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

  async ask(diagramId: string, user: JwtPayload, text: string): Promise<ModeratorAnswer> {
    const asker: Actor = { userId: user.sub, userName: user.name, type: 'USER' };
    const diagram = await this.diagramsService.findOne(diagramId);

    // Context is read BEFORE storing the new question, so it isn't duplicated in the thread.
    const [activity, roomChat, askerThread, session] = await Promise.all([
      this.activityModel.find({ diagramId }).sort({ timestamp: -1 }).limit(ACTIVITY_WINDOW).lean(),
      this.chatModel.find({ diagramId }).sort({ timestamp: -1 }).limit(ROOM_CHAT_WINDOW).lean(),
      this.chatModel
        .find({
          diagramId,
          $or: [{ 'sender.userId': asker.userId }, { 'addressedTo.userId': asker.userId }],
        })
        .sort({ timestamp: -1 })
        .limit(ASKER_THREAD_WINDOW)
        .lean(),
      this.sessionsService.getLatest(diagramId),
    ]);

    const question = await this.chatModel.create({
      diagramId,
      sender: asker,
      text,
      isAiResponse: false,
      timestamp: new Date(),
    });

    const promptContext = {
      askerName: asker.userName,
      diagramName: diagram.name,
      model: diagram.model,
      participants: (session?.participants ?? []).filter((p) => p.online).map((p) => p.userName),
      recentActivity: activity
        .reverse()
        .map((a) => ({ userName: a.actor.userName, summary: a.summary, timestamp: a.timestamp })),
      roomChat: roomChat.reverse().map(toChatLine),
      askerThread: askerThread.reverse().map(toChatLine),
      timeZone: this.configService.get<string>('APP_TIME_ZONE'),
    };

    const result = await this.aiService.editDiagram(text, compactModel(diagram.model), {
      systemPrompt: buildModeratorPrompt(promptContext),
      localSystemPrompt: buildModeratorLitePrompt(promptContext),
    });

    // Rule "solo modifica el lienzo si te lo piden": enforced here, not trusted to the model.
    let operations = result.operations;
    if (operations.length && !isExplicitChangeRequest(text)) {
      this.logger.warn(
        `Se descartaron ${operations.length} operación(es) de ${result.providerUsed}: "${text}" no pide cambios al diagrama`,
      );
      operations = [];
    }

    const answer = await this.chatModel.create({
      diagramId,
      sender: AI_ACTOR,
      text: ensureAddressed(result.reply, asker.userName),
      isAiResponse: true,
      addressedTo: asker,
      appliedOperationsCount: operations.length,
      providerUsed: result.providerUsed,
      timestamp: new Date(),
    });

    return {
      question: toChatMessage(question.toObject()),
      answer: toChatMessage(answer.toObject()),
      operations,
    };
  }
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
    timestamp: m.timestamp,
  };
}
