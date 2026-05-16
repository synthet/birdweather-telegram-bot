import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  BIRDWEATHER_GRAPHQL_ENDPOINT: z.string().url().default('https://app.birdweather.com/graphql'),
  DATABASE_URL: z.string().default('file:./data/birdweather-bot.sqlite'),
  POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development')
});

export const env = schema.parse(process.env);
