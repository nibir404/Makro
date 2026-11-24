# Contributing, versioning and releases

## Branches

- `main` — always buildable; each release is tagged from here.
- Feature work: `feat/<area>-<short-name>`. Fixes: `fix/<short-name>`. Docs: `docs/<short-name>`.
- Open a pull request into `main`. Before you merge, the PR must pass:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(inbox): bulk approve with undo
fix(canvas): keep inspector open on env switch
docs: add routes for secrets
chore(deps): bump next to 16.4.7
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`. Add `!` (e.g. `feat!:`) for a breaking change.

## Versioning

The project follows [Semantic Versioning](https://semver.org/). The version lives in `package.json` and must match the latest tag.

While the project is in prototype (`0.x`):

| Change | Bump | Example |
|---|---|---|
| New screens or flows, larger design updates, API integration of an area | minor | 0.1.0 → 0.2.0 |
| Fixes, design-fidelity tweaks, copy, docs | patch | 0.1.0 → 0.1.1 |

From `1.0.0` (first production release backed by real APIs), standard SemVer applies: breaking → major, features → minor, fixes → patch.

## Release process

1. Move the items under `## [Unreleased]` in `CHANGELOG.md` into a new version section dated `YYYY-MM-DD`. Update the compare links at the bottom.
2. Bump the version:
   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```
3. Commit:
   ```bash
   git commit -am "chore(release): vX.Y.Z"
   ```
4. Tag with an annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z — <one-line summary>"
   ```
5. Push the commit and the tag:
   ```bash
   git push origin main --follow-tags
   ```
6. Optionally, create a GitHub release from the tag, using the changelog section as the notes.

Tags are always `v` + the version (`v0.1.0`). Never move or delete a published tag. Fix forward with a new patch version.

## Documentation

Update the docs in the same PR as the code:

| When you change… | Update |
|---|---|
| Routes or URL states | `docs/ROUTES.md` |
| Structure, tokens or shared kit | `docs/ARCHITECTURE.md` |
| Anything user-visible | a line under `[Unreleased]` in `CHANGELOG.md` |
| A known gap (closed or found) | `docs/KNOWN_ISSUES.md` |
