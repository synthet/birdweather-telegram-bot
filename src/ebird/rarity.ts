import { fetchGeoRecentNotable, fetchGeoRecentSpecies, fetchRegionalSpeciesList } from './client.js';
import { isEbirdEnabled } from './config.js';
import { getEffectiveRegionCode, getStationGeo } from '../db/stationGeo.js';
import { lookupSpeciesCode, ensureTaxonomyLoaded } from './taxonomy.js';

const spplistCache = new Map<string, { codes: Set<string>; expiresAt: number }>();
const rarityCache = new Map<string, { note: string | null; expiresAt: number }>();
const SPPLIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RARITY_TTL_MS = 6 * 60 * 60 * 1000;

async function getRegionalSpeciesSet(regionCode: string): Promise<Set<string>> {
  const cached = spplistCache.get(regionCode);
  if (cached && cached.expiresAt > Date.now()) return cached.codes;

  const codes = new Set(await fetchRegionalSpeciesList(regionCode));
  spplistCache.set(regionCode, { codes, expiresAt: Date.now() + SPPLIST_TTL_MS });
  return codes;
}

export async function rarityHint(
  stationId: string,
  scientificName: string,
  chatId?: number,
): Promise<string | null> {
  if (!isEbirdEnabled()) return null;

  await ensureTaxonomyLoaded();
  const speciesCode = lookupSpeciesCode(scientificName);
  if (!speciesCode) return null;

  const cacheKey = `${stationId}:${speciesCode}`;
  const cached = rarityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.note;

  const geo = getStationGeo(stationId);
  const regionCode = getEffectiveRegionCode(stationId, chatId);
  let note: string | null = null;

  try {
    if (regionCode) {
      const regional = await getRegionalSpeciesSet(regionCode);
      if (!regional.has(speciesCode)) {
        note = 'eBird: unusual for this region (not on regional checklist).';
      }
    }

    if (!note && geo?.lat != null && geo?.lng != null && !geo.location_privacy) {
      const recent = await fetchGeoRecentSpecies(speciesCode, {
        lat: geo.lat,
        lng: geo.lng,
        back: 30,
        maxResults: 1,
      });
      if (recent.length === 0) {
        note = 'eBird: no human reports within 25 km in the last 30 days.';
      }

      if (!note) {
        const notable = await fetchGeoRecentNotable({
          lat: geo.lat,
          lng: geo.lng,
          back: 7,
          maxResults: 50,
        });
        if (notable.some((o) => o.speciesCode === speciesCode)) {
          note = 'eBird: recently marked notable nearby.';
        }
      }
    }
  } catch {
    note = null;
  }

  rarityCache.set(cacheKey, { note, expiresAt: Date.now() + RARITY_TTL_MS });
  return note;
}

/** @internal test helper */
export function clearRarityCaches(): void {
  spplistCache.clear();
  rarityCache.clear();
}
