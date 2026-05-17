/**
 * Restores birdweather_accounts for chats that have subscriptions but no token row.
 * Usage: node scripts/repair-account-link.mjs <chat_id> <station_id> [station_token]
 * Token defaults to BIRDWEATHER_API_TOKEN from .env (single-station dev setups only).
 */
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

dotenv.config();

const chatId = Number(process.argv[2]);
const stationId = process.argv[3];
const stationToken = process.argv[4] ?? process.env.BIRDWEATHER_API_TOKEN;

if (!Number.isFinite(chatId) || !stationId || !stationToken) {
  console.error(
    'Usage: node scripts/repair-account-link.mjs <chat_id> <station_id> [station_token]',
  );
  process.exit(1);
}

const dbPath = (process.env.DATABASE_URL ?? 'file:./data/birdweather-bot.sqlite').replace(
  'file:',
  '',
);
const db = new Database(dbPath);

let stationName = null;
try {
  const res = await fetch(
    `https://app.birdweather.com/api/v1/stations/${encodeURIComponent(stationToken)}/detections?limit=1`,
  );
  const body = await res.json();
  if (!body.success) throw new Error(body.message ?? 'API error');
} catch (e) {
  console.error('Token validation failed:', e.message);
  process.exit(1);
}

try {
  const gqlRes = await fetch(
    process.env.BIRDWEATHER_GRAPHQL_ENDPOINT ?? 'https://app.birdweather.com/graphql',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stationToken}`,
      },
      body: JSON.stringify({
        query: 'query Station($id: ID!) { station(id: $id) { name } }',
        variables: { id: stationId },
      }),
    },
  );
  const gqlBody = await gqlRes.json();
  stationName = gqlBody.data?.station?.name ?? null;
} catch {
  // name optional
}

db.prepare(
  `INSERT INTO birdweather_accounts (chat_id, station_id, station_token, station_name, updated_at)
   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
   ON CONFLICT(chat_id) DO UPDATE SET
     station_id = excluded.station_id,
     station_token = excluded.station_token,
     station_name = excluded.station_name,
     updated_at = CURRENT_TIMESTAMP`,
).run(chatId, stationId, stationToken, stationName);

db.prepare(
  'UPDATE station_subscriptions SET station_name = ? WHERE chat_id = ? AND station_id = ?',
).run(stationName, chatId, stationId);

console.log(
  `Linked chat ${chatId} to station ${stationId}${stationName ? ` (${stationName})` : ''}.`,
);
