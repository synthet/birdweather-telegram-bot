import { fetchStationDetections } from '../birdweather/rest.js';
import { applyDetectionFilters } from '../bot/birdweatherContext.js';
import { db } from '../db/client.js';
import { dedupe } from './dedupe.js';
import { detectionSessionKey } from './detectionSessionKey.js';
import { sessionDedupe } from './sessionDedupe.js';
import { seedSpeciesCooldownFromDetections } from './speciesCooldown.js';
import {
  NOTIFICATION_FETCH_LIMIT,
  asFilterRecord,
  detectionFiltersFromRow,
  type DetectionFilterSettings,
} from './filters.js';

export async function seedDeliveredDetections(
  chatId: number,
  stationId: string,
  stationToken: string,
  filters: DetectionFilterSettings,
): Promise<void> {
  const detections = await fetchStationDetections(stationToken, NOTIFICATION_FETCH_LIMIT);
  const filtered = applyDetectionFilters(detections, asFilterRecord(filters));
  for (const d of filtered) {
    dedupe.mark(chatId, stationId, d.id);
    sessionDedupe.mark(chatId, stationId, detectionSessionKey(d));
  }
  seedSpeciesCooldownFromDetections(chatId, stationId, filtered);
}

export function getChatDetectionFilters(chatId: number): DetectionFilterSettings {
  const row = db
    .prepare('SELECT min_score, min_confidence, min_probability FROM chat_settings WHERE chat_id=?')
    .get(chatId) as
    | { min_score: number; min_confidence: number; min_probability: number }
    | undefined;
  return detectionFiltersFromRow(
    row ?? { min_score: null, min_confidence: null, min_probability: null },
  );
}
