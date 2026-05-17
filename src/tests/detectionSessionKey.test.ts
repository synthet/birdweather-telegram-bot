import { describe, expect, it } from 'vitest';
import { detectionSessionKey } from '../subscriptions/detectionSessionKey.js';
import type { Detection } from '../birdweather/types.js';

function det(overrides: Partial<Detection> = {}): Detection {
  return {
    id: 'd1',
    detectedAt: '2026-05-17T21:30:00.000Z',
    species: { commonName: 'Titmouse', scientificName: 'Baeolophus atricristatus' },
    ...overrides,
  };
}

describe('detectionSessionKey', () => {
  it('matches detections in the same time bucket for one species', () => {
    const a = detectionSessionKey(det({ id: 'd1' }));
    const b = detectionSessionKey(
      det({ id: 'd2', detectedAt: '2026-05-17T21:31:00.000Z' }),
    );
    expect(a).toBe(b);
  });

  it('differs for different species at the same time', () => {
    const a = detectionSessionKey(det());
    const b = detectionSessionKey(
      det({
        species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
      }),
    );
    expect(a).not.toBe(b);
  });
});
