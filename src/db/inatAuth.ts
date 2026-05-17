import { db } from './client.js';

const OAUTH_STATE_TTL_SECONDS = 600;

export interface InatAccountLink {
  chat_id: number;
  inat_user_id: number;
  inat_login: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  token_expires_in: number | null;
}

export function createInatOAuthState(chatId: number, state: string): void {
  db.prepare('DELETE FROM inat_oauth_states WHERE expires_at <= CURRENT_TIMESTAMP').run();
  db.prepare(
    `INSERT INTO inat_oauth_states (state, chat_id, expires_at)
     VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))`,
  ).run(state, chatId, OAUTH_STATE_TTL_SECONDS);
}

export function consumeInatOAuthState(state: string): number | null {
  const row = db
    .prepare(
      `SELECT chat_id
       FROM inat_oauth_states
       WHERE state = ? AND expires_at > CURRENT_TIMESTAMP`,
    )
    .get(state) as { chat_id: number } | undefined;

  db.prepare('DELETE FROM inat_oauth_states WHERE state = ?').run(state);

  return row?.chat_id ?? null;
}

export function saveInatAccountLink(link: InatAccountLink): void {
  db.prepare(
    `INSERT INTO inat_accounts (
      chat_id,
      inat_user_id,
      inat_login,
      access_token,
      refresh_token,
      token_type,
      token_expires_in,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(chat_id) DO UPDATE SET
      inat_user_id = excluded.inat_user_id,
      inat_login = excluded.inat_login,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_type = excluded.token_type,
      token_expires_in = excluded.token_expires_in,
      updated_at = CURRENT_TIMESTAMP`,
  ).run(
    link.chat_id,
    link.inat_user_id,
    link.inat_login,
    link.access_token,
    link.refresh_token,
    link.token_type,
    link.token_expires_in,
  );
}
