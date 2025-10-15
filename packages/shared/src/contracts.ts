import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const ISSUE_TAGS = Object.freeze([
  'ux',
  'performance',
  'technical_debt',
  'research',
  'integration',
  'accessibility',
] as const);

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum TenantPlan {
  STARTER = 'starter',
  GROWTH = 'growth',
  ENTERPRISE = 'enterprise',
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  primaryDomain?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export enum NewsletterProvider {
  BEEHIIV = 'beehiiv',
  CUSTOM = 'custom',
}

export enum CardLayout {
  HERO = 'hero',
  GRID = 'grid',
  STACKED = 'stacked',
  FEATURED = 'featured',
}

export enum CtaVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  GHOST = 'ghost',
  LINK = 'link',
}

export enum ThemeStyle {
  LIGHT = 'light',
  DARK = 'dark',
  BRAND = 'brand',
}

export enum NewsletterVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
}

export interface NewsletterApp {
  id: string;
  tenantId: string;
  name: string;
  provider: NewsletterProvider;
  externalId?: string;
  description?: string;
  visibility: NewsletterVisibility;
  cardLayout: CardLayout;
  ctaVariant: CtaVariant;
  themeStyle: ThemeStyle;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

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
  tenantId: string;
  newsletterId: string;
  title: string;
  description: string;
  status: IssueStatus;
  tags: IssueTag[];
  impact: IssueImpact;
  issueNumber?: number;
  scheduledFor?: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export enum SaveSource {
  AUTOMATION = 'automation',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

export interface Save {
  id: string;
  tenantId: string;
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
  tenantId: string;
  code: string;
  totalReferrals: number;
  status: ReferralStatus;
  milestones: ReferralMilestone[];
  nextMilestone?: ReferralMilestone;
}

export enum SubscriptionEventType {
  ISSUE_PUBLISHED = 'issue_published',
  ISSUE_SCHEDULED = 'issue_scheduled',
  SUBSCRIBER_CREATED = 'subscriber_created',
  SUBSCRIBER_UPDATED = 'subscriber_updated',
  SUBSCRIBER_UNSUBSCRIBED = 'subscriber_unsubscribed',
}

export interface SubscriptionEvent {
  id: string;
  tenantId: string;
  newsletterId: string;
  type: SubscriptionEventType;
  source: NewsletterProvider;
  payload: Record<string, unknown>;
  receivedAt: string;
  processedAt?: string;
  metadata?: Record<string, unknown>;
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  ANALYST = 'analyst',
}

export interface UserSession {
  id: string;
  tenantId: string;
  userId: string;
  roles: UserRole[];
  expiresAt: string;
  refreshedAt?: string;
  metadata?: Record<string, unknown>;
}

export enum AnalyticsEventName {
  ISSUE_CREATED = 'issue_created',
  ISSUE_RESOLVED = 'issue_resolved',
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
  tenantId?: string;
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

export const TenantSchema: z.ZodType<Tenant> = z.object({
  id: nonEmptyString,
  slug: nonEmptyString,
  name: nonEmptyString,
  status: z.nativeEnum(TenantStatus),
  plan: z.nativeEnum(TenantPlan),
  primaryDomain: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const NewsletterAppSchema: z.ZodType<NewsletterApp> = z.object({
  id: nonEmptyString,
  tenantId: nonEmptyString,
  name: nonEmptyString,
  provider: z.nativeEnum(NewsletterProvider),
  externalId: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  visibility: z.nativeEnum(NewsletterVisibility),
  cardLayout: z.nativeEnum(CardLayout),
  ctaVariant: z.nativeEnum(CtaVariant),
  themeStyle: z.nativeEnum(ThemeStyle),
  metadata: z.record(z.unknown()).optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const IssueSchema: z.ZodType<Issue> = z.object({
  id: nonEmptyString.describe('Unique issue identifier'),
  tenantId: nonEmptyString.describe('Tenant this issue belongs to'),
  newsletterId: nonEmptyString.describe('Origin newsletter identifier'),
  title: nonEmptyString.describe('Human readable title'),
  description: nonEmptyString.describe('Detailed issue description'),
  status: z.nativeEnum(IssueStatus),
  tags: z.array(IssueTagSchema),
  impact: z.nativeEnum(IssueImpact),
  issueNumber: z.number().int().positive().optional(),
  scheduledFor: isoDateTime.optional(),
  publishedAt: isoDateTime.optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  metadata: z.record(z.unknown()).optional(),
});

export const SaveSchema: z.ZodType<Save> = z.object({
  id: nonEmptyString,
  tenantId: nonEmptyString,
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

export const ReferralMilestoneSchema: z.ZodType<ReferralMilestone> = z.object({
  target: z.number().int().positive(),
  reward: nonEmptyString,
  achievedAt: isoDateTime.optional(),
});

export const ReferralProgressSchema: z.ZodType<ReferralProgress> = z.object({
  tenantId: nonEmptyString,
  code: nonEmptyString,
  totalReferrals: z.number().int().nonnegative(),
  status: z.nativeEnum(ReferralStatus),
  milestones: z.array(ReferralMilestoneSchema),
  nextMilestone: ReferralMilestoneSchema.optional(),
});

export const SubscriptionEventSchema: z.ZodType<SubscriptionEvent> = z.object({
  id: nonEmptyString,
  tenantId: nonEmptyString,
  newsletterId: nonEmptyString,
  type: z.nativeEnum(SubscriptionEventType),
  source: z.nativeEnum(NewsletterProvider),
  payload: z.record(z.unknown()),
  receivedAt: isoDateTime,
  processedAt: isoDateTime.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UserSessionSchema: z.ZodType<UserSession> = z.object({
  id: nonEmptyString,
  tenantId: nonEmptyString,
  userId: nonEmptyString,
  roles: z.array(z.nativeEnum(UserRole)).nonempty(),
  expiresAt: isoDateTime,
  refreshedAt: isoDateTime.optional(),
  metadata: z.record(z.unknown()).optional(),
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
  tenantId: nonEmptyString.optional(),
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
  Tenant: TenantSchema,
  NewsletterApp: NewsletterAppSchema,
  Issue: IssueSchema,
  Save: SaveSchema,
  StreakEntry: StreakEntrySchema,
  ReferralMilestone: ReferralMilestoneSchema,
  ReferralProgress: ReferralProgressSchema,
  SubscriptionEvent: SubscriptionEventSchema,
  UserSession: UserSessionSchema,
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
