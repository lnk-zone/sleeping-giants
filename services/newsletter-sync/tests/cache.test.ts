import { describe, expect, it } from 'vitest';
import {
  clampTtlMinutes,
  computeBackoffDelayMinutes,
  computeNextExpiry,
  shouldWarmCache,
  type IssueCacheStateRow,
} from '../src/cache.js';

const baseState: IssueCacheStateRow = {
  id: 'state-id',
  tenant_id: 'tenant',
  newsletter_id: 'newsletter',
  last_warmed_at: null,
  expires_at: null,
  retry_count: 0,
  next_retry_at: null,
  last_error: null,
  status: 'idle',
  metadata: {},
};

describe('cache helpers', () => {
  it('clamps ttl to the expected range', () => {
    expect(clampTtlMinutes(5)).toBe(15);
    expect(clampTtlMinutes(15)).toBe(15);
    expect(clampTtlMinutes(42)).toBe(42);
    expect(clampTtlMinutes(120)).toBe(60);
    expect(clampTtlMinutes(Number.NaN)).toBe(15);
  });

  it('computes exponential backoff between 5 and 60 minutes', () => {
    expect(computeBackoffDelayMinutes(0)).toBe(5);
    expect(computeBackoffDelayMinutes(1)).toBe(5);
    expect(computeBackoffDelayMinutes(2)).toBe(10);
    expect(computeBackoffDelayMinutes(3)).toBe(20);
    expect(computeBackoffDelayMinutes(4)).toBe(40);
    expect(computeBackoffDelayMinutes(5)).toBe(60);
    expect(computeBackoffDelayMinutes(10)).toBe(60);
  });

  it('computes the next expiry timestamp using ttl minutes', () => {
    const now = new Date('2024-05-01T00:00:00.000Z');
    const expiry = computeNextExpiry(now, 30);
    expect(expiry).toBe('2024-05-01T00:30:00.000Z');
  });

  it('allows warming when cache is missing or expired', () => {
    const now = new Date('2024-05-01T00:00:00.000Z');
    expect(shouldWarmCache(null, now)).toBe(true);

    const expiredState: IssueCacheStateRow = {
      ...baseState,
      expires_at: '2024-04-30T23:30:00.000Z',
      status: 'warm',
    };
    expect(shouldWarmCache(expiredState, now)).toBe(true);
  });

  it('blocks warming when a retry backoff is active', () => {
    const now = new Date('2024-05-01T00:00:00.000Z');
    const state: IssueCacheStateRow = {
      ...baseState,
      next_retry_at: '2024-05-01T00:05:00.000Z',
      status: 'error',
    };
    expect(shouldWarmCache(state, now)).toBe(false);
  });

  it('blocks warming while cache is still fresh', () => {
    const now = new Date('2024-05-01T00:00:00.000Z');
    const state: IssueCacheStateRow = {
      ...baseState,
      expires_at: '2024-05-01T00:30:00.000Z',
      status: 'warm',
    };
    expect(shouldWarmCache(state, now)).toBe(false);
  });
});
