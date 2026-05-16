import Database from 'better-sqlite3';
import { env } from '../config/env.js';
const path = env.DATABASE_URL.replace('file:','');
export const db = new Database(path);
