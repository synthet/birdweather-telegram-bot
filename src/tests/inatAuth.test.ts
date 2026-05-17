import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { deleteInatAuth, getInatAuthByTelegramUser, isInatTokenExpired, upsertInatAuth } from '../db/inatAuth.js';
import { migrate } from '../db/schema.js';

describe('inat auth storage', () => {
  beforeEach(() => {
    migrate();
    db.exec('DELETE FROM inat_auth');
  });

  it('upserts and reads auth by telegram user', () => {
    upsertInatAuth({
      telegramUserId: 111,
      chatId: 222,
      inatUserId: 333,
      inatLogin: 'birder',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: '2026-05-17T12:00:00.000Z',
    });

    const auth = getInatAuthByTelegramUser(111);
    expect(auth?.telegram_user_id).toBe(111);
    expect(auth?.chat_id).toBe(222);
    expect(auth?.inat_user_id).toBe(333);
    expect(auth?.inat_login).toBe('birder');
    expect(auth?.access_token).toBe('access-1');
    expect(auth?.refresh_token).toBe('refresh-1');
    expect(auth?.token_expires_at).toBe('2026-05-17T12:00:00.000Z');

    upsertInatAuth({
      telegramUserId: 111,
      chatId: 999,
      inatUserId: 444,
      inatLogin: 'updated-birder',
      accessToken: 'access-2',
      refreshToken: null,
      tokenExpiresAt: '2026-05-18T12:00:00.000Z',
    });

    const updated = getInatAuthByTelegramUser(111);
    expect(updated?.chat_id).toBe(999);
    expect(updated?.inat_user_id).toBe(444);
    expect(updated?.inat_login).toBe('updated-birder');
    expect(updated?.access_token).toBe('access-2');
    expect(updated?.refresh_token).toBeNull();
    expect(updated?.token_expires_at).toBe('2026-05-18T12:00:00.000Z');
  });

  it('deletes auth by telegram user', () => {
    upsertInatAuth({ telegramUserId: 55, accessToken: 'x' });
    expect(deleteInatAuth(55)).toBe(true);
    expect(deleteInatAuth(55)).toBe(false);
    expect(getInatAuthByTelegramUser(55)).toBeUndefined();
  });

  it('determines token expiry', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');
    expect(isInatTokenExpired({ token_expires_at: null }, now)).toBe(false);
    expect(isInatTokenExpired({ token_expires_at: '2026-05-17T11:00:00.000Z' }, now)).toBe(false);
    expect(isInatTokenExpired({ token_expires_at: '2026-05-17T09:00:00.000Z' }, now)).toBe(true);
  });
});
