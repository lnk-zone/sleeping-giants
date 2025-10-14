import { Injectable } from '@nestjs/common';
import type { StreakEntry } from '@sleeping-giants/shared/contracts.js';

export class InsufficientDwellError extends Error {
  constructor(public readonly dwellSeconds: number) {
    super(`Dwell time ${dwellSeconds}s is below the 30s threshold.`);
    this.name = 'InsufficientDwellError';
  }
}

interface StreakState {
  count: number;
  lastCompletedAt?: number;
  entries: StreakEntry[];
}

const MAX_GAP_MS = 36 * 60 * 60 * 1000; // allow some flexibility across timezones

const isSameDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

@Injectable()
export class StreaksRepository {
  private readonly store = new Map<string, StreakState>();

  async recordCompletion(
    userId: string,
    completedAt: Date,
    dwellSeconds: number,
  ): Promise<StreakEntry> {
    if (dwellSeconds < 30) {
      throw new InsufficientDwellError(dwellSeconds);
    }

    const timestamp = completedAt.getTime();
    const state = this.store.get(userId) ?? { count: 0, entries: [] };
    const lastEntry = state.entries[state.entries.length - 1];

    if (lastEntry) {
      const lastDate = new Date(lastEntry.date);
      if (isSameDay(lastDate, completedAt)) {
        return lastEntry;
      }
    }

    const hasStreak = typeof state.lastCompletedAt === 'number';
    const withinWindow = hasStreak
      ? timestamp - (state.lastCompletedAt as number) <= MAX_GAP_MS
      : false;

    const nextCount = withinWindow ? state.count + 1 : 1;
    const entry: StreakEntry = {
      date: completedAt.toISOString(),
      completed: true,
      count: nextCount,
    };

    this.store.set(userId, {
      count: nextCount,
      lastCompletedAt: timestamp,
      entries: [...state.entries, entry].slice(-30),
    });

    return entry;
  }

  async history(userId: string): Promise<StreakEntry[]> {
    const state = this.store.get(userId);
    if (!state) {
      return [];
    }
    return [...state.entries];
  }
}
