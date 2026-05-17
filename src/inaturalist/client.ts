import { env } from '../config/env.js';
import { getInatAccount, updateInatAccountTokens } from '../db/inatAccounts.js';
import { logger } from '../utils/logging.js';

const INAT_BASE = 'https://api.inaturalist.org/v1';
const INAT_OAUTH_TOKEN_URL = 'https://www.inaturalist.org/oauth/token';
const DEFAULT_TIMEOUT_MS = 10_000;

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class InatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'InatApiError';
  }
}

function parseExpiresAt(expiresAt: string): number {
  const value = Date.parse(expiresAt);
  return Number.isNaN(value) ? 0 : value;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return parseExpiresAt(expiresAt) <= Date.now() + 30_000;
}

async function refreshToken(chatId: number, refreshTokenValue: string): Promise<string> {
  const clientId = env.INAT_CLIENT_ID?.trim();
  const clientSecret = env.INAT_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new InatApiError(
      'iNaturalist auth refresh requires INAT_CLIENT_ID and INAT_CLIENT_SECRET in env.',
      0,
      'INAT_MISSING_OAUTH_CONFIG',
    );
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(INAT_OAUTH_TOKEN_URL, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new InatApiError(
      text || `iNaturalist OAuth refresh failed (${res.status})`,
      res.status,
      'INAT_REFRESH_FAILED',
    );
  }

  const payload = (await res.json()) as OAuthTokenResponse;
  const nextRefreshToken = payload.refresh_token ?? refreshTokenValue;
  updateInatAccountTokens(
    chatId,
    payload.access_token,
    nextRefreshToken,
    new Date(Date.now() + payload.expires_in * 1000),
  );

  return payload.access_token;
}

async function getValidAccessToken(chatId: number): Promise<string> {
  const token = getInatAccount(chatId);
  if (!token) {
    throw new InatApiError(
      'No iNaturalist account linked for this user. Re-link your iNaturalist account and try again.',
      0,
      'INAT_TOKEN_NOT_FOUND',
    );
  }

  if (!isExpired(token.expires_at)) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new InatApiError(
      'Token is expired and no refresh token is available. Re-link your iNaturalist account.',
      0,
      'INAT_REFRESH_TOKEN_MISSING',
    );
  }
  logger.info({ chatId }, 'Refreshing expired iNaturalist token');
  return refreshToken(chatId, token.refresh_token);
}

async function authedRequest<T>(
  chatId: number,
  path: string,
  init: RequestInit & { telemetryName: string },
): Promise<T> {
  let token = await getValidAccessToken(chatId);

  const doFetch = async (): Promise<Response> => {
    const url = new URL(path.startsWith('http') ? path : `${INAT_BASE}${path}`);
    return fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let res = await doFetch();
  if (res.status === 401 || res.status === 403) {
    logger.warn({ chatId, status: res.status, path }, 'iNaturalist auth request rejected, retrying once');
    const current = getInatAccount(chatId);
    if (!current) {
      throw new InatApiError('iNaturalist token missing after auth failure. Re-link and try again.', 0, 'INAT_TOKEN_NOT_FOUND');
    }

    if (!current.refresh_token) {
      throw new InatApiError('iNaturalist token missing after auth failure. Re-link and try again.', 0, 'INAT_TOKEN_NOT_FOUND');
    }
    token = await refreshToken(chatId, current.refresh_token);
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const message =
      (res.status === 401 || res.status === 403)
        ? 'iNaturalist authorization failed after token refresh. Re-link your iNaturalist account and retry.'
        : text || `iNaturalist API error (${res.status})`;
    throw new InatApiError(message, res.status, 'INAT_API_REQUEST_FAILED');
  }

  logger.debug({ chatId, path, status: res.status, telemetry: init.telemetryName }, 'iNaturalist API request succeeded');
  return res.json() as Promise<T>;
}

export async function inatGetAuthed<T>(
  userId: number,
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${INAT_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return authedRequest<T>(userId, url.toString(), {
    method: 'GET',
    telemetryName: 'inat_get_authed',
  });
}

export async function inatPostAuthed<T>(userId: number, path: string, body: unknown): Promise<T> {
  return authedRequest<T>(userId, path, {
    method: 'POST',
    body: JSON.stringify(body),
    telemetryName: 'inat_post_authed',
  });
}
