import { describe, expect, it } from 'vitest';
import { parseCommandNumber } from '../utils/commandArgs.js';

describe('parseCommandNumber', () => {
  it('rejects empty payload', () => {
    expect(parseCommandNumber('')).toBeUndefined();
    expect(parseCommandNumber('   ')).toBeUndefined();
  });

  it('parses valid numbers', () => {
    expect(parseCommandNumber('5')).toBe(5);
    expect(parseCommandNumber(' 0.5 ')).toBe(0.5);
  });

  it('rejects non-numeric input', () => {
    expect(parseCommandNumber('abc')).toBeUndefined();
  });
});
