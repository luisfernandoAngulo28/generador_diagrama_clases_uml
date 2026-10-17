import { Module } from '@nestjs/common';
import { DiagramsModule } from '../diagrams/diagrams.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ModeratorService } from './moderator/moderator.service.js';

@Module({
  imports: [DiagramsModule],
  controllers: [AiController],
  providers: [AiService, ModeratorService],
  exports: [AiService, ModeratorService],
})
export class AiModule {}
