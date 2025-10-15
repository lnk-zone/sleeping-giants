export interface IssueCacheStateRow {
  id: string;
  tenant_id: string;
  newsletter_id: string;
  last_warmed_at: string | null;
  expires_at: string | null;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
}

export const MIN_CACHE_TTL_MINUTES = 15;
export const MAX_CACHE_TTL_MINUTES = 60;

export const clampTtlMinutes = (value: number): number => {
  if (!Number.isFinite(value)) {
    return MIN_CACHE_TTL_MINUTES;
  }
  return Math.max(MIN_CACHE_TTL_MINUTES, Math.min(MAX_CACHE_TTL_MINUTES, value));
};

export const computeBackoffDelayMinutes = (retryCount: number): number => {
  if (!Number.isFinite(retryCount) || retryCount <= 0) {
    return 5;
  }
  const exponent = Math.max(retryCount - 1, 0);
  const delay = Math.pow(2, exponent) * 5;
  return Math.min(delay, MAX_CACHE_TTL_MINUTES);
};

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const computeNextExpiry = (now: Date, ttlMinutes: number): string => {
  const ttl = clampTtlMinutes(ttlMinutes);
  const ms = ttl * 60 * 1000;
  return new Date(now.getTime() + ms).toISOString();
};

export const shouldWarmCache = (
  state: IssueCacheStateRow | null,
  now: Date,
): boolean => {
  if (!state) {
    return true;
  }

  if (state.status === 'warming') {
    const expiresAt = toDate(state.expires_at);
    if (expiresAt && expiresAt.getTime() > now.getTime()) {
      return false;
    }
  }

  const nextRetry = toDate(state.next_retry_at);
  if (nextRetry && nextRetry.getTime() > now.getTime()) {
    return false;
  }

  const expiresAt = toDate(state.expires_at);
  if (expiresAt && expiresAt.getTime() > now.getTime()) {
    return false;
  }

  return true;
};
