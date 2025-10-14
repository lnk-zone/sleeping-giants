import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ErrorCode,
  type StandardError,
} from '@sleeping-giants/shared/contracts.js';
import { PinoLogger } from 'nestjs-pino';

const mapStatusToCode = (status: number): ErrorCode => {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
};

@Catch()
export class StandardErrorFilter implements ExceptionFilter {
  constructor(@Optional() private readonly logger?: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unexpected error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responsePayload = exception.getResponse();
      if (typeof responsePayload === 'string') {
        message = responsePayload;
      } else if (responsePayload && typeof responsePayload === 'object') {
        message = (responsePayload as { message?: string }).message ?? message;
        details = { ...(responsePayload as Record<string, unknown>) };
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const payload: StandardError = {
      code: mapStatusToCode(status),
      message,
      details,
      retryable: status >= HttpStatus.INTERNAL_SERVER_ERROR,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger?.error({ err: exception }, 'unhandled exception');
      if (!this.logger) {
        console.error('unhandled exception', exception);
      }
    }

    response.status(status).send(payload);
  }
}
