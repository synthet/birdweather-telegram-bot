import { db } from './client.js';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret } from '../utils/secrets.js';
import type { InatTokenResponse, InatUser } from './inatAuth.js';

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
  const row = db.prepare('SELECT * FROM inat_accounts WHERE chat_id=?').get(chatId) as InatAccount | undefined;
  if (!row) return undefined;
  const key = env.TOKEN_ENCRYPTION_KEY;
  if (!key) return row;
  return {
    ...row,
    access_token: decryptSecret(row.access_token, key),
    refresh_token: row.refresh_token ? decryptSecret(row.refresh_token, key) : null,
  };
}

export function saveInatAccount(chatId: number, token: InatTokenResponse, user: InatUser): void {
  const key = env.TOKEN_ENCRYPTION_KEY;
  const expiresAt =
    typeof token.created_at === 'number' && typeof token.expires_in === 'number'
      ? new Date((token.created_at + token.expires_in) * 1000).toISOString()
      : null;
  const accessToken = key ? encryptSecret(token.access_token, key) : token.access_token;
  const refreshToken = token.refresh_token ? (key ? encryptSecret(token.refresh_token, key) : token.refresh_token) : null;

  db.prepare(
    `INSERT INTO inat_accounts(chat_id, inat_user_id, inat_username, access_token, refresh_token, token_type, scope, expires_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(chat_id) DO UPDATE SET
       inat_user_id=excluded.inat_user_id,
       inat_username=excluded.inat_username,
       access_token=excluded.access_token,
       refresh_token=excluded.refresh_token,
       token_type=excluded.token_type,
       scope=excluded.scope,
       expires_at=excluded.expires_at,
       updated_at=CURRENT_TIMESTAMP`,
  ).run(chatId, user.id, user.login, accessToken, refreshToken, token.token_type ?? null, token.scope ?? null, expiresAt);
}

export function updateInatAccountTokens(
  chatId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): void {
  const key = env.TOKEN_ENCRYPTION_KEY;
  const storedAccess = key ? encryptSecret(accessToken, key) : accessToken;
  const storedRefresh = key ? encryptSecret(refreshToken, key) : refreshToken;
  db.prepare(
    'UPDATE inat_accounts SET access_token=?, refresh_token=?, expires_at=?, updated_at=CURRENT_TIMESTAMP WHERE chat_id=?',
  ).run(storedAccess, storedRefresh, expiresAt.toISOString(), chatId);
}

export function deleteInatAccount(chatId: number): void {
  db.prepare('DELETE FROM inat_accounts WHERE chat_id=?').run(chatId);
}
