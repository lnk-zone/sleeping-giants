import { describe, expect, it } from 'vitest';
import { serializeEvent } from '../src/index.js';

describe('serializeEvent', () => {
  it('stringifies the event payload', () => {
    expect(serializeEvent({ name: 'init', properties: { ok: true } })).toBe(
      '{"name":"init","properties":{"ok":true}}'
    );
  });
});
