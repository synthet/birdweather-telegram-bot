import { describe, expect, it, beforeEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import {
  upsertStationGeo,
  getStationGeo,
  setEbirdRegionOverride,
  getEffectiveRegionCode,
} from '../db/stationGeo.js';
import type { Station } from '../birdweather/types.js';

const station: Station = {
  id: '99',
  name: 'Test',
  coords: { lat: 42.1, lon: -76.2 },
  locationPrivacy: false,
  country: 'United States',
  state: 'New York',
};

describe('station_geo', () => {
  beforeEach(() => {
    migrate();
    upsertStationGeo(station);
  });

  it('persists coordinates from station', () => {
    const geo = getStationGeo('99');
    expect(geo?.lat).toBe(42.1);
    expect(geo?.lng).toBe(-76.2);
    expect(geo?.location_privacy).toBe(0);
  });

  it('prefers chat region override', () => {
    db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(1001);
    setEbirdRegionOverride(1001, 'US-NY-001');
    expect(getEffectiveRegionCode('99', 1001)).toBe('US-NY-001');
  });
});
