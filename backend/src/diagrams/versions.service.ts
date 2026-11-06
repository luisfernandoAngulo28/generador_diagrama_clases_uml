import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DiagramVersionDocument } from './schemas/diagram-version.schema.js';
import type { Actor } from './schemas/author.schema.js';
import type { AuthorSource, UmlModel } from './uml.types.js';

/** Saves of the same person closer than this are one version. */
export const VERSION_MERGE_WINDOW_MS = 10 * 60 * 1000;
const VERSIONS_PAGE_SIZE = 50;

export interface VersionSummary {
  id: string;
  number: number;
  name: string;
  author: Actor;
  source: AuthorSource;
  changesCount: number;
  summary: string;
  restoredFrom?: number;
  classCount: number;
  relationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewVersion {
  diagramId: string;
  name: string;
  model: UmlModel;
  author: Actor;
  source: AuthorSource;
  changesCount: number;
  summary: string;
  restoredFrom?: number;
}

type LastVersion = Pick<DiagramVersionDocument, 'author' | 'source' | 'restoredFrom' | 'updatedAt'>;

/**
 * Whether a new save extends the latest version instead of opening a new one:
 * same person, same source (a change made by the AI is its own version), the
 * latest is not a restore (a restore is a milestone), and it is recent.
 */
export function extendsLastVersion(last: LastVersion | null, next: NewVersion, now: Date): boolean {
  if (!last || next.restoredFrom !== undefined || last.restoredFrom !== undefined) return false;
  return (
    last.author.userId === next.author.userId &&
    last.source === next.source &&
    now.getTime() - new Date(last.updatedAt).getTime() < VERSION_MERGE_WINDOW_MS
  );
}

@Injectable()
export class VersionsService {
  constructor(
    @InjectModel(DiagramVersionDocument.name)
    private readonly versionModel: Model<DiagramVersionDocument>,
  ) {}

  /** Records the model after a save with real changes. */
  async record(next: NewVersion, now = new Date()): Promise<void> {
    const last = await this.versionModel
      .findOne({ diagramId: next.diagramId })
      .sort({ number: -1 })
      .lean();
    if (last && extendsLastVersion(last, next, now)) {
      await this.versionModel.updateOne(
        { _id: last._id },
        {
          $set: { name: next.name, model: next.model, summary: next.summary || last.summary },
          $inc: { changesCount: next.changesCount },
        },
      );
      return;
    }
    await this.versionModel.create({ ...next, number: (last?.number ?? 0) + 1 });
  }

  async list(diagramId: string): Promise<VersionSummary[]> {
    const docs = await this.versionModel
      .find({ diagramId })
      .sort({ number: -1 })
      .limit(VERSIONS_PAGE_SIZE)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      number: d.number,
      name: d.name,
      author: d.author,
      source: d.source,
      changesCount: d.changesCount,
      summary: d.summary,
      restoredFrom: d.restoredFrom,
      classCount: d.model?.classes?.length ?? 0,
      relationCount: d.model?.relations?.length ?? 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async findOne(diagramId: string, versionId: string): Promise<DiagramVersionDocument> {
    const doc = await this.versionModel.findOne({ _id: versionId, diagramId }).lean();
    if (!doc) throw new NotFoundException(`Version ${versionId} not found`);
    return doc;
  }
}
