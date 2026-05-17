import { Telegraf } from 'telegraf';
import { db } from '../db/client.js';
import { getAccount } from '../db/accounts.js';
import { fetchRecentDetections, applyDetectionFilters } from '../bot/birdweatherContext.js';
import { createStationBirdweatherService } from '../birdweather/service.js';
import { enrichDetection } from '../integrations/detectionEnrichment.js';
import { dedupe } from './dedupe.js';
import { formatDetection } from '../bot/formatters/detections.js';
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
  const detections = await fetchRecentDetections(
    s.chat_id,
    s.station_id,
    NOTIFICATION_FETCH_LIMIT,
    asFilterRecord(filters),
  );

  for (const d of detections.reverse()) {
    if (dedupe.seen(s.chat_id, d.id)) continue;
    await bot.telegram.sendMessage(
      s.chat_id,
      `🐦 New BirdWeather detection\n\n${formatDetection(d)}`,
    );
    dedupe.mark(s.chat_id, s.station_id, d.id);
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
