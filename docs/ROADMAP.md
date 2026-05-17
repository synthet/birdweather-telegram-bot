# Roadmap

Items below come from README “Future” notes, the API landscape review chat (`c2da8fbf-fe65-49fb-85a5-8f023584bdf3`), and gaps vs. a full “birding bot” stack.

## Near term (fits current architecture)

| Item | Value | Effort |
|------|-------|--------|
| **xeno-canto v3** | Sample calls for detected species in `/recent` and notifications | Medium — new provider module + species search |
| **eBird hotspots** | `/hotspots` near linked station | Low — extend `ebird/client.ts` |
| **BotFather command sync** | Keep menu list aligned with `/help` | Trivial — docs only |
| **GraphQL `newDetection` subscription** | Lower latency than polling | High — transport, reconnect, dedupe alignment |
| **Telegram webhook mode** | Production scaling behind HTTPS | Medium — separate entry from long-poll |

## Medium term

| API | Use case | Notes |
|-----|----------|-------|
| **iNaturalist** | Photos / community context on species | REST; rate limits; optional enrichment |
| **Nuthatch** | “Bird of the day”, simple facts/images | Easy enrichment; not real-time sightings |
| **Open-Meteo / weather** | Context on detection time | No key; optional footer in alerts |

## Lower priority / research

| API | Use case | Notes |
|-----|----------|-------|
| **GBIF** | Occurrence maps, taxonomy matching | Better for analytics than chat alerts |
| **Macaulay Library direct API** | Media beyond eBird taxonomy links | Licensing; often via eBird species pages first |
| **Wikipedia/Wikidata** | Species summaries | Unofficial; HTML length limits in Telegram |

## Provider pattern (recommended)

When adding providers, mirror existing split:

```text
src/<provider>/client.ts    # HTTP + types
src/<provider>/enrich.ts      # map into Detection / Species
src/integrations/             # compose into detectionEnrichment
```

Keep **BirdWeather** as source of truth for detections; other APIs enrich or answer separate commands.

## Explicit non-plans

- Storing or committing user tokens in git
- Using owner `BIRDWEATHER_API_TOKEN` for per-user station data
- Multi-tenant public search without owner gate
