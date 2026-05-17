import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchStationDetections } from '../birdweather/rest.js';

describe('fetchStationDetections mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps camelCase species from list detections', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          detections: [
            {
              id: 1,
              stationId: 26807,
              timestamp: '2026-05-16T19:27:27.500-05:00',
              score: 8.19,
              confidence: 0.64,
              probability: 0.56,
              species: {
                id: 501,
                commonName: 'White-winged Dove',
                scientificName: 'Zenaida asiatica',
              },
              soundscape: { url: 'https://media.birdweather.com/soundscapes/26807/test.flac' },
            },
          ],
        }),
      }),
    );

    const detections = await fetchStationDetections('token', 1);
    expect(detections[0]?.species.commonName).toBe('White-winged Dove');
    expect(detections[0]?.species.scientificName).toBe('Zenaida asiatica');
    expect(detections[0]?.soundscapeUrl).toContain('test.flac');
  });

  it('maps snake_case species from single detection responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          detections: [
            {
              id: 2,
              station_id: 349,
              timestamp: '2022-11-21T19:01:46.000-05:00',
              species: {
                id: 3046,
                common_name: 'Turkey Vulture',
                scientific_name: 'Cathartes aura',
              },
            },
          ],
        }),
      }),
    );

    const detections = await fetchStationDetections('token', 1);
    expect(detections[0]?.species.commonName).toBe('Turkey Vulture');
    expect(detections[0]?.species.scientificName).toBe('Cathartes aura');
  });

  it('maps species image URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          detections: [
            {
              id: 3,
              species: {
                common_name: 'Robin',
                scientific_name: 'Turdus migratorius',
                thumbnail_url: 'https://media.birdweather.com/thumb.jpg',
                image_url: 'https://media.birdweather.com/full.jpg',
              },
            },
          ],
        }),
      }),
    );

    const detections = await fetchStationDetections('token', 1);
    expect(detections[0]?.species.thumbnailUrl).toBe('https://media.birdweather.com/thumb.jpg');
    expect(detections[0]?.species.imageUrl).toBe('https://media.birdweather.com/full.jpg');
  });
});
