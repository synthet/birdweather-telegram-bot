# Operations

## Environment variables

See `.env.example` for the canonical list. Parsed in `src/config/env.ts` with Zod.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | From [@BotFather](https://t.me/BotFather) |
| `BIRDWEATHER_API_TOKEN` | No | — | Owner-only `/stations`, `/species`; MCP public tools |
| `BOT_OWNER_TELEGRAM_ID` | If API token set | — | Your numeric Telegram user ID |
| `BIRDWEATHER_STATION_TOKEN` | No | — | MCP station-scoped tools only |
| `BIRDWEATHER_STATION_ID` | No | inferred | MCP station ID |
| `BIRDWEATHER_GRAPHQL_ENDPOINT` | No | BirdWeather app URL | |
| `DATABASE_URL` | No | `file:./data/birdweather-bot.sqlite` | |
| `POLL_INTERVAL_SECONDS` | No | `60` | Notification poll interval |
| `SPECIES_NOTIFY_COOLDOWN_MINUTES` | No | `15` | Anti-spam per species |
| `EBIRD_API_TOKEN` | No | — | [eBird keygen](https://ebird.org/api/keygen) |
| `MCP_AUTH_TOKEN` | For HTTP MCP | — | Bearer secret |
| `MCP_PORT` | For HTTP MCP | — | Exposed in Docker compose |
| `MCP_HTTP_HOST` | No | `0.0.0.0` | |
| `LOG_LEVEL` | No | `info` | pino |
| `NODE_ENV` | No | `development` | |

**Security:** Never commit `.env`, `data/*.sqlite`, or paste tokens into chat logs that may be stored in git.

## Local development

```bash
cp .env.example .env
# edit .env — TELEGRAM_BOT_TOKEN required
pnpm install   # or npm install
pnpm dev       # tsx watch src/index.ts
```

Build: `pnpm build` → `dist/`. Start: `pnpm start`.

## Docker

```bash
docker compose up --build -d
docker compose logs -f bot
```

- SQLite persisted at `./data` → `/app/data` in container.
- MCP port published when `MCP_PORT` is set in `.env`.

### Redeploy without losing DB

**PowerShell:**

```powershell
.\scripts\docker-redeploy.ps1
```

**Bash:**

```bash
bash scripts/docker-redeploy.sh
```

Backs up `data/birdweather-bot.sqlite` to `data/backups/` (keeps last 10 by default), rebuilds image, recreates container.

## MCP setup

### stdio (Cursor)

After `pnpm build`:

```json
{
  "mcpServers": {
    "birdweather": {
      "command": "node",
      "args": ["dist/mcp/stdio.js"],
      "env": {
        "BIRDWEATHER_API_TOKEN": "<owner token>",
        "BIRDWEATHER_STATION_TOKEN": "<station token>",
        "BIRDWEATHER_STATION_ID": "<id>"
      }
    }
  }
}
```

Dev alternative: `tsx src/mcp/stdio.ts` as command.

### HTTP

Set `MCP_AUTH_TOKEN` and `MCP_PORT`. Bot process starts Express MCP on boot.

```text
URL: http://localhost:3001/mcp
Authorization: Bearer <MCP_AUTH_TOKEN>
```

## BotFather checklist

Use `/empty` for default menu URL/title unless you want a custom web app button.

**Suggested command list** (update when adding commands):

```text
start - Welcome and intro
help - List all commands
register - Link your BirdWeather station
account - Show linked station
unregister - Remove linked station
station - Station details
stations - Search public stations (owner)
recent - Recent detections
species - Search species (owner)
top - Top species at station
subscribe_station - Detection alerts
unsubscribe_station - Stop alerts for a station
subscriptions - List subscriptions
settings - Notification thresholds
set_score - Minimum score filter
set_confidence - Minimum confidence filter
set_probability - Minimum probability filter
pause - Pause notifications
resume - Resume notifications
ebird_recent - Recent eBird near station
ebird_notable - Notable eBird near station
ebird_region - eBird region / geo status
set_ebird_region - Override eBird region code
```

**Branding assets** (repo):

| File | Use |
|------|-----|
| `assets/bot-description-640x360.png` | BotFather description banner |
| `assets/bot-profile-512x512.png` | Profile avatar |

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot exits immediately | `TELEGRAM_BOT_TOKEN` set; run `pnpm build` / container logs |
| `/stations` forbidden | User is not `BOT_OWNER_TELEGRAM_ID` or API token unset |
| No notifications | `/register`, `/subscribe_station`, not `/pause`; account `station_id` matches subscription |
| Repeated species alerts | Raise `SPECIES_NOTIFY_COOLDOWN_MINUTES`; verify cooldown table populated |
| eBird commands fail | `EBIRD_API_TOKEN`; station geo cached (`/ebird_region`) |
| Docker DB wiped | Use redeploy script; confirm `./data` volume mount |

## Logs

Structured JSON via **pino**. Set `LOG_LEVEL=debug` for verbose scheduler/API errors.
