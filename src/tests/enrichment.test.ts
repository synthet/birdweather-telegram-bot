import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enrichSpecies } from '../ebird/enrich.js';
import { clearTaxonomyCache, seedTaxonomyForTest } from '../ebird/taxonomy.js';

describe('enrichSpecies', () => {
  beforeEach(() => {
    clearTaxonomyCache();
    process.env.EBIRD_API_TOKEN = 'test-token';
  });

  it('adds eBird URL from taxonomy when missing', async () => {
    seedTaxonomyForTest([
      { taxonCode: 'amerob', scientificName: 'Turdus migratorius', commonName: 'American Robin' },
    ]);

    const result = await enrichSpecies({
      commonName: 'American Robin',
      scientificName: 'Turdus migratorius',
    });

    expect(result.ebirdUrl).toBe('https://ebird.org/species/amerob');
    expect(result.macaulayUrl).toBe('https://macaulaylibrary.org/species/amerob');
    expect(result.ebirdSpeciesCode).toBe('amerob');
  });

  it('skips enrichment when eBird token is unset', async () => {
    const prev = process.env.EBIRD_API_TOKEN;
    delete process.env.EBIRD_API_TOKEN;
    const result = await enrichSpecies({
      commonName: 'Robin',
      scientificName: 'Turdus migratorius',
    });
    process.env.EBIRD_API_TOKEN = prev;
    expect(result.ebirdUrl).toBeUndefined();
  });
});
