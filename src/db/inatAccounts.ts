import { randomUUID } from 'node:crypto';
import { db } from './client.js';

type InatAccountRow = {
  chat_id: number;
  inat_user_id: number | null;
  inat_username: string | null;
  expires_at: string | null;
};

export function createInatAuthNonce(chatId: number): string {
  const nonce = randomUUID();
  db.prepare('INSERT INTO inat_auth_links(nonce, chat_id) VALUES(?, ?)').run(nonce, chatId);
  return nonce;
}

export function getInatAccount(chatId: number): InatAccountRow | null {
  return (
    (db
      .prepare('SELECT chat_id, inat_user_id, inat_username, expires_at FROM inat_accounts WHERE chat_id=?')
      .get(chatId) as InatAccountRow | undefined) ?? null
  );
}

export function unlinkInatAccount(chatId: number): void {
  db.prepare('DELETE FROM inat_accounts WHERE chat_id=?').run(chatId);
}
