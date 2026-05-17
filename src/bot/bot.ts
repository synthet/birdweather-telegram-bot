import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { formatStation } from './formatters/stations.js';
import { formatDetection } from './formatters/detections.js';
import { formatSpecies } from './formatters/species.js';
import {
  fetchRecentDetections,
  requirePublicService,
  requireStationService,
  resolveStationId,
} from './birdweatherContext.js';
import { setupRegistration } from './registration.js';
import { asErrorMessage } from '../utils/errors.js';
import { parseCommandNumber } from '../utils/commandArgs.js';
import { getChatDetectionFilters, seedDeliveredDetections } from '../subscriptions/seeding.js';
import { refreshStationNameForChat } from './stationMetadata.js';
import { getAccount, hasActiveSubscription } from '../db/accounts.js';

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
const ensureSettings = (chatId: number) =>
  db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(chatId);

const HELP_TEXT = [
  '/register — link your BirdWeather station token and ID',
  '/account — show linked station',
  '/unregister — remove linked station',
  '/station <id> — station details (defaults to your linked station)',
  '/stations <query> — search public stations',
  '/recent [id] — recent detections',
  '/species <name> — search species',
  '/top [id] — top species for a station',
  '/subscribe_station [id] — alerts for detections',
  '/unsubscribe_station <id>',
  '/subscriptions',
  '/settings',
  '/set_score <num>',
  '/set_confidence <num>',
  '/set_probability <num>',
  '/pause',
  '/resume',
].join('\n');

setupRegistration(bot);

bot.command('start', (ctx) =>
  ctx.reply(
    'BirdWeather bot: link your station with /register, then monitor detections. Use /help for commands.',
  ),
);
bot.command('help', (ctx) => ctx.reply(HELP_TEXT));

