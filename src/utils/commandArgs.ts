/** Parses a numeric argument from a bot command payload; rejects empty input (Number('') === 0). */
export function parseCommandNumber(payload: string): number | undefined {
  const trimmed = payload.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/** Parses a 0–1 fraction or percent (e.g. 0.62, 62, 62%). Returns a stored 0–1 value. */
export function parseFractionOrPercent(payload: string): number | undefined {
  const trimmed = payload.trim();
  if (!trimmed) return undefined;

  const explicitPercent = trimmed.endsWith('%');
  const raw = explicitPercent ? trimmed.slice(0, -1).trim() : trimmed;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;

  if (explicitPercent || n > 1) {
    if (n < 0 || n > 100) return undefined;
    return n / 100;
  }
  if (n < 0 || n > 1) return undefined;
  return n;
}
