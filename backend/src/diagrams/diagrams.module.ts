import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagramsService } from './diagrams.service.js';
import { DiagramsController } from './diagrams.controller.js';
import { DiagramsGateway } from './diagrams.gateway.js';
import { Diagram } from './entities/diagram.entity.js';
import { DiagramHistoryEntry } from './entities/diagram-history-entry.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Diagram, DiagramHistoryEntry])],
  controllers: [DiagramsController],
  providers: [DiagramsService, DiagramsGateway],
  exports: [TypeOrmModule, DiagramsService],
})
export class DiagramsModule {}
