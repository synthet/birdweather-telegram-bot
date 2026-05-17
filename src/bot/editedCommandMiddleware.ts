import type { MiddlewareFn } from 'telegraf';
import type { Context } from 'telegraf';
import type { Message } from 'telegraf/types';

function isLeadingBotCommand(message: Message.TextMessage): boolean {
  const entity = message.entities?.[0];
  return entity?.type === 'bot_command' && entity.offset === 0;
}

/** Re-run command handlers when the user edits a message into a bot command. */
export const promoteEditedBotCommands: MiddlewareFn<Context> = (ctx, next) => {
  if (!('edited_message' in ctx.update)) return next();
  const edited = ctx.update.edited_message;
  if (edited && 'text' in edited && isLeadingBotCommand(edited)) {
    (ctx.update as { message?: typeof edited }).message = edited;
  }
  return next();
};
