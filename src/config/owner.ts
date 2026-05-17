import { env } from './env.js';

export function isBotOwner(telegramUserId: number | undefined): boolean {
  if (env.BOT_OWNER_TELEGRAM_ID == null || telegramUserId == null) return false;
  return telegramUserId === env.BOT_OWNER_TELEGRAM_ID;
}
