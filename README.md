# birdweather-telegram-bot

Telegram bot for monitoring BirdWeather stations and detections.

## Setup
1. Install Node.js 22+ and pnpm.
2. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`. Optionally set `BIRDWEATHER_API_TOKEN` and your `BOT_OWNER_TELEGRAM_ID` for owner-only public search.
3. `pnpm install`
4. `pnpm dev`

Create Telegram token with BotFather (`/newbot`) and paste in `.env`.

## Env vars
- `TELEGRAM_BOT_TOKEN`
- `BIRDWEATHER_API_TOKEN` (optional; owner-only `/stations` and `/species` — requires `BOT_OWNER_TELEGRAM_ID`)
- `BOT_OWNER_TELEGRAM_ID` (your Telegram user ID; required when `BIRDWEATHER_API_TOKEN` is set)
- `BIRDWEATHER_GRAPHQL_ENDPOINT`
- `DATABASE_URL`
- `POLL_INTERVAL_SECONDS`
- `LOG_LEVEL`
- `NODE_ENV`

## Commands
`/register`, `/account`, `/unregister`, `/start`, `/help`, `/station`, `/stations`, `/recent`, `/species`, `/top`, `/subscribe_station`, `/unsubscribe_station`, `/subscriptions`, `/settings`, `/set_score`, `/set_confidence`, `/set_probability`, `/pause`, `/resume`.

## Architecture
- `src/birdweather`: typed GraphQL client and service
- `src/bot`: command handlers and formatters
- `src/db`: SQLite schema/migrations
- `src/subscriptions`: polling scheduler + dedupe + notifications

## Docker

1. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN` (and optionally owner API token + `BOT_OWNER_TELEGRAM_ID` for public search).
2. `docker compose up --build -d`
3. `docker compose logs -f bot` to follow logs; `docker compose down` to stop.

SQLite data is stored in `./data` on the host (mounted into the container). To rebuild without losing data:

**PowerShell (Windows):**

```powershell
.\scripts\docker-redeploy.ps1
```

**Git Bash / WSL / Linux:**

```bash
bash scripts/docker-redeploy.sh
```

Stops the bot, backs up `data/birdweather-bot.sqlite` to `data/backups/` (keeps the last 10 by default), rebuilds, and recreates the container. Set `$env:KEEP_BACKUPS=20` (PowerShell) or `KEEP_BACKUPS=20` (bash) to retain more copies.

## Limitations
- Polling based notification only in MVP.
- Relies on BirdWeather API response compatibility.

## Future
- GraphQL subscription (`newDetection`) transport.
- Webhook mode for Telegram.
