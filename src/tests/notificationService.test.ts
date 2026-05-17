import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import { saveAccount } from '../db/accounts.js';
import { processNotifications } from '../subscriptions/notificationService.js';
import { seedDeliveredDetections } from '../subscriptions/seeding.js';
import { dedupe } from '../subscriptions/dedupe.js';
import type { Detection } from '../birdweather/types.js';
import type { Telegraf } from 'telegraf';

vi.mock('../integrations/detectionEnrichment.js', () => ({
  enrichDetection: vi.fn(async (d: Detection) => d),
}));

const mockDetections = vi.fn();
const mockTopSpecies = vi.fn();

vi.mock('../birdweather/service.js', () => ({
  createStationBirdweatherService: vi.fn(() => ({
    detections: mockDetections,
    topSpecies: mockTopSpecies,
  })),
}));

vi.mock('../birdweather/rest.js', () => ({
  fetchStationDetections: vi.fn(),
}));

import { fetchStationDetections } from '../birdweather/rest.js';
import { enrichDetection } from '../integrations/detectionEnrichment.js';
import { clearStationSpeciesCountCache } from '../subscriptions/stationSpeciesFrequency.js';

function detection(id: string, overrides: Partial<Detection> = {}): Detection {
  return {
    id,
    species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
    score: 0.9,
    confidence: 0.8,
    probability: 0.7,
    ...overrides,
  };
}

function setupSubscription(chatId: number, stationId = '42'): void {
  saveAccount(chatId, stationId, 'token', 'Home');
  db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(chatId);
  db.prepare(
    'INSERT OR REPLACE INTO station_subscriptions(chat_id,station_id,station_name,active) VALUES(?,?,?,1)',
  ).run(chatId, stationId, 'Home');
}

function cleanupChat(chatId: number): void {
  db.prepare('DELETE FROM species_last_notified WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM delivered_detections WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM station_subscriptions WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM chat_settings WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM birdweather_accounts WHERE chat_id=?').run(chatId);
}

function resetNotificationTestDb(): void {
  db.prepare('DELETE FROM species_last_notified WHERE chat_id >= 900000').run();
  db.prepare('DELETE FROM delivered_detections WHERE chat_id >= 900000').run();
  db.prepare('DELETE FROM station_subscriptions WHERE chat_id >= 900000').run();
  db.prepare('DELETE FROM chat_settings WHERE chat_id >= 900000').run();
  db.prepare('DELETE FROM birdweather_accounts WHERE chat_id >= 900000').run();
}

function mockBot(): Telegraf {
  return {
    telegram: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendPhoto: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Telegraf;
}

describe.sequential('processNotifications', () => {
  beforeEach(() => {
    migrate();
    resetNotificationTestDb();
    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);
    mockTopSpecies.mockReset();
    mockTopSpecies.mockResolvedValue([
      { species: { commonName: 'Robin', scientificName: 'Turdus migratorius' }, count: 500 },
    ]);
    clearStationSpeciesCountCache();
    vi.mocked(enrichDetection).mockImplementation(async (d: Detection) => d);
  });

  afterEach(() => {
    resetNotificationTestDb();
    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);
    mockTopSpecies.mockReset();
  });

  it('sends a message for undelivered detections', async () => {
    const chatId = 900_001;
    setupSubscription(chatId);
    mockDetections.mockResolvedValue([detection('d-new')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(dedupe.seen(chatId, 'd-new')).toBe(true);
    cleanupChat(chatId);
  });

  it('does not resend already delivered detections', async () => {
    const chatId = 900_002;
    setupSubscription(chatId);
    dedupe.mark(chatId, '42', 'd-old');
    mockDetections.mockResolvedValue([detection('d-old')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    expect(bot.telegram.sendPhoto).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });

  it('merges same-species detections with range and average metrics', async () => {
    const chatId = 900_007;
    setupSubscription(chatId);
    mockDetections.mockResolvedValue([
      detection('d-robin-1', { score: 7.0, confidence: 0.8 }),
      detection('d-robin-2', { score: 8.0, confidence: 0.9 }),
    ]);

    const bot = mockBot();
    await processNotifications(bot);

    const caption = String(
      vi.mocked(bot.telegram.sendMessage).mock.calls[0]?.[1] ??
        vi.mocked(bot.telegram.sendPhoto).mock.calls[0]?.[2]?.caption,
    );
    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(caption).toContain('Score 7–8 (avg 7.5)');
    expect(caption).toContain('Confidence 80%–90% (avg 85%)');
    expect(caption).toContain('2 detections');
    expect(dedupe.seen(chatId, 'd-robin-1')).toBe(true);
    expect(dedupe.seen(chatId, 'd-robin-2')).toBe(true);
    cleanupChat(chatId);
  });

  it('does not notify the same species again on the same day when common at station', async () => {
    const chatId = 900_011;
    setupSubscription(chatId);
    mockDetections.mockResolvedValueOnce([detection('d-day-1')]);
    const bot = mockBot();
    await processNotifications(bot);

    db.prepare(
      `UPDATE species_last_notified SET last_notified_at = datetime('now', '-20 minutes')
       WHERE chat_id=? AND station_id=?`,
    ).run(chatId, '42');

    mockDetections.mockResolvedValueOnce([detection('d-day-2', { score: 0.99 })]);
    await processNotifications(bot);
    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(dedupe.seen(chatId, 'd-day-2')).toBe(true);
    cleanupChat(chatId);
  });

  it('skips paused subscriptions', async () => {
    const chatId = 900_003;
    setupSubscription(chatId);
    db.prepare('UPDATE chat_settings SET paused=1 WHERE chat_id=?').run(chatId);
    mockDetections.mockResolvedValue([detection('d-paused')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(mockDetections).not.toHaveBeenCalled();
    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });

  it('continues other subscriptions when one fails', async () => {
    const chatIdFail = 900_004;
    const chatIdOk = 900_005;
    setupSubscription(chatIdFail);
    setupSubscription(chatIdOk, '43');

    mockDetections.mockImplementation(async (stationId: string) => {
      if (stationId === '42') throw new Error('API down');
      return [detection('d-ok')];
    });

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    cleanupChat(chatIdFail);
    cleanupChat(chatIdOk);
  });
});

describe.sequential('seedDeliveredDetections', () => {
  beforeEach(() => {
    migrate();
    resetNotificationTestDb();
    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);
  });

  afterEach(() => {
    resetNotificationTestDb();
  });

  it('marks recent detections as delivered without sending', async () => {
    const chatId = 900_010;
    setupSubscription(chatId);
    vi.mocked(fetchStationDetections).mockResolvedValue([
      detection('d-seed-1'),
      detection('d-seed-2'),
    ]);

    await seedDeliveredDetections(chatId, '42', 'token', {
      scoreGte: 0,
      confidenceGte: 0,
      probabilityGte: 0,
    });

    expect(dedupe.seen(chatId, 'd-seed-1')).toBe(true);
    expect(dedupe.seen(chatId, 'd-seed-2')).toBe(true);

    mockDetections.mockResolvedValue([detection('d-seed-1'), detection('d-seed-2')]);
    const bot = mockBot();
    await processNotifications(bot);
    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });
});
