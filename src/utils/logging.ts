import pino from 'pino';
import { env } from '../config/env.js';
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      '*.access_token',
      '*.refresh_token',
      '*.token',
      '*.station_token',
      'req.headers.authorization',
      'authorization',
    ],
    censor: '[REDACTED]',
  },
});
