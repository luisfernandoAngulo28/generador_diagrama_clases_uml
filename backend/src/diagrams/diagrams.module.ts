import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagramsService } from './diagrams.service.js';
import { DiagramsController } from './diagrams.controller.js';
import { Diagram } from './entities/diagram.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Diagram])],
  controllers: [DiagramsController],
  providers: [DiagramsService],
  exports: [TypeOrmModule, DiagramsService],
})
export class DiagramsModule {}
