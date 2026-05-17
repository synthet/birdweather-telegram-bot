import { describe, expect, it } from 'vitest';
import { assertStationAccess, applyDetectionFilters } from '../bot/birdweatherContext.js';
import type { Detection } from '../birdweather/types.js';

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
