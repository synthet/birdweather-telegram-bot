import { describe, expect, it } from 'vitest';
import {
  detectionReplyMarkup,
  formatDetectionHtml,
  formatRecentDetectionList,
} from '../bot/formatters/detections.js';

describe('formatDetectionHtml', () => {
  it('formats species, metrics, and links', () => {
    const msg = formatDetectionHtml({
      id: '1',
      detectedAt: '2026-05-17T00:33:50Z',
      score: 7.7,
      confidence: 0.8836901187896729,
      probability: 0.5634709596633911,
      soundscapeUrl: 'https://media.birdweather.com/soundscapes/test.flac',
      species: {
        commonName: 'Robin',
        scientificName: 'Turdus migratorius',
        birdweatherUrl: 'https://app.birdweather.com/species/1',
      },
    });
    expect(msg).toContain('<b>Robin</b>');
    expect(msg).toContain('<i>Turdus migratorius</i>');
    expect(msg).toContain('Score 7.7');
    expect(msg).not.toContain('Score 7.7%');
    expect(msg).toContain('Confidence 88%');
    expect(msg).toContain('Probability 56%');
    expect(msg).not.toContain('0.8836901187896729');
    expect(msg).not.toContain('0.5634709596633911');
    expect(msg).toContain('🔊 Listen');
    expect(msg).toMatch(/<a href="[^"]+">🔊 Listen<\/a>/);
  });

  it('includes eBird, Macaulay, and rarity note', () => {
    const msg = formatDetectionHtml({
      id: '1',
      species: {
        commonName: 'Robin',
        scientificName: 'Turdus migratorius',
        ebirdUrl: 'https://ebird.org/species/amerob',
        macaulayUrl: 'https://macaulaylibrary.org/species/amerob',
      },
      rarityNote: 'eBird: unusual for this region.',
    });
    expect(msg).toContain('eBird');
    expect(msg).toContain('Macaulay');
    expect(msg).toContain('unusual for this region');
  });

  it('links station name to BirdWeather when station id is present', () => {
    const msg = formatDetectionHtml({
      id: '1',
      detectedAt: '2026-05-17T00:33:50Z',
      species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
      station: { id: '26807', name: 'Sputnik' },
    });
    expect(msg).toContain('Sputnik');
    expect(msg).toContain('href="https://app.birdweather.com/stations/26807"');
  });

  it('shows detection time in station timezone', () => {
    const msg = formatDetectionHtml({
      id: '1',
      detectedAt: '2026-05-16T21:53:58-05:00',
      species: {
        commonName: 'Northern Rough-winged Swallow',
        scientificName: 'Stelgidopteryx serripennis',
      },
      station: { id: '26807', name: 'Sputnik', timezone: 'America/Chicago' },
    });
    expect(msg).toMatch(/May 16, 2026/);
    expect(msg).toMatch(/9:53/);
    expect(msg).toMatch(/CDT|CST/);
    expect(msg).not.toContain('May 17, 2026, 2:53');
  });

  it('shows score and confidence ranges with averages when detections were merged', () => {
    const msg = formatDetectionHtml(
      {
        id: '1',
        score: 7.8,
        confidence: 0.96,
        species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
      },
      {
        mergedMetrics: {
          count: 3,
          score: { min: 6.2, max: 7.8, avg: 7.1 },
          confidence: { min: 0.85, max: 0.96, avg: 0.91 },
        },
      },
    );
    expect(msg).toContain('Score 6.2–7.8 (avg 7.1)');
    expect(msg).toContain('Confidence 85%–96% (avg 91%)');
    expect(msg).toContain('3 detections');
  });

  it('omits soundscape link when disabled', () => {
    const msg = formatDetectionHtml(
      {
        id: '1',
        species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
        soundscapeUrl: 'https://media.birdweather.com/soundscapes/test.flac',
      },
      { includeSoundscapeLink: false },
    );
    expect(msg).not.toContain('Listen');
  });
});

describe('formatRecentDetectionList', () => {
  it('formats a numbered list with station link header', () => {
    const msg = formatRecentDetectionList(
      [
        {
          id: '1',
          detectedAt: '2026-05-17T21:30:00.000Z',
          score: 7.7,
          confidence: 0.88,
          species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
          station: { id: '42', name: 'Home', timezone: 'UTC' },
        },
      ],
      '42',
    );
    expect(msg).toContain('Recent detections · https://app.birdweather.com/stations/42');
    expect(msg).toContain('1. Robin (Turdus migratorius)');
    expect(msg).toContain('score 7.7');
    expect(msg).toContain('conf 88%');
  });
});

describe('detectionReplyMarkup', () => {
  it('builds inline buttons for audio and BirdWeather', () => {
    const markup = detectionReplyMarkup({
      id: '1',
      species: {
        commonName: 'Robin',
        scientificName: 'Turdus migratorius',
        birdweatherUrl: 'https://app.birdweather.com/species/1',
      },
      soundscapeUrl: 'https://media.birdweather.com/soundscapes/test.flac',
    });
    expect(markup?.inline_keyboard[0]).toHaveLength(2);
    expect(markup?.inline_keyboard[0][0].text).toBe('🔊 Listen');
  });
});
