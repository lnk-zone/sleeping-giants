import type { Issue } from '@sleeping-giants/shared/contracts.js';
import type { IssueCache } from './cache.js';
import { createIssueCacheKey } from './cache.js';

export interface CacheWarmerConfig {
  cache: IssueCache;
  loader: () => Promise<Issue[]>;
  intervalMs: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
  jitterRatio?: number;
}

const DEFAULT_LOGGER: Pick<Console, 'info' | 'warn' | 'error'> = {
  info: (...args: unknown[]) => console.info('[issue-cache-warmer]', ...args),
  warn: (...args: unknown[]) => console.warn('[issue-cache-warmer]', ...args),
  error: (...args: unknown[]) => console.error('[issue-cache-warmer]', ...args),
};

const withJitter = (interval: number, jitterRatio: number): number => {
  if (jitterRatio <= 0) {
    return interval;
  }
  const jitter = interval * jitterRatio * (Math.random() - 0.5) * 2;
  return Math.max(1_000, Math.round(interval + jitter));
};

export class CacheWarmer {
  private readonly cache: IssueCache;
  private readonly loader: () => Promise<Issue[]>;
  private readonly intervalMs: number;
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;
  private readonly jitterRatio: number;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CacheWarmerConfig) {
    this.cache = config.cache;
    this.loader = config.loader;
    this.intervalMs = config.intervalMs;
    this.logger = config.logger ?? DEFAULT_LOGGER;
    this.jitterRatio = config.jitterRatio ?? 0.1;
  }

  start(): () => void {
    const schedule = () => {
      const delay = withJitter(this.intervalMs, this.jitterRatio);
      this.timer = setTimeout(async () => {
        try {
          const issues = await this.loader();
          await Promise.all(
            issues.map((issue) => this.cache.set(createIssueCacheKey(issue.id), issue)),
          );
          this.logger.info(`Preloaded ${issues.length} issues into cache`);
        } catch (error) {
          this.logger.warn('Issue cache warmer failed', error);
        } finally {
          schedule();
        }
      }, delay);
    };

    schedule();

    return () => {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    };
  }
}
