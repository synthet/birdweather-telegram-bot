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
| `TOKEN_ENCRYPTION_KEY` | No | — | Encrypt station/OAuth tokens at rest (16+ chars) |
| `INAT_CLIENT_ID` | For iNaturalist OAuth | — | OAuth app client ID |
| `INAT_CLIENT_SECRET` | For iNaturalist OAuth | — | OAuth app client secret |
| `INAT_REDIRECT_URI` | For iNaturalist OAuth | — | Must match app callback (e.g. `https://host/auth/inat/callback`) |
| `INAT_OAUTH_SCOPES` | No | `read write` | Space- or comma-separated scopes |
| `INAT_OAUTH_AUTHORIZE_URL` | No | iNaturalist authorize URL | Override for testing only |
| `INAT_OAUTH_TOKEN_URL` | No | iNaturalist token URL | Override for testing only |
| `INAT_API_BASE_URL` | No | `https://api.inaturalist.org/v1` | iNaturalist API base |
| `INAT_AUTH_BASE_URL` | No | — | Public base URL for `/inat_connect` links in Telegram |
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
INAT_REDIRECT_URI=https://<your-domain>/auth/inat/callback
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

## iNaturalist OAuth setup

Use this when enabling iNaturalist account linking features in your deployment.

### 1) Create the iNaturalist OAuth app

1. Sign in to iNaturalist with the account that will own the OAuth application.
2. Create a new OAuth application in iNaturalist account settings.
3. Set application name/description to identify your bot instance (for example `BirdWeather Telegram Bot - prod`).
4. Configure redirect URI(s) exactly as used by your bot service (see callback section below).
5. Save the app and record the generated **Client ID** and **Client Secret**.

### 2) Required environment variables

Add these variables to `.env` for OAuth-enabled deployments:

| Variable                    | Required             | Example                                       | Notes                                           |
| --------------------------- | -------------------- | --------------------------------------------- | ----------------------------------------------- |
| `INAT_CLIENT_ID`            | Yes                  | `1234`                                        | OAuth application client ID                     |
| `INAT_CLIENT_SECRET`        | Yes                  | `abc...`                                      | OAuth application client secret; keep private   |
| `INAT_REDIRECT_URI`         | Yes                  | `https://bot.example.com/auth/inat/callback`  | Must exactly match iNaturalist app redirect URI |
| `INAT_OAUTH_SCOPES`         | Yes                  | `read`                                        | Space-delimited scope list; keep minimal        |
| `INAT_AUTH_BASE_URL`        | No                   | `https://www.inaturalist.org/oauth/authorize` | Override only for testing/proxy use             |
| `INAT_TOKEN_URL`            | No                   | `https://www.inaturalist.org/oauth/token`     | Override only for testing/proxy use             |
| `INAT_TOKEN_ENCRYPTION_KEY` | Strongly recommended | `<32+ byte secret>`                           | Encrypt tokens at rest before DB write          |

### 3) Callback URL configuration

- Production should use HTTPS and a stable public hostname.
- Redirect URI must match **exactly** (scheme, host, path, trailing slash, and port if non-default).
- If you run separate staging/prod bots, register each callback URL explicitly in iNaturalist and keep secrets isolated by environment.
- Behind reverse proxies, make sure forwarded protocol/host handling preserves your public callback URL.

### 4) Token lifetime and refresh behavior

- Access tokens are expected to be short-lived and should be treated as ephemeral credentials.
- If iNaturalist returns refresh tokens for your app/scopes, refresh proactively before expiry and rotate stored refresh tokens whenever a new one is issued.
- If no refresh token is available (or refresh fails with invalid/revoked grant), require the user to reauthorize.
- Never assume fixed TTL values in code; rely on provider response fields (`expires_in`, token type, and refresh-token presence).

### 5) Troubleshooting checklist

| Symptom                                   | Checks                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state` mismatch on callback              | Verify state is generated per login attempt, stored server-side, single-use, and not reused across chats/sessions. Check clock skew and multi-instance shared session storage. |
| `redirect_uri` mismatch / `invalid_grant` | Confirm bot uses exactly the same `INAT_REDIRECT_URI` value registered in iNaturalist. Watch for trailing slash, `http` vs `https`, and proxy host rewrites.                   |
| “Authorization revoked” / refresh fails   | User revoked app access in iNaturalist or secret rotated. Delete local token pair, prompt re-link, and verify current `INAT_CLIENT_SECRET`.                                    |

### 6) Privacy and data-retention notes

- Store only what is needed: provider user id, access token, refresh token (if present), expiry, scopes, and audit timestamps.
- Encrypt tokens at rest (application-layer encryption preferred) and redact token fields from logs.
- Restrict token read access to bot runtime components that perform API calls.
- On unlink/account deletion, delete stored tokens immediately.
- Add a retention policy for stale/unused token rows (for example, purge records not refreshed or used in 90 days).
- Document lawful basis/consent in your privacy notice if deploying for real users.

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

| File                                 | Use                          |
| ------------------------------------ | ---------------------------- |
| `assets/bot-description-640x360.png` | BotFather description banner |
| `assets/bot-profile-512x512.png`     | Profile avatar               |

## Troubleshooting

| Symptom                 | Check                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Bot exits immediately   | `TELEGRAM_BOT_TOKEN` set; run `pnpm build` / container logs                                |
| `/stations` forbidden   | User is not `BOT_OWNER_TELEGRAM_ID` or API token unset                                     |
| No notifications        | `/register`, `/subscribe_station`, not `/pause`; account `station_id` matches subscription |
| Repeated species alerts | Raise `SPECIES_NOTIFY_COOLDOWN_MINUTES`; verify cooldown table populated                   |
| eBird commands fail     | `EBIRD_API_TOKEN`; station geo cached (`/ebird_region`)                                    |
| Docker DB wiped         | Use redeploy script; confirm `./data` volume mount                                         |

## Logs

Structured JSON via **pino**. Set `LOG_LEVEL=debug` for verbose scheduler/API errors.
