import { isMcpHttpEnabled, mcpEnv } from '../config/mcpEnv.js';
import { logger } from '../utils/logging.js';
import { startMcpHttpServer, stopMcpHttpServer } from './http.js';

if (!isMcpHttpEnabled()) {
  console.error('Set MCP_AUTH_TOKEN and MCP_PORT to run the MCP HTTP server.');
  process.exit(1);
}

const server = await startMcpHttpServer();
logger.info({ port: mcpEnv.MCP_PORT }, 'MCP HTTP-only process started');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    void stopMcpHttpServer().then(() => {
      server.close();
      process.exit(0);
    });
  });
}
