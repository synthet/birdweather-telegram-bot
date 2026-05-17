import { db } from '../db/client.js';

export const sessionDedupe = {
  seen(chatId: number, stationId: string, sessionKey: string): boolean {
    return !!db
      .prepare(
        'SELECT 1 FROM delivered_detection_sessions WHERE chat_id=? AND station_id=? AND session_key=?',
      )
      .get(chatId, stationId, sessionKey);
  },

  mark(chatId: number, stationId: string, sessionKey: string): void {
    db.prepare(
      'INSERT OR IGNORE INTO delivered_detection_sessions(chat_id, station_id, session_key) VALUES(?,?,?)',
    ).run(chatId, stationId, sessionKey);
  },
};
