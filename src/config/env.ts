import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

const schema = z
  .object({
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    BIRDWEATHER_API_TOKEN: z.string().min(1).optional(),
    BIRDWEATHER_STATION_TOKEN: z.string().min(1).optional(),
    BIRDWEATHER_STATION_ID: z.string().min(1).optional(),
    BIRDWEATHER_GRAPHQL_ENDPOINT: z.string().url().default('https://app.birdweather.com/graphql'),
    DATABASE_URL: z.string().default('file:./data/birdweather-bot.sqlite'),
    POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
    SPECIES_NOTIFY_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(10),
    SPECIES_RARE_STATION_MAX_COUNT: z.coerce.number().int().nonnegative().default(5),
    MCP_AUTH_TOKEN: z.string().min(1).optional(),
    MCP_PORT: z.coerce.number().int().positive().optional(),
    MCP_HTTP_HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.string().default('info'),
    NODE_ENV: z.string().default('development'),
    EBIRD_API_TOKEN: z.string().min(1).optional(),
    TOKEN_ENCRYPTION_KEY: z.string().min(16).optional(),
    INAT_CLIENT_ID: z.string().min(1).optional(),
    INAT_CLIENT_SECRET: z.string().min(1).optional(),
    INAT_REDIRECT_URI: z.string().url().optional(),
    INAT_OAUTH_SCOPES: z.string().optional(),
    INAT_OAUTH_AUTHORIZE_URL: z.string().url().default('https://www.inaturalist.org/oauth/authorize'),
    INAT_OAUTH_TOKEN_URL: z.string().url().default('https://www.inaturalist.org/oauth/token'),
    INAT_API_BASE_URL: z.string().url().default('https://api.inaturalist.org/v1'),
    INAT_AUTH_BASE_URL: z.string().url().optional(),
  });

export const env = schema.parse(process.env);
