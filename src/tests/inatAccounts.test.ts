import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { migrate } from '../db/schema.js';
import {
  getInatAccount,
  linkInatAccountForChat,
  deleteInatAccount,
} from '../db/inatAccounts.js';
import { getInatAuthToken } from '../db/inaturalistAuth.js';
import { createOauthState, consumeOauthState } from '../db/inatAuth.js';

describe('inat OAuth chat binding', () => {
  beforeEach(() => {
    migrate();
    db.exec('DELETE FROM inat_oauth_states');
    db.exec('DELETE FROM inat_accounts');
    db.exec('DELETE FROM inat_account_links');
    db.exec('DELETE FROM inaturalist_auth_tokens');
  });

  it('stores and returns telegram chat id in oauth state', () => {
    const state = createOauthState(42_001);
    expect(consumeOauthState(state)).toBe(42_001);
    expect(consumeOauthState(state)).toBeUndefined();
  });

  it('links tokens to chat for status and API client', () => {
    linkInatAccountForChat(
      42_002,
      {
        access_token: 'access',
        refresh_token: 'refresh',
        created_at: Math.floor(Date.now() / 1000),
        expires_in: 3600,
      },
      { id: 99, login: 'birder', name: 'Birder' },
    );

    const account = getInatAccount(42_002);
    expect(account?.inat_username).toBe('birder');
    expect(account?.access_token).toBe('access');

    const apiToken = getInatAuthToken(42_002);
    expect(apiToken?.access_token).toBe('access');
    expect(apiToken?.refresh_token).toBe('refresh');

    deleteInatAccount(42_002);
    expect(getInatAccount(42_002)).toBeUndefined();
    expect(getInatAuthToken(42_002)).toBeUndefined();
  });
});
