import type { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { asErrorMessage } from '../utils/errors.js';
import { deleteInatAccount, getInatAccount } from '../db/inatAccounts.js';

const PRIVATE_ONLY_MESSAGE =
  'For privacy, iNaturalist auth commands must be used in a private chat with this bot.';

function isPrivateChat(chatType: string): boolean {
  return chatType === 'private';
}

function getPrivateChatHint(botUsername: string | undefined): string {
  if (!botUsername) {
    return PRIVATE_ONLY_MESSAGE;
  }
  return `${PRIVATE_ONLY_MESSAGE}\n\nOpen: https://t.me/${botUsername}`;
}

function buildInatStartUrl(chatId: number): string | undefined {
  if (!env.INAT_AUTH_BASE_URL) return undefined;
  const base = env.INAT_AUTH_BASE_URL.replace(/\/$/, '');
  const url = new URL('/auth/inat/start', base);
  url.searchParams.set('telegram_chat_id', String(chatId));
  return url.toString();
}

export function setupInatCommands(bot: Telegraf): void {
  bot.command('inat_connect', async (ctx) => {
    try {
      if (!isPrivateChat(ctx.chat.type)) {
        return ctx.reply(getPrivateChatHint(ctx.me));
      }
      const url = buildInatStartUrl(ctx.chat.id);
      if (!url) {
        return ctx.reply('iNaturalist auth is not configured yet. Set INAT_AUTH_BASE_URL on the bot server.');
      }
      return ctx.reply(`Use this one-time iNaturalist link:\n${url}`);
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });

  bot.command('inat_status', async (ctx) => {
    try {
      const account = getInatAccount(ctx.chat.id);
      if (!account) {
        return ctx.reply('iNaturalist: not linked. Use /inat_connect in private chat to link your account.');
      }
      const expiry = account.expires_at ? new Date(account.expires_at) : undefined;
      const now = new Date();
      const tokenState =
        !expiry || Number.isNaN(expiry.getTime())
          ? 'unknown'
          : expiry.getTime() > now.getTime()
            ? `valid until ${expiry.toISOString()}`
            : `expired at ${expiry.toISOString()}`;
      return ctx.reply(
        [
          'iNaturalist: linked',
          `Username: ${account.inat_username ?? 'unknown'}`,
          `User ID: ${account.inat_user_id ?? 'unknown'}`,
          `Token window: ${tokenState}`,
        ].join('\n'),
      );
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });

  bot.command('inat_disconnect', async (ctx) => {
    try {
      if (!isPrivateChat(ctx.chat.type)) {
        return ctx.reply(getPrivateChatHint(ctx.me));
      }
      const existing = getInatAccount(ctx.chat.id);
      if (!existing) {
        return ctx.reply('No linked iNaturalist account was found.');
      }
      deleteInatAccount(ctx.chat.id);
      return ctx.reply('Disconnected iNaturalist account and deleted stored tokens.');
    } catch (e) {
      return ctx.reply(asErrorMessage(e));
    }
  });
}
