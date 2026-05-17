import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { isInitializeRequest, type McpServer } from '@modelcontextprotocol/server';
import type { Request, Response } from 'express';
import { mcpEnv, isMcpHttpEnabled } from '../config/mcpEnv.js';
import { env } from '../config/env.js';
import { consumeInatOAuthState, createInatOAuthState, saveInatAccountLink } from '../db/inatAuth.js';
import { asErrorMessage, UserInputError } from '../utils/errors.js';
import { logger } from '../utils/logging.js';
import { bearerAuthMiddleware } from './auth.js';
import { createMcpContext } from './context.js';
import { createBirdweatherMcpServer } from './createServer.js';

let httpServer: Server | null = null;
const transports = new Map<string, NodeStreamableHTTPServerTransport>();

const INAT_AUTHORIZE_URL = 'https://www.inaturalist.org/oauth/authorize';
const INAT_TOKEN_URL = 'https://www.inaturalist.org/oauth/token';
const INAT_ME_URL = 'https://api.inaturalist.org/v1/users/me';

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
  app.get('/auth/inat/start', (req, res) => void handleInatAuthStart(req, res));
  app.get('/auth/inat/callback', (req, res) => void handleInatAuthCallback(req, res));

  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.on('error', reject);
  });
  httpServer = server;

  logger.info({ port, host }, 'MCP HTTP server listening on /mcp');
  return server;
}

function mustGetInatConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.INAT_CLIENT_ID || !env.INAT_CLIENT_SECRET || !env.INAT_REDIRECT_URI) {
    throw new Error('iNaturalist OAuth env vars are required: INAT_CLIENT_ID, INAT_CLIENT_SECRET, INAT_REDIRECT_URI');
  }
  return {
    clientId: env.INAT_CLIENT_ID,
    clientSecret: env.INAT_CLIENT_SECRET,
    redirectUri: env.INAT_REDIRECT_URI,
  };
}

async function handleInatAuthStart(req: Request, res: Response): Promise<void> {
  try {
    const { clientId, redirectUri } = mustGetInatConfig();
    const chatId = Number(req.query.chat_id);
    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      throw new UserInputError('Missing or invalid chat_id query param');
    }

    const state = randomBytes(32).toString('hex');
    createInatOAuthState(chatId, state);

    const url = new URL(INAT_AUTHORIZE_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'write');
    url.searchParams.set('state', state);

    res.redirect(url.toString());
  } catch (err) {
    logger.error({ err }, 'failed to start iNat OAuth flow');
    const message = err instanceof UserInputError ? err.message : 'Unable to start OAuth flow';
    res.status(err instanceof UserInputError ? 400 : 500).send(message);
  }
}

async function handleInatAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { clientId, clientSecret, redirectUri } = mustGetInatConfig();
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    if (!code || !state) {
      throw new UserInputError('Missing code or state');
    }

    const chatId = consumeInatOAuthState(state);
    if (!chatId) {
      throw new UserInputError('Invalid or expired OAuth state');
    }

    const tokenResponse = await fetch(INAT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`iNat token exchange failed: ${tokenResponse.status}`);
    }
    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token) {
      throw new Error('iNat token exchange returned no access_token');
    }

    const meResponse = await fetch(INAT_ME_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!meResponse.ok) {
      throw new Error(`failed to fetch iNat identity: ${meResponse.status}`);
    }
    const meData = (await meResponse.json()) as {
      results?: Array<{ id?: number; login?: string }>;
    };
    const me = meData.results?.[0];
    if (!me?.id || !me.login) {
      throw new Error('iNat identity response missing user id/login');
    }

    saveInatAccountLink({
      chat_id: chatId,
      inat_user_id: me.id,
      inat_login: me.login,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      token_type: tokenData.token_type ?? null,
      token_expires_in: tokenData.expires_in ?? null,
    });

    res
      .status(200)
      .type('html')
      .send(`<html><body><h1>iNaturalist linked</h1><p>Connected as @${me.login}.</p></body></html>`);
  } catch (err) {
    logger.error({ err: asErrorMessage(err) }, 'failed to complete iNat OAuth callback');
    const status = err instanceof UserInputError ? 400 : 500;
    const message = err instanceof UserInputError ? err.message : 'Unable to complete OAuth callback';
    res.status(status).send(message);
  }
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
