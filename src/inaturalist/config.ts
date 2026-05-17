import { env } from '../config/env.js';

const DEFAULT_SCOPES = ['read', 'write'];

export type InatOauthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseScopes(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_SCOPES;
  const scopes = raw
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes.length ? scopes : DEFAULT_SCOPES;
}

export function isInatOauthEnabled(): boolean {
  return Boolean(
    clean(env.INAT_CLIENT_ID ?? process.env.INAT_CLIENT_ID) &&
      clean(env.INAT_CLIENT_SECRET ?? process.env.INAT_CLIENT_SECRET) &&
      clean(env.INAT_REDIRECT_URI ?? process.env.INAT_REDIRECT_URI),
  );
}

export function getInatOauthConfig(): InatOauthConfig {
  const clientId = clean(env.INAT_CLIENT_ID ?? process.env.INAT_CLIENT_ID);
  const clientSecret = clean(env.INAT_CLIENT_SECRET ?? process.env.INAT_CLIENT_SECRET);
  const redirectUri = clean(env.INAT_REDIRECT_URI ?? process.env.INAT_REDIRECT_URI);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'iNaturalist OAuth is disabled. Set INAT_CLIENT_ID, INAT_CLIENT_SECRET, and INAT_REDIRECT_URI in .env to enable.',
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: parseScopes(clean(env.INAT_OAUTH_SCOPES ?? process.env.INAT_OAUTH_SCOPES)),
  };
}
