import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DiagramsService } from './diagrams.service.js';
import { CreateDiagramDto } from './dto/create-diagram.dto.js';
import { UpdateDiagramDto } from './dto/update-diagram.dto.js';

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
