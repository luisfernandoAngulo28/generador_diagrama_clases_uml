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

@WebSocketGateway({ cors: { origin: '*' } })
export class DiagramsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-diagram')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() diagramId: string,
  ) {
    client.data.diagramId = diagramId;
    client.join(diagramId);
    this.broadcastPresence(diagramId);
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

  handleDisconnect(client: Socket) {
    const diagramId = client.data?.diagramId as string | undefined;
    if (diagramId) {
      setImmediate(() => this.broadcastPresence(diagramId));
    }
  }

  private async broadcastPresence(diagramId: string) {
    const sockets = await this.server.in(diagramId).fetchSockets();
    this.server.in(diagramId).emit('presence', { count: sockets.length });
  }
}
