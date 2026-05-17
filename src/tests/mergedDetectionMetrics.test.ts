import { describe, expect, it } from 'vitest';
import { summarizeDetectionMetrics } from '../subscriptions/mergedDetectionMetrics.js';
import type { Detection } from '../birdweather/types.js';

function det(score: number, confidence: number): Detection {
  return {
    id: 'd',
    score,
    confidence,
    species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
  };
}

describe('summarizeDetectionMetrics', () => {
  it('computes min, max, and average', () => {
    const summary = summarizeDetectionMetrics([det(7, 0.8), det(8, 0.9), det(6, 0.7)]);
    expect(summary.count).toBe(3);
    expect(summary.score).toEqual({ min: 6, max: 8, avg: 7 });
    expect(summary.confidence?.min).toBeCloseTo(0.7);
    expect(summary.confidence?.max).toBeCloseTo(0.9);
    expect(summary.confidence?.avg).toBeCloseTo(0.8);
  });
});
