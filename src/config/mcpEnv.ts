import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  BIRDWEATHER_API_TOKEN: z.string().min(1).optional(),
  BIRDWEATHER_STATION_TOKEN: z.string().min(1).optional(),
  BIRDWEATHER_STATION_ID: z.string().min(1).optional(),
  BIRDWEATHER_GRAPHQL_ENDPOINT: z.string().url().default('https://app.birdweather.com/graphql'),
  MCP_AUTH_TOKEN: z.string().min(1).optional(),
  MCP_PORT: z.coerce.number().int().positive().optional(),
  MCP_HTTP_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

export const mcpEnv = schema.parse(process.env);

export function isMcpHttpEnabled(): boolean {
  return Boolean(mcpEnv.MCP_AUTH_TOKEN && mcpEnv.MCP_PORT);
}
