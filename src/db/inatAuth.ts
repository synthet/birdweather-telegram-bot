import { db } from './client.js';

export interface InatAuthRecord {
  telegram_user_id: number;
  chat_id: number | null;
  inat_user_id: string | null;
  inat_login: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInatAuthInput {
  telegramUserId: number;
  inatUserId: string | null;
  inatLogin: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  chatId?: number | null;
}

export function upsertInatAuth(input: UpsertInatAuthInput): void {
  const { telegramUserId, inatUserId, inatLogin, accessToken, refreshToken = null, tokenExpiresAt = null, chatId = null } =
    input;

  db.prepare(
    `INSERT INTO inat_auth_state
      (telegram_user_id, chat_id, inat_user_id, inat_login, access_token, refresh_token, token_expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(telegram_user_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       inat_user_id = excluded.inat_user_id,
       inat_login = excluded.inat_login,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(telegramUserId, chatId, inatUserId, inatLogin, accessToken, refreshToken, tokenExpiresAt);
}

export function getInatAuthByTelegramUser(telegramUserId: number): InatAuthRecord | undefined {
  return db
    .prepare('SELECT * FROM inat_auth_state WHERE telegram_user_id = ?')
    .get(telegramUserId) as InatAuthRecord | undefined;
}

export function deleteInatAuth(telegramUserId: number): boolean {
  const result = db.prepare('DELETE FROM inat_auth_state WHERE telegram_user_id = ?').run(telegramUserId);
  return result.changes > 0;
}

export function isInatTokenExpired(record: Pick<InatAuthRecord, 'token_expires_at'>, skewSeconds = 60): boolean {
  if (!record.token_expires_at) return true;
  const expiresAtMs = Date.parse(record.token_expires_at);
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs <= Date.now() + skewSeconds * 1000;
}
