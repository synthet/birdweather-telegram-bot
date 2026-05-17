# BirdWeather API research and improvement plan

_Date researched: 2026-05-17_

## What the BirdWeather API currently offers

BirdWeather exposes a GraphQL endpoint (`https://app.birdweather.com/graphql`) with query and subscription operations documented at `https://app.birdweather.com/api/`.

Notable operations relevant to this bot:

- `detections` (rich filtering: species, geography, score thresholds, station filters)
- `stations` and `station`
- `searchSpecies`, `topSpecies`
- `counts`, `dailyDetectionCounts`, `timeOfDayDetectionCounts`
- subscription `newDetection`

## Current app usage vs API capabilities

Current bot uses:

- `station`, `stations`, `detections`, `searchSpecies`, `topSpecies`
- Polling-based notification scheduler instead of GraphQL subscription

Current gaps where API can add immediate product value:

1. **Time-window controls in user workflows**
   - `/recent` and scheduler use default detection window behavior.
   - The API supports `period` (InputDuration), so we can let users choose windows like 1h/6h/24h.

2. **Geo-filtered discovery tools**
   - API supports bounding box filters (`ne`, `sw`) for detections/sightings/counts.
   - We currently do not expose commands for local area trends around a station.

3. **Analytics and trend endpoints**
   - `counts`, `dailyDetectionCounts`, and `timeOfDayDetectionCounts` are not used.
   - These can power `/stats` summaries and digest-style notifications.

4. **Push-style detection handling**
   - API includes `newDetection` subscription.
   - App currently polls; this is simpler but slower and can produce duplicate-fetch overhead.

5. **Filtering improvements**
   - API supports richer `detections` filters (continents/countries/classifications/recordingModes).
   - Bot currently exposes only score/confidence/probability/soundscape-related filtering.

## Recommended roadmap

### Phase 1 (quick wins, low risk)

- Add optional `period` in detection fetch paths:
  - `/recent [station_id] [window]` (e.g., `1h`, `6h`, `24h`, `7d`)
  - subscription polling window control in settings
- Add `/stats` command backed by `counts` for linked station and current filters
- Add internal observability metrics around GraphQL latency/error rates

### Phase 2 (feature growth)

- Add `/trend` command using `dailyDetectionCounts`
- Add `/active_hours` command using `timeOfDayDetectionCounts`
- Add optional geo filters around station coordinates (e.g., 25 km equivalent via bbox helper)

### Phase 3 (architecture upgrade)

- Introduce an optional subscription worker using `newDetection`
- Keep polling as fallback; choose mode via env flag
- Add idempotent delivery guardrails for mixed polling+subscription operation

## Suggested implementation notes

- Keep GraphQL query files modular by operation group (`queries/detections.ts`, `queries/analytics.ts`) as new operations are added.
- Add strong runtime validation for user-provided period strings before turning them into `InputDuration`.
- Preserve existing local post-filtering as defense-in-depth for inconsistent API values.

## Acceptance criteria for first implementation PR

- `/recent` accepts optional period values and rejects invalid units with clear examples.
- scheduler respects configured period window for detection fetches.
- `/stats` returns counts summary with selected window.
- tests cover period parsing and GraphQL variable construction.
