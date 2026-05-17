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

vi.mock('../birdweather/service.js', () => ({
  createStationBirdweatherService: vi.fn(() => ({
    detections: mockDetections,
  })),
}));

vi.mock('../birdweather/rest.js', () => ({
  fetchStationDetections: vi.fn(),
}));

import { fetchStationDetections } from '../birdweather/rest.js';

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
    telegram: { sendMessage: vi.fn().mockResolvedValue(undefined) },
  } as unknown as Telegraf;
}

describe.sequential('processNotifications', () => {
  beforeEach(() => {
    migrate();
    resetNotificationTestDb();
    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);
  });

  afterEach(() => {
    resetNotificationTestDb();
    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);
  });

  it('sends a message for undelivered detections', async () => {
    const chatId = 900_001;
    setupSubscription(chatId);
    mockDetections.mockResolvedValue([detection('d-new')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Robin'),
      expect.any(Object),
    );
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
    cleanupChat(chatId);
  });

  it('notifies once per species within the cooldown window', async () => {
    const chatId = 900_007;
    setupSubscription(chatId);
    mockDetections.mockResolvedValue([
      detection('d-robin-1'),
      detection('d-robin-2', { score: 0.95 }),
    ]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(dedupe.seen(chatId, 'd-robin-1')).toBe(true);
    expect(dedupe.seen(chatId, 'd-robin-2')).toBe(true);
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

    mockDetections.mockReset();
    mockDetections.mockResolvedValue([]);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      chatIdOk,
      expect.any(String),
      expect.any(Object),
    );
    cleanupChat(chatIdFail);
    cleanupChat(chatIdOk);
  });

  it('passes score thresholds to the detection fetch', async () => {
    const chatId = 900_006;
    setupSubscription(chatId);
    db.prepare(
      'UPDATE chat_settings SET min_score=0.5, min_confidence=0.4, min_probability=0.3 WHERE chat_id=?',
    ).run(chatId);
    mockDetections.mockResolvedValue([]);

    await processNotifications(mockBot());

    expect(mockDetections).toHaveBeenCalledWith('42', 5, {
      scoreGte: 0.5,
      confidenceGte: 0.4,
      probabilityGte: 0.3,
    });
    cleanupChat(chatId);
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
