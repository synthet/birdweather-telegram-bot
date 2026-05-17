import type { Station } from '../birdweather/types.js';
import { upsertStationGeo } from '../db/stationGeo.js';
import { resolveEbirdRegionForStation } from '../ebird/geo.js';
import { isEbirdEnabled } from '../ebird/config.js';
import { createStationBirdweatherService } from '../birdweather/service.js';

export async function refreshStationGeoFromGraphql(
  stationId: string,
  stationToken: string,
): Promise<Station | null> {
  const station = await createStationBirdweatherService(stationToken).station(stationId);
  if (!station) return null;

  upsertStationGeo(station);

  if (isEbirdEnabled() && station.coords && !station.locationPrivacy) {
    try {
      await resolveEbirdRegionForStation(stationId);
    } catch {
      // region reverse is best-effort
    }
  }

  return station;
}

export function cacheStationGeo(station: Station): void {
  upsertStationGeo(station);
}
