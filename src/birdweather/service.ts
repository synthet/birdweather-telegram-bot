import { gqlClient } from './client.js';
import { DETECTIONS_QUERY, SEARCH_SPECIES_QUERY, STATIONS_QUERY, STATION_QUERY, TOP_SPECIES_QUERY } from './queries.js';
import type { Detection, Species, Station } from './types.js';

async function retry<T>(fn:()=>Promise<T>, attempts=3): Promise<T> { let e: unknown; for(let i=0;i<attempts;i++){ try{return await fn();}catch(err){e=err; await new Promise(r=>setTimeout(r,300*(i+1)));}} throw e; }

export const birdweatherService = {
  station: async (id: string): Promise<Station | null> => retry(async()=> (await gqlClient.request<{station: Station | null}>(STATION_QUERY,{id})).station),
  stations: async (query: string, first=10): Promise<Station[]> => retry(async()=> (await gqlClient.request<{stations: Station[]}>(STATIONS_QUERY,{query, first})).stations),
  detections: async (stationId: string, first=10, filters: Record<string, unknown> = {}): Promise<Detection[]> => retry(async()=> (await gqlClient.request<{detections: Detection[]}>(DETECTIONS_QUERY,{stationIds:[stationId], first, ...filters})).detections),
  searchSpecies: async (query: string): Promise<Species[]> => retry(async()=> (await gqlClient.request<{searchSpecies: Species[]}>(SEARCH_SPECIES_QUERY,{query})).searchSpecies),
  topSpecies: async (stationId: string, first=10): Promise<Array<{species: Species; count: number}>> => retry(async()=> (await gqlClient.request<{topSpecies: Array<{species: Species; count: number}>}>(TOP_SPECIES_QUERY,{stationId, first})).topSpecies)
};
