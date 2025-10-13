import { describe, expect, it } from 'vitest';
import { bootstrapReader } from '../src/index.js';

describe('bootstrapReader', () => {
  it('announces the configured version', () => {
    expect(bootstrapReader({ version: '0.0.1' })).toBe(
      'Sleeping Giants Reader v0.0.1'
    );
  });
});
