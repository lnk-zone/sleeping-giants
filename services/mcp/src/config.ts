import type { ReferralMilestone } from '@sleeping-giants/shared/contracts.js';

export interface RateLimitConfig {
  readonly max: number;
  readonly timeWindow: string | number;
}

export interface BuilderConfig {
  readonly suggestionLimit: number;
  readonly defaultReferences: readonly string[];
}

export interface McpConfig {
  readonly apiKey: string;
  readonly rateLimit: RateLimitConfig;
  readonly latencyBudgetMs: number;
  readonly referralMilestones: readonly ReferralMilestone[];
  readonly builder: BuilderConfig;
  readonly allowedUnauthenticatedPaths: readonly string[];
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const loadConfig = (): McpConfig => {
  const defaultMilestones: ReferralMilestone[] = [
    { target: 1, reward: 'Beta access badge' },
    { target: 3, reward: 'Strategy session' },
    { target: 5, reward: 'Founders roundtable invite' },
  ];

  return {
    apiKey: process.env.MCP_API_KEY ?? 'local-dev-key',
    rateLimit: {
      max: toNumber(process.env.MCP_RATE_LIMIT_MAX, 60),
      timeWindow: process.env.MCP_RATE_LIMIT_WINDOW ?? '1 minute',
    },
    latencyBudgetMs: toNumber(process.env.MCP_LATENCY_BUDGET_MS, 500),
    referralMilestones: defaultMilestones,
    builder: {
      suggestionLimit: toNumber(process.env.MCP_BUILDER_SUGGESTION_LIMIT, 3),
      defaultReferences: Object.freeze([
        'https://sleepinggiants.example.com/builder-mode',
        'https://sleepinggiants.example.com/resources/playbook',
      ]),
    },
    allowedUnauthenticatedPaths: ['/health'],
  } satisfies McpConfig;
};

export const defaultConfig = Object.freeze(loadConfig());
