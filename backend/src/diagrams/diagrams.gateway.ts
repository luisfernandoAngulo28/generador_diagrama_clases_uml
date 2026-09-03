import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
  editorName: string;
}

/**
 * Pessimistic per-class lock, inspired by Enterprise Architect's Settings >
 * Locks: whoever opens a class to edit it "checks it out" for the room, so
 * two people can't silently overwrite each other's edit to the same class.
 * In-memory only (per server process), same durability tier as `presence`.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class DiagramsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // diagramId -> classId -> lock
  private readonly locks = new Map<string, Map<string, ClassLock>>();

  @SubscribeMessage('join-diagram')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string | { diagramId: string; userName?: string },
  ) {
    const diagramId = typeof payload === 'string' ? payload : payload.diagramId;
    const userName = typeof payload === 'string' ? undefined : payload.userName?.trim();

    client.data.diagramId = diagramId;
    client.data.editorName = userName || `Usuario ${client.id.slice(0, 4).toUpperCase()}`;
    client.join(diagramId);
    this.broadcastPresence(diagramId);
    client.emit('locks-update', this.serializeLocks(diagramId));
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
      editorName: (client.data.editorName as string) ?? 'Otro usuario',
    });
    this.server
      .in(payload.diagramId)
      .emit('locks-update', this.serializeLocks(payload.diagramId));
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
      }
    }

    setImmediate(() => this.broadcastPresence(diagramId));
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
