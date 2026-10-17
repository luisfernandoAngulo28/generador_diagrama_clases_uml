import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Schema as MongooseSchema } from 'mongoose';
import type { UmlModel } from '../uml.types.js';
import { Actor, ActorSchema } from './author.schema.js';

/**
 * A UML class diagram as one MongoDB document. The model is a tree
 * (classes → attributes, relations) with authorship stamps embedded in each
 * element, so it's stored as-is instead of being normalized into tables.
 *
 * `_id` is a UUID string (not an ObjectId) so diagrams migrated from
 * PostgreSQL keep their ids, and frontend URLs / XMI exports keep working.
 */
@Schema({ collection: 'diagrams', timestamps: true, versionKey: false })
export class DiagramDocument {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  model: UmlModel;

  @Prop({ type: ActorSchema })
  createdBy?: Actor;

  @Prop({ type: ActorSchema })
  lastModifiedBy?: Actor;

  createdAt: Date;
  updatedAt: Date;
}

export const DiagramSchema = SchemaFactory.createForClass(DiagramDocument);
DiagramSchema.index({ updatedAt: -1 });
