import { db } from './client.js';
export function migrate(): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS chat_settings (
  chat_id INTEGER PRIMARY KEY,
  min_score REAL DEFAULT 0,
  min_confidence REAL DEFAULT 0,
  min_probability REAL DEFAULT 0,
  include_soundscape_links INTEGER DEFAULT 1,
  paused INTEGER DEFAULT 0,
  ebird_region_override TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS station_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  station_id TEXT NOT NULL,
  station_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  active INTEGER DEFAULT 1,
  UNIQUE(chat_id, station_id)
);
CREATE TABLE IF NOT EXISTS delivered_detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  station_id TEXT NOT NULL,
  detection_id TEXT NOT NULL,
  delivered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id, detection_id)
);
CREATE INDEX IF NOT EXISTS idx_station_subscriptions_chat_id ON station_subscriptions(chat_id);
CREATE INDEX IF NOT EXISTS idx_station_subscriptions_station_id ON station_subscriptions(station_id);
CREATE INDEX IF NOT EXISTS idx_delivered_detection_id ON delivered_detections(detection_id);
CREATE INDEX IF NOT EXISTS idx_delivered_at ON delivered_detections(delivered_at);
CREATE TABLE IF NOT EXISTS species_last_notified (
  chat_id INTEGER NOT NULL,
  station_id TEXT NOT NULL,
  species_key TEXT NOT NULL,
  last_notified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, station_id, species_key)
);
CREATE INDEX IF NOT EXISTS idx_species_last_notified_at ON species_last_notified(last_notified_at);
CREATE TABLE IF NOT EXISTS birdweather_accounts (
  chat_id INTEGER PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_token TEXT NOT NULL,
  station_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS station_geo (
  station_id TEXT PRIMARY KEY,
  lat REAL,
  lng REAL,
  location_privacy INTEGER DEFAULT 0,
  country TEXT,
  state TEXT,
  ebird_region_code TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inat_user_tokens (
  user_id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS registration_sessions (
  chat_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  station_token TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
  `);
  migrateColumns();
}

function columnExists(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function migrateColumns(): void {
  if (!columnExists('chat_settings', 'ebird_region_override')) {
    db.exec('ALTER TABLE chat_settings ADD COLUMN ebird_region_override TEXT');
  }
}
