/** Format BirdWeather detection score (roughly 0–10 scale, not a percent). */
export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
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
