import { Injectable } from '@nestjs/common';

interface SubscriptionRecord {
  readonly email: string;
  readonly subscribedAt: string;
}

@Injectable()
export class SubscriptionService {
  private readonly subscribers = new Map<string, SubscriptionRecord>();

  async subscribe(email: string, timestamp: Date = new Date()): Promise<SubscriptionRecord> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.subscribers.get(normalizedEmail);
    if (existing) {
      return existing;
    }
    const record: SubscriptionRecord = {
      email: normalizedEmail,
      subscribedAt: timestamp.toISOString(),
    };
    this.subscribers.set(normalizedEmail, record);
    return record;
  }

  async count(): Promise<number> {
    return this.subscribers.size;
  }
}
