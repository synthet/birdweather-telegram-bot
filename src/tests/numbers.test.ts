import { describe, expect, it } from 'vitest';
import { formatAsPercent, formatScore, formatScoreThreshold } from '../utils/numbers.js';

describe('formatScore', () => {
  it('formats API scores without a percent sign', () => {
    expect(formatScore(7.7)).toBe('7.7');
    expect(formatScore(8.19)).toBe('8.2');
    expect(formatScore(8)).toBe('8');
    expect(formatScore(null)).toBe('—');
  });
});

describe('formatScoreThreshold', () => {
  it('always shows one decimal', () => {
    expect(formatScoreThreshold(7)).toBe('7.0');
    expect(formatScoreThreshold(7.75)).toBe('7.8');
  });
});

describe('formatAsPercent', () => {
  it('rounds fractional values to whole percents', () => {
    expect(formatAsPercent(0.9)).toBe('90%');
    expect(formatAsPercent(0.8836901187896729)).toBe('88%');
  });

  it('handles edge cases', () => {
    expect(formatAsPercent(null)).toBe('—');
    expect(formatAsPercent(1)).toBe('100%');
  });
});
