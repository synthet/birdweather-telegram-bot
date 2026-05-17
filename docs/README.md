# Documentation

Public specs and runbooks for **birdweather-telegram-bot** — safe to share in the repo and with contributors.

| Document                             | Purpose                                               |
| ------------------------------------ | ----------------------------------------------------- |
| [SPEC.md](./SPEC.md)                 | Product behavior: commands, auth, notifications, data |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Modules, APIs, data flow, database                    |
| [OPERATIONS.md](./OPERATIONS.md)     | Env vars, Docker, MCP, BotFather, security            |

For day-to-day setup, start with the root [README.md](../README.md), then use this folder for design detail.

**Maintainer-only** (gitignored): [`docs/local/`](./local/) — deployment runbooks, roadmap, agent session history, and other machine-specific notes. Not present in public clones unless you create that folder locally.

## Additional runbooks

- **iNaturalist OAuth setup and operations:** see [OPERATIONS.md → iNaturalist OAuth setup](./OPERATIONS.md#inaturalist-oauth-setup).
