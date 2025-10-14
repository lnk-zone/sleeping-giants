import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { APP_CONFIG, type McpConfig } from '../config.js';

const normalizePath = (path: string | undefined): string => {
  if (!path) {
    return '';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const extractApiKey = (request: FastifyRequest): string | undefined => {
  const header = request.headers['authorization'] ?? request.headers['Authorization'];
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader.trim();
  }
  return undefined;
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: McpConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request) {
      return true;
    }

    if (request.method === 'OPTIONS') {
      return true;
    }

    const path = normalizePath((request.routerPath ?? request.url) as string | undefined);
    if (this.config.allowedUnauthenticatedPaths.includes(path)) {
      return true;
    }

    const apiKey = extractApiKey(request);
    if (apiKey && apiKey === this.config.apiKey) {
      return true;
    }

    throw new UnauthorizedException({
      message: 'Missing or invalid API key',
    });
  }
}
