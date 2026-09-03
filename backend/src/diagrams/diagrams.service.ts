import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagram } from './entities/diagram.entity.js';
import { DiagramHistoryEntry } from './entities/diagram-history-entry.entity.js';
import { CreateDiagramDto } from './dto/create-diagram.dto.js';
import { UpdateDiagramDto } from './dto/update-diagram.dto.js';
import { summarizeModelDiff } from './model-diff.util.js';
import type { JwtPayload } from '../auth/auth.service.js';

const HISTORY_PAGE_SIZE = 50;

@Injectable()
export class DiagramsService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramsRepository: Repository<Diagram>,
    @InjectRepository(DiagramHistoryEntry)
    private readonly historyRepository: Repository<DiagramHistoryEntry>,
  ) {}

  async create(dto: CreateDiagramDto, author?: JwtPayload): Promise<Diagram> {
    const diagram = this.diagramsRepository.create(dto);
    const saved = await this.diagramsRepository.save(diagram);
    if (author) {
      await this.logChange(saved.id, author, 'Creó el diagrama');
    }
    return saved;
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

  async update(id: string, dto: UpdateDiagramDto, author?: JwtPayload): Promise<Diagram> {
    const diagram = await this.findOne(id);
    const previousModel = diagram.model;
    Object.assign(diagram, dto);
    const saved = await this.diagramsRepository.save(diagram);

    if (author && dto.model) {
      const summary = summarizeModelDiff(previousModel, saved.model);
      await this.logChange(id, author, summary);
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const diagram = await this.findOne(id);
    await this.diagramsRepository.remove(diagram);
  }

  private async logChange(diagramId: string, author: JwtPayload, summary: string): Promise<void> {
    await this.historyRepository.save(
      this.historyRepository.create({
        diagramId,
        userId: author.sub,
        userName: author.name,
        summary,
      }),
    );
  }

  getHistory(diagramId: string): Promise<DiagramHistoryEntry[]> {
    return this.historyRepository.find({
      where: { diagramId },
      order: { createdAt: 'DESC' },
      take: HISTORY_PAGE_SIZE,
    });
  }
}
