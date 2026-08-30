import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagram } from './entities/diagram.entity.js';
import { CreateDiagramDto } from './dto/create-diagram.dto.js';
import { UpdateDiagramDto } from './dto/update-diagram.dto.js';

@Injectable()
export class DiagramsService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramsRepository: Repository<Diagram>,
  ) {}

  create(dto: CreateDiagramDto): Promise<Diagram> {
    const diagram = this.diagramsRepository.create(dto);
    return this.diagramsRepository.save(diagram);
  }

  findAll(): Promise<Diagram[]> {
    return this.diagramsRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Diagram> {
    const diagram = await this.diagramsRepository.findOneBy({ id });
    if (!diagram) {
      throw new NotFoundException(`Diagram ${id} not found`);
    }
    return diagram;
  }

  async update(id: string, dto: UpdateDiagramDto): Promise<Diagram> {
    const diagram = await this.findOne(id);
    Object.assign(diagram, dto);
    return this.diagramsRepository.save(diagram);
  }

  async remove(id: string): Promise<void> {
    const diagram = await this.findOne(id);
    await this.diagramsRepository.remove(diagram);
  }
}
