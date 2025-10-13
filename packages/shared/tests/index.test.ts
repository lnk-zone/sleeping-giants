import { describe, expect, it } from 'vitest';
import { noop } from '../src/index.js';

describe('noop', () => {
  it('does not throw', () => {
    expect(() => noop()).not.toThrow();
  });
});
