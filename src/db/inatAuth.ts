import { db } from './client.js';

export interface InatAuthRecord {
  telegram_user_id: number;
  telegram_chat_id: number | null;
  inat_user_id: number | null;
  inat_login: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  refresh_client_id: string | null;
  refresh_client_secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInatAuthInput {
  telegramUserId: number;
  telegramChatId?: number | null;
  inatUserId?: number | null;
  inatLogin?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | Date | null;
  refreshClientId?: string | null;
  refreshClientSecret?: string | null;
}

function normalizeExpiry(tokenExpiresAt?: string | Date | null): string | null {
  if (!tokenExpiresAt) return null;
  if (tokenExpiresAt instanceof Date) return tokenExpiresAt.toISOString();
  return tokenExpiresAt;
}

export function upsertInatAuth(input: UpsertInatAuthInput): void {
  db.prepare(
    `INSERT INTO inat_auth (
      telegram_user_id,
      telegram_chat_id,
      inat_user_id,
      inat_login,
      access_token,
      refresh_token,
      token_expires_at,
      refresh_client_id,
      refresh_client_secret,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      telegram_chat_id = excluded.telegram_chat_id,
      inat_user_id = excluded.inat_user_id,
      inat_login = excluded.inat_login,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      refresh_client_id = excluded.refresh_client_id,
      refresh_client_secret = excluded.refresh_client_secret,
      updated_at = CURRENT_TIMESTAMP`,
  ).run(
    input.telegramUserId,
    input.telegramChatId ?? null,
    input.inatUserId ?? null,
    input.inatLogin ?? null,
    input.accessToken,
    input.refreshToken ?? null,
    normalizeExpiry(input.tokenExpiresAt),
    input.refreshClientId ?? null,
    input.refreshClientSecret ?? null,
  );
}

export function getInatAuthByTelegramUser(telegramUserId: number): InatAuthRecord | undefined {
  return db
    .prepare('SELECT * FROM inat_auth WHERE telegram_user_id = ?')
    .get(telegramUserId) as InatAuthRecord | undefined;
}

export function deleteInatAuth(telegramUserId: number): boolean {
  const result = db.prepare('DELETE FROM inat_auth WHERE telegram_user_id = ?').run(telegramUserId);
  return result.changes > 0;
}

export function isInatTokenExpired(record: Pick<InatAuthRecord, 'token_expires_at'>): boolean {
  if (!record.token_expires_at) return false;
  const expiresAtMs = Date.parse(record.token_expires_at);
  if (Number.isNaN(expiresAtMs)) return true;
  return expiresAtMs <= Date.now();
}
