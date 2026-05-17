import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Never run tests against the bot's production SQLite file.
process.env.DATABASE_URL = 'file:./data/test-bot.sqlite';
// Satisfy the Zod env schema so all test suites can import env modules.
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'test:token';
dotenv.config();

export default defineConfig({ test: { environment: 'node' } });
