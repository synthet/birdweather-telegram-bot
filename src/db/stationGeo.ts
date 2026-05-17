import { db } from './client.js';
import type { Station } from '../birdweather/types.js';
import type { StationGeoRecord } from '../ebird/types.js';

export function upsertStationGeo(station: Station): void {
  const lat = station.coords?.lat ?? null;
  const lng = station.coords?.lon ?? null;
  db.prepare(
    `INSERT INTO station_geo(station_id, lat, lng, location_privacy, country, state, updated_at)
     VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(station_id) DO UPDATE SET
       lat=excluded.lat,
       lng=excluded.lng,
       location_privacy=excluded.location_privacy,
       country=excluded.country,
       state=excluded.state,
       updated_at=CURRENT_TIMESTAMP`,
  ).run(
    station.id,
    lat,
    lng,
    station.locationPrivacy ? 1 : 0,
    station.country ?? null,
    station.state ?? null,
  );
}

export function updateEbirdRegionCode(stationId: string, regionCode: string): void {
  db.prepare(
    'UPDATE station_geo SET ebird_region_code=?, updated_at=CURRENT_TIMESTAMP WHERE station_id=?',
  ).run(regionCode, stationId);
}

export function getStationGeo(stationId: string): StationGeoRecord | null {
  return (
    (db.prepare('SELECT * FROM station_geo WHERE station_id=?').get(stationId) as
      | StationGeoRecord
      | undefined) ?? null
  );
}

export function getEbirdRegionOverride(chatId: number): string | null {
  const row = db
    .prepare('SELECT ebird_region_override FROM chat_settings WHERE chat_id=?')
    .get(chatId) as { ebird_region_override: string | null } | undefined;
  return row?.ebird_region_override?.trim() || null;
}

export function setEbirdRegionOverride(chatId: number, regionCode: string | null): void {
  db.prepare(
    'UPDATE chat_settings SET ebird_region_override=?, updated_at=CURRENT_TIMESTAMP WHERE chat_id=?',
  ).run(regionCode, chatId);
}

export function getEffectiveRegionCode(stationId: string, chatId?: number): string | null {
  if (chatId != null) {
    const override = getEbirdRegionOverride(chatId);
    if (override) return override;
  }
  return getStationGeo(stationId)?.ebird_region_code ?? null;
}

export interface ResolvedGeo {
  lat: number;
  lng: number;
  locationPrivacy: boolean;
  regionCode: string | null;
}

export function resolveGeoForCommands(
  stationId: string,
  chatId: number,
): ResolvedGeo | { error: string } {
  const geo = getStationGeo(stationId);
  if (!geo) {
    return { error: 'No station location cached. Run /station or /register again.' };
  }

  const regionCode = getEffectiveRegionCode(stationId, chatId);
  if (geo.lat == null || geo.lng == null || geo.location_privacy) {
    if (!regionCode) {
      return {
        error:
          'Station coordinates are private or missing. Set a region with /set_ebird_region <code> (e.g. US-CA-037).',
      };
    }
    return {
      lat: 0,
      lng: 0,
      locationPrivacy: true,
      regionCode,
    };
  }

  return {
    lat: geo.lat,
    lng: geo.lng,
    locationPrivacy: false,
    regionCode,
  };
}
