import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Enumerations and tag lists consumed by the Apps SDK.
 */
export enum Industry {
  FINTECH = 'fintech',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  ECOMMERCE = 'ecommerce',
  SUSTAINABILITY = 'sustainability',
  MEDIA = 'media',
}

export const INDUSTRIES = Object.freeze(Object.values(Industry));

export enum ProductStage {
  IDEATION = 'ideation',
  PROTOTYPE = 'prototype',
  MVP = 'mvp',
  GROWTH = 'growth',
  SCALE = 'scale',
}

export const PRODUCT_STAGES = Object.freeze(Object.values(ProductStage));

export enum Constraint {
  TIME = 'time',
  BUDGET = 'budget',
  COMPLIANCE = 'compliance',
  TALENT = 'talent',
  DATA = 'data',
}

export const CONSTRAINTS = Object.freeze(Object.values(Constraint));

export const ISSUE_TAGS = Object.freeze([
  'ux',
  'performance',
  'technical_debt',
  'research',
  'integration',
  'accessibility',
] as const);

export type IssueTag = (typeof ISSUE_TAGS)[number];

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

export enum IssueImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  tags: IssueTag[];
  impact: IssueImpact;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export enum SaveSource {
  BUILDER = 'builder',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

export interface Save {
  id: string;
  userId: string;
  source: SaveSource;
  savedAt: string;
  notes?: string;
  issueId?: string;
  tags: IssueTag[];
}

export interface StreakEntry {
  date: string;
  completed: boolean;
  count: number;
  notes?: string;
}

export interface BuilderModeInput {
  industry: Industry;
  stage: ProductStage;
  constraints: Constraint[];
  goal: string;
  targetCustomer: string;
  context?: string;
  tags: IssueTag[];
}

export interface BuilderModeOutput {
  id: string;
  summary: string;
  keyActions: string[];
  suggestedIssues: Issue[];
  confidence: number;
  impact: IssueImpact;
  references?: string[];
}

export interface ReferralMilestone {
  target: number;
  reward: string;
  achievedAt?: string;
}

export enum ReferralStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface ReferralProgress {
  code: string;
  totalReferrals: number;
  status: ReferralStatus;
  milestones: ReferralMilestone[];
  nextMilestone?: ReferralMilestone;
}

export enum AnalyticsEventName {
  ISSUE_CREATED = 'issue_created',
  ISSUE_RESOLVED = 'issue_resolved',
  BUILDER_SUBMITTED = 'builder_submitted',
  SAVE_CREATED = 'save_created',
  REFERRAL_SHARED = 'referral_shared',
  SESSION_STARTED = 'session_started',
}

export interface AnalyticsContext {
  locale?: string;
  platform?: string;
  sdkVersion?: string;
  source?: string;
}

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  timestamp: string;
  userId?: string;
  anonymousId?: string;
  properties: Record<string, unknown>;
  context?: AnalyticsContext;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  RATE_LIMITED = 'rate_limited',
  INTERNAL_ERROR = 'internal_error',
}

export interface StandardError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  cause?: string;
  docUrl?: string;
}

const isoDateTime = z
  .string()
  .datetime({ offset: true })
  .describe('RFC 3339 timestamp string with timezone offset');

const nonEmptyString = z.string().min(1);

const IssueTagSchema = z.enum(ISSUE_TAGS);

export const IssueSchema: z.ZodType<Issue> = z.object({
  id: nonEmptyString.describe('Unique issue identifier'),
  title: nonEmptyString.describe('Human readable title'),
  description: nonEmptyString.describe('Detailed issue description'),
  status: z.nativeEnum(IssueStatus),
  tags: z.array(IssueTagSchema),
  impact: z.nativeEnum(IssueImpact),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  metadata: z.record(z.unknown()).optional(),
});

