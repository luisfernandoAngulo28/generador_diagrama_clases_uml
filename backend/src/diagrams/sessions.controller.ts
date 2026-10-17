import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /** Restores a continuous session: session state + recent activity + group chat. */
  @Get(':diagramId/latest')
  async latest(@Param('diagramId') diagramId: string) {
    const state = await this.sessionsService.getInitState(diagramId);
    if (!state.session) {
      throw new NotFoundException(`No hay sesión para el diagrama ${diagramId}`);
    }
    return state;
  }
}
