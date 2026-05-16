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
  `);
}
