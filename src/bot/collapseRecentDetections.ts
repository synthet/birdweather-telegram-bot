import type { Detection } from '../birdweather/types.js';
import { detectionSessionKey } from '../subscriptions/detectionSessionKey.js';

/** One row per acoustic session so rolling BirdWeather IDs do not flood /recent. */
export function collapseRecentDetections(
  detections: Detection[],
  maxItems: number,
): Detection[] {
  const seen = new Set<string>();
  const out: Detection[] = [];
  for (const d of detections) {
    const key = detectionSessionKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
    if (out.length >= maxItems) break;
  }
  return out;
}
