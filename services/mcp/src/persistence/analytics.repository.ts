import { Injectable } from '@nestjs/common';
import type { AnalyticsEvent } from '@sleeping-giants/shared/contracts.js';

@Injectable()
export class AnalyticsRepository {
  private readonly events: AnalyticsEvent[] = [];

  async record(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async list(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async clear(): Promise<void> {
    this.events.length = 0;
  }
}
