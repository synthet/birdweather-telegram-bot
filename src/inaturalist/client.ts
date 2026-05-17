import { logger } from '../utils/logging.js';
import { getInatToken, saveInatToken, type InatTokenRecord } from '../db/inaturalistTokens.js';

const INAT_BASE = 'https://api.inaturalist.org/v1';
const TOKEN_URL = process.env.INAT_OAUTH_TOKEN_URL?.trim() || 'https://www.inaturalist.org/oauth/token';
const CLIENT_ID = process.env.INAT_OAUTH_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.INAT_OAUTH_CLIENT_SECRET?.trim();
const TOKEN_SKEW_MS = 30_000;

export class InatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'InatApiError';
  }
}

function isExpired(expiresAtIso: string): boolean {
  const exp = Date.parse(expiresAtIso);
  return !Number.isFinite(exp) || exp <= Date.now() + TOKEN_SKEW_MS;
}

function assertOauthConfig(): { clientId: string; clientSecret: string } {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new InatApiError(
      'iNaturalist OAuth client credentials are not configured (INAT_OAUTH_CLIENT_ID/INAT_OAUTH_CLIENT_SECRET).',
      0,
    );
  }
  return { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };
}

async function requestToken(form: URLSearchParams): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; token_type?: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new InatApiError(text || `iNaturalist token endpoint error (${res.status})`, res.status);
  }

  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; token_type?: string }>;
}

async function refreshOrReacquireToken(userId: number, current: InatTokenRecord): Promise<InatTokenRecord> {
  const { clientId, clientSecret } = assertOauthConfig();

  let payload: { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string };
  if (current.refresh_token) {
    payload = await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: current.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    );
  } else {
    payload = await requestToken(
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    );
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString();
  const updated: InatTokenRecord = {
    user_id: userId,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? current.refresh_token,
    expires_at: expiresAt,
    token_type: payload.token_type ?? 'Bearer',
  };
  saveInatToken(updated);
  logger.info({ userId, expiresAt }, 'inaturalist token refreshed');
  return updated;
}

async function getUsableToken(userId: number, forceRefresh = false): Promise<InatTokenRecord> {
  const token = getInatToken(userId);
  if (!token) {
    throw new InatApiError(
      'No iNaturalist token found for this user. Reconnect your iNaturalist account and try again.',
      0,
    );
  }

  if (forceRefresh || isExpired(token.expires_at)) {
    return refreshOrReacquireToken(userId, token);
  }

  return token;
}

async function inatRequestAuthed<T>(
  method: 'GET' | 'POST',
  userId: number,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  body?: unknown,
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${INAT_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const doFetch = async (token: string): Promise<Response> =>
    fetch(url, {
      method,
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  let token = await getUsableToken(userId);
  let res = await doFetch(token.access_token);

  if (res.status === 401 || res.status === 403) {
    logger.warn({ userId, status: res.status, path }, 'inaturalist auth failed; attempting token refresh');
    token = await getUsableToken(userId, true);
    res = await doFetch(token.access_token);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new InatApiError(
        'iNaturalist authorization failed after token refresh. Reconnect your iNaturalist account and try again.',
        res.status,
      );
    }
    throw new InatApiError(text || `iNaturalist API error (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

export function inatGetAuthed<T>(
  userId: number,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  return inatRequestAuthed<T>('GET', userId, path, params);
}

export function inatPostAuthed<T>(userId: number, path: string, body: unknown): Promise<T> {
  return inatRequestAuthed<T>('POST', userId, path, undefined, body);
}
