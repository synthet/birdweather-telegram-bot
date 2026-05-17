export interface NumericSummary {
  min: number;
  max: number;
  avg: number;
}

export interface MergedDetectionMetrics {
  count: number;
  score?: NumericSummary;
  confidence?: NumericSummary;
  probability?: NumericSummary;
}
