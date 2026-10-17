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
import { resolveSocketUser } from '../../diagrams/socket-auth.js';
import { ModeratorService } from '../moderator/moderator.service.js';

export interface ChatSendPayload {
  diagramId: string;
  text: string;
  /** Ask the AI moderator. Also true when the text mentions "@IA". */
  askAi?: boolean;
}

const MAX_MESSAGE_LENGTH = 2000;

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
  ) {}

  @SubscribeMessage('chat:send')
  async handleSend(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatSendPayload) {
    const user = resolveSocketUser(client, this.authService);
    const diagramId = payload?.diagramId;
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';

    if (!user) {
      client.emit('chat:error', { message: 'Inicia sesión para participar en el chat grupal.' });
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
      question = await this.moderatorService.storeUserMessage(diagramId, user, text);
    } catch (err) {
      this.logger.warn(`No se pudo guardar el mensaje: ${describe(err)}`);
      client.emit('chat:error', { message: 'No se pudo enviar el mensaje.' });
      return;
    }
    room.emit('chat:new-message', question);

    const askAi = payload.askAi ?? /@ia\b/i.test(text);
    if (!askAi) return;

    const requestId = randomUUID();
    room.emit('ai:status', { requestId, isThinking: true, promptBy: user.name });
    try {
      const { answer, operations } = await this.moderatorService.answer(diagramId, user, question);
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
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
