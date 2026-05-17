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
| `INAT_CLIENT_ID` | For iNaturalist OAuth | — | OAuth app client ID |
| `INAT_CLIENT_SECRET` | For iNaturalist OAuth | — | OAuth app client secret |
| `INAT_REDIRECT_URI` | For iNaturalist OAuth | — | Must exactly match app callback URL |
| `MCP_AUTH_TOKEN` | For HTTP MCP | — | Bearer secret |
| `MCP_PORT` | For HTTP MCP | — | Exposed in Docker compose |
| `MCP_HTTP_HOST` | No | `0.0.0.0` | |
| `LOG_LEVEL` | No | `info` | pino |
| `NODE_ENV` | No | `development` | |

**Security:** Never commit `.env`, `data/*.sqlite`, or paste tokens into chat logs that may be stored in git.

## iNaturalist OAuth setup

Use this section when enabling iNaturalist account linking.

### 1) Create an iNaturalist OAuth application

1. Sign in to iNaturalist with the maintainer account that will own the app.
2. Open account settings and create a new OAuth application.
3. Set an app name/description that clearly identifies this bot.
4. Add the callback URL from `INAT_REDIRECT_URI` (must match exactly, including protocol, host, path, and trailing slash behavior).
5. Save and copy the generated **Client ID** and **Client Secret** into your `.env`.

### 2) Configure required environment variables

Add the following values:

```bash
INAT_CLIENT_ID=...
INAT_CLIENT_SECRET=...
INAT_REDIRECT_URI=https://<your-domain>/auth/inaturalist/callback
```

Recommendations:

- Use HTTPS in production.
- Keep `INAT_CLIENT_SECRET` in a secret manager (not plaintext deploy scripts).
- Keep staging and production apps separate (different client IDs/secrets/redirect URIs).

### 3) Callback URL configuration checklist

If OAuth redirect fails, verify all of the following are identical between app settings and runtime config:

- URL scheme (`https://` vs `http://`)
- Hostname (including `www` subdomain differences)
- Path (for example `/auth/inaturalist/callback`)
- Port (if non-default)
- Trailing slash behavior

## iNaturalist token lifetime and refresh behavior

- Access tokens should be treated as short-lived and may expire at any time.
- Persist the token expiry timestamp returned by iNaturalist and check it before API calls.
- If a refresh token is present, refresh access tokens proactively before expiry (for example, a few minutes early).
- If refresh fails (`invalid_grant`, revoked session, expired refresh token), clear stored credentials and require the user to re-authorize.

## iNaturalist OAuth troubleshooting checklist

| Symptom | Check |
|---------|--------|
| `state` mismatch | Verify CSRF `state` is generated server-side, stored per session/user, single-use, and compared byte-for-byte on callback. |
| Redirect URI mismatch | Confirm `INAT_REDIRECT_URI` exactly matches the configured callback URL (scheme/host/path/port/trailing slash). |
| User reports auth revoked | Attempt token refresh once; on failure clear stored tokens and prompt for a fresh OAuth consent flow. |

## Privacy and data retention for OAuth tokens

- Store only required OAuth secrets (access token, refresh token if provided, expiry, and minimal account identifier).
- Encrypt tokens at rest when possible; never log raw tokens.
- Restrict token access to bot runtime and migration/admin tooling only.
- Delete stored OAuth credentials immediately when a user disconnects account access.
- Apply a retention limit for orphaned OAuth rows (for example after account deletion), and document cleanup cadence.
- Avoid backing up secrets into publicly accessible artifacts.

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
