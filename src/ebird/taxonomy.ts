import { fetchTaxonomy } from './client.js';
import { isEbirdEnabled } from './config.js';
import type { EbirdTaxonomyRow } from './types.js';

const SCIENTIFIC_INDEX = new Map<string, string>();
let loadPromise: Promise<void> | null = null;
let loadedAt = 0;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeScientific(name: string): string {
  return name.trim().toLowerCase();
}

function indexRow(row: EbirdTaxonomyRow): void {
  if (row.scientificName && row.taxonCode) {
    SCIENTIFIC_INDEX.set(normalizeScientific(row.scientificName), row.taxonCode);
  }
}

export async function ensureTaxonomyLoaded(): Promise<void> {
  if (!isEbirdEnabled()) return;
  const stale = Date.now() - loadedAt > REFRESH_MS;
  if (SCIENTIFIC_INDEX.size > 0 && !stale) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const rows = await fetchTaxonomy();
    SCIENTIFIC_INDEX.clear();
    for (const row of rows) indexRow(row);
    loadedAt = Date.now();
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function lookupSpeciesCode(scientificName: string): string | null {
  return SCIENTIFIC_INDEX.get(normalizeScientific(scientificName)) ?? null;
}

export function ebirdSpeciesUrl(speciesCode: string): string {
  return `https://ebird.org/species/${speciesCode}`;
}

export function macaulaySpeciesUrl(speciesCode: string): string {
  return `https://macaulaylibrary.org/species/${speciesCode}`;
}

/** @internal test helper */
export function clearTaxonomyCache(): void {
  SCIENTIFIC_INDEX.clear();
  loadedAt = 0;
  loadPromise = null;
}

/** @internal test helper */
export function seedTaxonomyForTest(rows: EbirdTaxonomyRow[]): void {
  for (const row of rows) indexRow(row);
  loadedAt = Date.now();
}
