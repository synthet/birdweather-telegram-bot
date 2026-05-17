import { bot } from './bot/bot.js';
import { env } from './config/env.js';
import { migrate } from './db/schema.js';
import { startMcpHttpServer, stopMcpHttpServer } from './mcp/http.js';
import { logger } from './utils/logging.js';
import { startScheduler } from './subscriptions/scheduler.js';

if (env.BIRDWEATHER_API_TOKEN && env.BOT_OWNER_TELEGRAM_ID == null) {
  logger.warn(
    'BIRDWEATHER_API_TOKEN is set but BOT_OWNER_TELEGRAM_ID is missing; /stations and /species are owner-only until you set it',
  );
}

migrate();

const mcpHttpEnabled = Boolean(env.MCP_AUTH_TOKEN && env.MCP_PORT);
if (mcpHttpEnabled) {
  await startMcpHttpServer();
}

const timer = startScheduler(bot);
await bot.launch();
logger.info('bot started');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    void (async () => {
      clearInterval(timer);
      if (mcpHttpEnabled) await stopMcpHttpServer();
      bot.stop(sig);
      logger.info({ sig }, 'bot stopped');
      process.exit(0);
    })();
  });
}
