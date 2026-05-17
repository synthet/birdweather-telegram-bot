import type { Detection } from '../birdweather/types.js';
import { env } from '../config/env.js';
import { speciesKey } from './speciesKey.js';

/** Collapses rolling BirdWeather detection rows for one acoustic visit into one alert key. */
export function detectionSessionKey(detection: Detection): string {
  const sk = speciesKey(detection.species);
  if (!detection.detectedAt) return `${sk}|unknown`;

  const at = new Date(detection.detectedAt);
  if (Number.isNaN(at.getTime())) return `${sk}|unknown`;

  const bucketMinutes = env.DETECTION_SESSION_BUCKET_MINUTES;
  const bucketMs = bucketMinutes * 60 * 1000;
  const bucketStart = Math.floor(at.getTime() / bucketMs) * bucketMs;
  return `${sk}|${bucketStart}`;
}
