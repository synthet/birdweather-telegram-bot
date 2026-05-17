import { describe, expect, it } from 'vitest';
import {
  createMcpContext,
  requirePublic,
  requireStation,
  type McpContext,
} from '../mcp/context.js';

describe('MCP context', () => {
  const emptyCtx: McpContext = {
    publicService: null,
    stationService: null,
    stationId: null,
    stationToken: null,
  };

  it('requirePublic returns error when API token not configured', () => {
    const result = requirePublic(emptyCtx);
    expect(result).toEqual({
      error: 'Set BIRDWEATHER_API_TOKEN to use search_stations and search_species.',
    });
  });

  it('requireStation returns error when station token not configured', () => {
    const result = requireStation(emptyCtx);
    expect(result).toEqual({
      error:
        'Set BIRDWEATHER_STATION_TOKEN (and BIRDWEATHER_STATION_ID if inference fails) for station tools.',
    });
  });

  it('requirePublic returns service when configured', () => {
    const mockService = { stations: async () => [], searchSpecies: async () => [] };
    const ctx: McpContext = { ...emptyCtx, publicService: mockService };
    expect(requirePublic(ctx)).toBe(mockService);
  });

  it('requireStation returns service bundle when configured', () => {
    const mockService = {
      station: async () => null,
      detections: async () => [],
      topSpecies: async () => [],
    };
    const ctx: McpContext = {
      ...emptyCtx,
      stationService: mockService,
      stationId: '123',
      stationToken: 'tok',
    };
    const result = requireStation(ctx);
    expect(result).toEqual({
      service: mockService,
      stationId: '123',
      stationToken: 'tok',
    });
  });
});

describe('createMcpContext', () => {
  it('returns null services when no tokens are provided', async () => {
    const ctx = await createMcpContext({
      apiToken: undefined,
      stationToken: undefined,
      stationId: undefined,
    });
    expect(ctx.publicService).toBeNull();
    expect(ctx.stationService).toBeNull();
  });
});
