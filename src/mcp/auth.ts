import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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
