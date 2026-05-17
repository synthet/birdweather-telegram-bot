import { env } from '../config/env.js';

/** Feature flag: eBird API integration is on only when a non-empty token is configured. */
export function isEbirdEnabled(): boolean {
  return Boolean(getEbirdToken());
}

export function getEbirdToken(): string | undefined {
  const raw = env.EBIRD_API_TOKEN ?? process.env.EBIRD_API_TOKEN;
  const token = raw?.trim();
  return token || undefined;
}

export const EBIRD_DISABLED_HINT =
  'eBird features are disabled. Set EBIRD_API_TOKEN in .env to enable (https://ebird.org/api/keygen).';

export function requireEbirdToken(): string {
  const token = getEbirdToken();
  if (!token) {
    throw new Error(EBIRD_DISABLED_HINT);
  }
  return token;
}
