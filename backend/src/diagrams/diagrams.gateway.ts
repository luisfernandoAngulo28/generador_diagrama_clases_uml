import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { SessionsService } from './sessions.service.js';

export interface DiagramUpdatePayload {
  diagramId: string;
  nodes: unknown[];
  edges: unknown[];
}

interface LockPayload {
  diagramId: string;
  classId: string;
}

interface ClassLock {
  socketId: string;
  userId: string;
  editorName: string;
  lockedAt: Date;
}

/**
 * Pessimistic per-class lock, inspired by Enterprise Architect's Settings >
 * Locks: whoever opens a class to edit it "checks it out" for the room, so
 * two people can't silently overwrite each other's edit to the same class.
 * The in-memory map is the fast path; every change is mirrored to the
 * diagram's continuous session in MongoDB (SessionsService).
 *
 * Identity: the client sends its JWT in the handshake
 * (`io(url, { auth: { token } })`), so the server — not the client — decides
 * who is talking. Without a valid token the socket still works as an
 * anonymous guest (1er Parcial behavior).
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class DiagramsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DiagramsGateway.name);

  // diagramId -> classId -> lock
  private readonly locks = new Map<string, Map<string, ClassLock>>();

  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
  ) {}

  handleConnection(client: Socket) {
    const token = (client.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || !token) return;
    try {
      const payload = this.authService.verifyToken(token);
      client.data.userId = payload.sub;
      client.data.editorName = payload.name;
      client.data.authenticated = true;
    } catch {
      // Invalid/expired token: fall back to guest identity in handleJoin.
    }
  }

  @SubscribeMessage('join-diagram')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string | { diagramId: string; userName?: string },
  ) {
    const diagramId = typeof payload === 'string' ? payload : payload.diagramId;
    const userName = typeof payload === 'string' ? undefined : payload.userName?.trim();

    client.data.diagramId = diagramId;
    if (!client.data.authenticated) {
      client.data.userId = `guest:${client.id}`;
      client.data.editorName = userName || `Usuario ${client.id.slice(0, 4).toUpperCase()}`;
    }
    client.join(diagramId);
    this.broadcastPresence(diagramId);
    client.emit('locks-update', this.serializeLocks(diagramId));

    try {
      await this.sessionsService.join(diagramId, {
        userId: client.data.userId as string,
        userName: client.data.editorName as string,
      });
      client.emit('session:init-state', await this.sessionsService.getInitState(diagramId));
    } catch (err) {
      this.logger.warn(`No se pudo restaurar la sesión de ${diagramId}: ${String(err)}`);
    }
  }

  @SubscribeMessage('diagram-update')
  handleUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DiagramUpdatePayload,
  ) {
    client.to(payload.diagramId).emit('diagram-update', {
      nodes: payload.nodes,
      edges: payload.edges,
    });
  }

  @SubscribeMessage('lock-class')
  handleLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LockPayload,
  ) {
    const roomLocks = this.locks.get(payload.diagramId) ?? new Map();
    this.locks.set(payload.diagramId, roomLocks);

    const existing = roomLocks.get(payload.classId);
    if (existing && existing.socketId !== client.id) {
      // Already locked by someone else: don't steal it, just resend the
      // current state so the requester's UI stays consistent.
      client.emit('locks-update', this.serializeLocks(payload.diagramId));
      return;
    }

    roomLocks.set(payload.classId, {
      socketId: client.id,
      userId: (client.data.userId as string) ?? `guest:${client.id}`,
      editorName: (client.data.editorName as string) ?? 'Otro usuario',
      lockedAt: new Date(),
    });
    this.server
      .in(payload.diagramId)
      .emit('locks-update', this.serializeLocks(payload.diagramId));
    this.persistLocks(payload.diagramId);
  }

  @SubscribeMessage('unlock-class')
  handleUnlock(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LockPayload,
  ) {
    const roomLocks = this.locks.get(payload.diagramId);
    const existing = roomLocks?.get(payload.classId);
    if (!roomLocks || !existing || existing.socketId !== client.id) return;

    roomLocks.delete(payload.classId);
    this.server
      .in(payload.diagramId)
      .emit('locks-update', this.serializeLocks(payload.diagramId));
    this.persistLocks(payload.diagramId);
  }

  handleDisconnect(client: Socket) {
    const diagramId = client.data?.diagramId as string | undefined;
    if (!diagramId) return;

    const roomLocks = this.locks.get(diagramId);
    if (roomLocks) {
      let releasedAny = false;
      for (const [classId, lock] of roomLocks) {
        if (lock.socketId === client.id) {
          roomLocks.delete(classId);
          releasedAny = true;
        }
      }
      if (releasedAny) {
        setImmediate(() =>
          this.server.in(diagramId).emit('locks-update', this.serializeLocks(diagramId)),
        );
        this.persistLocks(diagramId);
      }
    }

    setImmediate(() => {
      void this.broadcastPresence(diagramId);
      void this.markLeft(diagramId, client.data.userId as string | undefined);
    });
  }

  /** Marks the user offline in the session; pauses it when the room is empty. */
  private async markLeft(diagramId: string, userId: string | undefined) {
    if (!userId) return;
    try {
      const sockets = await this.server.in(diagramId).fetchSockets();
      const online = [...new Set(sockets.map((s) => s.data.userId as string).filter(Boolean))];
      await this.sessionsService.leave(diagramId, userId, online);
    } catch (err) {
      this.logger.warn(`No se pudo actualizar la sesión de ${diagramId}: ${String(err)}`);
    }
  }

  private persistLocks(diagramId: string) {
    const roomLocks = this.locks.get(diagramId) ?? new Map<string, ClassLock>();
    const snapshot = Object.fromEntries(
      [...roomLocks.entries()].map(([classId, lock]) => [
        classId,
        { userId: lock.userId, userName: lock.editorName, lockedAt: lock.lockedAt },
      ]),
    );
    this.sessionsService
      .saveLocks(diagramId, snapshot)
      .catch((err) => this.logger.warn(`No se pudieron guardar los locks de ${diagramId}: ${String(err)}`));
  }

  private serializeLocks(diagramId: string): Record<string, { editorName: string }> {
    const roomLocks = this.locks.get(diagramId);
    if (!roomLocks) return {};
    return Object.fromEntries(
      [...roomLocks.entries()].map(([classId, lock]) => [
        classId,
        { editorName: lock.editorName },
      ]),
    );
  }

  private async broadcastPresence(diagramId: string) {
    const sockets = await this.server.in(diagramId).fetchSockets();
    this.server.in(diagramId).emit('presence', { count: sockets.length });
  }
}
