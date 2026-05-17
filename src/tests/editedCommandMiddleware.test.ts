import { describe, expect, it, vi } from 'vitest';
import { promoteEditedBotCommands } from '../bot/editedCommandMiddleware.js';

describe('promoteEditedBotCommands', () => {
  it('copies edited_message into message for leading bot commands', async () => {
    const edited_message = {
      message_id: 1,
      date: 1,
      chat: { id: 1, type: 'private' as const },
      text: '/set_score 7',
      entities: [{ type: 'bot_command' as const, offset: 0, length: 10 }],
    };
    const update = { update_id: 1, edited_message };
    const ctx = { update };
    const next = vi.fn();
    await promoteEditedBotCommands(ctx as never, next);
    expect(update).toHaveProperty('message', edited_message);
    expect(next).toHaveBeenCalled();
  });

  it('ignores edits that are not bot commands', async () => {
    const update = {
      update_id: 1,
      edited_message: {
        message_id: 1,
        date: 1,
        chat: { id: 1, type: 'private' as const },
        text: 'hello',
      },
    };
    const ctx = { update };
    const next = vi.fn();
    await promoteEditedBotCommands(ctx as never, next);
    expect(update).not.toHaveProperty('message');
    expect(next).toHaveBeenCalled();
  });
});
