import {
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
import { renderXmi } from './xmi.util.js';

@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post()
  create(@Body() dto: CreateDiagramDto) {
    return this.diagramsService.create(dto);
  }

  @Get()
  findAll() {
    return this.diagramsService.findAll();
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diagramsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDiagramDto) {
    return this.diagramsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diagramsService.remove(id);
  }
}
