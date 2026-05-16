import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logging.js';
import { processNotifications } from './notificationService.js';

export function startScheduler(bot: Telegraf): NodeJS.Timeout {
  return setInterval(() => {
    processNotifications(bot).catch((e) => logger.error({ err: e }, 'notification tick failed'));
  }, env.POLL_INTERVAL_SECONDS * 1000);
}
