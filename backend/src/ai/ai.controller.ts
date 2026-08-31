import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { ChatDto } from './dto/chat.dto.js';
import { InterpretPhotoDto } from './dto/interpret-photo.dto.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto.message);
  }

  @Post('interpret-photo')
  interpretPhoto(@Body() dto: InterpretPhotoDto) {
    return this.aiService.interpretDiagramPhoto(dto.imageBase64, dto.mediaType);
  }
}
