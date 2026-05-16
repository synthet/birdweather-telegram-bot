import { db } from '../db/client.js';
export const dedupe = {
  seen(chatId: number, detectionId: string): boolean { return !!db.prepare('SELECT 1 FROM delivered_detections WHERE chat_id=? AND detection_id=?').get(chatId, detectionId); },
  mark(chatId:number, stationId:string, detectionId:string): void { db.prepare('INSERT OR IGNORE INTO delivered_detections(chat_id, station_id, detection_id) VALUES(?,?,?)').run(chatId,stationId,detectionId); }
};
