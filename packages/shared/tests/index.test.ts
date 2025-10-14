import { describe, expect, it } from 'vitest';
import {
  AnalyticsEventName,
  AnalyticsEventSchema,
  ErrorCode,
  ISSUE_TAGS,
  IssueImpact,
  IssueSchema,
  IssueStatus,
  ReferralProgressSchema,
  ReferralStatus,
  SaveSchema,
  SaveSource,
  StandardErrorSchema,
  StreakEntrySchema,
  contractSchemas,
  jsonSchemas,
} from '../src/index.js';

describe('enumerations', () => {
  it('exposes stable issue tags', () => {
    expect(ISSUE_TAGS).toEqual([
      'ux',
      'performance',
      'technical_debt',
      'research',
      'integration',
      'accessibility',
    ]);
  });
});

describe('schema validation', () => {
  it('validates an issue payload', () => {
    const issue = {
      id: 'issue-1',
      tenantId: 'tenant-1',
      newsletterId: 'newsletter-1',
      title: 'Improve onboarding',
      description: 'New users struggle to understand the product setup flow.',
      status: IssueStatus.OPEN,
      tags: ['ux', 'research'],
      impact: IssueImpact.HIGH,
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T11:00:00.000Z',
    } as const;

    expect(IssueSchema.parse(issue)).toEqual(issue);
  });

  it('rejects invalid saves', () => {
    expect(() =>
      SaveSchema.parse({
        id: 'save-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: SaveSource.AUTOMATION,
        savedAt: 'invalid',
        tags: [],
      }),
    ).toThrowError(/Invalid datetime/);
  });

  it('validates referral progress payloads', () => {
    const progress = {
      tenantId: 'tenant-1',
      code: 'REF-CODE',
      totalReferrals: 5,
      status: ReferralStatus.IN_PROGRESS,
      milestones: [
        {
          target: 3,
          reward: 'Early access',
          achievedAt: '2024-02-02T12:00:00.000Z',
        },
        {
          target: 10,
          reward: 'Premium coaching session',
        },
      ],
      nextMilestone: {
        target: 10,
        reward: 'Premium coaching session',
      },
    } as const;

    expect(ReferralProgressSchema.parse(progress)).toEqual(progress);
  });

  it('validates analytics events and errors', () => {
    const event = {
      name: AnalyticsEventName.SESSION_STARTED,
      timestamp: '2024-03-01T15:30:00.000Z',
      userId: 'user-123',
      properties: { session: 'beta-access' },
    } as const;

    expect(AnalyticsEventSchema.parse(event)).toMatchObject(event);

    const error = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Missing goal field',
      details: { field: 'goal' },
      retryable: false,
    } as const;

    expect(StandardErrorSchema.parse(error)).toMatchObject(error);
  });

  it('validates streak entry payloads', () => {
    const entry = {
      date: '2024-04-01T09:00:00.000Z',
      completed: true,
      count: 14,
    } as const;

    expect(StreakEntrySchema.parse(entry)).toMatchObject(entry);
  });
});

describe('schema registry', () => {
  it('exposes all schemas under contractSchemas', () => {
    expect(Object.keys(contractSchemas)).toEqual([
      'Tenant',
      'NewsletterApp',
      'Issue',
      'Save',
      'StreakEntry',
      'ReferralMilestone',
      'ReferralProgress',
      'SubscriptionEvent',
      'UserSession',
      'AnalyticsEvent',
      'StandardError',
    ]);
  });

  it('exports OpenAPI compatible JSON schemas', () => {
    expect(Object.keys(jsonSchemas)).toEqual(Object.keys(contractSchemas));
    const issueSchema = jsonSchemas.Issue as Record<string, unknown>;
    expect(issueSchema).toHaveProperty('$ref', '#/definitions/Issue');
    expect(issueSchema).toHaveProperty('definitions.Issue.properties.status.enum', Object.values(IssueStatus));
  });
});
