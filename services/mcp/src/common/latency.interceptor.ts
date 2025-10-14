import { Inject, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Observable, tap } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import { APP_CONFIG, type McpConfig } from '../config.js';

@Injectable()
export class LatencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(APP_CONFIG) private readonly config: McpConfig,
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const path = context.switchToHttp().getRequest().url ?? 'unknown';

    const finalize = (label: string) => {
      const duration = Date.now() - startedAt;
      if (response && typeof response.header === 'function') {
        response.header('x-response-time', duration.toFixed(2));
      }
      if (duration > this.config.latencyBudgetMs) {
        this.logger.warn(
          {
            path,
            duration,
            budget: this.config.latencyBudgetMs,
            label,
          },
          'latency budget exceeded',
        );
      }
    };

    return next.handle().pipe(
      tap({
        next: () => finalize('success'),
        error: () => finalize('error'),
      }),
    );
  }
}
