import { db } from './client.js';

export interface BirdweatherAccount {
  chat_id: number;
  station_id: string;
  station_token: string;
  station_name: string | null;
  created_at: string;
  updated_at: string;
}

export function getAccount(chatId: number): BirdweatherAccount | undefined {
  return db
    .prepare('SELECT * FROM birdweather_accounts WHERE chat_id = ?')
    .get(chatId) as BirdweatherAccount | undefined;
}

export function saveAccount(
  chatId: number,
  stationId: string,
  stationToken: string,
  stationName: string | null,
): void {
  db.prepare(
    `INSERT INTO birdweather_accounts (chat_id, station_id, station_token, station_name, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(chat_id) DO UPDATE SET
       station_id = excluded.station_id,
       station_token = excluded.station_token,
       station_name = excluded.station_name,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(chatId, stationId, stationToken, stationName);
}

export function deleteAccount(chatId: number): boolean {
  const result = db.prepare('DELETE FROM birdweather_accounts WHERE chat_id = ?').run(chatId);
  return result.changes > 0;
}

export function updateStationNames(chatId: number, stationId: string, stationName: string): void {
  db.prepare(
    'UPDATE birdweather_accounts SET station_name = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?',
  ).run(stationName, chatId);
  db.prepare(
    'UPDATE station_subscriptions SET station_name = ? WHERE chat_id = ? AND station_id = ?',
  ).run(stationName, chatId, stationId);
}

export function hasActiveSubscription(chatId: number): boolean {
  return Boolean(
    db
      .prepare('SELECT 1 FROM station_subscriptions WHERE chat_id = ? AND active = 1 LIMIT 1')
      .get(chatId),
  );
}
