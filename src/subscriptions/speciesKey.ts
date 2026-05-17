import type { Species } from '../birdweather/types.js';

export function speciesKey(species: Pick<Species, 'id' | 'scientificName' | 'commonName'>): string {
  if (species.id) return `id:${species.id}`;
  const scientific = species.scientificName?.trim().toLowerCase();
  if (scientific && scientific !== 'unknown') return `sci:${scientific}`;
  return `common:${species.commonName.trim().toLowerCase()}`;
}
