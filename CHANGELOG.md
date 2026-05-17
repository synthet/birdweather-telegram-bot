# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-17

### Added

- Species reference photos on detection alerts and `/recent` when BirdWeather provides `imageUrl` / `thumbnailUrl`.
- `sendDetection` helper: sends a photo with HTML caption when possible, falls back to text if Telegram rejects the image URL.
- Smarter species notification policy: at most one alert per species per station calendar day unless the species is rare or infrequent at the station.
- Merged detection metrics in alert text when multiple detections for the same species arrive in one poll.
- `pickBestDetection` to choose the highest-quality detection in a species group.
- `SPECIES_RARE_STATION_MAX_COUNT` env var (default 5) for station top-species rarity threshold.
- Tests for merged metrics, send detection, species notify policy, and REST species image mapping.

### Changed

- Default `SPECIES_NOTIFY_COOLDOWN_MINUTES` from 15 to 10.
- `/recent` sends one message per detection (with photos) instead of a single combined HTML reply.
- Notification polling groups detections by species, enriches the best pick, and applies the new notify policy before sending.
- GraphQL detections query and REST mapper include species image URLs.

### Fixed

- Station calendar-day logic for species cooldown uses station timezone helpers consistently.

## [0.1.0] - 2026-05-01

Initial release: Telegram bot for BirdWeather station subscriptions, MCP server, SQLite persistence, eBird enrichment, and Hetzner deploy workflow.
