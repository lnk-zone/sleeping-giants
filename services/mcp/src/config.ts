import type { ReferralMilestone } from '@sleeping-giants/shared/contracts.js';

export interface RateLimitConfig {
  readonly max: number;
  readonly timeWindow: string | number;
}

export interface IssuesConfig {
  readonly suggestionLimit: number;
}

export interface McpConfig {
  readonly apiKey: string;
  readonly rateLimit: RateLimitConfig;
  readonly latencyBudgetMs: number;
  readonly referralMilestones: readonly ReferralMilestone[];
  readonly issues: IssuesConfig;
  readonly allowedUnauthenticatedPaths: readonly string[];
  readonly tenantId: string;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseReferralMilestones = (
  raw: string | undefined,
): readonly ReferralMilestone[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((milestone): milestone is ReferralMilestone => {
        if (!milestone || typeof milestone !== 'object') {
          return false;
        }
        const candidate = milestone as Record<string, unknown>;
        return (
          typeof candidate.target === 'number' &&
          typeof candidate.reward === 'string' &&
          (candidate.achievedAt === undefined || typeof candidate.achievedAt === 'string')
        );
      })
      .map((milestone) => ({ ...milestone }));
  } catch {
    return [];
  }
};

export const loadConfig = (): McpConfig => {
  return {
    apiKey: process.env.MCP_API_KEY ?? 'local-dev-key',
    rateLimit: {
      max: toNumber(process.env.MCP_RATE_LIMIT_MAX, 60),
      timeWindow: process.env.MCP_RATE_LIMIT_WINDOW ?? '1 minute',
    },
    latencyBudgetMs: toNumber(process.env.MCP_LATENCY_BUDGET_MS, 500),
    referralMilestones: Object.freeze(
      parseReferralMilestones(process.env.MCP_REFERRAL_MILESTONES),
    ),
    issues: {
      suggestionLimit: toNumber(process.env.MCP_ISSUE_SUGGESTION_LIMIT, 5),
    },
    allowedUnauthenticatedPaths: ['/health'],
    tenantId: process.env.MCP_TENANT_ID ?? 'platform',
  } satisfies McpConfig;
};

export const defaultConfig = Object.freeze(loadConfig());
