import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DiagramDocument } from './schemas/diagram.schema.js';
import { ActivityLogDocument } from './schemas/activity-log.schema.js';
import type { Actor } from './schemas/author.schema.js';
import { CreateDiagramDto } from './dto/create-diagram.dto.js';
import { UpdateDiagramDto } from './dto/update-diagram.dto.js';
import { applyAuthorship, diffModel, type ModelChange } from './authorship.util.js';
import type { AuthorSource, AuthorStamp, UmlModel } from './uml.types.js';
import type { JwtPayload } from '../auth/auth.service.js';

const HISTORY_PAGE_SIZE = 50;

/** Public shape of a diagram (what the controller returns and the generator consumes). */
export interface Diagram {
  id: string;
  name: string;
  model: UmlModel;
  createdBy?: Actor;
  lastModifiedBy?: Actor;
  createdAt: Date;
  updatedAt: Date;
}

/** Same shape the frontend's HistoryPanel already renders, plus the structured fields. */
export interface DiagramHistoryEntry {
  id: string;
  diagramId: string;
  userId: string;
  userName: string;
  summary: string;
  createdAt: Date;
  action: ModelChange['action'];
  target: ModelChange['target'];
}

@Injectable()
export class DiagramsService {
  constructor(
    @InjectModel(DiagramDocument.name)
    private readonly diagramModel: Model<DiagramDocument>,
    @InjectModel(ActivityLogDocument.name)
    private readonly activityModel: Model<ActivityLogDocument>,
  ) {}

  async create(
    dto: CreateDiagramDto,
    author?: JwtPayload,
    source: AuthorSource = 'MANUAL',
  ): Promise<Diagram> {
    const stamp = author ? toStamp(author, source) : undefined;
    const model = stamp ? applyAuthorship(undefined, dto.model, stamp) : dto.model;
    const actor = author ? toActor(author) : undefined;

    const saved = await this.diagramModel.create({
      name: dto.name,
      model,
      createdBy: actor,
      lastModifiedBy: actor,
    });

    if (author) {
      const created: ModelChange = {
        action: source === 'XMI_IMPORT' ? 'DIAGRAM_IMPORTED' : 'DIAGRAM_CREATED',
        target: { entityType: 'DIAGRAM', entityId: saved._id, entityName: saved.name },
        details: { source },
        summary: source === 'XMI_IMPORT' ? `Importó el diagrama desde XMI` : 'Creó el diagrama',
      };
      await this.logChanges(saved._id, author, [created, ...diffModel(undefined, model)]);
    }
    return toDiagram(saved.toObject());
  }

  async findAll(): Promise<Diagram[]> {
    const docs = await this.diagramModel.find().sort({ updatedAt: -1 }).lean();
    return docs.map(toDiagram);
  }

  async findOne(id: string): Promise<Diagram> {
    const doc = await this.diagramModel.findById(id).lean();
    if (!doc) {
      throw new NotFoundException(`Diagram ${id} not found`);
    }
    return toDiagram(doc);
  }

  async update(
    id: string,
    dto: UpdateDiagramDto,
    author?: JwtPayload,
    source: AuthorSource = 'MANUAL',
  ): Promise<Diagram> {
    const current = await this.findOne(id);
    const changes: ModelChange[] = [];
    const set: Partial<DiagramDocument> = {};

    if (dto.name !== undefined && dto.name !== current.name) {
      set.name = dto.name;
      changes.push({
        action: 'DIAGRAM_RENAMED',
        target: { entityType: 'DIAGRAM', entityId: id, entityName: dto.name },
        details: { from: current.name, to: dto.name },
        summary: `Renombró el diagrama a ${dto.name}`,
      });
    }

    if (dto.model) {
      // Authorship is computed from the stored model, never trusted from the client.
      set.model = author
        ? applyAuthorship(current.model, dto.model, toStamp(author, source))
        : dto.model;
      changes.push(...diffModel(current.model, dto.model));
    }

    if (author && changes.length) set.lastModifiedBy = toActor(author);

    const saved = await this.diagramModel
      .findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' })
      .lean();
    if (!saved) {
      throw new NotFoundException(`Diagram ${id} not found`);
    }

    if (author && changes.length) {
      await this.logChanges(id, author, changes);
    }
    return toDiagram(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.diagramModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Diagram ${id} not found`);
    }
  }

  async getHistory(diagramId: string): Promise<DiagramHistoryEntry[]> {
    const logs = await this.activityModel
      .find({ diagramId })
      .sort({ timestamp: -1 })
      .limit(HISTORY_PAGE_SIZE)
      .lean();
    return logs.map((log) => ({
      id: String(log._id),
      diagramId: log.diagramId,
      userId: log.actor.userId,
      userName: log.actor.userName,
      summary: log.summary,
      createdAt: log.timestamp,
      action: log.action,
      target: log.target,
    }));
  }

  private async logChanges(
    diagramId: string,
    author: JwtPayload,
    changes: ModelChange[],
  ): Promise<void> {
    if (!changes.length) return;
    const actor = toActor(author);
    const timestamp = new Date();
    await this.activityModel.insertMany(
      changes.map((change) => ({ diagramId, actor, timestamp, ...change })),
    );
  }
}

function toActor(user: JwtPayload): Actor {
  return { userId: user.sub, userName: user.name, type: 'USER' };
}

function toStamp(user: JwtPayload, source: AuthorSource): AuthorStamp {
  return { userId: user.sub, userName: user.name, timestamp: new Date().toISOString(), source };
}

function toDiagram(doc: DiagramDocument): Diagram {
  return {
    id: doc._id,
    name: doc.name,
    model: doc.model,
    createdBy: doc.createdBy,
    lastModifiedBy: doc.lastModifiedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
