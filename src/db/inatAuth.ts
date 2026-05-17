import { randomBytes } from 'node:crypto';
import { db } from './client.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface InatTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  created_at?: number;
  expires_in?: number;
}

export interface InatUser {
  id: number;
  login: string;
  name?: string | null;
}

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

export function createOauthState(chatId: number): string {
  const state = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  db.prepare('INSERT INTO inat_oauth_states(state, telegram_chat_id, expires_at) VALUES(?, ?, ?)').run(state, chatId, expiresAt);
  return state;
}

export function consumeOauthState(state: string): { valid: boolean; chatId: number | null } {
  const row = db
    .prepare('DELETE FROM inat_oauth_states WHERE state = ? AND expires_at > ? RETURNING telegram_chat_id')
    .get(state, new Date().toISOString()) as { telegram_chat_id: number | null } | undefined;
  return { valid: row !== undefined, chatId: row?.telegram_chat_id ?? null };
}

export function purgeExpiredOauthStates(): void {
  db.prepare('DELETE FROM inat_oauth_states WHERE expires_at <= ?').run(new Date().toISOString());
}

export function saveInatLink(token: InatTokenResponse, user: InatUser): void {
  const expiresAt =
    typeof token.created_at === 'number' && typeof token.expires_in === 'number'
      ? new Date((token.created_at + token.expires_in) * 1000).toISOString()
      : null;

  db.prepare(
    `INSERT INTO inat_account_links(
      inat_user_id, inat_login, inat_name, access_token, refresh_token, token_type, scope, expires_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(inat_user_id) DO UPDATE SET
      inat_login=excluded.inat_login,
      inat_name=excluded.inat_name,
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_type=excluded.token_type,
      scope=excluded.scope,
      expires_at=excluded.expires_at,
      updated_at=CURRENT_TIMESTAMP`,
  ).run(
    user.id,
    user.login,
    user.name ?? null,
    token.access_token,
    token.refresh_token ?? null,
    token.token_type ?? null,
    token.scope ?? null,
    expiresAt,
  );
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
  return expiresAtMs <= Date.now() + 30_000;
}
