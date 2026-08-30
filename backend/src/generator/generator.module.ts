import { Module } from '@nestjs/common';
import { DiagramsModule } from '../diagrams/diagrams.module.js';
import { GeneratorController } from './generator.controller.js';
import { GeneratorService } from './generator.service.js';

@Module({
  imports: [DiagramsModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class GeneratorModule {}
