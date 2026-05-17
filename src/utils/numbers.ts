/** Round a score threshold to one decimal (BirdWeather ~0–10 scale). */
export function normalizeScoreThreshold(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Format a stored min-score threshold (always one decimal, e.g. 7 → 7.0). */
export function formatScoreThreshold(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return normalizeScoreThreshold(value).toFixed(1);
}

/** Format BirdWeather detection score (roughly 0–10 scale, not a percent). */
export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = normalizeScoreThreshold(value);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

/** Format 0–1 (or 0–100) values for display as a percentage. */
export function formatAsPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const pct = value >= 0 && value <= 1 ? value * 100 : value;
  if (pct >= 99.95) return '100%';
  if (pct >= 10) return `${Math.round(pct)}%`;
  return `${pct.toFixed(1)}%`;
}
