import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DiagramsService } from './diagrams.service.js';
import { CreateDiagramDto } from './dto/create-diagram.dto.js';
import { UpdateDiagramDto } from './dto/update-diagram.dto.js';
import { ImportXmiDto } from './dto/import-xmi.dto.js';
import { renderXmi } from './xmi.util.js';
import { parseXmi } from './xmi-import.util.js';
import { validateModel } from './validation.util.js';
import { renderDocumentationHtml } from './documentation.util.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';

@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post()
  create(@Body() dto: CreateDiagramDto, @CurrentUser() user: JwtPayload) {
    return this.diagramsService.create(dto, user);
  }

  @Get()
  findAll() {
    return this.diagramsService.findAll();
  }

  @Post('import-xmi')
  async importXmi(@Body() dto: ImportXmiDto, @CurrentUser() user: JwtPayload) {
    let parsed: ReturnType<typeof parseXmi>;
    try {
      parsed = parseXmi(dto.xml);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'No se pudo interpretar el archivo XMI.',
      );
    }
    return this.diagramsService.create({ name: parsed.name, model: parsed.model }, user);
  }

  @Get(':id/xmi')
  async exportXmi(@Param('id') id: string, @Res() res: Response) {
    const diagram = await this.diagramsService.findOne(id);
    const xml = renderXmi(diagram.name, diagram.model);
    const filename = diagram.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'diagrama';

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xmi"`);
    res.send(xml);
  }

  @Get(':id/validate')
  async validate(@Param('id') id: string) {
    const diagram = await this.diagramsService.findOne(id);
    return validateModel(diagram.model);
  }

  @Get(':id/documentation')
  async exportDocumentation(@Param('id') id: string, @Res() res: Response) {
    const diagram = await this.diagramsService.findOne(id);
    const html = renderDocumentationHtml(diagram.name, diagram.model);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.diagramsService.getHistory(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diagramsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDiagramDto, @CurrentUser() user: JwtPayload) {
    return this.diagramsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diagramsService.remove(id);
  }
}
