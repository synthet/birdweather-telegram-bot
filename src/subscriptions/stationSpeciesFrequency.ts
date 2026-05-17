import type { Species } from '../birdweather/types.js';
import type { StationBirdweatherService } from '../birdweather/service.js';
import { env } from '../config/env.js';
import { speciesKey } from './speciesKey.js';

const CACHE_TTL_MS = 30 * 60 * 1000;
const TOP_SPECIES_LIMIT = 100;

const countCache = new Map<string, { counts: Map<string, number>; expiresAt: number }>();

export async function getStationSpeciesCounts(
  service: Pick<StationBirdweatherService, 'topSpecies'>,
  stationId: string,
): Promise<Map<string, number>> {
  const cached = countCache.get(stationId);
  if (cached && cached.expiresAt > Date.now()) return cached.counts;

  const top = await service.topSpecies(stationId, TOP_SPECIES_LIMIT);
  const counts = new Map<string, number>();
  for (const row of top) {
    counts.set(speciesKey(row.species), row.count);
  }
  countCache.set(stationId, { counts, expiresAt: Date.now() + CACHE_TTL_MS });
  return counts;
}

export async function isInfrequentAtStation(
  service: Pick<StationBirdweatherService, 'topSpecies'>,
  stationId: string,
  species: Species,
): Promise<boolean> {
  const counts = await getStationSpeciesCounts(service, stationId);
  const count = counts.get(speciesKey(species));
  if (count === undefined) return true;
  return count <= env.SPECIES_RARE_STATION_MAX_COUNT;
}

/** @internal test helper */
export function clearStationSpeciesCountCache(): void {
  countCache.clear();
}
