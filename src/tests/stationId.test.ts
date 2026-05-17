import { describe, expect, it } from 'vitest';
import { parseStationId } from '../utils/stationId.js';

describe('parseStationId', () => {
  it('accepts numeric ids', () => {
    expect(parseStationId('26807')).toBe('26807');
    expect(parseStationId('  42  ')).toBe('42');
  });

  it('extracts id from birdweather urls', () => {
    expect(parseStationId('https://app.birdweather.com/stations/26807')).toBe('26807');
    expect(parseStationId('https://app.birdweather.com/stations/26807/')).toBe('26807');
    expect(parseStationId('app.birdweather.com/stations/26807')).toBe('26807');
  });

  it('rejects invalid input', () => {
    expect(parseStationId('not-a-station')).toBeNull();
    expect(parseStationId('')).toBeNull();
  });
});