export const SaveSchema: z.ZodType<Save> = z.object({
  id: nonEmptyString,
  userId: nonEmptyString,
  source: z.nativeEnum(SaveSource),
  savedAt: isoDateTime,
  notes: z.string().min(1).optional(),
  issueId: nonEmptyString.optional(),
  tags: z.array(IssueTagSchema),
});

export const StreakEntrySchema: z.ZodType<StreakEntry> = z.object({
  date: isoDateTime,
  completed: z.boolean(),
  count: z.number().int().nonnegative(),
  notes: z.string().min(1).optional(),
});

export const BuilderModeInputSchema: z.ZodType<BuilderModeInput> = z.object({
  industry: z.nativeEnum(Industry),
  stage: z.nativeEnum(ProductStage),
  constraints: z.array(z.nativeEnum(Constraint)).max(CONSTRAINTS.length),
  goal: nonEmptyString,
  targetCustomer: nonEmptyString,
  context: z.string().optional(),
  tags: z.array(IssueTagSchema),
});

export const BuilderModeOutputSchema: z.ZodType<BuilderModeOutput> = z.object({
  id: nonEmptyString,
  summary: nonEmptyString,
  keyActions: z.array(nonEmptyString),
  suggestedIssues: z.array(IssueSchema),
  confidence: z.number().min(0).max(1),
  impact: z.nativeEnum(IssueImpact),
  references: z.array(z.string().url()).optional(),
});

export const ReferralMilestoneSchema: z.ZodType<ReferralMilestone> = z.object({
  target: z.number().int().positive(),
  reward: nonEmptyString,
  achievedAt: isoDateTime.optional(),
});

export const ReferralProgressSchema: z.ZodType<ReferralProgress> = z.object({
  code: nonEmptyString,
  totalReferrals: z.number().int().nonnegative(),
  status: z.nativeEnum(ReferralStatus),
  milestones: z.array(ReferralMilestoneSchema),
  nextMilestone: ReferralMilestoneSchema.optional(),
});

export const AnalyticsContextSchema: z.ZodType<AnalyticsContext> = z.object({
  locale: z.string().min(2).optional(),
  platform: z.string().optional(),
  sdkVersion: z.string().optional(),
  source: z.string().optional(),
});

export const AnalyticsEventSchema: z.ZodType<AnalyticsEvent> = z.object({
  name: z.nativeEnum(AnalyticsEventName),
  timestamp: isoDateTime,
  userId: nonEmptyString.optional(),
  anonymousId: nonEmptyString.optional(),
  properties: z.record(z.unknown()),
  context: AnalyticsContextSchema.optional(),
});

export const StandardErrorSchema: z.ZodType<StandardError> = z.object({
  code: z.nativeEnum(ErrorCode),
  message: nonEmptyString,
  details: z.record(z.unknown()).optional(),
  retryable: z.boolean().optional(),
  cause: z.string().optional(),
  docUrl: z.string().url().optional(),
});

const schemas = {
  Issue: IssueSchema,
  Save: SaveSchema,
  StreakEntry: StreakEntrySchema,
  BuilderModeInput: BuilderModeInputSchema,
  BuilderModeOutput: BuilderModeOutputSchema,
  ReferralMilestone: ReferralMilestoneSchema,
  ReferralProgress: ReferralProgressSchema,
  AnalyticsEvent: AnalyticsEventSchema,
  StandardError: StandardErrorSchema,
} as const;

export type ContractSchemaName = keyof typeof schemas;

const toJsonSchema = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  name: ContractSchemaName,
) =>
  zodToJsonSchema(schema, {
    name,
    target: 'openApi3',
    $refStrategy: 'none',
  });

export const jsonSchemas: Record<ContractSchemaName, unknown> = Object.freeze(
  Object.fromEntries(
    (Object.entries(schemas) as Array<[ContractSchemaName, z.ZodTypeAny]>).map(
      ([name, schema]) => [name, toJsonSchema(schema, name)],
    ),
  ),
) as Record<ContractSchemaName, unknown>;

export const contractSchemas = Object.freeze(schemas);
