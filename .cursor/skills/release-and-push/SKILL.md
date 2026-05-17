---
name: release-and-push
description: >-
  Bumps package.json version, updates CHANGELOG.md, commits, and pushes to
  origin. Use when the user asks to release, bump version, update changelog,
  ship, or run /release-and-push.
disable-model-invocation: true
---

# Release and push

Ship a versioned snapshot of the repo. Version lives in `package.json` only (no separate tags required unless the user asks).

## Preconditions

- Working tree should reflect the release (features merged or changes ready).
- Run `npm test` (or `pnpm test` if available). Fix failures before committing.
- Follow `.cursor/rules/no-secrets-in-git.mdc`: never stage `.env`, `data/*.sqlite`, or credential files.

## Version bump

1. Read current `package.json` `version` (semver `MAJOR.MINOR.PATCH`).
2. Ask the user for bump type if unclear:
   - **patch** — fixes only
   - **minor** — new features, backward compatible (default for feature work)
   - **major** — breaking changes
3. Increment accordingly and update `package.json`.

## Changelog

Edit `CHANGELOG.md` (Keep a Changelog style):

- Add `## [X.Y.Z] - YYYY-MM-DD` under the header (today’s date in UTC or local, consistent within the file).
- Group bullets under `### Added`, `### Changed`, `### Fixed`, `### Removed` as appropriate.
- Summarize from `git diff` and recent conversation — user-facing behavior, not file lists.
- Move unreleased work out of any `## [Unreleased]` section if present.

## Commit

1. `git status` and `git diff` — confirm no secrets or `data/` DB files.
2. Stage all release-related sources (typical: `package.json`, `CHANGELOG.md`, and the feature/fix files for this release).
3. Commit message (complete sentences):

```
Release vX.Y.Z.

<One sentence on the main theme of the release.>
```

Use a HEREDOC for the message on Unix; on PowerShell use `git commit -m "Release vX.Y.Z." -m "..."`.

## Push

- `git push origin HEAD` (or current branch name).
- If push is rejected, report; do not force-push `main` unless the user explicitly requests it.

## After push

- Remind that production deploys via Hetzner (`scripts/deploy-hetzner.sh`) or CI on `main` per `.cursor/rules/hetzner-deploy.mdc`.
- Do not run local Docker redeploy unless the user asked.

## Optional git tag

Only if the user asks: `git tag vX.Y.Z && git push origin vX.Y.Z`.
