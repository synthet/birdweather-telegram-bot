import { describe, expect, it, vi, beforeEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import { saveAccount } from '../db/accounts.js';
import { processNotifications } from '../subscriptions/notificationService.js';
import { seedDeliveredDetections } from '../subscriptions/seeding.js';
import { dedupe } from '../subscriptions/dedupe.js';
import type { Detection } from '../birdweather/types.js';
import type { Telegraf } from 'telegraf';

vi.mock('../bot/birdweatherContext.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bot/birdweatherContext.js')>();
  return {
    ...actual,
    fetchRecentDetections: vi.fn(),
  };
});

vi.mock('../birdweather/rest.js', () => ({
  fetchStationDetections: vi.fn(),
}));

import { fetchRecentDetections } from '../bot/birdweatherContext.js';
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
  db.prepare('DELETE FROM delivered_detections WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM station_subscriptions WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM chat_settings WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM birdweather_accounts WHERE chat_id=?').run(chatId);
}

function mockBot(): Telegraf {
  return {
    telegram: { sendMessage: vi.fn().mockResolvedValue(undefined) },
  } as unknown as Telegraf;
}

describe('processNotifications', () => {
  beforeEach(() => {
    migrate();
    vi.clearAllMocks();
  });

  it('sends a message for undelivered detections', async () => {
    const chatId = 900_001;
    setupSubscription(chatId);
    vi.mocked(fetchRecentDetections).mockResolvedValue([detection('d-new')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Robin'),
    );
    expect(dedupe.seen(chatId, 'd-new')).toBe(true);
    cleanupChat(chatId);
  });

  it('does not resend already delivered detections', async () => {
    const chatId = 900_002;
    setupSubscription(chatId);
    dedupe.mark(chatId, '42', 'd-old');
    vi.mocked(fetchRecentDetections).mockResolvedValue([detection('d-old')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });

  it('skips paused subscriptions', async () => {
    const chatId = 900_003;
    setupSubscription(chatId);
    db.prepare('UPDATE chat_settings SET paused=1 WHERE chat_id=?').run(chatId);
    vi.mocked(fetchRecentDetections).mockResolvedValue([detection('d-paused')]);

    const bot = mockBot();
    await processNotifications(bot);

    expect(fetchRecentDetections).not.toHaveBeenCalled();
    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });

  it('continues other subscriptions when one fails', async () => {
    const chatIdFail = 900_004;
    const chatIdOk = 900_005;
    setupSubscription(chatIdFail);
    setupSubscription(chatIdOk, '43');

    vi.mocked(fetchRecentDetections).mockImplementation(async (chatId) => {
      if (chatId === chatIdFail) throw new Error('API down');
      return [detection('d-ok')];
    });

    const bot = mockBot();
    await processNotifications(bot);

    expect(bot.telegram.sendMessage).toHaveBeenCalledOnce();
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(chatIdOk, expect.any(String));
    cleanupChat(chatIdFail);
    cleanupChat(chatIdOk);
  });

  it('passes score thresholds to fetchRecentDetections', async () => {
    const chatId = 900_006;
    setupSubscription(chatId);
    db.prepare(
      'UPDATE chat_settings SET min_score=0.5, min_confidence=0.4, min_probability=0.3 WHERE chat_id=?',
    ).run(chatId);
    vi.mocked(fetchRecentDetections).mockResolvedValue([]);

    await processNotifications(mockBot());

    expect(fetchRecentDetections).toHaveBeenCalledWith(chatId, '42', 5, {
      scoreGte: 0.5,
      confidenceGte: 0.4,
      probabilityGte: 0.3,
    });
    cleanupChat(chatId);
  });
});

describe('seedDeliveredDetections', () => {
  beforeEach(() => {
    migrate();
    vi.clearAllMocks();
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

    vi.mocked(fetchRecentDetections).mockResolvedValue([
      detection('d-seed-1'),
      detection('d-seed-2'),
    ]);
    const bot = mockBot();
    await processNotifications(bot);
    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    cleanupChat(chatId);
  });
});
