import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Never run tests against the bot's production SQLite file.
process.env.DATABASE_URL = 'file:./data/test-bot.sqlite';
dotenv.config();

export default defineConfig({ test: { environment: 'node' } });
