import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { isInitializeRequest, type McpServer } from '@modelcontextprotocol/server';
import type { Request, Response } from 'express';
import { mcpEnv, isMcpHttpEnabled } from '../config/mcpEnv.js';
import { logger } from '../utils/logging.js';
import { bearerAuthMiddleware } from './auth.js';
import { createMcpContext } from './context.js';
import { createBirdweatherMcpServer } from './createServer.js';

let httpServer: Server | null = null;
const transports = new Map<string, NodeStreamableHTTPServerTransport>();

function getServerFactory(mcpServer: McpServer): () => McpServer {
  return () => mcpServer;
}

async function handleMcpPost(
  req: Request,
  res: Response,
  getServer: () => McpServer,
): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: NodeStreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };

      const server = getServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    logger.error({ err: e }, 'MCP HTTP request failed');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

async function handleMcpGet(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
}

async function handleMcpDelete(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
  transports.delete(sessionId);
}

export async function startMcpHttpServer(): Promise<Server> {
  if (!isMcpHttpEnabled() || !mcpEnv.MCP_AUTH_TOKEN || !mcpEnv.MCP_PORT) {
    throw new Error('MCP HTTP requires MCP_AUTH_TOKEN and MCP_PORT');
  }

  const port = mcpEnv.MCP_PORT;
  const authToken = mcpEnv.MCP_AUTH_TOKEN;

  const ctx = await createMcpContext();
  const mcpServer = createBirdweatherMcpServer(ctx);
  const getServer = getServerFactory(mcpServer);

  const host = mcpEnv.MCP_HTTP_HOST;
  const app = createMcpExpressApp({
    host,
    ...(host === '0.0.0.0' || host === '::'
      ? { allowedHosts: ['localhost', '127.0.0.1', '[::1]'] }
      : {}),
  });

  const auth = bearerAuthMiddleware(authToken);

  app.post('/mcp', auth, (req, res) => void handleMcpPost(req, res, getServer));
  app.get('/mcp', auth, (req, res) => void handleMcpGet(req, res));
  app.delete('/mcp', auth, (req, res) => void handleMcpDelete(req, res));

  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.on('error', reject);
  });
  httpServer = server;

  logger.info({ port, host }, 'MCP HTTP server listening on /mcp');
  return server;
}

export async function stopMcpHttpServer(): Promise<void> {
  for (const transport of transports.values()) {
    await transport.close();
  }
  transports.clear();

  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer!.close((err) => (err ? reject(err) : resolve()));
    });
    httpServer = null;
  }
}
