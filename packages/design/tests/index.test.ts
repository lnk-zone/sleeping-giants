import { describe, expect, it } from 'vitest';
import { createDesignToken } from '../src/index.js';

describe('createDesignToken', () => {
  it('returns a token object', () => {
    expect(createDesignToken('color.brand', '#ff0000')).toEqual({
      name: 'color.brand',
      value: '#ff0000'
    });
  });
});
