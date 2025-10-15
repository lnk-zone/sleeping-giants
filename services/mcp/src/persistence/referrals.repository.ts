import { Inject, Injectable } from '@nestjs/common';
import {
  ReferralProgressSchema,
  ReferralStatus,
  type ReferralMilestone,
  type ReferralProgress,
} from '@sleeping-giants/shared/contracts.js';
import { APP_CONFIG, type McpConfig } from '../config.js';

type ReferralRecord = {
  readonly referrals: Map<string, string>;
  readonly achievedAt: Map<number, string>;
};

const cloneMilestone = (milestone: ReferralMilestone): ReferralMilestone => ({
  target: milestone.target,
  reward: milestone.reward,
  achievedAt: milestone.achievedAt,
});

@Injectable()
export class ReferralsRepository {
  private readonly store = new Map<string, ReferralRecord>();
  private readonly milestones: readonly ReferralMilestone[];
  private readonly tenantId: string;

  constructor(@Inject(APP_CONFIG) config: McpConfig) {
    this.milestones = config.referralMilestones;
    this.tenantId = config.tenantId;
  }

  private getOrCreate(code: string): ReferralRecord {
    const existing = this.store.get(code);
    if (existing) {
      return existing;
    }
    const record: ReferralRecord = {
      referrals: new Map<string, string>(),
      achievedAt: new Map<number, string>(),
    };
    this.store.set(code, record);
    return record;
  }

  private toProgress(code: string, record: ReferralRecord): ReferralProgress {
    const totalReferrals = record.referrals.size;
    const milestones = this.milestones.map((milestone) => {
      const achievedAt = record.achievedAt.get(milestone.target);
      return { ...cloneMilestone(milestone), achievedAt };
    });
    const finalTarget =
      this.milestones[this.milestones.length - 1]?.target ?? Number.POSITIVE_INFINITY;
    const status =
      totalReferrals === 0
        ? ReferralStatus.NOT_STARTED
        : totalReferrals >= finalTarget
        ? ReferralStatus.COMPLETED
        : ReferralStatus.IN_PROGRESS;
    const nextMilestone = this.milestones.find((milestone) => totalReferrals < milestone.target);

    return ReferralProgressSchema.parse({
      tenantId: this.tenantId,
      code,
      totalReferrals,
      status,
      milestones,
      nextMilestone: nextMilestone ? cloneMilestone(nextMilestone) : undefined,
    });
  }

  async recordReferral(code: string, userId: string, occurredAt: Date): Promise<ReferralProgress> {
    const record = this.getOrCreate(code);
    if (!record.referrals.has(userId)) {
      record.referrals.set(userId, occurredAt.toISOString());
      for (const milestone of this.milestones) {
        if (record.referrals.size >= milestone.target && !record.achievedAt.has(milestone.target)) {
          record.achievedAt.set(milestone.target, occurredAt.toISOString());
        }
      }
    }
    return this.toProgress(code, record);
  }

  async getProgress(code: string): Promise<ReferralProgress> {
    const record = this.getOrCreate(code);
    return this.toProgress(code, record);
  }
}
