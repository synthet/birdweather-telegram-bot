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

export function createOauthState(): string {
  const state = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  db.prepare('INSERT INTO inat_oauth_states(state, expires_at) VALUES(?, ?)').run(state, expiresAt);
  return state;
}

export function consumeOauthState(state: string): boolean {
  const row = db
    .prepare('SELECT state, expires_at FROM inat_oauth_states WHERE state = ?')
    .get(state) as { state: string; expires_at: string } | undefined;

  if (!row) return false;
  db.prepare('DELETE FROM inat_oauth_states WHERE state = ?').run(state);
  if (Date.parse(row.expires_at) < Date.now()) return false;
  return true;
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
