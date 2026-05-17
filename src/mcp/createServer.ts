import { McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { fetchStationDetections } from '../birdweather/rest.js';
import { applyDetectionFilters } from '../bot/birdweatherContext.js';
import { type McpContext, requirePublic, requireStation } from './context.js';

const MCP_INSTRUCTIONS = [
  'BirdWeather read-only MCP server.',
  'Public catalog tools (search_stations, search_species) require BIRDWEATHER_API_TOKEN.',
  'Station tools (get_station, list_detections, get_top_species) require BIRDWEATHER_STATION_TOKEN and cover only that configured station.',
].join(' ');

function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function createBirdweatherMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: 'birdweather', version: '0.1.0' },
    { instructions: MCP_INSTRUCTIONS },
  );

  server.registerTool(
    'search_stations',
    {
      title: 'Search stations',
      description: 'Search public BirdWeather stations by name or location query.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Search text'),
        first: z.number().int().positive().max(50).optional().describe('Max results (default 10)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, first }): Promise<CallToolResult> => {
      const pub = requirePublic(ctx);
      if ('error' in pub) return errorResult(pub.error);
      try {
        const stations = await pub.stations(query, first ?? 10);
        return jsonResult({ stations });
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    'search_species',
    {
      title: 'Search species',
      description: 'Search BirdWeather species by common or scientific name.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Species name fragment'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }): Promise<CallToolResult> => {
      const pub = requirePublic(ctx);
      if ('error' in pub) return errorResult(pub.error);
      try {
        const species = await pub.searchSpecies(query);
        return jsonResult({ species });
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    'get_station',
    {
      title: 'Get station',
      description: 'Fetch details for the configured station.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      const st = requireStation(ctx);
      if ('error' in st) return errorResult(st.error);
      try {
        const station = await st.service.station(st.stationId);
        return jsonResult({ station });
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    'list_detections',
    {
      title: 'List detections',
      description: 'Recent detections for the configured station (REST API), with optional score filters.',
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).optional().describe('Max detections (default 10)'),
        scoreGte: z.number().optional(),
        confidenceGte: z.number().optional(),
        probabilityGte: z.number().optional(),
        validSoundscape: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit, scoreGte, confidenceGte, probabilityGte, validSoundscape }): Promise<CallToolResult> => {
      const st = requireStation(ctx);
      if ('error' in st) return errorResult(st.error);
      try {
        const raw = await fetchStationDetections(st.stationToken, limit ?? 10);
        const detections = applyDetectionFilters(raw, {
          scoreGte,
          confidenceGte,
          probabilityGte,
          validSoundscape,
        });
        return jsonResult({ detections });
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    'get_top_species',
    {
      title: 'Top species',
      description: 'Most frequently detected species at the configured station.',
      inputSchema: z.object({
        limit: z.number().int().positive().max(50).optional().describe('Max species (default 10)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit }): Promise<CallToolResult> => {
      const st = requireStation(ctx);
      if ('error' in st) return errorResult(st.error);
      try {
        const topSpecies = await st.service.topSpecies(st.stationId, limit ?? 10);
        return jsonResult({ topSpecies });
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    },
  );

  return server;
}
