import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logging.js';
import { processNotifications } from './notificationService.js';

function runTick(bot: Telegraf): void {
  processNotifications(bot).catch((e) => logger.error({ err: e }, 'notification tick failed'));
}

export function startScheduler(bot: Telegraf): ReturnType<typeof setInterval> {
  runTick(bot);
  return setInterval(() => runTick(bot), env.POLL_INTERVAL_SECONDS * 1000);
}
