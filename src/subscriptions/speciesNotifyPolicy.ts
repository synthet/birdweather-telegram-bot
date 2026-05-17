import type { Detection } from '../birdweather/types.js';
import type { StationBirdweatherService } from '../birdweather/service.js';
import { db } from '../db/client.js';
import { parseSqliteTimestamp, stationCalendarDay } from '../utils/dates.js';
import { isInfrequentAtStation } from './stationSpeciesFrequency.js';
import { speciesKey } from './speciesKey.js';

export function hasSpeciesBeenNotified(
  chatId: number,
  stationId: string,
  key: string,
): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM species_last_notified
       WHERE chat_id=? AND station_id=? AND species_key=?`,
    )
    .get(chatId, stationId, key);
  return !!row;
}

export function wasSpeciesNotifiedOnCalendarDay(
  chatId: number,
  stationId: string,
  key: string,
  calendarDay: string,
  timeZone?: string | null,
): boolean {
  const row = db
    .prepare(
      `SELECT last_notified_at FROM species_last_notified
       WHERE chat_id=? AND station_id=? AND species_key=?`,
    )
    .get(chatId, stationId, key) as { last_notified_at: string } | undefined;
  if (!row) return false;
  const lastDay = stationCalendarDay(timeZone, parseSqliteTimestamp(row.last_notified_at));
  return lastDay === calendarDay;
}

export async function isDetectionRare(
  detection: Detection,
  ctx: {
    chatId: number;
    stationId: string;
    service: Pick<StationBirdweatherService, 'topSpecies'>;
  },
): Promise<boolean> {
  if (detection.rarityNote) return true;

  const key = speciesKey(detection.species);
  if (!hasSpeciesBeenNotified(ctx.chatId, ctx.stationId, key)) return true;

  return isInfrequentAtStation(ctx.service, ctx.stationId, detection.species);
}

export async function shouldNotifySpecies(
  detection: Detection,
  ctx: {
    chatId: number;
    stationId: string;
    service: Pick<StationBirdweatherService, 'topSpecies'>;
    timeZone?: string | null;
  },
): Promise<boolean> {
  const key = speciesKey(detection.species);
  const today = stationCalendarDay(ctx.timeZone);
  if (!wasSpeciesNotifiedOnCalendarDay(ctx.chatId, ctx.stationId, key, today, ctx.timeZone)) {
    return true;
  }
  return isDetectionRare(detection, ctx);
}
