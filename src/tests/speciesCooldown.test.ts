import { describe, expect, it, beforeEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import { speciesKey } from '../subscriptions/speciesKey.js';
import {
  isSpeciesOnCooldown,
  recordSpeciesNotified,
} from '../subscriptions/speciesCooldown.js';

describe('speciesKey', () => {
  it('prefers scientific name', () => {
    expect(
      speciesKey({ commonName: 'Robin', scientificName: 'Turdus migratorius' }),
    ).toBe('sci:turdus migratorius');
  });
});

describe('species cooldown', () => {
  const chatId = 800_001;
  const stationId = '42';

  beforeEach(() => {
    migrate();
    db.prepare('DELETE FROM species_last_notified WHERE chat_id=?').run(chatId);
  });

  it('blocks repeat species within cooldown window', () => {
    const key = speciesKey({ commonName: 'Robin', scientificName: 'Turdus migratorius' });
    expect(isSpeciesOnCooldown(chatId, stationId, key)).toBe(false);

    recordSpeciesNotified(chatId, stationId, key);
    expect(isSpeciesOnCooldown(chatId, stationId, key)).toBe(true);
  });
});
