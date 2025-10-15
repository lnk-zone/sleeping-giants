import { describe, expect, it } from 'vitest';
import { normalizePrdPost } from '../src/prd.js';

describe('normalizePrdPost', () => {
  it('generates sanitized html and plain text body', () => {
    const post = normalizePrdPost({
      id: 'post-1',
      title: 'Hello World',
      slug: 'hello-world',
      bodyHtml: '<p>Hello <strong>World</strong></p>',
      excerpt: 'Hello World',
    });

    expect(post.body).toBe('<p>Hello <strong>World</strong></p>');
    expect(post.bodyPlain).toBe('Hello World');
    expect(post.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });
});
