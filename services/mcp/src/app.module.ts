import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { APP_CONFIG, loadConfig } from './config.js';
import { HealthController } from './common/health.controller.js';
import { LatencyInterceptor } from './common/latency.interceptor.js';
import { ApiKeyGuard } from './common/api-key.guard.js';
import { StandardErrorFilter } from './common/standard-error.filter.js';
import { AnalyticsRepository } from './persistence/analytics.repository.js';
import { ReferralsRepository } from './persistence/referrals.repository.js';
import { SavesRepository } from './persistence/saves.repository.js';
import { StreaksRepository } from './persistence/streaks.repository.js';
import { SubscriptionService } from './subscriptions/subscription.service.js';
import { SubscriptionsController } from './subscriptions/subscriptions.controller.js';
import { IssuesController } from './issues/issues.controller.js';
import { IssuesService } from './issues/issues.service.js';
import { ISSUE_PROVIDER, InMemoryIssueProvider } from './issues/issue-provider.js';
import { SavesController } from './saves/saves.controller.js';
import { StreaksController } from './streaks/streaks.controller.js';
import { ReferralsController } from './referrals/referrals.controller.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'mcp-service',
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true },
              }
            : undefined,
      },
    }),
  ],
  controllers: [
    HealthController,
    AnalyticsController,
    IssuesController,
    SavesController,
    StreaksController,
    ReferralsController,
    SubscriptionsController,
  ],
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    { provide: ISSUE_PROVIDER, useFactory: () => new InMemoryIssueProvider() },
    IssuesService,
    SavesRepository,
    StreaksRepository,
    ReferralsRepository,
    AnalyticsRepository,
    SubscriptionService,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_INTERCEPTOR, useClass: LatencyInterceptor },
    { provide: APP_FILTER, useClass: StandardErrorFilter },
  ],
})
export class AppModule {}
