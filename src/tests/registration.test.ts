import { describe, expect, it, beforeEach } from 'vitest';
import { migrate } from '../db/schema.js';
import { db } from '../db/client.js';
import {
  clearRegistration,
  getRegistrationSession,
  setRegistrationToken,
  startRegistration,
} from '../db/registration.js';
import { saveAccount, getAccount, deleteAccount } from '../db/accounts.js';

describe('registration', () => {
  beforeEach(() => {
    migrate();
    db.exec('DELETE FROM delivered_detections');
    db.exec('DELETE FROM registration_sessions');
    db.exec('DELETE FROM station_subscriptions');
    db.exec('DELETE FROM chat_settings');
    db.exec('DELETE FROM birdweather_accounts');
  });

  it('tracks registration steps', () => {
    startRegistration(42);
    expect(getRegistrationSession(42)?.step).toBe('awaiting_token');

    setRegistrationToken(42, 'secret-token');
    const session = getRegistrationSession(42);
    expect(session?.step).toBe('awaiting_station_id');
    expect(session?.station_token).toBe('secret-token');

    clearRegistration(42);
    expect(getRegistrationSession(42)).toBeUndefined();
  });

  it('stores linked accounts per chat', () => {
    saveAccount(7, '123', 'tok', 'Backyard');
    const account = getAccount(7);
    expect(account?.station_id).toBe('123');
    expect(account?.station_token).toBe('tok');
    expect(deleteAccount(7)).toBe(true);
    expect(getAccount(7)).toBeUndefined();
  });
});
