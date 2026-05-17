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

Operational setup for third-party OAuth providers (including iNaturalist app creation, callback URL requirements, and token handling policy) is documented in [`OPERATIONS.md`](./OPERATIONS.md).

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
| `/recent [id]` | Station token | Recent detections — one message per detection; species photo when BirdWeather provides `imageUrl` / `thumbnailUrl` |
| `/species <name>` | Owner + API token | Search species catalog |
| `/top [id]` | Station token | Top species at station |

### Subscriptions and filters

| Command | Description |
|---------|-------------|
| `/subscribe_station [id]` | Subscribe to detection alerts (linked station if omitted) |
| `/unsubscribe_station <id>` | Remove subscription |
| `/subscriptions` | List active subscriptions |
| `/settings` | Show min score / confidence / probability, pause state |
| `/set_score <n>` | Minimum detection score (BirdWeather ~0–10 scale; stored and shown with one decimal, e.g. `7.0`) |
| `/set_confidence <n>` | Minimum confidence — fraction or percent (`0.62`, `62`, or `62%`) |
| `/set_probability <n>` | Minimum probability — same parsing as confidence |
| `/pause` | Stop notifications |
| `/resume` | Resume notifications |

Per-chat settings live in `chat_settings`. Subscriptions in `station_subscriptions`.

Edited messages that become bot commands (e.g. fixing `/set_score 7` after a typo) are handled the same as new commands.

### eBird (optional `EBIRD_API_TOKEN`)

| Command | Description |
|---------|-------------|
| `/ebird_recent` | Recent eBird reports near station (geo) or in region (privacy) |
| `/ebird_notable` | Notable/rare reports (same geo/region rules) |
| `/ebird_region` | Cached coordinates, region code, override status |
| `/set_ebird_region <code>` | Manual eBird region override |

Requires linked station. Geo comes from BirdWeather station GraphQL + `station_geo` cache; privacy stations use regional endpoints instead of lat/lng.

### iNaturalist (optional OAuth env + `INAT_AUTH_BASE_URL`)

| Command | Description |
|---------|-------------|
| `/inat_connect` | Start OAuth link flow (private chat only) |
| `/inat_status` | Show link state and token expiry |
| `/inat_disconnect` | Remove stored iNaturalist tokens (private chat only) |

Requires HTTP MCP server with `/auth/inat/start` and `/auth/inat/callback` reachable at `INAT_AUTH_BASE_URL`. Does not add iNaturalist content to detection alerts.

## Notification behavior

### Trigger

- Scheduler runs every `POLL_INTERVAL_SECONDS` (default 60).
- For each active `station_subscriptions` row with `paused = 0`:
  - Load subscriber’s `birdweather_accounts` row; **skip** if missing or `station_id` mismatch.
  - Fetch recent detections via **station GraphQL** with user filters.
  - Collect undelivered detections and **group by species** (`speciesKey`) for the current poll.

### Dedupe and alerting (layered)

1. **Per detection ID** — `delivered_detections`: each `(chat_id, detection_id)` is processed at most once. Suppressed detections are still marked delivered so they do not backlog.

2. **Per poll, per species** — Undelivered detections for the same species in one poll are batched:
   - `pickBestDetection` chooses the highest-quality row (score, then confidence, then probability, then time) for enrichment and display.
   - If two or more detections are merged, the caption includes **merged metrics**: min–max and average for score/confidence/probability when values differ, or average-only when identical, plus `N detections`.

3. **Burst cooldown** — `species_last_notified` + `SPECIES_NOTIFY_COOLDOWN_MINUTES` (default **10**): suppress another alert for the same species at the same station within the window. Cooldown hits still mark all batched detection IDs delivered.

4. **Calendar-day policy** — After the first alert for a species at a station/chat **today** (station IANA timezone, or UTC if unknown), further alerts for that species are suppressed for the rest of the day unless the detection is **rare**:
   - First time this species has ever triggered a notification for that chat/station.
   - eBird enrichment set a `rarityNote` on the detection.
   - Species is **infrequent at the station**: missing from the cached top-100 list or count ≤ `SPECIES_RARE_STATION_MAX_COUNT` (default **5**).

### Seeding

On subscribe/register, bot fetches recent detections and marks them delivered + seeds species cooldown so historical birds do not alert.

### Message format

- Delivery: `sendPhoto` with HTML caption when BirdWeather provides `imageUrl` (preferred) or `thumbnailUrl`; otherwise `sendMessage` with the same HTML body.
- Telegram **HTML** (`parse_mode: 'HTML'`).
- **No banner title line** on alerts (e.g. no “New detection” header); caption starts with species common/scientific names.
- Optional lines: timestamp · station name, score/confidence/probability (single detection or merged summary), eBird rarity note, footer links.
- **Inline keyboard:** Listen (soundscape), BirdWeather, eBird, Macaulay when URLs exist.
- Link previews disabled.

### Enrichment on notify

- eBird taxonomy lookup → `ebirdUrl`, `macaulayUrl` on species.
- Optional `rarityNote` from regional checklist / recent geo notable logic (also affects calendar-day rare exceptions).

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
- **HTTP:** `MCP_AUTH_TOKEN` + `MCP_PORT`; Bearer auth; starts with main bot when both set. When iNaturalist OAuth env is configured, HTTP app also serves `/auth/inat/start` and `/auth/inat/callback`.

## Non-goals (current release)

- Telegram webhook mode (long-polling only).
- BirdWeather GraphQL live `newDetection` subscription transport.
- Multi-station per user (one linked account; multiple subscriptions possible but notifications require account station match).
- **Spectrograms** as attached images (BirdWeather API has no per-detection spectrogram URL; species reference photos are used instead).
- **iNaturalist beyond account linking:** no iNat URLs on detection cards, no auto-posting observations to iNaturalist.
- xeno-canto, GBIF, Nuthatch (planned; not implemented).

## Acceptance criteria (implemented)

- [x] Per-user station registration with token validation
- [x] Owner-gated public search token
- [x] Polling notifications with per-detection ID dedupe
- [x] Species grouping per poll with best-detection pick and merged metric summaries
- [x] Burst species cooldown (`SPECIES_NOTIFY_COOLDOWN_MINUTES`, default 10)
- [x] Calendar-day species cap with rare/infrequent exceptions (`SPECIES_RARE_STATION_MAX_COUNT`)
- [x] Species reference photos on alerts and `/recent` when BirdWeather provides image URLs
- [x] Configurable score/confidence/probability filters (score 0–10; confidence/probability fraction or percent)
- [x] Docker deployment with persistent SQLite volume
- [x] eBird enrichment and regional commands
- [x] iNaturalist OAuth connect/status/disconnect (when configured)
- [x] MCP stdio + optional HTTP
- [x] HTML detection cards with inline action buttons
- [x] Edited-message command promotion for `/set_*` and other commands
