import type { Issue } from '@sleeping-giants/shared/contracts.js';

export interface IssueCache {
  get<T = Issue>(key: string): Promise<T | undefined> | T | undefined;
  set<T = Issue>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttl: number): Promise<unknown>;
  del(key: string): Promise<number>;
  flushall?(async?: 'ASYNC'): Promise<unknown>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const clampTtl = (minutes: number): number => {
  const min = 15 * 60 * 1000;
  const max = 60 * 60 * 1000;
  const ttlMs = minutes * 60 * 1000;
  if (ttlMs < min) {
    return min;
  }
  if (ttlMs > max) {
    return max;
  }
  return ttlMs;
};

export class InMemoryIssueCache implements IssueCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;

  constructor(ttlMinutes = 30) {
    this.ttlMs = clampTtl(ttlMinutes);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = Date.now() + (ttlMs ?? this.ttlMs);
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class RedisIssueCache implements IssueCache {
  private readonly client: RedisLikeClient;
  private readonly ttlMs: number;

  constructor(client: RedisLikeClient, ttlMinutes = 30) {
    this.client = client;
    this.ttlMs = clampTtl(ttlMinutes);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key);
    if (!raw) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const payload = JSON.stringify(value);
    await this.client.set(key, payload, 'PX', ttlMs ?? this.ttlMs);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    if (typeof this.client.flushall === 'function') {
      await this.client.flushall('ASYNC');
    }
  }
}

export const createIssueCacheKey = (id: string): string => `issue:${id}`;
