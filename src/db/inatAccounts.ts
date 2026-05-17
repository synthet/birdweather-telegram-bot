import { db } from './client.js';
import type { InatTokenResponse, InatUser } from './inatAuth.js';
import { saveInatLink } from './inatAuth.js';
import { saveInatAuthToken } from './inaturalistAuth.js';

export type InatAccount = {
  chat_id: number;
  inat_user_id: number | null;
  inat_username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function getInatAccount(chatId: number): InatAccount | undefined {
  return db.prepare('SELECT * FROM inat_accounts WHERE chat_id=?').get(chatId) as InatAccount | undefined;
}

export function upsertInatAccount(
  chatId: number,
  token: InatTokenResponse,
  user: InatUser,
): void {
  const expiresAt =
    typeof token.created_at === 'number' && typeof token.expires_in === 'number'
      ? new Date((token.created_at + token.expires_in) * 1000).toISOString()
      : null;

  db.prepare(
    `INSERT INTO inat_accounts(
      chat_id, inat_user_id, inat_username, access_token, refresh_token, token_type, scope, expires_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(chat_id) DO UPDATE SET
      inat_user_id=excluded.inat_user_id,
      inat_username=excluded.inat_username,
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_type=excluded.token_type,
      scope=excluded.scope,
      expires_at=excluded.expires_at,
      updated_at=CURRENT_TIMESTAMP`,
  ).run(
    chatId,
    user.id,
    user.login,
    token.access_token,
    token.refresh_token ?? null,
    token.token_type ?? null,
    token.scope ?? null,
    expiresAt,
  );
}

/** Persist OAuth result for Telegram commands and the iNaturalist API client. */
export function linkInatAccountForChat(
  chatId: number,
  token: InatTokenResponse,
  user: InatUser,
): void {
  saveInatLink(token, user);
  upsertInatAccount(chatId, token, user);

  const expiresAt =
    typeof token.created_at === 'number' && typeof token.expires_in === 'number'
      ? new Date((token.created_at + token.expires_in) * 1000)
      : new Date(Date.now() + 3600_000);
  saveInatAuthToken(chatId, token.access_token, token.refresh_token ?? '', expiresAt);
}

export function deleteInatAccount(chatId: number): void {
  db.prepare('DELETE FROM inat_accounts WHERE chat_id=?').run(chatId);
  db.prepare('DELETE FROM inaturalist_auth_tokens WHERE chat_id=?').run(chatId);
}

