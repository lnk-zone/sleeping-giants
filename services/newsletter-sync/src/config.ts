import { clampTtlMinutes } from './cache.js';

export interface SyncConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  cacheTtlMinutes: number;
  assetsBucket: string;
  imageMaxWidth: number;
  imageQuality: number;
  maxRetryAttempts: number;
}

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optionalNumberEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const loadConfig = (): SyncConfig => {
  const ttlMinutes = clampTtlMinutes(
    optionalNumberEnv('NEWSLETTER_SYNC_CACHE_TTL_MINUTES', 30),
  );

  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    cacheTtlMinutes: ttlMinutes,
    assetsBucket: process.env.NEWSLETTER_SYNC_ASSETS_BUCKET ?? 'public',
    imageMaxWidth: optionalNumberEnv('NEWSLETTER_SYNC_IMAGE_MAX_WIDTH', 1600),
    imageQuality: optionalNumberEnv('NEWSLETTER_SYNC_IMAGE_QUALITY', 82),
    maxRetryAttempts: optionalNumberEnv('NEWSLETTER_SYNC_MAX_RETRIES', 5),
  };
};
