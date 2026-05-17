import { db } from './client.js';

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

export function deleteInatAccount(chatId: number): void {
  db.prepare('DELETE FROM inat_accounts WHERE chat_id=?').run(chatId);
}

