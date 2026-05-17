import { db } from './client.js';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret } from '../utils/secrets.js';

export type RegistrationStep = 'awaiting_token' | 'awaiting_station_id';

export interface RegistrationSession {
  chat_id: number;
  step: RegistrationStep;
  station_token: string | null;
}

export function getRegistrationSession(chatId: number): RegistrationSession | undefined {
  const session = db
    .prepare('SELECT chat_id, step, station_token FROM registration_sessions WHERE chat_id = ?')
    .get(chatId) as RegistrationSession | undefined;
  if (!session?.station_token) return session;
  if (!env.TOKEN_ENCRYPTION_KEY) return session;
  return {
    ...session,
    station_token: decryptSecret(session.station_token, env.TOKEN_ENCRYPTION_KEY),
  };
}

export function startRegistration(chatId: number): void {
  db.prepare(
    `INSERT INTO registration_sessions (chat_id, step, station_token)
     VALUES (?, 'awaiting_token', NULL)
     ON CONFLICT(chat_id) DO UPDATE SET step = 'awaiting_token', station_token = NULL`,
  ).run(chatId);
}

export function setRegistrationToken(chatId: number, stationToken: string): void {
  const storedToken = env.TOKEN_ENCRYPTION_KEY
    ? encryptSecret(stationToken, env.TOKEN_ENCRYPTION_KEY)
    : stationToken;
  db.prepare(
    `UPDATE registration_sessions SET step = 'awaiting_station_id', station_token = ? WHERE chat_id = ?`,
  ).run(storedToken, chatId);
}

export function clearRegistration(chatId: number): void {
  db.prepare('DELETE FROM registration_sessions WHERE chat_id = ?').run(chatId);
}
