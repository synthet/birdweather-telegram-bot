import { describe, expect, it, vi, beforeEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import {
  hasSpeciesBeenNotified,
  isDetectionRare,
  shouldNotifySpecies,
  wasSpeciesNotifiedOnCalendarDay,
} from '../subscriptions/speciesNotifyPolicy.js';
import { recordSpeciesNotified } from '../subscriptions/speciesCooldown.js';
import { clearStationSpeciesCountCache } from '../subscriptions/stationSpeciesFrequency.js';
import { stationCalendarDay } from '../utils/dates.js';
import type { Detection } from '../birdweather/types.js';

const chatId = 800_010;
const stationId = '42';
const robinKey = 'sci:turdus migratorius';

function robin(overrides: Partial<Detection> = {}): Detection {
  return {
    id: 'd1',
    species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
    ...overrides,
  };
}

describe('speciesNotifyPolicy', () => {
  beforeEach(() => {
    migrate();
    db.prepare('DELETE FROM species_last_notified WHERE chat_id=?').run(chatId);
    clearStationSpeciesCountCache();
  });

  it('allows first notification for a species', async () => {
    expect(hasSpeciesBeenNotified(chatId, stationId, robinKey)).toBe(false);
    expect(
      await shouldNotifySpecies(robin(), {
        chatId,
        stationId,
        service: { topSpecies: vi.fn() },
      }),
    ).toBe(true);
  });

  it('blocks a repeat on the same calendar day when common at station', async () => {
    recordSpeciesNotified(chatId, stationId, robinKey);
    const today = stationCalendarDay('UTC');
    expect(wasSpeciesNotifiedOnCalendarDay(chatId, stationId, robinKey, today, 'UTC')).toBe(
      true,
    );

    const service = {
      topSpecies: vi.fn().mockResolvedValue([
        { species: robin().species, count: 500 },
      ]),
    };
    expect(await isDetectionRare(robin(), { chatId, stationId, service })).toBe(false);
    expect(
      await shouldNotifySpecies(robin(), { chatId, stationId, service, timeZone: 'UTC' }),
    ).toBe(false);
  });

  it('allows a same-day repeat when eBird marks it rare', async () => {
    recordSpeciesNotified(chatId, stationId, robinKey);
    const service = { topSpecies: vi.fn() };
    expect(
      await shouldNotifySpecies(
        robin({ rarityNote: 'eBird: unusual for this region.' }),
        { chatId, stationId, service, timeZone: 'UTC' },
      ),
    ).toBe(true);
  });

  it('allows a same-day repeat when the species is infrequent at the station', async () => {
    recordSpeciesNotified(chatId, stationId, robinKey);
    const service = {
      topSpecies: vi.fn().mockResolvedValue([]),
    };
    expect(
      await shouldNotifySpecies(robin(), { chatId, stationId, service, timeZone: 'UTC' }),
    ).toBe(true);
  });
});
