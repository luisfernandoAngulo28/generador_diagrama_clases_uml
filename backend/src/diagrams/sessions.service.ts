import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DiagramSessionDocument,
  type PersistedLock,
} from './schemas/diagram-session.schema.js';
import { ActivityLogDocument } from './schemas/activity-log.schema.js';
import { GroupChatMessageDocument } from './schemas/group-chat-message.schema.js';

const INIT_STATE_PAGE_SIZE = 50;

export interface SessionUser {
  userId: string;
  userName: string;
}

/**
 * Continuous sessions: a diagram's room is ACTIVE while someone is in it and
 * PAUSED when the last participant leaves; joining again resumes the same
 * session (participants, last activity) instead of starting from zero.
 *
 * The gateway keeps locks and presence in memory (fast path) and mirrors
 * them here; this is the durable copy used to restore context on reconnect.
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(DiagramSessionDocument.name)
    private readonly sessionModel: Model<DiagramSessionDocument>,
    @InjectModel(ActivityLogDocument.name)
    private readonly activityModel: Model<ActivityLogDocument>,
    @InjectModel(GroupChatMessageDocument.name)
    private readonly chatModel: Model<GroupChatMessageDocument>,
  ) {}

  /** Latest non-closed session of a diagram (ACTIVE or PAUSED), or null. */
  getLatest(diagramId: string) {
    return this.sessionModel
      .findOne({ diagramId, status: { $ne: 'CLOSED' } })
      .sort({ lastActivityAt: -1 })
      .lean();
  }

  /** Resumes (or starts) the diagram's session and marks the user online in it. */
  async join(diagramId: string, user: SessionUser) {
    const now = new Date();
    const existing = await this.getLatest(diagramId);
    if (!existing) {
      return (
        await this.sessionModel.create({
          diagramId,
          status: 'ACTIVE',
          startedAt: now,
          lastActivityAt: now,
          participants: [{ ...user, joinedAt: now, lastSeenAt: now, online: true }],
          activeLocks: {},
        })
      ).toObject();
    }

    const known = existing.participants.some((p) => p.userId === user.userId);
    const update = known
      ? {
          $set: {
            status: 'ACTIVE',
            lastActivityAt: now,
            'participants.$[p].online': true,
            'participants.$[p].lastSeenAt': now,
            'participants.$[p].userName': user.userName,
          },
        }
      : {
          $set: { status: 'ACTIVE', lastActivityAt: now },
          $push: { participants: { ...user, role: 'editor', joinedAt: now, lastSeenAt: now, online: true } },
        };
    return this.sessionModel
      .findByIdAndUpdate(existing._id, update, {
        returnDocument: 'after',
        arrayFilters: known ? [{ 'p.userId': user.userId }] : undefined,
      })
      .lean();
  }

  /**
   * Marks the user offline. `onlineUserIds` is who is still connected to the
   * room (from the gateway); when nobody is left the session is PAUSED.
   */
  async leave(diagramId: string, userId: string, onlineUserIds: string[]): Promise<void> {
    const session = await this.getLatest(diagramId);
    if (!session) return;
    const now = new Date();
    const stillHere = onlineUserIds.includes(userId);
    await this.sessionModel.updateOne(
      { _id: session._id },
      {
        $set: {
          lastActivityAt: now,
          ...(onlineUserIds.length === 0 ? { status: 'PAUSED' } : {}),
          ...(stillHere ? {} : { 'participants.$[p].online': false, 'participants.$[p].lastSeenAt': now }),
        },
      },
      { arrayFilters: stillHere ? undefined : [{ 'p.userId': userId }] },
    );
  }

  async saveLocks(diagramId: string, locks: Record<string, PersistedLock>): Promise<void> {
    await this.sessionModel.updateOne(
      { diagramId, status: { $ne: 'CLOSED' } },
      { $set: { activeLocks: locks, lastActivityAt: new Date() } },
    );
  }

  /** Everything a client needs to resume the room: session, recent activity and chat. */
  async getInitState(diagramId: string) {
    const [session, recentActivity, chat] = await Promise.all([
      this.getLatest(diagramId),
      this.activityModel
        .find({ diagramId })
        .sort({ timestamp: -1 })
        .limit(INIT_STATE_PAGE_SIZE)
        .lean(),
      this.chatModel
        .find({ diagramId })
        .sort({ timestamp: -1 })
        .limit(INIT_STATE_PAGE_SIZE)
        .lean(),
    ]);
    return {
      session,
      recentActivity,
      // Same shape as the live `chat:new-message` events ({ id, ... }).
      chat: chat.reverse().map(({ _id, ...message }) => ({ id: String(_id), ...message })),
    };
  }
}
