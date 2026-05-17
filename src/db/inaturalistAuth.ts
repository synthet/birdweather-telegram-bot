import { db } from './client.js';

export interface InatAuthTokenRow {
  chat_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
}

export function getInatAuthToken(chatId: number): InatAuthTokenRow | undefined {
  return db
    .prepare('SELECT * FROM inaturalist_auth_tokens WHERE chat_id = ?')
    .get(chatId) as InatAuthTokenRow | undefined;
}

export function saveInatAuthToken(
  chatId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): void {
  db.prepare(
    `INSERT INTO inaturalist_auth_tokens (chat_id, access_token, refresh_token, expires_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(chat_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(chatId, accessToken, refreshToken, expiresAt.toISOString());
}
