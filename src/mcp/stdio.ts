import { StdioServerTransport, type McpServer } from '@modelcontextprotocol/server';
import { createMcpContext } from './context.js';
import { createBirdweatherMcpServer } from './createServer.js';

async function main(): Promise<void> {
  const ctx = await createMcpContext();
  const server: McpServer = createBirdweatherMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
