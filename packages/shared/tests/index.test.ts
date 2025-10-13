import { describe, expect, it } from 'vitest';
import {
  AnalyticsEventName,
  AnalyticsEventSchema,
  BuilderModeInputSchema,
  BuilderModeOutputSchema,
  CONSTRAINTS,
  Constraint,
  ErrorCode,
  INDUSTRIES,
  ISSUE_TAGS,
  Industry,
  IssueImpact,
  IssueSchema,
  IssueStatus,
  PRODUCT_STAGES,
  ProductStage,
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
  it('exposes stable industry values', () => {
    expect(INDUSTRIES).toEqual([
      Industry.FINTECH,
      Industry.HEALTHCARE,
      Industry.EDUCATION,
      Industry.ECOMMERCE,
      Industry.SUSTAINABILITY,
      Industry.MEDIA,
    ]);
  });

  it('exposes stable product stages', () => {
    expect(PRODUCT_STAGES).toEqual([
      ProductStage.IDEATION,
      ProductStage.PROTOTYPE,
      ProductStage.MVP,
      ProductStage.GROWTH,
      ProductStage.SCALE,
    ]);
  });

  it('exposes stable constraints', () => {
    expect(CONSTRAINTS).toEqual([
      Constraint.TIME,
      Constraint.BUDGET,
      Constraint.COMPLIANCE,
      Constraint.TALENT,
      Constraint.DATA,
    ]);
  });

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
        userId: 'user-1',
        source: SaveSource.BUILDER,
        savedAt: 'invalid',
        tags: [],
      }),
    ).toThrowError(/Invalid datetime/);
  });

  it('validates builder mode input and output', () => {
    const builderInput = {
      industry: Industry.ECOMMERCE,
      stage: ProductStage.MVP,
      constraints: [Constraint.TIME, Constraint.BUDGET],
      goal: 'Launch a marketplace pilot',
      targetCustomer: 'Independent retailers',
      context: 'Focused on North American launch partners.',
      tags: ['integration'],
    } as const;

    const issue = IssueSchema.parse({
      id: 'issue-2',
      title: 'Merchant analytics gap',
      description: 'Retailers cannot access actionable sales analytics.',
      status: IssueStatus.OPEN,
      tags: ['research'],
      impact: IssueImpact.MEDIUM,
      createdAt: '2024-01-10T08:00:00.000Z',
      updatedAt: '2024-01-10T08:00:00.000Z',
    });

    const builderOutput = {
      id: 'builder-1',
      summary: 'Deliver a merchant insights dashboard that highlights real-time KPIs.',
      keyActions: [
        'Interview 5 existing merchants to map analytics needs.',
        'Prototype KPI dashboard widgets with live marketplace data.',
      ],
      suggestedIssues: [issue],
      confidence: 0.8,
      impact: IssueImpact.HIGH,
      references: ['https://example.com/dashboard'],
    } as const;

    expect(BuilderModeInputSchema.parse(builderInput)).toEqual(builderInput);
    expect(BuilderModeOutputSchema.parse(builderOutput)).toEqual(builderOutput);
  });

  it('validates referral progress payloads', () => {
    const progress = {
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
      name: AnalyticsEventName.BUILDER_SUBMITTED,
      timestamp: '2024-03-01T15:30:00.000Z',
      userId: 'user-123',
      properties: {
        industry: Industry.FINTECH,
        stage: ProductStage.GROWTH,
      },
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
      'Issue',
      'Save',
      'StreakEntry',
      'BuilderModeInput',
      'BuilderModeOutput',
      'ReferralMilestone',
      'ReferralProgress',
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
