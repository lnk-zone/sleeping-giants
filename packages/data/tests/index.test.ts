import { describe, expect, it } from 'vitest';
import { average } from '../src/index.js';

describe('average', () => {
  it('returns zero for an empty data set', () => {
    expect(average([])).toBe(0);
  });

  it('returns the arithmetic mean of the values', () => {
    expect(
      average([
        { metric: 'alpha', value: 1 },
        { metric: 'beta', value: 3 }
      ])
    ).toBe(2);
  });
});
