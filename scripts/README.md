# Scripts

## In git (`scripts/`)

Generic utilities safe to share — no hostnames, SSH key names, or operator paths.

| Script | Use |
|--------|-----|
| `docker-redeploy.sh` | Local Docker: backup SQLite, rebuild, recreate `bot` |
| `docker-redeploy.ps1` | Same on Windows PowerShell |
| `deploy-hetzner.sh` | Production deploy via SSH (`HETZNER_SERVER_HOST`, `.env`; GitHub Actions on `main`) |
| `install-mcp-toolbox.sh` | Download MCP Toolbox for Databases into `.cursor/toolbox/` (Bash) |
| `install-mcp-toolbox.ps1` | Same on Windows |

`deploy-hetzner.sh` excludes `docs/local/` from the tarball. Set `SYNC_DB=1` to upload `./data/birdweather-bot.sqlite`.

## Gitignored (`docs/local/scripts/`)

Operator-specific provisioning and one-off maintenance. See `docs/local/deployment.md` on your machine.

| Script | Use |
|--------|-----|
| `provision.ps1` | Create Hetzner server (cloud-init, personal SSH key name) |
| `deploy.ps1` | Windows deploy with hcloud IP lookup; always syncs local DB if present |
| `cloud-init.yaml` | First-boot Docker install for provision |
| `repair-account-link.mjs` | Fix `birdweather_accounts` when subscriptions exist without a token row |
