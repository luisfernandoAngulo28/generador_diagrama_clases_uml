import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { ModeratorService } from './moderator/moderator.service.js';
import { EditDiagramDto } from './dto/edit-diagram.dto.js';
import { InterpretPhotoDto } from './dto/interpret-photo.dto.js';
import { AskModeratorDto } from './dto/ask-moderator.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly moderatorService: ModeratorService,
  ) {}

  @Post('edit')
  edit(@Body() dto: EditDiagramDto) {
    return this.aiService.editDiagram(dto.message, dto.model);
  }

  @Post('interpret-photo')
  interpretPhoto(@Body() dto: InterpretPhotoDto) {
    return this.aiService.interpretDiagramPhoto(dto.imageBase64, dto.mediaType);
  }

  /** Public group chat: asks the moderator in a diagram's room (the WebSocket version arrives in Semana 3). */
  @Post('moderator/:diagramId')
  askModerator(
    @Param('diagramId') diagramId: string,
    @Body() dto: AskModeratorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.moderatorService.ask(diagramId, user, dto.message);
  }
}
