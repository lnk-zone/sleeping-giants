import type { PrdPost } from '../prd.js';
import { normalizePrdPost } from '../prd.js';
import type { BeehiivPost } from './types.js';
import { BeehiivClient } from './client.js';

export interface BeehiivWorkerConfig {
  apiKey?: string;
  publicationId?: string;
  pageSize?: number;
  baseUrl?: string;
  fetchImpl?: typeof globalThis.fetch;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

const DEFAULT_LOGGER: Pick<Console, 'info' | 'warn' | 'error'> = {
  info: (...args: unknown[]) => console.info('[beehiiv-worker]', ...args),
  warn: (...args: unknown[]) => console.warn('[beehiiv-worker]', ...args),
  error: (...args: unknown[]) => console.error('[beehiiv-worker]', ...args),
};

const derivePublicationId = (explicit?: string): string => {
  const value = explicit ?? process.env.BEEHIIV_PUBLICATION_ID;
  if (!value) {
    throw new Error('Missing Beehiiv publication identifier. Set BEEHIIV_PUBLICATION_ID.');
  }
  return value;
};

const deriveApiKey = (explicit?: string): string => {
  const value = explicit ?? process.env.BEEHIIV_API_KEY;
  if (!value) {
    throw new Error('Missing Beehiiv API key. Set BEEHIIV_API_KEY.');
  }
  return value;
};

const toPrdPost = (post: BeehiivPost): PrdPost => {
  const firstAuthor = post.authors?.[0] ?? post.author ?? undefined;
  const tags = (post.tags ?? []).map((tag) => tag.name.trim()).filter(Boolean);
  const slug = post.slug ?? post.id;
  const text = post.text ?? post.plaintext ?? '';
  const excerptSource = post.preview_text ?? text;
  const heroImage = post.hero_image_url ?? post.image_url ?? post.featured_image_url ?? undefined;

  return normalizePrdPost({
    id: post.id,
    title: post.title,
    slug,
    excerpt: excerptSource,
    bodyHtml: post.html ?? '',
    rawText: text,
    tags,
    publishedAt: post.published_at ?? post.created_at ?? new Date().toISOString(),
    updatedAt: post.updated_at ?? post.published_at ?? post.created_at ?? new Date().toISOString(),
    url: post.web_url ?? '',
    heroImageUrl: heroImage ?? null,
    author: firstAuthor?.name ?? null,
  });
};

export class BeehiivWorker {
  private readonly client: BeehiivClient;
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;

  constructor(config: BeehiivWorkerConfig = {}) {
    const apiKey = deriveApiKey(config.apiKey);
    const publicationId = derivePublicationId(config.publicationId);
    this.logger = config.logger ?? DEFAULT_LOGGER;
    this.client = new BeehiivClient({
      apiKey,
      publicationId,
      pageSize: config.pageSize,
      baseUrl: config.baseUrl,
      fetchImpl: config.fetchImpl,
    });
  }

  async run(): Promise<PrdPost[]> {
    this.logger.info('Starting Beehiiv sync');
    const posts = await this.client.fetchAllPosts();
    this.logger.info(`Fetched ${posts.length} Beehiiv posts`);

    const normalized = posts.map(toPrdPost);
    this.logger.info(`Normalized ${normalized.length} posts into PRD schema`);

    return normalized;
  }
}
