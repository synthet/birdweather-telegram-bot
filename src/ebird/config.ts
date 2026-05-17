import { env } from '../config/env.js';

export function isEbirdEnabled(): boolean {
  return Boolean(env.EBIRD_API_TOKEN);
}

export function requireEbirdToken(): string {
  if (!env.EBIRD_API_TOKEN) {
    throw new Error('Set EBIRD_API_TOKEN in .env for eBird features (https://ebird.org/api/keygen).');
  }
  return env.EBIRD_API_TOKEN;
}
