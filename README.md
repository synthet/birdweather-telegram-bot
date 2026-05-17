# birdweather-telegram-bot

Telegram bot for monitoring BirdWeather stations and detections, with optional eBird enrichment and an MCP read API.

## Setup

1. Install Node.js 22+ and pnpm (or npm).
2. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`. Optionally set owner/eBird/MCP variables (see below).
3. `pnpm install`
4. `pnpm dev`

Create a Telegram token with [@BotFather](https://t.me/BotFather) (`/newbot`) and paste it in `.env`.

## Documentation

Detailed specs and architecture: **[docs/](./docs/)**

- [Product spec](./docs/SPEC.md) — commands, auth, notifications
- [Architecture](./docs/ARCHITECTURE.md) — modules, APIs, data model
- [Operations](./docs/OPERATIONS.md) — env, Docker, MCP, BotFather
- [Roadmap](./docs/ROADMAP.md) — planned integrations
- [History](./docs/HISTORY.md) — chat-driven change log

## Env vars (summary)

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Required |
| `BIRDWEATHER_API_TOKEN` | Optional; owner-only `/stations`, `/species` |
| `BOT_OWNER_TELEGRAM_ID` | Required when API token is set |
| `EBIRD_API_TOKEN` | Optional; eBird commands + rarity/links |
| `SPECIES_NOTIFY_COOLDOWN_MINUTES` | Optional; default 15 |
| `MCP_AUTH_TOKEN`, `MCP_PORT` | Optional; HTTP MCP with bot |

Full list: `.env.example` and [docs/OPERATIONS.md](./docs/OPERATIONS.md).

## Commands (summary)

`/register`, `/account`, `/unregister`, `/start`, `/help`, `/station`, `/stations`, `/recent`, `/species`, `/top`, `/subscribe_station`, `/unsubscribe_station`, `/subscriptions`, `/settings`, `/set_score`, `/set_confidence`, `/set_probability`, `/pause`, `/resume`, `/ebird_recent`, `/ebird_notable`, `/ebird_region`, `/set_ebird_region`.

## Architecture (summary)

- `src/birdweather` — GraphQL client and service
- `src/bot` — Telegraf handlers and formatters
- `src/db` — SQLite schema and accounts
- `src/subscriptions` — polling, dedupe, species cooldown, notifications
- `src/ebird` — eBird API 2.0 integration
- `src/mcp` — Model Context Protocol server (stdio + optional HTTP)

## Docker

1. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`.
2. `docker compose up --build -d`
3. `docker compose logs -f bot`

SQLite data is stored in `./data` on the host. Redeploy with backup:

**PowerShell:** `.\scripts\docker-redeploy.ps1`  
**Bash:** `bash scripts/docker-redeploy.sh`

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm test` | Vitest |
| `pnpm mcp:stdio` | MCP over stdio |
| `pnpm mcp:http` | MCP HTTP only (dev) |

## Limitations

- Polling-based notifications (no GraphQL live subscription yet).
- One linked BirdWeather station per Telegram chat.
- Relies on BirdWeather and eBird API compatibility.

See [docs/ROADMAP.md](./docs/ROADMAP.md) for planned improvements.
