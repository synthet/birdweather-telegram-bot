# Product specification

## Purpose

Telegram bot that links each user to their own **BirdWeather** station, surfaces detections and station metadata, sends **push-style alerts** for new detections on subscribed stations, and optionally enriches output with **eBird** context (links, regional rarity, nearby reports).

## Users and roles

| Role | Who | Capabilities |
|------|-----|----------------|
| **Subscriber** | Any Telegram user | `/register`, own-station commands, subscriptions, filters, pause/resume |
| **Bot owner** | `BOT_OWNER_TELEGRAM_ID` | Above plus owner-only **public catalog** queries when `BIRDWEATHER_API_TOKEN` is set: `/stations`, `/species` |

Non-owners never use the shared `BIRDWEATHER_API_TOKEN`; they use only their per-chat **station token** from registration.

## Registration

1. User sends `/register`.
2. Bot asks for **station auth token** (validated via BirdWeather REST).
3. User sends **station ID** (numeric or parsed from station URL).
4. Bot validates token + ID pair, stores row in `birdweather_accounts`, refreshes geo cache, seeds notification state.

Commands: `/account`, `/unregister`, `/cancel` during flow.

**Access rule:** Station-scoped GraphQL/REST calls require a linked account and matching `station_id`. Users cannot query arbitrary stations by ID unless they are the bot owner using public search.

## Commands

### Core

| Command | Description |
|---------|-------------|
| `/start` | Short intro |
| `/help` | Full command list |
| `/register` | Link BirdWeather station token + ID |
| `/account` | Show linked station (token masked) |
| `/unregister` | Remove linked station |
| `/cancel` | Abort registration |

### Station and detections

| Command | Auth | Description |
|---------|------|-------------|
| `/station [id]` | Station token | Station details; defaults to linked station |
| `/stations <query>` | Owner + `BIRDWEATHER_API_TOKEN` | Search public stations |
| `/recent [id]` | Station token | Recent detections (HTML, inline links) |
| `/species <name>` | Owner + API token | Search species catalog |
| `/top [id]` | Station token | Top species at station |

### Subscriptions and filters

| Command | Description |
|---------|-------------|
| `/subscribe_station [id]` | Subscribe to detection alerts (linked station if omitted) |
| `/unsubscribe_station <id>` | Remove subscription |
| `/subscriptions` | List active subscriptions |
| `/settings` | Show min score / confidence / probability, pause state |
| `/set_score <n>` | Minimum detection score (0–1) |
| `/set_confidence <n>` | Minimum confidence |
| `/set_probability <n>` | Minimum probability |
| `/pause` | Stop notifications |
| `/resume` | Resume notifications |

Per-chat settings live in `chat_settings`. Subscriptions in `station_subscriptions`.

### eBird (optional `EBIRD_API_TOKEN`)

| Command | Description |
|---------|-------------|
| `/ebird_recent` | Recent eBird reports near station (geo) or in region (privacy) |
| `/ebird_notable` | Notable/rare reports (same geo/region rules) |
| `/ebird_region` | Cached coordinates, region code, override status |
| `/set_ebird_region <code>` | Manual eBird region override |

Requires linked station. Geo comes from BirdWeather station GraphQL + `station_geo` cache; privacy stations use regional endpoints instead of lat/lng.

## Notification behavior

### Trigger

- Scheduler runs every `POLL_INTERVAL_SECONDS` (default 60).
- For each active `station_subscriptions` row with `paused = 0`:
  - Load subscriber’s `birdweather_accounts` row; **skip** if missing or `station_id` mismatch.
  - Fetch recent detections via **station GraphQL** with user filters.
  - Process oldest-first among new items (`reverse()` on filtered list).

### Dedupe

- **Per detection ID:** `delivered_detections` — each `(chat_id, detection_id)` delivered at most once.
- **Per species cooldown:** `species_last_notified` — same species at same station suppressed for `SPECIES_NOTIFY_COOLDOWN_MINUTES` (default 15). Cooldown hits still mark detection IDs delivered to avoid backlog spam.

### Seeding

On subscribe/register, bot fetches recent detections and marks them delivered + seeds species cooldown so historical birds do not alert.

### Message format

- Telegram **HTML** (`parse_mode: 'HTML'`).
- **No banner title line** (e.g. no “New BirdWeather detection” header); message starts with species common/scientific names.
- Optional lines: timestamp · station name, score/confidence/probability as percents, eBird rarity note, footer links.
- **Inline keyboard:** Listen (soundscape), BirdWeather, eBird, Macaulay when URLs exist.
- Link previews disabled.

### Enrichment on notify

- eBird taxonomy lookup → `ebirdUrl`, `macaulayUrl` on species.
- Optional `rarityNote` from regional checklist / recent geo notable logic.

## MCP (Model Context Protocol)

Read-only MCP server exposing BirdWeather data to agents (Cursor, etc.).

| Tool | Token required |
|------|----------------|
| `search_stations` | `BIRDWEATHER_API_TOKEN` |
| `search_species` | `BIRDWEATHER_API_TOKEN` |
| `get_station` | `BIRDWEATHER_STATION_TOKEN` (+ optional `BIRDWEATHER_STATION_ID`) |
| `list_detections` | Station token (REST detections + filters) |
| `get_top_species` | Station token |

Transports:

- **stdio:** `pnpm mcp:stdio` / `node dist/mcp/stdio.js`
- **HTTP:** `MCP_AUTH_TOKEN` + `MCP_PORT`; Bearer auth; starts with main bot when both set

## Non-goals (current release)

- Telegram webhook mode (long-polling only).
- BirdWeather GraphQL live `newDetection` subscription transport.
- Multi-station per user (one linked account; multiple subscriptions possible but notifications require account station match).
- xeno-canto, iNaturalist, GBIF, Nuthatch (see [ROADMAP.md](./ROADMAP.md)).

## Acceptance criteria (implemented)

- [x] Per-user station registration with token validation
- [x] Owner-gated public search token
- [x] Polling notifications with detection + species dedupe
- [x] Configurable score/confidence/probability filters
- [x] Docker deployment with persistent SQLite volume
- [x] eBird enrichment and regional commands
- [x] MCP stdio + optional HTTP
- [x] HTML detection cards with inline action buttons
- [x] Species notify cooldown env-tunable
