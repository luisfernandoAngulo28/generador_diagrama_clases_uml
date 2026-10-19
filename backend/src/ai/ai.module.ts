import { Module } from '@nestjs/common';
import { DiagramsModule } from '../diagrams/diagrams.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ChatGateway } from './chat/chat.gateway.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ModeratorService } from './moderator/moderator.service.js';

@Module({
  imports: [DiagramsModule, AuthModule],
  controllers: [AiController],
  providers: [AiService, ModeratorService, ChatGateway],
  exports: [AiService, ModeratorService],
})
export class AiModule {}
