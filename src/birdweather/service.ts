import { connectionNodes } from './connections.js';
import { createGqlClient } from './client.js';
import { env } from '../config/env.js';
import {
  DETECTIONS_QUERY,
  SEARCH_SPECIES_QUERY,
  STATIONS_QUERY,
  STATION_QUERY,
  TOP_SPECIES_QUERY,
} from './queries.js';
import type { Detection, Species, Station } from './types.js';
import { stationBirdweatherUrl } from '../utils/stationId.js';

interface GqlStation {
  id: string;
  name: string;
  type?: string;
  location?: string;
  locationPrivacy?: boolean;
  country?: string;
  state?: string;
  coords?: { lat: number; lon: number };
  timezone?: string;
  latestDetectionAt?: string;
  audioUrl?: string;
  videoUrl?: string;
  counts?: { detections?: number; species?: number };
}

interface GqlDetection {
  id: string;
  timestamp?: string;
  score?: number;
  confidence?: number;
  probability?: number;
  soundscape?: { url?: string };
  species: Species;
  station?: Pick<Station, 'id' | 'name'>;
}

async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let e: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw e;
}

function mapStation(s: GqlStation): Station {
  return {
    id: s.id,
    name: s.name,
    stationType: s.type,
    location: s.location,
    country: s.country,
    state: s.state,
    coords: s.coords ? { lat: s.coords.lat, lon: s.coords.lon } : undefined,
    locationPrivacy: s.locationPrivacy,
    timezone: s.timezone,
    latestDetectionAt: s.latestDetectionAt,
    detectionCount: s.counts?.detections,
    speciesCount: s.counts?.species,
    audioUrl: s.audioUrl,
    videoUrl: s.videoUrl,
    url: stationBirdweatherUrl(s.id),
  };
}

function mapDetection(d: GqlDetection): Detection {
  return {
    id: d.id,
    detectedAt: d.timestamp,
    score: d.score,
    confidence: d.confidence,
    probability: d.probability,
    soundscapeUrl: d.soundscape?.url,
    species: d.species,
    station: d.station,
  };
}

export function createBirdweatherService(apiToken: string) {
  const gqlClient = createGqlClient(apiToken);

  return {
    station: async (id: string): Promise<Station | null> =>
      retry(async () => {
        const data = await gqlClient.request<{ station: GqlStation | null }>(STATION_QUERY, { id });
        return data.station ? mapStation(data.station) : null;
      }),

    stations: async (query: string, first = 10): Promise<Station[]> =>
      retry(async () => {
        const data = await gqlClient.request<{ stations: { nodes?: GqlStation[] } }>(STATIONS_QUERY, {
          query,
          first,
        });
        return connectionNodes(data.stations).map(mapStation);
      }),

    detections: async (
      stationId: string,
      first = 10,
      filters: Record<string, unknown> = {},
    ): Promise<Detection[]> =>
      retry(async () => {
        const data = await gqlClient.request<{ detections: { nodes?: GqlDetection[] } }>(
          DETECTIONS_QUERY,
          { stationIds: [stationId], first, ...filters },
        );
        return connectionNodes(data.detections).map(mapDetection);
      }),

    searchSpecies: async (query: string): Promise<Species[]> =>
      retry(async () => {
        const data = await gqlClient.request<{ searchSpecies: { nodes?: Species[] } }>(
          SEARCH_SPECIES_QUERY,
          { query },
        );
        return connectionNodes(data.searchSpecies);
      }),

    topSpecies: async (
      stationId: string,
      limit = 10,
    ): Promise<Array<{ species: Species; count: number }>> =>
      retry(async () => {
        const data = await gqlClient.request<{
          topSpecies: Array<{ species: Species; count: number }>;
        }>(TOP_SPECIES_QUERY, { stationIds: [stationId], limit });
        return data.topSpecies;
      }),
  };
}

export type BirdweatherService = ReturnType<typeof createBirdweatherService>;

export type PublicBirdweatherService = Pick<BirdweatherService, 'stations' | 'searchSpecies'>;
export type StationBirdweatherService = Pick<
  BirdweatherService,
  'station' | 'detections' | 'topSpecies' | 'stations' | 'searchSpecies'
>;

export function createPublicBirdweatherService(apiToken: string): PublicBirdweatherService {
  const service = createBirdweatherService(apiToken);
  return {
    stations: service.stations,
    searchSpecies: service.searchSpecies,
  };
}

export function createStationBirdweatherService(apiToken: string): StationBirdweatherService {
  const service = createBirdweatherService(apiToken);
  return {
    station: service.station,
    detections: service.detections,
    topSpecies: service.topSpecies,
    stations: service.stations,
    searchSpecies: service.searchSpecies,
  };
}

/** Default token: idempotent public catalog queries only (stations, species search). */
export const publicBirdweatherService = env.BIRDWEATHER_API_TOKEN
  ? createPublicBirdweatherService(env.BIRDWEATHER_API_TOKEN)
  : null;
