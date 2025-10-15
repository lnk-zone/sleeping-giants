import { sanitizeHtml } from './html/sanitizer.js';

export interface PrdPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  bodyPlain: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  url: string;
  heroImageUrl?: string;
  author?: string;
  readingTimeMinutes: number;
  source: 'beehiiv';
}

export interface PrdPostInput {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  bodyHtml?: string;
  rawText?: string;
  tags?: string[];
  publishedAt?: string;
  updatedAt?: string;
  url?: string;
  heroImageUrl?: string | null;
  author?: string | null;
}

const WORDS_PER_MINUTE = 220;

export const computeReadingTimeMinutes = (text: string): number => {
  const words = text
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const readingTime = Math.ceil(words.length / WORDS_PER_MINUTE);
  return readingTime > 0 ? readingTime : 1;
};

export const normalizePrdPost = (input: PrdPostInput): PrdPost => {
  const body = sanitizeHtml(input.bodyHtml ?? '');
  const publishedAt = input.publishedAt ?? new Date().toISOString();
  const updatedAt = input.updatedAt ?? publishedAt;
  const textSource = input.rawText ?? body;
  const plainText = textSource.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const excerpt =
    input.excerpt ??
    plainText
      .slice(0, 280);

  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    excerpt,
    body,
    bodyPlain: plainText,
    tags: input.tags ?? [],
    publishedAt,
    updatedAt,
    url: input.url ?? '',
    heroImageUrl: input.heroImageUrl ?? undefined,
    author: input.author ?? undefined,
    readingTimeMinutes: computeReadingTimeMinutes(plainText),
    source: 'beehiiv',
  };
};
