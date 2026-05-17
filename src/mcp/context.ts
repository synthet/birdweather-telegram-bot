import {
  createPublicBirdweatherService,
  createStationBirdweatherService,
  type PublicBirdweatherService,
  type StationBirdweatherService,
} from '../birdweather/service.js';
import { inferStationIdFromToken } from '../birdweather/rest.js';
import { mcpEnv } from '../config/mcpEnv.js';

export interface McpContext {
  publicService: PublicBirdweatherService | null;
  stationService: StationBirdweatherService | null;
  stationId: string | null;
  stationToken: string | null;
}

export interface McpContextConfig {
  apiToken?: string;
  stationToken?: string;
  stationId?: string;
}

export async function createMcpContext(
  overrides?: McpContextConfig,
): Promise<McpContext> {
  const apiToken =
    overrides && 'apiToken' in overrides ? overrides.apiToken : mcpEnv.BIRDWEATHER_API_TOKEN;
  const stationToken =
    overrides && 'stationToken' in overrides
      ? overrides.stationToken
      : mcpEnv.BIRDWEATHER_STATION_TOKEN;
  const configuredStationId =
    overrides && 'stationId' in overrides ? overrides.stationId : mcpEnv.BIRDWEATHER_STATION_ID;

  const publicService = apiToken ? createPublicBirdweatherService(apiToken) : null;

  let stationService: StationBirdweatherService | null = null;
  let stationId: string | null = null;
  const resolvedStationToken = stationToken ?? null;

  if (resolvedStationToken) {
    stationService = createStationBirdweatherService(resolvedStationToken);
    stationId =
      configuredStationId ?? (await inferStationIdFromToken(resolvedStationToken));
    if (!stationId) {
      throw new Error(
        'Could not resolve station ID from BIRDWEATHER_STATION_TOKEN. Set BIRDWEATHER_STATION_ID explicitly.',
      );
    }
  }

  return {
    publicService,
    stationService,
    stationId,
    stationToken: resolvedStationToken,
  };
}

export function requirePublic(ctx: McpContext): PublicBirdweatherService | { error: string } {
  if (!ctx.publicService) {
    return {
      error:
        'Set BIRDWEATHER_API_TOKEN to use search_stations and search_species.',
    };
  }
  return ctx.publicService;
}

export function requireStation(
  ctx: McpContext,
): { service: StationBirdweatherService; stationId: string; stationToken: string } | { error: string } {
  if (!ctx.stationService || !ctx.stationId || !ctx.stationToken) {
    return {
      error:
        'Set BIRDWEATHER_STATION_TOKEN (and BIRDWEATHER_STATION_ID if inference fails) for station tools.',
    };
  }
  return {
    service: ctx.stationService,
    stationId: ctx.stationId,
    stationToken: ctx.stationToken,
  };
}
