# birdweather-telegram-bot

Telegram bot for monitoring BirdWeather stations and detections.

## Setup
1. Install Node.js 22+ and pnpm.
2. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`.
3. `pnpm install`
4. `pnpm dev`

Create Telegram token with BotFather (`/newbot`) and paste in `.env`.

## Env vars
- `TELEGRAM_BOT_TOKEN`
- `BIRDWEATHER_GRAPHQL_ENDPOINT`
- `DATABASE_URL`
- `POLL_INTERVAL_SECONDS`
- `LOG_LEVEL`
- `NODE_ENV`

## Commands
`/start`, `/help`, `/station`, `/stations`, `/recent`, `/species`, `/top`, `/subscribe_station`, `/unsubscribe_station`, `/subscriptions`, `/settings`, `/set_score`, `/set_confidence`, `/set_probability`, `/pause`, `/resume`.

## Architecture
- `src/birdweather`: typed GraphQL client and service
- `src/bot`: command handlers and formatters
- `src/db`: SQLite schema/migrations
- `src/subscriptions`: polling scheduler + dedupe + notifications

## Docker
`docker compose up --build -d`

## Limitations
- Polling based notification only in MVP.
- Relies on BirdWeather API response compatibility.

## Future
- GraphQL subscription (`newDetection`) transport.
- Webhook mode for Telegram.
