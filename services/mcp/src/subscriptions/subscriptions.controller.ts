import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { parseWithSchema } from '../common/validation.js';
import { SubscriptionService } from './subscription.service.js';

const SubscriptionSchema = z.object({
  email: z.string().email(),
  occurredAt: z.string().datetime().optional(),
});

@Controller('subscribe')
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  @HttpCode(202)
  async subscribe(
    @Body() body: unknown,
  ): Promise<{ status: 'subscribed'; subscribedAt: string }> {
    const payload = parseWithSchema(SubscriptionSchema, body);
    const subscribed = await this.subscriptionService.subscribe(
      payload.email,
      payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
    );
    return { status: 'subscribed', subscribedAt: subscribed.subscribedAt };
  }
}
