import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

// Random key used only in this process lifetime — prevents length-leaking via HMAC digest comparison.
const HMAC_KEY = randomBytes(32);

export function safeEqual(a: string, b: string): boolean {
  const digestA = createHmac('sha256', HMAC_KEY).update(a).digest();
  const digestB = createHmac('sha256', HMAC_KEY).update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export function bearerAuthMiddleware(expectedToken: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = header.slice('Bearer '.length);
    if (!safeEqual(token, expectedToken)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

export function rateLimitMiddleware(maxRequests: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}
