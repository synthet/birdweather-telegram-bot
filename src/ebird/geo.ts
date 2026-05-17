import { reverseRegion } from './client.js';
import { isEbirdEnabled } from './config.js';
import { getStationGeo, updateEbirdRegionCode } from '../db/stationGeo.js';

const regionReverseCache = new Map<string, { code: string; expiresAt: number }>();
const REGION_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export async function resolveEbirdRegionForStation(stationId: string): Promise<string | null> {
  const geo = getStationGeo(stationId);
  if (!geo) return null;
  if (geo.ebird_region_code) return geo.ebird_region_code;

  if (!isEbirdEnabled() || geo.lat == null || geo.lng == null || geo.location_privacy) {
    return null;
  }

  const key = cacheKey(geo.lat, geo.lng);
  const cached = regionReverseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    updateEbirdRegionCode(stationId, cached.code);
    return cached.code;
  }

  const result = await reverseRegion(geo.lat, geo.lng);
  const code = result.result?.[0]?.code ?? null;
  if (code) {
    regionReverseCache.set(key, { code, expiresAt: Date.now() + REGION_TTL_MS });
    updateEbirdRegionCode(stationId, code);
  }
  return code;
}

/** @internal test helper */
export function clearRegionReverseCache(): void {
  regionReverseCache.clear();
}
