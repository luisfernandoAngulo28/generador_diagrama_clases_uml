import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Actor, ActorSchema } from './author.schema.js';
import type { AuthorSource, UmlModel } from '../uml.types.js';

/**
 * Version history of a diagram: a full snapshot of the model after each save
 * with real changes, so any earlier state can be restored. Consecutive saves of
 * the same person within a short window are merged into one version (the
 * 30-second autosave would otherwise create dozens). Like the bitácora, it has
 * no FK to the diagram.
 */
@Schema({ collection: 'diagram_versions', versionKey: false, timestamps: true })
export class DiagramVersionDocument {
  @Prop({ required: true, index: true })
  diagramId: string;

  /** 1, 2, 3… per diagram. */
  @Prop({ required: true })
  number: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  model: UmlModel;

  @Prop({ type: ActorSchema, required: true })
  author: Actor;

  @Prop({ type: String, required: true })
  source: AuthorSource;

  /** Model changes accumulated in this version (from diffModel). */
  @Prop({ default: 0 })
  changesCount: number;

  /** Last change, e.g. "Agregó el atributo total a Pedido". */
  @Prop({ default: '' })
  summary: string;

  /** Set when this version was created by restoring an earlier one. */
  @Prop()
  restoredFrom?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const DiagramVersionSchema = SchemaFactory.createForClass(DiagramVersionDocument);
DiagramVersionSchema.index({ diagramId: 1, number: -1 }, { unique: true });
