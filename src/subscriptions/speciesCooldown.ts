import { db } from '../db/client.js';
import { env } from '../config/env.js';
import type { Detection } from '../birdweather/types.js';
import { speciesKey } from './speciesKey.js';

export function isSpeciesOnCooldown(
  chatId: number,
  stationId: string,
  key: string,
): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM species_last_notified
       WHERE chat_id=? AND station_id=? AND species_key=?
         AND last_notified_at > datetime('now', '-' || ? || ' minutes')`,
    )
    .get(chatId, stationId, key, env.SPECIES_NOTIFY_COOLDOWN_MINUTES);
  return !!row;
}

export function recordSpeciesNotified(chatId: number, stationId: string, key: string): void {
  db.prepare(
    `INSERT INTO species_last_notified(chat_id, station_id, species_key, last_notified_at)
     VALUES (?,?,?, CURRENT_TIMESTAMP)
     ON CONFLICT(chat_id, station_id, species_key) DO UPDATE SET
       last_notified_at = CURRENT_TIMESTAMP`,
  ).run(chatId, stationId, key);
}

export function seedSpeciesCooldownFromDetections(
  chatId: number,
  stationId: string,
  detections: Detection[],
): void {
  const keys = new Set(detections.map((d) => speciesKey(d.species)));
  for (const key of keys) {
    recordSpeciesNotified(chatId, stationId, key);
  }
}