bot.command('station', async (ctx) => {
  try {
    const id = resolveStationId(ctx.chat.id, ctx.payload);
    if (!id) {
      return ctx.reply('Usage: /station <station_id>\nOr /register to link your station first.');
    }
    const st = await requireStationService(ctx.chat.id, id).station(id);
    return ctx.reply(st ? formatStation(st) : 'Station not found');
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('stations', async (ctx) => {
  const q = ctx.payload.trim();
  if (!q) return ctx.reply('Usage: /stations <query>');
  try {
    const list = await requirePublicService(ctx.from?.id).stations(q, 10);
    return ctx.reply(list.length ? list.map(formatStation).join('\n\n') : 'No stations found');
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('recent', async (ctx) => {
  const id = resolveStationId(ctx.chat.id, ctx.payload);
  if (!id) {
    return ctx.reply('Usage: /recent <station_id>\nOr /register to use your linked station.');
  }
  try {
    const list = await fetchRecentDetections(ctx.chat.id, id, 10);
    return ctx.reply(list.length ? list.map(formatDetection).join('\n\n') : 'No detections found');
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('species', async (ctx) => {
  const q = ctx.payload.trim();
  if (!q) return ctx.reply('Usage: /species <name>');
  try {
    const list = await requirePublicService(ctx.from?.id).searchSpecies(q);
    return ctx.reply(list.slice(0, 10).map(formatSpecies).join('\n\n') || 'No species found');
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('top', async (ctx) => {
  const id = resolveStationId(ctx.chat.id, ctx.payload);
  if (!id) {
    return ctx.reply('Usage: /top <station_id>\nOr /register to use your linked station.');
  }
  try {
    const list = await requireStationService(ctx.chat.id, id).topSpecies(id, 10);
    return ctx.reply(
      list.length
        ? list.map((x, i) => `${i + 1}. ${x.species.commonName} (${x.species.scientificName}) - ${x.count}`).join('\n')
        : 'No top species data',
    );
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('subscribe_station', async (ctx) => {
  const chatId = ctx.chat.id;
  const id = resolveStationId(chatId, ctx.payload);
  if (!id) {
    return ctx.reply('Usage: /subscribe_station <station_id>\nOr /register to subscribe to your linked station.');
  }
  ensureSettings(chatId);
  try {
    const st = await requireStationService(chatId, id).station(id);
    db.prepare(
      'INSERT OR REPLACE INTO station_subscriptions(chat_id,station_id,station_name,active) VALUES(?,?,?,1)',
    ).run(chatId, id, st?.name ?? null);
    const account = getAccount(chatId);
    if (account) {
      try {
        await seedDeliveredDetections(chatId, id, account.station_token, getChatDetectionFilters(chatId));
      } catch {
        // seeding is best-effort
      }
    }
    return ctx.reply(`Subscribed to station ${id}${st?.name ? ` (${st.name})` : ''}`);
  } catch (e) {
    return ctx.reply(asErrorMessage(e));
  }
});

bot.command('unsubscribe_station', (ctx) => {
  const id = ctx.payload.trim() || getAccount(ctx.chat.id)?.station_id;
  if (!id) return ctx.reply('Usage: /unsubscribe_station <station_id>');
  db.prepare('DELETE FROM station_subscriptions WHERE chat_id=? AND station_id=?').run(ctx.chat.id, id);
  return ctx.reply(`Unsubscribed from ${id}`);
});

bot.command('subscriptions', async (ctx) => {
  const chatId = ctx.chat.id;
  await refreshStationNameForChat(chatId);

  const rows = db
    .prepare('SELECT station_id, station_name FROM station_subscriptions WHERE chat_id=? AND active=1')
    .all(chatId) as Array<{ station_id: string; station_name: string | null }>;
  if (!rows.length) return ctx.reply('No subscriptions');

  const account = getAccount(chatId);
  const lines = rows.map((r) => `${r.station_id} - ${r.station_name ?? 'Unknown'}`);
  if (!account) {
    lines.push(
      '\nStation token missing — alerts and /recent will not work until you /register again.',
    );
  }
  return ctx.reply(lines.join('\n'));
});

bot.command('settings', (ctx) => {
  ensureSettings(ctx.chat.id);
  const s = db.prepare('SELECT * FROM chat_settings WHERE chat_id=?').get(ctx.chat.id) as {
    min_score: number;
    min_confidence: number;
    min_probability: number;
    include_soundscape_links: number;
    paused: number;
  };
  const account = getAccount(ctx.chat.id);
  const linkLine = account
    ? `Linked station: ${account.station_id}\n`
    : hasActiveSubscription(ctx.chat.id)
      ? 'Station token missing — use /register to restore your link.\n'
      : '';
  return ctx.reply(
    `${linkLine}score>=${s.min_score}\nconfidence>=${s.min_confidence}\nprobability>=${s.min_probability}\ninclude soundscape=${!!s.include_soundscape_links}\npaused=${!!s.paused}`,
  );
});

for (const field of ['score', 'confidence', 'probability'] as const) {
  bot.command(`set_${field}`, (ctx) => {
    ensureSettings(ctx.chat.id);
    const n = parseCommandNumber(ctx.payload);
    if (n === undefined) return ctx.reply(`Usage: /set_${field} <number>`);
    db.prepare(
      `UPDATE chat_settings SET min_${field}=?, updated_at=CURRENT_TIMESTAMP WHERE chat_id=?`,
    ).run(n, ctx.chat.id);
    return ctx.reply(`Updated ${field} threshold to ${n}`);
  });
}

bot.command('pause', (ctx) => {
  ensureSettings(ctx.chat.id);
  db.prepare('UPDATE chat_settings SET paused=1 WHERE chat_id=?').run(ctx.chat.id);
  return ctx.reply('Notifications paused');
});

bot.command('resume', (ctx) => {
  ensureSettings(ctx.chat.id);
  db.prepare('UPDATE chat_settings SET paused=0 WHERE chat_id=?').run(ctx.chat.id);
  return ctx.reply('Notifications resumed');
});

bot.catch((err, ctx) => {
  void ctx.reply('Something went wrong. Please try again.');
  console.error(err);
});
