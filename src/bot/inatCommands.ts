import type { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { createInatAuthNonce, getInatAccount, unlinkInatAccount } from '../db/inatAccounts.js';

function isPrivateChat(ctx: { chat?: { type?: string } }): boolean {
  return ctx.chat?.type === 'private';
}

function privateOnlyMessage(botUsername?: string): string {
  const deepLink = botUsername
    ? `https://t.me/${botUsername}?start=inat_connect`
    : 'Open a private chat with this bot';
  return `For security, run this command in a private chat with me.\n${deepLink}`;
}

function tokenWindow(expiresAt: string | null): string {
  if (!expiresAt) return 'unknown';
  const now = new Date();
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return `invalid (${expiresAt})`;
  return expires > now ? `valid until ${expires.toISOString()}` : `expired at ${expires.toISOString()}`;
}

export function setupInatCommands(bot: Telegraf): void {
  bot.command('inat_connect', async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply(privateOnlyMessage(ctx.botInfo?.username));
    }
    const nonce = createInatAuthNonce(ctx.chat.id);
    const path = `/auth/inat/start?nonce=${encodeURIComponent(nonce)}&chat_id=${encodeURIComponent(String(ctx.chat.id))}`;
    const link = env.INAT_AUTH_BASE_URL ? new URL(path, env.INAT_AUTH_BASE_URL).toString() : path;
    return ctx.reply(`Connect your iNaturalist account using this one-time link:\n${link}`);
  });

  bot.command('inat_status', (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply(privateOnlyMessage(ctx.botInfo?.username));
    }
    const account = getInatAccount(ctx.chat.id);
    if (!account) {
      return ctx.reply('iNaturalist status: not linked.\nUse /inat_connect in a private chat to link.');
    }
    const username = account.inat_username ? `@${account.inat_username}` : '(unknown)';
    return ctx.reply(`iNaturalist status: linked\nUsername: ${username}\nToken window: ${tokenWindow(account.expires_at)}`);
  });

  bot.command('inat_disconnect', (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply(privateOnlyMessage(ctx.botInfo?.username));
    }
    unlinkInatAccount(ctx.chat.id);
    return ctx.reply('Disconnected iNaturalist account and removed stored tokens.');
  });
}
