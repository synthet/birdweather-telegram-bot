# Release and push

Follow the project skill at `.cursor/skills/release-and-push/SKILL.md`.

1. Run tests (`npm test`).
2. Bump `package.json` version (minor unless I specify patch/major).
3. Add a `CHANGELOG.md` entry for today with Added/Changed/Fixed bullets from the current diff.
4. Commit everything ready for this release (exclude `.env`, `data/*.sqlite`, secrets).
5. Push to `origin` on the current branch.

Use commit message: `Release vX.Y.Z.` plus a one-line summary of the release theme.

After push, note Hetzner/CI deploy if this is `main`.
