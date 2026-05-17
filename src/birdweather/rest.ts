import type { Detection, Species } from './types.js';

const REST_BASE = 'https://app.birdweather.com/api/v1';

interface RestSpecies {
  id?: number;
  common_name?: string;
  scientific_name?: string;
  commonName?: string;
  scientificName?: string;
  image_url?: string;
  thumbnail_url?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface RestDetection {
  id: number | string;
  station_id?: number | string;
  stationId?: number | string;
  timestamp?: string;
  score?: number;
  confidence?: number;
  probability?: number;
  species?: RestSpecies;
  soundscape?: { url?: string };
}

function mapSpecies(s: RestSpecies): Species {
  const commonName = s.commonName ?? s.common_name;
  const scientificName = s.scientificName ?? s.scientific_name;
  const imageUrl = s.imageUrl ?? s.image_url;
  const thumbnailUrl = s.thumbnailUrl ?? s.thumbnail_url;
  return {
    ...(s.id != null ? { id: String(s.id) } : {}),
    commonName: commonName ?? 'Unknown',
    scientificName: scientificName ?? 'Unknown',
    ...(imageUrl ? { imageUrl } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
  };
}

function mapDetection(d: RestDetection): Detection {
  return {
    id: String(d.id),
    detectedAt: d.timestamp,
    score: d.score,
    confidence: d.confidence,
    probability: d.probability,
    soundscapeUrl: d.soundscape?.url,
    species: d.species ? mapSpecies(d.species) : { commonName: 'Unknown', scientificName: 'Unknown' },
  };
}

async function restGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${REST_BASE}${path}`, { signal: signal ?? AbortSignal.timeout(10_000) });
  const body = (await res.json()) as T & { success?: boolean; message?: string };
  if (!res.ok || body.success === false) {
    throw new Error((body as { message?: string }).message ?? `BirdWeather API error (${res.status})`);
  }
  return body;
}

export async function validateStationToken(stationToken: string): Promise<boolean> {
  try {
    await restGet(`/stations/${encodeURIComponent(stationToken)}/stats`);
    return true;
  } catch {
    return false;
  }
}

export async function inferStationIdFromToken(stationToken: string): Promise<string | null> {
  try {
    const body = await restGet<{ detections: RestDetection[] }>(
      `/stations/${encodeURIComponent(stationToken)}/detections?limit=1`,
    );
    const first = body.detections?.[0];
    const stationId = first?.station_id ?? first?.stationId;
    return stationId != null ? String(stationId) : null;
  } catch {
    return null;
  }
}

export async function fetchStationDetections(
  stationToken: string,
  limit = 10,
): Promise<Detection[]> {
  const body = await restGet<{ detections: RestDetection[] }>(
    `/stations/${encodeURIComponent(stationToken)}/detections?limit=${limit}`,
  );
  return (body.detections ?? []).map(mapDetection);
}
