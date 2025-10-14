import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import {
  AnalyticsEventSchema,
  type AnalyticsEvent,
} from '@sleeping-giants/shared/contracts.js';
import { parseWithSchema } from '../common/validation.js';
import { AnalyticsRepository } from '../persistence/analytics.repository.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsRepository)
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  @Post('events')
  @HttpCode(202)
  async ingest(@Body() body: unknown): Promise<{ accepted: true }> {
    const event = parseWithSchema(AnalyticsEventSchema, body) as AnalyticsEvent;
    await this.analyticsRepository.record(event);
    return { accepted: true } as const;
  }

  @Get('events')
  async list(): Promise<AnalyticsEvent[]> {
    const events = await this.analyticsRepository.list();
    return events.map((event) => AnalyticsEventSchema.parse(event));
  }
}
