import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service.js';
import { DiagramsService } from '../../diagrams/diagrams.service.js';
import { resolveSocketUser } from '../../diagrams/socket-auth.js';
import { ModeratorService } from '../moderator/moderator.service.js';
import type { ChatImage, ImageMediaType } from '../providers/ai-provider.interface.js';

export interface ChatSendPayload {
  diagramId: string;
  text: string;
  /** Ask the AI moderator. Also true when the text mentions "@IA". */
  askAi?: boolean;
  /** Image for the AI to read (image → text); the client downsizes it first. */
  image?: ChatImage;
  /** Small JPEG data URL of the same image, stored with the message for the room. */
  imageThumb?: string;
}

export interface AiSettingsPayload {
  diagramId: string;
  /** false = "solo sugerencias": the AI explains changes but never applies them. */
  canEditCanvas: boolean;
}

const MAX_MESSAGE_LENGTH = 2000;
/** Socket.io's default frame limit is 1 MB; the client downsizes images well below this. */
const MAX_IMAGE_BASE64 = 900_000;
const MAX_THUMB_LENGTH = 120_000;
const IMAGE_TYPES: readonly ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_IMAGE_QUESTION = '¿Qué hay en esta imagen?';

/** The attached image if it is well-formed, null if invalid, undefined if there is none. */
export function validImage(payload: ChatSendPayload | undefined): ChatImage | null | undefined {
  const image = payload?.image;
  if (!image) return undefined;
  if (typeof image.data !== 'string' || !image.data || image.data.length > MAX_IMAGE_BASE64) return null;
  if (!IMAGE_TYPES.includes(image.mediaType)) return null;
  if (!/^[A-Za-z0-9+/=]+$/.test(image.data.slice(0, 200))) return null;
  return { data: image.data, mediaType: image.mediaType };
}

function validThumb(thumb: unknown): string | undefined {
  return typeof thumb === 'string' &&
    thumb.length <= MAX_THUMB_LENGTH &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(thumb)
    ? thumb
    : undefined;
}

/**
 * Public group chat of a diagram's room (2do Parcial). Shares the Socket.io
 * server with DiagramsGateway (same room = diagramId).
 *
 *   cliente ── chat:send ──▶ servidor
 *   servidor ── chat:new-message ──▶ sala   (la pregunta, al instante)
 *   servidor ── ai:status {isThinking:true, promptBy} ──▶ sala
 *   servidor ── chat:new-message ──▶ sala   (respuesta de la IA + operaciones)
 *   servidor ── ai:status {isThinking:false} ──▶ sala
 *
 * Operations travel with the AI answer but only the asker's client applies
 * them (it is the one that asked), so they aren't applied once per viewer;
 * the regular diagram sync + save then propagates them with source 'AI'.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly moderatorService: ModeratorService,
    private readonly diagramsService: DiagramsService,
  ) {}

  @SubscribeMessage('chat:send')
  async handleSend(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatSendPayload) {
    const user = resolveSocketUser(client, this.authService);
    const diagramId = payload?.diagramId;
    const image = validImage(payload);
    const typed = typeof payload?.text === 'string' ? payload.text.trim() : '';
    // An image alone is a valid question.
    const text = typed || (image ? DEFAULT_IMAGE_QUESTION : '');

    if (!user) {
      client.emit('chat:error', { message: 'Inicia sesión para participar en el chat grupal.' });
      return;
    }
    if (image === null) {
      client.emit('chat:error', { message: 'La imagen no es válida o es demasiado grande.' });
      return;
    }
    if (!diagramId || !text || text.length > MAX_MESSAGE_LENGTH) {
      client.emit('chat:error', { message: 'Mensaje vacío o demasiado largo.' });
      return;
    }
    // A brand-new diagram may send before its join-diagram round trip finished.
    if (!client.rooms.has(diagramId)) await client.join(diagramId);

    const room = this.server.in(diagramId);
    let question;
    try {
      question = await this.moderatorService.storeUserMessage(
        diagramId,
        user,
        text,
        image ? validThumb(payload.imageThumb) : undefined,
      );
    } catch (err) {
      this.logger.warn(`No se pudo guardar el mensaje: ${describe(err)}`);
      client.emit('chat:error', { message: 'No se pudo enviar el mensaje.' });
      return;
    }
    room.emit('chat:new-message', question);

    // A picture is always meant for the AI to read.
    const askAi = Boolean(image) || (payload.askAi ?? /@ia\b/i.test(text));
    if (!askAi) return;

    const requestId = randomUUID();
    room.emit('ai:status', { requestId, isThinking: true, promptBy: user.name });
    try {
      const { answer, operations } = await this.moderatorService.answer(
        diagramId,
        user,
        question,
        image ?? undefined,
      );
      room.emit('chat:new-message', { ...answer, operations });
    } catch (err) {
      this.logger.warn(`El moderador no pudo responder a ${user.name}: ${describe(err)}`);
      room.emit('chat:error', {
        message: `La IA no pudo responder a ${user.name} en este momento. Intenta de nuevo.`,
      });
    } finally {
      room.emit('ai:status', { requestId, isThinking: false, promptBy: user.name });
    }
  }

  /**
   * Room setting "IA edita el lienzo" (configurable executor):
   *   cliente ── ai:settings {diagramId, canEditCanvas} ──▶ servidor
   *   servidor ── ai:settings {diagramId, canEditCanvas, changedBy} ──▶ sala
   * Stored on the diagram, so it survives reloads and applies to every member;
   * the moderator enforces it server-side (see applyCanvasPolicy).
   */
  @SubscribeMessage('ai:settings')
  async handleSettings(@ConnectedSocket() client: Socket, @MessageBody() payload: AiSettingsPayload) {
    const user = resolveSocketUser(client, this.authService);
    if (!user) {
      client.emit('chat:error', { message: 'Inicia sesión para cambiar la configuración de la IA.' });
      return;
    }
    if (!payload?.diagramId || typeof payload.canEditCanvas !== 'boolean') {
      client.emit('chat:error', { message: 'Configuración de la IA inválida.' });
      return;
    }
    try {
      const diagram = await this.diagramsService.setAiCanEditCanvas(payload.diagramId, payload.canEditCanvas, user);
      this.server.in(diagram.id).emit('ai:settings', {
        diagramId: diagram.id,
        canEditCanvas: diagram.aiCanEditCanvas,
        changedBy: user.name,
      });
    } catch (err) {
      this.logger.warn(`No se pudo cambiar la configuración de la IA: ${describe(err)}`);
      client.emit('chat:error', { message: 'No se pudo cambiar la configuración de la IA.' });
    }
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
