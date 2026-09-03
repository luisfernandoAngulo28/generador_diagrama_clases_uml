import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { EditDiagramDto } from './dto/edit-diagram.dto.js';
import { InterpretPhotoDto } from './dto/interpret-photo.dto.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('edit')
  edit(@Body() dto: EditDiagramDto) {
    return this.aiService.editDiagram(dto.message, dto.model);
  }

  @Post('interpret-photo')
  interpretPhoto(@Body() dto: InterpretPhotoDto) {
    return this.aiService.interpretDiagramPhoto(dto.imageBase64, dto.mediaType);
  }
}
