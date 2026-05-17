import { beforeEach, describe, expect, it, vi } from 'vitest';

import {

  assertStationAccess,

  applyDetectionFilters,

  resolveCatalogService,

} from '../bot/birdweatherContext.js';

import type { Detection } from '../birdweather/types.js';

import { getAccount } from '../db/accounts.js';

import { createStationBirdweatherService } from '../birdweather/service.js';



vi.mock('../db/accounts.js', () => ({ getAccount: vi.fn() }));

vi.mock('../birdweather/service.js', async (importOriginal) => {

  const actual = await importOriginal<typeof import('../birdweather/service.js')>();

  return {

    ...actual,

    createStationBirdweatherService: vi.fn(),

  };

});



describe('resolveCatalogService', () => {

  const account = {

    chat_id: 1,

    station_id: '26807',

    station_token: 'station-tok',

    station_name: 'Sputnik',

    created_at: '',

    updated_at: '',

  };

  const stationCatalog = {
    station: vi.fn(),
    detections: vi.fn(),
    topSpecies: vi.fn(),
    stations: vi.fn(),
    searchSpecies: vi.fn(),
  };



  beforeEach(() => {

    vi.mocked(getAccount).mockReset();

    vi.mocked(createStationBirdweatherService).mockReset();

    vi.mocked(createStationBirdweatherService).mockReturnValue(stationCatalog);

  });



  it('uses the linked station token for registered users', () => {

    vi.mocked(getAccount).mockReturnValue(account);



    const svc = resolveCatalogService(1);



    expect(createStationBirdweatherService).toHaveBeenCalledWith('station-tok');

    expect(svc).toBe(stationCatalog);

  });



  it('requires registration when no station is linked', () => {

    vi.mocked(getAccount).mockReturnValue(undefined);



    expect(() => resolveCatalogService(1)).toThrow(/\/register/);

    expect(createStationBirdweatherService).not.toHaveBeenCalled();

  });

});



describe('assertStationAccess', () => {

  const account = {

    chat_id: 1,

    station_id: '42',

    station_token: 'tok',

    station_name: null,

    created_at: '',

    updated_at: '',

  };



  it('allows matching station id', () => {

    expect(() => assertStationAccess(account, '42')).not.toThrow();

  });



  it('rejects other station ids', () => {

    expect(() => assertStationAccess(account, '99')).toThrow(/linked station \(42\)/);

  });

});



describe('applyDetectionFilters', () => {

  const base: Detection = {

    id: '1',

    species: { commonName: 'Robin', scientificName: 'Turdus' },

    score: 0.8,

    confidence: 0.7,

    probability: 0.6,

    soundscapeUrl: 'https://audio.example/a',

  };



  it('filters by thresholds and soundscape', () => {

    const out = applyDetectionFilters([base, { ...base, id: '2', score: 0.1 }], {

      scoreGte: 0.5,

      confidenceGte: 0.5,

      probabilityGte: 0.5,

      validSoundscape: true,

    });

    expect(out.map((d) => d.id)).toEqual(['1']);

  });

});


