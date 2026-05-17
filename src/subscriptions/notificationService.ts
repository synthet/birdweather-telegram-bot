import { Telegraf } from 'telegraf';
import { db } from '../db/client.js';
import { getAccount } from '../db/accounts.js';
import { applyDetectionFilters } from '../bot/birdweatherContext.js';
import type { Detection } from '../birdweather/types.js';
import { createStationBirdweatherService } from '../birdweather/service.js';
import { enrichDetection } from '../integrations/detectionEnrichment.js';
import { sendDetection } from '../bot/sendDetection.js';
import { dedupe } from './dedupe.js';
import { summarizeDetectionMetrics } from './mergedDetectionMetrics.js';
import { pickBestDetection } from './pickBestDetection.js';
import { speciesKey } from './speciesKey.js';
import { isSpeciesOnCooldown, recordSpeciesNotified } from './speciesCooldown.js';
import { shouldNotifySpecies } from './speciesNotifyPolicy.js';
import { logger } from '../utils/logging.js';
import {
  NOTIFICATION_FETCH_LIMIT,
  asFilterRecord,
  detectionFiltersFromRow,
} from './filters.js';

export interface ActiveSubscription {
  chat_id: number;
  station_id: string;
  min_score: number | null;
  min_confidence: number | null;
  min_probability: number | null;
  paused: number | null;
}

export function listActiveSubscriptions(): ActiveSubscription[] {
  return db
    .prepare(
      'SELECT ss.chat_id, ss.station_id, cs.min_score, cs.min_confidence, cs.min_probability, cs.paused FROM station_subscriptions ss LEFT JOIN chat_settings cs ON cs.chat_id = ss.chat_id WHERE ss.active=1',
    )
    .all() as ActiveSubscription[];
}

async function processSubscription(bot: Telegraf, s: ActiveSubscription): Promise<void> {
  if (s.paused) return;

  const account = getAccount(s.chat_id);
  if (!account || account.station_id !== s.station_id) return;

  const filters = detectionFiltersFromRow(s);
  const filterRecord = asFilterRecord(filters);
  const service = createStationBirdweatherService(account.station_token);
  const raw = await service.detections(s.station_id, NOTIFICATION_FETCH_LIMIT, filterRecord);
  const detections = applyDetectionFilters(raw, filterRecord);

  const settings = db
    .prepare('SELECT include_soundscape_links FROM chat_settings WHERE chat_id=?')
    .get(s.chat_id) as { include_soundscape_links: number } | undefined;
  const includeSoundscape = settings?.include_soundscape_links !== 0;

  const pendingBySpecies = new Map<string, Detection[]>();
  for (const d of detections) {
    if (dedupe.seen(s.chat_id, d.id)) continue;
    const key = speciesKey(d.species);
    const group = pendingBySpecies.get(key) ?? [];
    group.push(d);
    pendingBySpecies.set(key, group);
  }

  for (const [key, group] of pendingBySpecies) {
    if (isSpeciesOnCooldown(s.chat_id, s.station_id, key)) {
      for (const d of group) dedupe.mark(s.chat_id, s.station_id, d.id);
      continue;
    }

    const best = pickBestDetection(group);
    const enriched = await enrichDetection(best, {
      stationId: s.station_id,
      chatId: s.chat_id,
      includeRarity: true,
    });

    const notify = await shouldNotifySpecies(enriched, {
      chatId: s.chat_id,
      stationId: s.station_id,
      service,
      timeZone: enriched.station?.timezone,
    });
    if (!notify) {
      for (const d of group) dedupe.mark(s.chat_id, s.station_id, d.id);
      continue;
    }

    await sendDetection(bot.telegram, s.chat_id, enriched, {
      includeSoundscapeLink: includeSoundscape,
      mergedMetrics: group.length > 1 ? summarizeDetectionMetrics(group) : undefined,
    });
    for (const d of group) dedupe.mark(s.chat_id, s.station_id, d.id);
    recordSpeciesNotified(s.chat_id, s.station_id, key);
  }
}

export async function processNotifications(bot: Telegraf): Promise<void> {
  for (const s of listActiveSubscriptions()) {
    try {
      await processSubscription(bot, s);
    } catch (e) {
      logger.error(
        { err: e, chatId: s.chat_id, stationId: s.station_id },
        'notification failed for subscription',
      );
    }
  }
}
