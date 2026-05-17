import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: { BOT_OWNER_TELEGRAM_ID: 424242 },
}));

import { isBotOwner } from '../config/owner.js';

describe('isBotOwner', () => {
  it('returns true only for the configured owner id', () => {
    expect(isBotOwner(424242)).toBe(true);
    expect(isBotOwner(1)).toBe(false);
    expect(isBotOwner(undefined)).toBe(false);
  });
});
