import { env } from '../config/env.js';
import type { EbirdObservation, EbirdRegionReverse, EbirdTaxonomyRow } from './types.js';

const EBIRD_BASE = 'https://api.ebird.org/v2';

export class EbirdApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'EbirdApiError';
  }
}

function getToken(): string {
  if (!env.EBIRD_API_TOKEN) {
    throw new EbirdApiError('EBIRD_API_TOKEN is not configured', 0);
  }
  return env.EBIRD_API_TOKEN;
}

export async function ebirdGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${EBIRD_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(10_000),
    headers: { 'X-eBirdApiToken': getToken() },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new EbirdApiError(text || `eBird API error (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

export function fetchTaxonomy(): Promise<EbirdTaxonomyRow[]> {
  return ebirdGet<EbirdTaxonomyRow[]>('/ref/taxonomy/ebird', { fmt: 'json' });
}

export function fetchTaxon(speciesCode: string): Promise<EbirdTaxonomyRow> {
  return ebirdGet<EbirdTaxonomyRow>(`/ref/taxa/${encodeURIComponent(speciesCode)}`, {
    fmt: 'json',
  });
}

export function reverseRegion(lat: number, lng: number): Promise<EbirdRegionReverse> {
  return ebirdGet<EbirdRegionReverse>('/ref/region/reverse', { lat, lng, format: 'json' });
}

export interface GeoRecentParams {
  lat: number;
  lng: number;
  dist?: number;
  back?: number;
  maxResults?: number;
}

export function fetchGeoRecent(params: GeoRecentParams): Promise<EbirdObservation[]> {
  return ebirdGet<EbirdObservation[]>('/data/obs/geo/recent', {
    lat: params.lat,
    lng: params.lng,
    dist: params.dist ?? 25,
    back: params.back ?? 7,
    maxResults: params.maxResults ?? 10,
  });
}

export function fetchGeoRecentNotable(params: GeoRecentParams): Promise<EbirdObservation[]> {
  return ebirdGet<EbirdObservation[]>('/data/obs/geo/recent/notable', {
    lat: params.lat,
    lng: params.lng,
    dist: params.dist ?? 25,
    back: params.back ?? 14,
    maxResults: params.maxResults ?? 10,
  });
}

export function fetchGeoRecentSpecies(
  speciesCode: string,
  params: GeoRecentParams,
): Promise<EbirdObservation[]> {
  return ebirdGet<EbirdObservation[]>(
    `/data/obs/geo/recent/${encodeURIComponent(speciesCode)}`,
    {
      lat: params.lat,
      lng: params.lng,
      dist: params.dist ?? 25,
      back: params.back ?? 30,
      maxResults: params.maxResults ?? 1,
    },
  );
}

export function fetchRegionalSpeciesList(regionCode: string): Promise<string[]> {
  return ebirdGet<string[]>(`/product/spplist/${encodeURIComponent(regionCode)}`);
}

export function fetchRegionalRecent(
  regionCode: string,
  params: { back?: number; maxResults?: number } = {},
): Promise<EbirdObservation[]> {
  return ebirdGet<EbirdObservation[]>(`/data/obs/${encodeURIComponent(regionCode)}/recent`, {
    back: params.back ?? 7,
    maxResults: params.maxResults ?? 10,
  });
}

export function fetchRegionalNotable(
  regionCode: string,
  params: { back?: number; maxResults?: number } = {},
): Promise<EbirdObservation[]> {
  return ebirdGet<EbirdObservation[]>(
    `/data/obs/${encodeURIComponent(regionCode)}/recent/notable`,
    {
      back: params.back ?? 14,
      maxResults: params.maxResults ?? 10,
    },
  );
}
