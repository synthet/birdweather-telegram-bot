import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { db } from '../db/client.js';

export function validateRedirectUriExact(redirectUri: string, configuredRedirectUri: string): boolean {
  const a = Buffer.from(redirectUri);
  const b = Buffer.from(configuredRedirectUri);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createOauthState(redirectUri: string): string {
  const state = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO oauth_states(state, redirect_uri) VALUES(?, ?)').run(state, redirectUri);
  return state;
}

export function consumeOauthStateOnce(state: string, redirectUri: string): boolean {
  const result = db
    .prepare('DELETE FROM oauth_states WHERE state = ? AND redirect_uri = ?')
    .run(state, redirectUri);
  return result.changes > 0;
}

export function oauthRateLimitMiddleware(windowMs = 60_000, max = 20): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= max) {
      const retrySeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retrySeconds));
      res.status(429).json({ error: 'Too many OAuth requests. Please retry shortly.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}
