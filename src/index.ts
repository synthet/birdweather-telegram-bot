import { bot } from './bot/bot.js';
import { env } from './config/env.js';
import { migrate } from './db/schema.js';
import { startMcpHttpServer, stopMcpHttpServer } from './mcp/http.js';
import { logger } from './utils/logging.js';
import { startScheduler } from './subscriptions/scheduler.js';
import { isEbirdEnabled } from './ebird/config.js';
import { isInatOauthEnabled } from './inaturalist/config.js';

migrate();

const mcpHttpEnabled = Boolean(env.MCP_AUTH_TOKEN && env.MCP_PORT);
if (mcpHttpEnabled) {
  await startMcpHttpServer();
}

const timer = startScheduler(bot);
await bot.launch();
logger.info({ ebird: isEbirdEnabled() }, 'bot started');
logger.info({ enabled: isInatOauthEnabled() }, 'capability: inaturalist_oauth');

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
