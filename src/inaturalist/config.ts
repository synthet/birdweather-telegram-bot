import { z } from 'zod';

import { env } from '../config/env.js';

const DEFAULT_INAT_OAUTH_SCOPES = ['read', 'write'] as const;

function getRawInatOauthEnv() {
  return {
    clientId: env.INAT_CLIENT_ID ?? process.env.INAT_CLIENT_ID,
    clientSecret: env.INAT_CLIENT_SECRET ?? process.env.INAT_CLIENT_SECRET,
    redirectUri: env.INAT_REDIRECT_URI ?? process.env.INAT_REDIRECT_URI,
    scopes: env.INAT_OAUTH_SCOPES ?? process.env.INAT_OAUTH_SCOPES,
  };
}

function parseScopes(rawScopes: string | undefined): string[] {
  const parsed = rawScopes
    ?.split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return parsed && parsed.length > 0 ? parsed : [...DEFAULT_INAT_OAUTH_SCOPES];
}

const configSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
  scopes: z.array(z.string().min(1)).min(1),
});

/** Feature flag: iNaturalist OAuth integration is enabled only when full OAuth settings are configured. */
export function isInatOauthEnabled(): boolean {
  const { clientId, clientSecret, redirectUri } = getRawInatOauthEnv();
  return Boolean(clientId?.trim() && clientSecret?.trim() && redirectUri?.trim());
}

export function getInatOauthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
} {
  const raw = getRawInatOauthEnv();

  if (!raw.clientId?.trim() || !raw.clientSecret?.trim() || !raw.redirectUri?.trim()) {
    throw new Error(
      'iNaturalist OAuth is disabled. Set INAT_CLIENT_ID, INAT_CLIENT_SECRET, and INAT_REDIRECT_URI in .env to enable.',
    );
  }

  return configSchema.parse({
    clientId: raw.clientId.trim(),
    clientSecret: raw.clientSecret.trim(),
    redirectUri: raw.redirectUri.trim(),
    scopes: parseScopes(raw.scopes),
  });
}
