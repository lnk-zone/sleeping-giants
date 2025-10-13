import { describe, expect, it } from 'vitest';
import { createMessage } from '../src/index.js';

describe('createMessage', () => {
  it('wraps the id and payload into a message object', () => {
    const message = createMessage('welcome', { ok: true });
    expect(message).toEqual({ id: 'welcome', payload: { ok: true } });
  });
});
