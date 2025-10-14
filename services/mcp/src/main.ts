import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';
import { APP_CONFIG, type McpConfig } from './config.js';
import type { RateLimitPluginOptions } from '@fastify/rate-limit';
import type { FastifyCompressOptions } from '@fastify/compress';

export const configureApp = async (
  app: NestFastifyApplication,
): Promise<NestFastifyApplication> => {
  const config = app.get<McpConfig>(APP_CONFIG);
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const fastify = app.getHttpAdapter().getInstance();
  type FastifyPlugin = Parameters<typeof fastify.register>[0];
  type FastifyPluginOptions = Parameters<typeof fastify.register>[1];
  const rateLimitOptions = {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  } satisfies RateLimitPluginOptions;

  await fastify.register(
    rateLimit as unknown as FastifyPlugin,
    rateLimitOptions as FastifyPluginOptions,
  );

  const compressionOptions = { global: true } satisfies FastifyCompressOptions;
  await fastify.register(
    compress as unknown as FastifyPlugin,
    compressionOptions as FastifyPluginOptions,
  );
  return app;
};

export const bootstrap = async (): Promise<NestFastifyApplication> => {
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  await configureApp(app);
  await app.init();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.getHttpAdapter().getInstance().ready();
  await app.listen({ port, host });
  return app;
};

const isMainModule = (): boolean => {
  if (typeof process === 'undefined' || !Array.isArray(process.argv) || process.argv.length < 2) {
    return false;
  }
  const modulePath = fileURLToPath(import.meta.url);
  return modulePath === process.argv[1];
};

if (isMainModule()) {
  bootstrap().catch((error) => {
    console.error('Failed to start MCP service', error);
    process.exit(1);
  });
}

export { AppModule };
