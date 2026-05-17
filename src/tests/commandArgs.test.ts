import { describe, expect, it } from 'vitest';
import { parseCommandNumber, parseFractionOrPercent } from '../utils/commandArgs.js';

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

describe('parseFractionOrPercent', () => {
  it('parses fractions and percents', () => {
    expect(parseFractionOrPercent('0.62')).toBe(0.62);
    expect(parseFractionOrPercent('62%')).toBe(0.62);
    expect(parseFractionOrPercent('62')).toBe(0.62);
    expect(parseFractionOrPercent(' 80 ')).toBe(0.8);
  });

  it('rejects out-of-range values', () => {
    expect(parseFractionOrPercent('')).toBeUndefined();
    expect(parseFractionOrPercent('101')).toBeUndefined();
    expect(parseFractionOrPercent('101%')).toBeUndefined();
    expect(parseFractionOrPercent('-5%')).toBeUndefined();
  });
});
