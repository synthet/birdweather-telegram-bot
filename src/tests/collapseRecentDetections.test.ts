import { describe, expect, it } from 'vitest';
import { collapseRecentDetections } from '../bot/collapseRecentDetections.js';
import type { Detection } from '../birdweather/types.js';

function det(id: string, at: string, scientific: string): Detection {
  return {
    id,
    detectedAt: at,
    species: { commonName: 'Bird', scientificName: scientific },
  };
}

describe('collapseRecentDetections', () => {
  it('keeps one row per acoustic session', () => {
    const raw = [
      det('d1', '2026-05-17T21:30:00.000Z', 'Baeolophus atricristatus'),
      det('d2', '2026-05-17T21:31:00.000Z', 'Baeolophus atricristatus'),
      det('d3', '2026-05-17T20:00:00.000Z', 'Turdus migratorius'),
    ];
    expect(collapseRecentDetections(raw, 10)).toHaveLength(2);
  });

  it('respects maxItems', () => {
    const raw = [
      det('d1', '2026-05-17T21:30:00.000Z', 'Species a'),
      det('d2', '2026-05-17T20:00:00.000Z', 'Species b'),
      det('d3', '2026-05-17T19:00:00.000Z', 'Species c'),
    ];
    expect(collapseRecentDetections(raw, 2)).toHaveLength(2);
  });
});
