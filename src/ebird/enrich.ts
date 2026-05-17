import type { Species } from '../birdweather/types.js';
import { isEbirdEnabled } from './config.js';
import {
  ebirdSpeciesUrl,
  lookupSpeciesCode,
  macaulaySpeciesUrl,
  ensureTaxonomyLoaded,
} from './taxonomy.js';

export async function enrichSpecies(species: Species): Promise<Species> {
  if (species.ebirdUrl && species.macaulayUrl) return species;

  if (!isEbirdEnabled()) return species;

  await ensureTaxonomyLoaded();
  const code = lookupSpeciesCode(species.scientificName);
  if (!code) return species;

  return {
    ...species,
    ebirdSpeciesCode: code,
    ebirdUrl: species.ebirdUrl ?? ebirdSpeciesUrl(code),
    macaulayUrl: species.macaulayUrl ?? macaulaySpeciesUrl(code),
  };
}
