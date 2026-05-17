import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Never run tests against the bot's production SQLite file.
process.env.DATABASE_URL = 'file:./data/test-bot.sqlite';
dotenv.config();
const ownerId = process.env.BOT_OWNER_TELEGRAM_ID;
if (process.env.BIRDWEATHER_API_TOKEN && (!ownerId || Number(ownerId) <= 0)) {
  process.env.BOT_OWNER_TELEGRAM_ID = '1';
}

export default defineConfig({ test: { environment: 'node' } });
