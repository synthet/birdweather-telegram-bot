import type { BirdweatherAccount } from '../db/accounts.js';
import { getAccount, hasActiveSubscription } from '../db/accounts.js';
import {
  createStationBirdweatherService,
  type PublicBirdweatherService,
  type StationBirdweatherService,
} from '../birdweather/service.js';
import type { Detection } from '../birdweather/types.js';
import { enrichDetections } from '../integrations/detectionEnrichment.js';
import { parseStationId } from '../utils/stationId.js';

export type CatalogService = PublicBirdweatherService;

const CATALOG_REQUIRES_REGISTRATION_MSG =
  'Link your station with /register to search stations and species with your station token.';

/** Station token from the linked account (same access model for every user). */
export function resolveCatalogService(chatId: number): CatalogService {
  const account = getAccount(chatId);
  if (account) {
    return createStationBirdweatherService(account.station_token);
  }
  throw new Error(CATALOG_REQUIRES_REGISTRATION_MSG);
}

export function requireAccount(chatId: number): BirdweatherAccount {
  const account = getAccount(chatId);
  if (!account) {
    if (hasActiveSubscription(chatId)) {
      throw new Error(
        'Your station token is missing. Use /register again with your BirdWeather token and station ID.',
      );
    }
    throw new Error('Link your station with /register first.');
  }
  return account;
}

export function hasStationAccess(chatId: number): boolean {
  return Boolean(getAccount(chatId));
}

export function assertStationAccess(account: BirdweatherAccount, stationId: string): void {
  if (account.station_id !== stationId) {
    throw new Error(`Access is limited to your linked station (${account.station_id}).`);
  }
}

export function requireStationService(chatId: number, stationId: string): StationBirdweatherService {
  const account = requireAccount(chatId);
  assertStationAccess(account, stationId);
  return createStationBirdweatherService(account.station_token);
}

export function resolveStationId(chatId: number, payloadId: string): string | null {
  const trimmed = payloadId.trim();
  if (trimmed) return parseStationId(trimmed) ?? trimmed;
  return getAccount(chatId)?.station_id ?? null;
}

export async function fetchRecentDetections(
  chatId: number,
  stationId: string,
  limit: number,
  filters: Record<string, unknown> = {},
): Promise<Detection[]> {
  const account = requireAccount(chatId);
  assertStationAccess(account, stationId);
  const service = createStationBirdweatherService(account.station_token);
  const detections = await service.detections(stationId, limit, filters);
  const filtered = applyDetectionFilters(detections, filters);
  return enrichDetections(filtered, {
    stationId,
    chatId,
    includeRarity: false,
  });
}

export function applyDetectionFilters(
  detections: Detection[],
  filters: Record<string, unknown>,
): Detection[] {
  const scoreGte = Number(filters.scoreGte ?? 0);
  const confidenceGte = Number(filters.confidenceGte ?? 0);
  const probabilityGte = Number(filters.probabilityGte ?? 0);
  const validSoundscape = filters.validSoundscape === true;

  return detections.filter((d) => {
    if ((d.score ?? 0) < scoreGte) return false;
    if ((d.confidence ?? 0) < confidenceGte) return false;
    if ((d.probability ?? 0) < probabilityGte) return false;
    if (validSoundscape && !d.soundscapeUrl) return false;
    return true;
  });
}
