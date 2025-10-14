import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ReferralProgressSchema, type ReferralProgress } from '@sleeping-giants/shared/contracts.js';
import { z } from 'zod';
import { parseWithSchema } from '../common/validation.js';
import { ReferralsRepository } from '../persistence/referrals.repository.js';

const ReferralRecordSchema = z.object({
  userId: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
});

@Controller('referrals')
export class ReferralsController {
  constructor(
    @Inject(ReferralsRepository)
    private readonly referralsRepository: ReferralsRepository,
  ) {}

  @Post(':code')
  async record(
    @Param('code') code: string,
    @Body() body: unknown,
  ): Promise<ReferralProgress> {
    const payload = parseWithSchema(ReferralRecordSchema, body);
    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    const progress = await this.referralsRepository.recordReferral(
      code,
      payload.userId,
      occurredAt,
    );
    return ReferralProgressSchema.parse(progress);
  }

  @Get(':code')
  async get(@Param('code') code: string): Promise<ReferralProgress> {
    const progress = await this.referralsRepository.getProgress(code);
    return ReferralProgressSchema.parse(progress);
  }
}
