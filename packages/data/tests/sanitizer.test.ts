import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../src/html/sanitizer.js';

describe('sanitizeHtml', () => {
  it('removes script tags and leaves text content intact', () => {
    const dirty = '<p>Hello<script>alert("xss")</script>world</p>';
    const sanitized = sanitizeHtml(dirty);
    expect(sanitized).toBe('<p>Hello world</p>');
  });

  it('drops unsafe attributes and javascript URLs', () => {
    const dirty =
      '<a href="javascript:alert(1)" onclick="alert(2)" target="_blank">Click me</a>';
    const sanitized = sanitizeHtml(dirty);
    expect(sanitized).toBe('<a rel="noopener" target="_blank">Click me</a>');
  });

  it('preserves allowed tags and safe attributes', () => {
    const dirty =
      '<p class="lead">Welcome to <strong>Sleeping Giants</strong> <a href="https://example.com" rel="noreferrer">blog</a>.</p>';
    const sanitized = sanitizeHtml(dirty);
    expect(sanitized).toBe(
      '<p class="lead">Welcome to <strong>Sleeping Giants</strong> <a href="https://example.com" rel="noreferrer">blog</a>.</p>',
    );
  });

  it('optionally keeps data attributes when requested', () => {
    const dirty = '<div data-track="hero" class="hero">Hello</div>';
    const sanitized = sanitizeHtml(dirty, { allowDataAttributes: true });
    expect(sanitized).toBe('<div class="hero" data-track="hero">Hello</div>');
  });
});
