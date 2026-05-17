import type { Telegraf, Context } from 'telegraf';
import { saveAccount, getAccount, deleteAccount } from '../db/accounts.js';
import {
  clearRegistration,
  getRegistrationSession,
  setRegistrationToken,
  startRegistration,
} from '../db/registration.js';
import { validateRegistration } from '../birdweather/validate.js';
import { validateStationToken } from '../birdweather/rest.js';
import { requireStationService } from './birdweatherContext.js';
import { db } from '../db/client.js';
import { parseStationId, stationBirdweatherUrl } from '../utils/stationId.js';
import { createStationBirdweatherService } from '../birdweather/service.js';
import { getChatDetectionFilters, seedDeliveredDetections } from '../subscriptions/seeding.js';
import { refreshStationNameForChat } from './stationMetadata.js';
import { refreshStationGeoFromGraphql } from './stationGeoRefresh.js';

const ensureSettings = (chatId: number) =>
  db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(chatId);

function maskToken(token: string): string {
  if (token.length <= 8) return '••••';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function handleRegistrationMessage(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id;
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
  if (chatId == null || !text || text.startsWith('/')) return false;

  const session = getRegistrationSession(chatId);
  if (!session) return false;

  if (session.step === 'awaiting_token') {
    const tokenOk = await validateStationToken(text);
    if (!tokenOk) {
      await ctx.reply('That token was not accepted. Send your BirdWeather station auth token, or /cancel to stop.');
      return true;
    }
    setRegistrationToken(chatId, text);
    await ctx.reply(
      'Token accepted.\n\nNow send your station ID (numeric ID from the BirdWeather app or station URL).',
    );
    return true;
  }

  if (session.step === 'awaiting_station_id' && session.station_token) {
    const stationId = parseStationId(text);
    if (!stationId) {
      await ctx.reply(
        'Could not read a station ID from that message. Send a numeric ID (e.g. 26807) or your BirdWeather station URL.',
      );
      return true;
    }

    const result = await validateRegistration(session.station_token, stationId);
    if (!result.ok) {
      await ctx.reply(`${result.message}\n\nTry another station ID, or /cancel to start over.`);
      return true;
    }

    let stationName: string | null = result.stationName ?? null;
    if (!stationName) {
      try {
        stationName =
          (await createStationBirdweatherService(session.station_token).station(stationId))?.name ??
          null;
      } catch {
        // name is optional
      }
    }

    saveAccount(chatId, stationId, session.station_token, stationName ?? null);
    clearRegistration(chatId);
    ensureSettings(chatId);

    try {
      await refreshStationGeoFromGraphql(stationId, session.station_token);
    } catch {
      // geo cache is best-effort
    }
    db.prepare(
      'INSERT OR REPLACE INTO station_subscriptions(chat_id,station_id,station_name,active) VALUES(?,?,?,1)',
    ).run(chatId, stationId, stationName ?? null);

    try {
      await seedDeliveredDetections(
        chatId,
        stationId,
        session.station_token,
        getChatDetectionFilters(chatId),
      );
    } catch {
      // seeding is best-effort; polling will still dedupe new birds
    }

    await ctx.reply(
      `Linked to station ${stationId}${stationName ? ` (${stationName})` : ''}.\n${stationBirdweatherUrl(stationId)}\n\nYou are subscribed to detection alerts. Use /account to review, /unregister to remove.`,
    );
    return true;
  }

  return false;
}

export function setupRegistration(bot: Telegraf): void {
  bot.use(async (ctx, next) => {
    if (await handleRegistrationMessage(ctx)) return;
    return next();
  });

  bot.command('register', async (ctx) => {
    const chatId = ctx.chat.id;
    const existing = getAccount(chatId);
    if (existing) {
      await ctx.reply(
        `You already linked station ${existing.station_id} (${existing.station_name ?? 'unnamed'}).\n${stationBirdweatherUrl(existing.station_id)}\n\nSend /unregister first to link a different station, or /account to view details.`,
      );
      return;
    }
    startRegistration(chatId);
    await ctx.reply(
      'BirdWeather registration\n\n' +
        'Permissions requested: read access to your BirdWeather station metadata and detections so this bot can send bird alerts in this chat.\n' +
        'Disconnect anytime with /unregister; this removes your linked station from this chat.\n\n' +
        '1) Send your station auth token (from the PUC app or station settings — not your Telegram bot token).\n' +
        '2) Then send your station ID.\n\n' +
        'Permissions: this stores your station token so the bot can read station details/detections and send alerts.\n' +
        'Disconnect anytime with /unregister.\n\n' +
        '/cancel — abort registration',
    );
  });

  bot.command('cancel', async (ctx) => {
    if (!getRegistrationSession(ctx.chat.id)) {
      await ctx.reply('No registration in progress.');
      return;
    }
    clearRegistration(ctx.chat.id);
    await ctx.reply('Registration cancelled.');
  });

  bot.command('unregister', async (ctx) => {
    const chatId = ctx.chat.id;
    clearRegistration(chatId);
    const removed = deleteAccount(chatId);
    if (!removed) {
      await ctx.reply('No BirdWeather station is linked to this chat.');
      return;
    }
    db.prepare('DELETE FROM station_subscriptions WHERE chat_id=?').run(chatId);
    await ctx.reply('BirdWeather station unlinked. Detection commands for your station now need an explicit ID.');
  });

  bot.command('account', async (ctx) => {
    const account = getAccount(ctx.chat.id);
    if (!account) {
      await ctx.reply('No station linked. Use /register to connect your BirdWeather station.');
      return;
    }
    const refreshedName = await refreshStationNameForChat(ctx.chat.id);
    const displayName = refreshedName ?? account.station_name ?? 'Unknown';
    let details = `Station: ${displayName}\nID: ${account.station_id}\nBirdWeather: ${stationBirdweatherUrl(account.station_id)}\nToken: ${maskToken(account.station_token)}`;
    try {
      const station = await requireStationService(ctx.chat.id, account.station_id).station(
        account.station_id,
      );
      if (station) {
        details += `\nType: ${station.stationType ?? 'N/A'}\nLocation: ${station.location ?? 'N/A'}`;
      }
    } catch {
      // station metadata is optional
    }
    await ctx.reply(details);
  });
}
