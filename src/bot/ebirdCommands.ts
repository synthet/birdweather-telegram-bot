import type { Telegraf } from 'telegraf';
import { requireEbirdToken, isEbirdEnabled } from '../ebird/config.js';
import {
  fetchGeoRecent,
  fetchGeoRecentNotable,
  fetchRegionalNotable,
  fetchRegionalRecent,
} from '../ebird/client.js';
import { resolveGeoForCommands, getStationGeo, setEbirdRegionOverride } from '../db/stationGeo.js';
import { requireAccount } from './birdweatherContext.js';
import { asErrorMessage } from '../utils/errors.js';
import { formatEbirdObservationList } from './formatters/ebird.js';
import { db } from '../db/client.js';
import { refreshStationGeoFromGraphql } from './stationGeoRefresh.js';

const ensureSettings = (chatId: number) =>
  db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(chatId);

export function setupEbirdCommands(bot: Telegraf): void {
  bot.command('ebird_recent', async (ctx) => {
    if (!isEbirdEnabled()) return ctx.reply(asErrorMessage(new Error(requireEbirdToken())));
    try {
      const account = requireAccount(ctx.chat.id);
      await refreshStationGeoFromGraphql(account.station_id, account.station_token);
      const geo = resolveGeoForCommands(account.station_id, ctx.chat.id);
      if ('error' in geo) return ctx.reply(geo.error);

      const observations = geo.locationPrivacy
        ? geo.regionCode
          ? await fetchRegionalRecent(geo.regionCode, { back: 7, maxResults: 10 })
          : []
        : await fetchGeoRecent({ lat: geo.lat, lng: geo.lng, back: 7, maxResults: 10 });

      const header = geo.locationPrivacy
        ? `eBird recent in region ${geo.regionCode} (last 7 days):`
        : 'eBird recent within 25 km (last 7 days):';

      return ctx.reply(
        `${header}\n\n${formatEbirdObservationList(observations, 'No recent eBird observations found.')}`,
      );
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });

  bot.command('ebird_notable', async (ctx) => {
    if (!isEbirdEnabled()) return ctx.reply(asErrorMessage(new Error(requireEbirdToken())));
    try {
      const account = requireAccount(ctx.chat.id);
      await refreshStationGeoFromGraphql(account.station_id, account.station_token);
      const geo = resolveGeoForCommands(account.station_id, ctx.chat.id);
      if ('error' in geo) return ctx.reply(geo.error);

      const observations = geo.locationPrivacy
        ? geo.regionCode
          ? await fetchRegionalNotable(geo.regionCode, { back: 14, maxResults: 10 })
          : []
        : await fetchGeoRecentNotable({ lat: geo.lat, lng: geo.lng, back: 14, maxResults: 10 });

      const header = geo.locationPrivacy
        ? `eBird notable in region ${geo.regionCode}:`
        : 'eBird notable within 25 km:';

      return ctx.reply(
        `${header}\n\n${formatEbirdObservationList(observations, 'No notable eBird observations found.')}`,
      );
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });

  bot.command('ebird_region', async (ctx) => {
    try {
      const account = requireAccount(ctx.chat.id);
      await refreshStationGeoFromGraphql(account.station_id, account.station_token);
      const cached = getStationGeo(account.station_id);
      const override = db
        .prepare('SELECT ebird_region_override FROM chat_settings WHERE chat_id=?')
        .get(ctx.chat.id) as { ebird_region_override: string | null } | undefined;

      const lines = [
        `Station: ${account.station_id}`,
        `Location privacy: ${cached?.location_privacy ? 'yes' : 'no'}`,
        cached?.lat != null && cached?.lng != null && !cached.location_privacy
          ? `Coordinates: ${cached.lat.toFixed(4)}, ${cached.lng.toFixed(4)}`
          : 'Coordinates: hidden or unavailable',
        `eBird region (cached): ${cached?.ebird_region_code ?? 'not set'}`,
        `Your override: ${override?.ebird_region_override ?? 'none'}`,
        isEbirdEnabled() ? 'eBird API: configured' : 'eBird API: not configured (set EBIRD_API_TOKEN)',
      ];
      return ctx.reply(lines.join('\n'));
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });

  bot.command('set_ebird_region', async (ctx) => {
    const code = ctx.payload.trim();
    if (!code) {
      return ctx.reply('Usage: /set_ebird_region <region_code>\nExample: US-CA-037');
    }
    ensureSettings(ctx.chat.id);
    setEbirdRegionOverride(ctx.chat.id, code);
    return ctx.reply(`eBird region override set to ${code}.`);
  });
}
