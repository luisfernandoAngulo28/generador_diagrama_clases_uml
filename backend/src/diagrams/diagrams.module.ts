import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { DiagramsService } from './diagrams.service.js';
import { DiagramsController } from './diagrams.controller.js';
import { DiagramsGateway } from './diagrams.gateway.js';
import { SessionsService } from './sessions.service.js';
import { SessionsController } from './sessions.controller.js';
import { DiagramDocument, DiagramSchema } from './schemas/diagram.schema.js';
import { ActivityLogDocument, ActivityLogSchema } from './schemas/activity-log.schema.js';
import {
  DiagramSessionDocument,
  DiagramSessionSchema,
} from './schemas/diagram-session.schema.js';
import {
  GroupChatMessageDocument,
  GroupChatMessageSchema,
} from './schemas/group-chat-message.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DiagramDocument.name, schema: DiagramSchema },
      { name: ActivityLogDocument.name, schema: ActivityLogSchema },
      { name: DiagramSessionDocument.name, schema: DiagramSessionSchema },
      { name: GroupChatMessageDocument.name, schema: GroupChatMessageSchema },
    ]),
  ],
  controllers: [DiagramsController, SessionsController],
  providers: [DiagramsService, SessionsService, DiagramsGateway],
  exports: [MongooseModule, DiagramsService, SessionsService],
})
export class DiagramsModule {}
