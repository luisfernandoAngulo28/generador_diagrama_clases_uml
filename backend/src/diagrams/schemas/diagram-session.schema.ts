import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

@Schema({ _id: false })
export class SessionParticipant {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ default: 'editor' })
  role: string;

  @Prop({ type: Date, default: () => new Date() })
  joinedAt: Date;

  @Prop({ type: Date, default: () => new Date() })
  lastSeenAt: Date;

  @Prop({ default: false })
  online: boolean;
}

const SessionParticipantSchema = SchemaFactory.createForClass(SessionParticipant);

export interface PersistedLock {
  userId: string;
  userName: string;
  lockedAt: Date;
}

/**
 * Continuous work session on a diagram: who has worked on it and which
 * classes were checked out, so a room can be paused (everyone leaves) and
 * resumed later exactly where it was left. One ACTIVE/PAUSED session per
 * diagram; a CLOSED one is kept as history.
 */
@Schema({ collection: 'diagram_sessions', timestamps: true, versionKey: false })
export class DiagramSessionDocument {
  @Prop({ required: true, index: true })
  diagramId: string;

  @Prop({ type: String, enum: ['ACTIVE', 'PAUSED', 'CLOSED'], default: 'ACTIVE' })
  status: SessionStatus;

  @Prop({ type: Date, default: () => new Date() })
  startedAt: Date;

  @Prop({ type: Date, default: () => new Date() })
  lastActivityAt: Date;

  @Prop({ type: [SessionParticipantSchema], default: [] })
  participants: SessionParticipant[];

  /** classId -> lock holder. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  activeLocks: Record<string, PersistedLock>;
}

export const DiagramSessionSchema = SchemaFactory.createForClass(DiagramSessionDocument);
DiagramSessionSchema.index({ diagramId: 1, lastActivityAt: -1 });
