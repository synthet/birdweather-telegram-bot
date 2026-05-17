/** Parses a numeric argument from a bot command payload; rejects empty input (Number('') === 0). */
export function parseCommandNumber(payload: string): number | undefined {
  const trimmed = payload.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}
