import { bot } from './bot/bot.js';
import { migrate } from './db/schema.js';
import { logger } from './utils/logging.js';
import { startScheduler } from './subscriptions/scheduler.js';

migrate();
const timer = startScheduler(bot);
await bot.launch();
logger.info('bot started');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    clearInterval(timer);
    bot.stop(sig);
    logger.info({ sig }, 'bot stopped');
    process.exit(0);
  });
}
