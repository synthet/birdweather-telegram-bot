import { Telegraf } from 'telegraf';
import { birdweatherService } from '../birdweather/service.js';
import { db } from '../db/client.js';
import { dedupe } from './dedupe.js';
import { formatDetection } from '../bot/formatters/detections.js';

export async function processNotifications(bot: Telegraf): Promise<void> {
  const subs = db.prepare('SELECT ss.chat_id, ss.station_id, cs.min_score, cs.min_confidence, cs.min_probability, cs.include_soundscape_links, cs.paused FROM station_subscriptions ss LEFT JOIN chat_settings cs ON cs.chat_id = ss.chat_id WHERE ss.active=1').all() as any[];
  for (const s of subs) {
    if (s.paused) continue;
    const detections = await birdweatherService.detections(s.station_id, 5, {scoreGte:s.min_score ?? 0, confidenceGte:s.min_confidence ?? 0, probabilityGte:s.min_probability ?? 0, validSoundscape:(s.include_soundscape_links ?? 1) === 1});
    for (const d of detections.reverse()) {
      if (dedupe.seen(s.chat_id, d.id)) continue;
      await bot.telegram.sendMessage(s.chat_id, `🐦 New BirdWeather detection\n\n${formatDetection(d)}`);
      dedupe.mark(s.chat_id, s.station_id, d.id);
    }
  }
}
