import { db } from './client.js';

export interface InatAuth {
  telegram_user_id: number;
  chat_id: number | null;
  inat_user_id: number | null;
  inat_login: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInatAuthInput {
  telegramUserId: number;
  chatId?: number | null;
  inatUserId?: number | null;
  inatLogin?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
}

export function upsertInatAuth(input: UpsertInatAuthInput): void {
  db.prepare(
    `INSERT INTO inat_auth (
      telegram_user_id,
      chat_id,
      inat_user_id,
      inat_login,
      access_token,
      refresh_token,
      token_expires_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      chat_id = excluded.chat_id,
      inat_user_id = excluded.inat_user_id,
      inat_login = excluded.inat_login,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      updated_at = CURRENT_TIMESTAMP`,
  ).run(
    input.telegramUserId,
    input.chatId ?? null,
    input.inatUserId ?? null,
    input.inatLogin ?? null,
    input.accessToken,
    input.refreshToken ?? null,
    input.tokenExpiresAt ?? null,
  );
}

export function getInatAuthByTelegramUser(telegramUserId: number): InatAuth | undefined {
  return db
    .prepare('SELECT * FROM inat_auth WHERE telegram_user_id = ?')
    .get(telegramUserId) as InatAuth | undefined;
}

export function deleteInatAuth(telegramUserId: number): boolean {
  const result = db.prepare('DELETE FROM inat_auth WHERE telegram_user_id = ?').run(telegramUserId);
  return result.changes > 0;
}

export function isInatTokenExpired(auth: Pick<InatAuth, 'token_expires_at'>, now = new Date()): boolean {
  if (!auth.token_expires_at) {
    return false;
  }
  return new Date(auth.token_expires_at).getTime() <= now.getTime();
}
