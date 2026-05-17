import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { migrate } from '../db/schema.js';
import {
  deleteInatAuth,
  getInatAuthByTelegramUser,
  isInatTokenExpired,
  upsertInatAuth,
} from '../db/inatAuth.js';

describe('inat auth db access', () => {
  beforeEach(() => {
    migrate();
    db.exec('DELETE FROM inat_auth');
  });

  it('upserts and fetches inat auth by telegram user', () => {
    const expiry = new Date(Date.now() + 60_000);
    upsertInatAuth({
      telegramUserId: 101,
      telegramChatId: 202,
      inatUserId: 303,
      inatLogin: 'birder',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: expiry,
      refreshClientId: 'client-id',
      refreshClientSecret: 'client-secret',
    });

    const row = getInatAuthByTelegramUser(101);
    expect(row).toBeDefined();
    expect(row?.telegram_chat_id).toBe(202);
    expect(row?.inat_user_id).toBe(303);
    expect(row?.inat_login).toBe('birder');
    expect(row?.access_token).toBe('access-1');
    expect(row?.refresh_token).toBe('refresh-1');
    expect(row?.refresh_client_id).toBe('client-id');
    expect(row?.refresh_client_secret).toBe('client-secret');
    expect(row?.token_expires_at).toBe(expiry.toISOString());

    upsertInatAuth({
      telegramUserId: 101,
      telegramChatId: 999,
      accessToken: 'access-2',
      tokenExpiresAt: null,
    });

    const updated = getInatAuthByTelegramUser(101);
    expect(updated?.telegram_chat_id).toBe(999);
    expect(updated?.access_token).toBe('access-2');
    expect(updated?.token_expires_at).toBeNull();
  });

  it('deletes auth rows', () => {
    upsertInatAuth({ telegramUserId: 111, accessToken: 'access' });
    expect(deleteInatAuth(111)).toBe(true);
    expect(deleteInatAuth(111)).toBe(false);
    expect(getInatAuthByTelegramUser(111)).toBeUndefined();
  });

  it('evaluates token expiry', () => {
    expect(isInatTokenExpired({ token_expires_at: null })).toBe(false);
    expect(isInatTokenExpired({ token_expires_at: new Date(Date.now() - 1_000).toISOString() })).toBe(true);
    expect(isInatTokenExpired({ token_expires_at: new Date(Date.now() + 60_000).toISOString() })).toBe(false);
    expect(isInatTokenExpired({ token_expires_at: 'not-a-date' })).toBe(true);
  });
});
