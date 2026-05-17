import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { isInitializeRequest, type McpServer } from '@modelcontextprotocol/server';
import type { Request, Response } from 'express';
import { mcpEnv, isMcpHttpEnabled } from '../config/mcpEnv.js';
import { env } from '../config/env.js';
import { linkInatAccountForChat } from '../db/inatAccounts.js';
import { consumeOauthState, createOauthState, purgeExpiredOauthStates } from '../db/inatAuth.js';
import { UserInputError } from '../utils/errors.js';
import { logger } from '../utils/logging.js';
import { bearerAuthMiddleware, rateLimitMiddleware } from './auth.js';
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
  const rateLimit = rateLimitMiddleware(120, 60_000);

  app.post('/mcp', rateLimit, auth, (req, res) => void handleMcpPost(req, res, getServer));
  app.get('/mcp', rateLimit, auth, (req, res) => void handleMcpGet(req, res));
  app.delete('/mcp', rateLimit, auth, (req, res) => void handleMcpDelete(req, res));
  app.get('/auth/inat/start', (req, res) => {
    try {
      if (!env.INAT_CLIENT_ID || !env.INAT_REDIRECT_URI) {
        throw new UserInputError('iNaturalist OAuth is not configured');
      }
      purgeExpiredOauthStates();
      const chatIdRaw = `${req.query.telegram_chat_id ?? ''}`.trim();
      const telegramChatId = chatIdRaw ? Number(chatIdRaw) : undefined;
      if (chatIdRaw && !Number.isFinite(telegramChatId)) {
        throw new UserInputError('Invalid telegram_chat_id');
      }
      if (telegramChatId == null) {
        throw new UserInputError('Missing telegram_chat_id — open the link from /inat_connect');
      }
      const state = createOauthState(telegramChatId);
      const url = new URL(env.INAT_OAUTH_AUTHORIZE_URL);
      url.searchParams.set('client_id', env.INAT_CLIENT_ID);
      url.searchParams.set('redirect_uri', env.INAT_REDIRECT_URI);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      res.redirect(url.toString());
    } catch (err) {
      logger.warn({ err, query: req.query }, 'failed to start iNat OAuth flow');
      res.status(400).send(err instanceof Error ? err.message : 'Invalid request');
    }
  });
  app.get('/auth/inat/callback', async (req, res) => {
    try {
      const code = `${req.query.code ?? ''}`.trim();
      const state = `${req.query.state ?? ''}`.trim();
      if (!code || !state) throw new UserInputError('Missing OAuth callback parameters');
      if (!env.INAT_CLIENT_ID || !env.INAT_CLIENT_SECRET || !env.INAT_REDIRECT_URI) {
        throw new UserInputError('iNaturalist OAuth is not configured');
      }
      const telegramChatId = consumeOauthState(state);
      if (telegramChatId == null) throw new UserInputError('Invalid or expired OAuth state');

      const tokenResp = await fetch(env.INAT_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.INAT_CLIENT_ID,
          client_secret: env.INAT_CLIENT_SECRET,
          redirect_uri: env.INAT_REDIRECT_URI,
          grant_type: 'authorization_code',
          code,
        }),
      });
      if (!tokenResp.ok) throw new Error(`Token exchange failed with status ${tokenResp.status}`);
      const tokenJson = (await tokenResp.json()) as {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        scope?: string;
        created_at?: number;
        expires_in?: number;
      };
      if (!tokenJson.access_token) throw new Error('Token exchange response did not include access token');

      const meResp = await fetch(`${env.INAT_API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (!meResp.ok) throw new Error(`iNat identity request failed with status ${meResp.status}`);
      const meJson = (await meResp.json()) as { results?: Array<{ id?: number; login?: string; name?: string }> };
      const user = meJson.results?.[0];
      if (!user?.id || !user.login) throw new Error('Unable to read iNat identity from response');

      const token = {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
        token_type: tokenJson.token_type,
        scope: tokenJson.scope,
        created_at: tokenJson.created_at,
        expires_in: tokenJson.expires_in,
      };
      linkInatAccountForChat(telegramChatId, token, {
        id: user.id,
        login: user.login,
        name: user.name ?? null,
      });
      res
        .status(200)
        .type('html')
        .send('<html><body><h1>iNaturalist linked successfully.</h1><p>You can close this window.</p></body></html>');
    } catch (err) {
      if (err instanceof UserInputError) {
        logger.warn({ err, query: req.query }, 'invalid iNat OAuth callback');
        res.status(400).send(err.message);
        return;
      }
      logger.error({ err, query: req.query }, 'failed iNat OAuth callback');
      res.status(500).send('Failed to complete iNaturalist OAuth');
    }
  });

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
