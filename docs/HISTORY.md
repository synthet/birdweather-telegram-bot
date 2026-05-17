# Development history (from agent sessions)

Chronological summary of work driven in Cursor chats (May 2026). Transcript UUIDs refer to Cursor agent-transcripts for that session.

| When | Topic | Outcome | Transcript |
|------|-------|---------|------------|
| Initial | Bot creation | Project scaffold, `.env` setup guidance | `e005e171-4804-4cd0-8727-af566a1e8276` |
| | Build | Fixed `graphql-request` timeout → `AbortSignal.timeout`; added `@types/better-sqlite3` | `c0710958-b897-4863-84ca-d599d346acb1` |
| | BotFather | Command list, about/description copy, 640×360 banner + 512 profile assets | `265cb190-0134-445a-8428-5835cf0cc311` |
| | Registration | Per-user station token + ID; validate via REST/GraphQL | `e614b49e-64fe-4c81-8f0e-8ed686ad62d3` |
| | Owner token | `BIRDWEATHER_API_TOKEN` limited to `BOT_OWNER_TELEGRAM_ID` for public search | `e614b49e-64fe-4c81-8f0e-8ed686ad62d3` |
| | Notifications | Polling scheduler, dedupe, subscribe flow, filters | `4e1f1d01-aa91-445b-b69f-adc228788e91` |
| | Docker | `Dockerfile`, `docker-compose.yml`, persistent `data/` volume | `50398561-81d3-4a89-b8dd-fd2fa4fbeb95` |
| | API token policy | Default token only for idempotent public catalog queries | `50398561-81d3-4a89-b8dd-fd2fa4fbeb95` |
| | Redeploy | `scripts/docker-redeploy.*` with SQLite backup | `50398561-81d3-4a89-b8dd-fd2fa4fbeb95` |
| | Docker debug | Fixed container start issues (env/volume) | `21d30db0-fafc-4a92-9784-cc8999822410` |
| | eBird | API 2.0 client, taxonomy, enrichment, commands, rarity hints | `defda3a7-7362-4962-aff4-e0d35b912e8d` |
| | UX/UI | HTML detection cards, percents, inline keyboards, screenshot-driven tweaks | `6380f79a-…`, `540032d4-…` |
| | Anti-noise | Species cooldown + seeding on subscribe | `87e67339-e0fc-4e30-8fd9-8cc42f42772e` |
| | MCP | stdio + HTTP Streamable MCP, five read-only tools | `d42692b5-a393-460f-bb6b-0dab75ce6a69` |
| | Security rule | `.cursor/rules/no-secrets-in-git.mdc` | `2bed4360-892c-4212-900e-0abd9f7a16bd` |
| | API survey | Integration options (eBird done; xeno-canto, iNat, etc. deferred) | `c2da8fbf-fe65-49fb-85a5-8f023584bdf3` |
| | Notification copy | Removed “New BirdWeather detection” header from alerts | `773f147c-6347-4f29-ba4c-2a11910d6dae` |
| | Documentation | `docs/` specs and ops guides | `e80e93fd-5ae5-4260-86b0-6bf4e4c321a0` |
| 2026-05-16 | Hetzner production | Production server + cloud-init + Docker; local ops in gitignored `scripts/hetzner/` and `docs/local/` | `d645d42e-c8dd-41e3-b25a-448b549f5631` |
| 2026-05-16 | Remote MCP (planned) | Request to wire second MCP in `.cursor/mcp.json` to production HTTP endpoint; firewall/tunnel still required | `074dc6c3-e60f-4dec-b569-1926081298d5` |

## Security note

If a BotFather or API token was ever pasted into chat, rotate it in the provider dashboard and store only in local `.env`. Do not commit tokens or SQLite files.
