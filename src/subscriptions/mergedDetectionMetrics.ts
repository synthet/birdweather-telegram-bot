import type { Detection } from '../birdweather/types.js';
import type { MergedDetectionMetrics, NumericSummary } from '../bot/formatters/detectionMetrics.js';

export type { MergedDetectionMetrics, NumericSummary } from '../bot/formatters/detectionMetrics.js';

function numericValues(
  detections: Detection[],
  field: 'score' | 'confidence' | 'probability',
): number[] {
  return detections
    .map((d) => d[field])
    .filter((v): v is number => v != null && !Number.isNaN(v));
}

function summarizeValues(values: number[]): NumericSummary | undefined {
  if (!values.length) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { min, max, avg };
}

export function summarizeDetectionMetrics(detections: Detection[]): MergedDetectionMetrics {
  return {
    count: detections.length,
    score: summarizeValues(numericValues(detections, 'score')),
    confidence: summarizeValues(numericValues(detections, 'confidence')),
    probability: summarizeValues(numericValues(detections, 'probability')),
  };
}
