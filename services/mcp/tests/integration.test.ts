import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  AnalyticsEventName,
  IssueImpact,
  IssueStatus,
  ReferralProgressSchema,
  ReferralStatus,
  SaveSchema,
  SaveSource,
  StreakEntrySchema,
} from '@sleeping-giants/shared/contracts.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/main.js';
import { APP_CONFIG, type McpConfig, loadConfig } from '../src/config.js';
import { ISSUE_PROVIDER, InMemoryIssueProvider } from '../src/issues/issue-provider.js';

const createTestConfig = (): McpConfig => ({
  ...loadConfig(),
  apiKey: 'test-key',
  latencyBudgetMs: 750,
  tenantId: 'tenant-test',
});

const debugResponse = (response: { statusCode: number; json(): unknown }, label: string) => {
  if (response.statusCode >= 500) {
    console.error(label, response.json());
  }
};

describe('MCP service integration', () => {
  let app: NestFastifyApplication;
  const config = createTestConfig();
  const authHeaders = { Authorization: `Bearer ${config.apiKey}` };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .overrideProvider(ISSUE_PROVIDER)
      .useValue(
        new InMemoryIssueProvider([
          {
            id: 'issue-growth',
            tenantId: 'tenant-test',
            newsletterId: 'newsletter-test',
            title: 'Improve activation messaging',
            description: 'Activation emails are not highlighting the premium data hooks.',
            status: IssueStatus.OPEN,
            tags: ['ux', 'integration'],
            impact: IssueImpact.MEDIUM,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'issue-insights',
            tenantId: 'tenant-test',
            newsletterId: 'newsletter-test',
            title: 'Expand actionable insights',
            description: 'Operators need better alerts around failing automations.',
            status: IssueStatus.OPEN,
            tags: ['performance', 'integration'],
            impact: IssueImpact.HIGH,
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        ]),
      )
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds to health checks without authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('rejects unauthorized requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/issues',
    });
    expect(response.statusCode).toBe(401);
  });

  it('lists issues using the configured provider', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/issues?tags=ux&limit=1',
      headers: authHeaders,
    });
    debugResponse(response, 'issues failure');
    expect(response.statusCode).toBe(200);
    const issues = response.json();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: 'issue-growth' });
  });

  it('creates and lists saves through the persistence layer', async () => {
    const savePayload = SaveSchema.parse({
      id: 'save-123',
      tenantId: 'tenant-test',
      userId: 'user-1',
      source: SaveSource.AUTOMATION,
      savedAt: new Date().toISOString(),
      tags: ['ux'],
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/saves',
      headers: authHeaders,
      payload: savePayload,
    });
    debugResponse(createResponse, 'save failure');
    expect(createResponse.statusCode).toBe(201);
    expect(SaveSchema.parse(createResponse.json())).toMatchObject(savePayload);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/saves/user-1',
      headers: authHeaders,
    });
    expect(listResponse.statusCode).toBe(200);
    const saves = listResponse.json().map((entry: unknown) => SaveSchema.parse(entry));
    expect(saves).toHaveLength(1);
  });

  it('enforces a 30 second dwell time before streak increments', async () => {
    const failure = await app.inject({
      method: 'POST',
      url: '/api/streaks/complete',
      headers: authHeaders,
      payload: { userId: 'user-streak', dwellSeconds: 20 },
    });
    debugResponse(failure, 'streak failure');
    expect(failure.statusCode).toBe(400);

    const success = await app.inject({
      method: 'POST',
      url: '/api/streaks/complete',
      headers: authHeaders,
      payload: { userId: 'user-streak', dwellSeconds: 45 },
    });
    expect(success.statusCode).toBe(201);
    const entry = StreakEntrySchema.parse(success.json());
    expect(entry.count).toBe(1);
  });

  it('records referrals idempotently and tracks progress accurately', async () => {
    const record = async (userId: string) =>
      app.inject({
        method: 'POST',
        url: '/api/referrals/BUILD',
        headers: authHeaders,
        payload: { userId },
      });

    const first = await record('user-a');
    debugResponse(first, 'referral failure');
    expect(first.statusCode).toBe(201);
    const duplicate = await record('user-a');
    debugResponse(duplicate, 'referral duplicate failure');
    expect(duplicate.statusCode).toBe(201);
    const second = await record('user-b');
    debugResponse(second, 'referral second failure');
    expect(second.statusCode).toBe(201);

    const progressResponse = await app.inject({
      method: 'GET',
      url: '/api/referrals/BUILD',
      headers: authHeaders,
    });
    expect(progressResponse.statusCode).toBe(200);
    const progress = ReferralProgressSchema.parse(progressResponse.json());
    expect(progress.totalReferrals).toBe(2);
    expect(progress.status).toBe(ReferralStatus.IN_PROGRESS);
  });

  it('maintains idempotent subscriptions', async () => {
    const payload = { email: 'founders@example.com' };
    const first = await app.inject({
      method: 'POST',
      url: '/api/subscribe',
      headers: authHeaders,
      payload,
    });
    debugResponse(first, 'subscribe failure');
    expect(first.statusCode).toBe(202);

    const second = await app.inject({
      method: 'POST',
      url: '/api/subscribe',
      headers: authHeaders,
      payload,
    });
    debugResponse(second, 'subscribe duplicate failure');
    expect(second.statusCode).toBe(202);
    expect(second.json()).toEqual(first.json());
  });

  it('ingests analytics within latency budget', async () => {
    const payload = {
      name: AnalyticsEventName.SESSION_STARTED,
      timestamp: new Date().toISOString(),
      userId: 'user-analytics',
      properties: { feature: 'issue-triage', impact: IssueImpact.HIGH },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/analytics/events',
      headers: authHeaders,
      payload,
    });
    debugResponse(response, 'analytics failure');

    expect(response.statusCode).toBe(202);
    const responseTime = Number.parseFloat(response.headers['x-response-time'] as string);
    expect(responseTime).toBeLessThan(config.latencyBudgetMs);
  });
});
