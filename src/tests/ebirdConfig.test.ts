import { afterEach, describe, expect, it } from 'vitest';
import { getEbirdToken, isEbirdEnabled } from '../ebird/config.js';

describe('isEbirdEnabled', () => {
  const prev = process.env.EBIRD_API_TOKEN;

  afterEach(() => {
    if (prev === undefined) delete process.env.EBIRD_API_TOKEN;
    else process.env.EBIRD_API_TOKEN = prev;
  });

  it('is false when token is unset', () => {
    delete process.env.EBIRD_API_TOKEN;
    expect(isEbirdEnabled()).toBe(false);
    expect(getEbirdToken()).toBeUndefined();
  });

  it('is false when token is whitespace only', () => {
    process.env.EBIRD_API_TOKEN = '   ';
    expect(isEbirdEnabled()).toBe(false);
    expect(getEbirdToken()).toBeUndefined();
  });

  it('is true when token is set', () => {
    process.env.EBIRD_API_TOKEN = 'abc123';
    expect(isEbirdEnabled()).toBe(true);
    expect(getEbirdToken()).toBe('abc123');
  });
});
