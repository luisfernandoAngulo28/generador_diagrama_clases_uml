import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Actor, ActorSchema } from './author.schema.js';

export type ActivityAction =
  | 'DIAGRAM_CREATED'
  | 'DIAGRAM_RENAMED'
  | 'DIAGRAM_IMPORTED'
  | 'CLASS_CREATED'
  | 'CLASS_RENAMED'
  | 'CLASS_UPDATED'
  | 'CLASS_DELETED'
  | 'ATTRIBUTE_ADDED'
  | 'ATTRIBUTE_UPDATED'
  | 'ATTRIBUTE_REMOVED'
  | 'RELATION_CREATED'
  | 'RELATION_UPDATED'
  | 'RELATION_DELETED'
  | 'AI_REVIEW_PERFORMED'
  | 'AI_SETTINGS_CHANGED'
  /** Entry migrated from the 1er Parcial PostgreSQL history (free-text summary only). */
  | 'LEGACY_HISTORY';

export type ActivityEntityType = 'DIAGRAM' | 'CLASS' | 'ATTRIBUTE' | 'RELATION';

@Schema({ _id: false })
export class ActivityTarget {
  @Prop({ type: String, required: true })
  entityType: ActivityEntityType;

  @Prop()
  entityId?: string;

  @Prop()
  entityName?: string;
}

const ActivityTargetSchema = SchemaFactory.createForClass(ActivityTarget);

/**
 * Group activity log ("bitácora grupal"): one structured entry per change,
 * so the AI moderator can answer "¿qué hizo Marco?" from real data. Like the
 * old PostgreSQL history table, it has no FK to the diagram — entries
 * survive the diagram's deletion.
 */
@Schema({ collection: 'diagram_activity_logs', versionKey: false })
export class ActivityLogDocument {
  @Prop({ required: true })
  diagramId: string;

  @Prop({ type: ActorSchema, required: true })
  actor: Actor;

  @Prop({ type: String, required: true })
  action: ActivityAction;

  @Prop({ type: ActivityTargetSchema, required: true })
  target: ActivityTarget;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details: Record<string, unknown>;

  /** Human-readable sentence, e.g. "Agregó el atributo total a Pedido". */
  @Prop({ required: true })
  summary: string;

  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLogDocument);
ActivityLogSchema.index({ diagramId: 1, timestamp: -1 });
ActivityLogSchema.index({ diagramId: 1, 'actor.userId': 1, timestamp: -1 });
