import { db } from './client.js';

export interface InatTokenRecord {
  user_id: number;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  token_type: string;
}

export function getInatToken(userId: number): InatTokenRecord | null {
  return (
    (db
      .prepare(
        `SELECT user_id, access_token, refresh_token, expires_at, token_type
         FROM inat_user_tokens WHERE user_id=?`,
      )
      .get(userId) as InatTokenRecord | undefined) ?? null
  );
}

export function saveInatToken(record: InatTokenRecord): void {
  db.prepare(
    `INSERT INTO inat_user_tokens (user_id, access_token, refresh_token, expires_at, token_type, updated_at)
     VALUES (@user_id, @access_token, @refresh_token, @expires_at, @token_type, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       access_token=excluded.access_token,
       refresh_token=excluded.refresh_token,
       expires_at=excluded.expires_at,
       token_type=excluded.token_type,
       updated_at=CURRENT_TIMESTAMP`,
  ).run(record);
}
