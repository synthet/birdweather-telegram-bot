import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearTaxonomyCache,
  lookupSpeciesCode,
  seedTaxonomyForTest,
  ebirdSpeciesUrl,
} from '../ebird/taxonomy.js';

describe('ebird taxonomy', () => {
  beforeEach(() => {
    clearTaxonomyCache();
  });

  it('maps scientific name to species code', () => {
    seedTaxonomyForTest([
      { taxonCode: 'amerob', scientificName: 'Turdus migratorius', commonName: 'American Robin' },
    ]);
    expect(lookupSpeciesCode('Turdus migratorius')).toBe('amerob');
    expect(lookupSpeciesCode('turdus migratorius')).toBe('amerob');
  });

  it('builds eBird species URL', () => {
    expect(ebirdSpeciesUrl('amerob')).toBe('https://ebird.org/species/amerob');
  });
});
