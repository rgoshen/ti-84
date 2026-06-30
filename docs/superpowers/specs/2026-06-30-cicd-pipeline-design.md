# CI/CD Pipeline — Design

- **Date:** 2026-06-30
- **Status:** Approved (pre-implementation)
- **Repo:** `github.com/rgoshen/ti-84` → image `ghcr.io/rgoshen/ti-84`
- **Branch:** `feature/cicd-pipeline`

## Summary

Add a GitHub Actions CI/CD pipeline that, from the project's existing Conventional
Commits:

1. Gates every PR (and `main`) on typecheck + unit + build + e2e.
2. On merge to `main`, runs **semantic-release** (fully automatic) to compute the
   next SemVer, write `CHANGELOG.md`, bump `package.json`, create the `vX.Y.Z`
   git tag and a GitHub Release.
3. Builds a **multi-arch** (`linux/amd64,linux/arm64`) image from the existing
   Dockerfile and pushes it to **GHCR** with SemVer-derived tags.

## Decisions (locked)

- **Release flow:** semantic-release, fully automatic on push to `main` (no
  human gate). This means the release bot commits the version/changelog back to
  `main` — a deliberate, scoped exception to the repo's "no direct commits to
  main" rule (the commit carries `[skip ci]`).
- **CI gate:** full — `astro check` → `vitest run` → `astro build` → Playwright
  e2e, on every PR.
- **Image arch:** `linux/amd64` + `linux/arm64`.

## Architecture

Three workflows; the test gate is defined once and reused.

```
PR ──> ci.yml ──uses──> _verify.yml (the gate)

push main ──> release.yml
                ├─ verify   (uses _verify.yml)
                ├─ release  (needs verify) ── semantic-release ── tag vX.Y.Z + GitHub Release + CHANGELOG/version commit [skip ci]
                └─ publish  (needs release, if new_release_published) ── GHCR multi-arch build & push
```

**Why one workflow with sequenced jobs (not a separate tag-triggered publish):**
a tag pushed by `GITHUB_TOKEN` does not trigger another workflow (GitHub
anti-recursion), so an `on: push: tags` publish job would silently never run
without a PAT. Sequencing `release → publish` off the action's version output
avoids needing a PAT.

**Why `[skip ci]` matters:** semantic-release's `@semantic-release/git` commit to
`main` would otherwise re-trigger `release.yml`; the default `[skip ci]` in the
commit message suppresses that, preventing a release loop.

## Components

### `.github/workflows/_verify.yml` (reusable — `on: workflow_call`)
Steps: `actions/checkout@v4` → `actions/setup-node@v4` (node 24 to match the
Dockerfile's `node:24-alpine`, `cache: npm`) → `npm ci` → `npx astro check` →
`npx vitest run` → `npm run build` → cache + `npx playwright install --with-deps
chromium` → `npx playwright test`. `permissions: contents: read`.

### `.github/workflows/ci.yml` (`on: pull_request: [main]`)
Single job that `uses: ./.github/workflows/_verify.yml`. Concurrency group keyed
on the PR ref with `cancel-in-progress: true`. This is the branch-protection
required check.

### `.github/workflows/release.yml` (`on: push: branches: [main]`)
- `verify` job: `uses: ./.github/workflows/_verify.yml`.
- `release` job: `needs: verify`.
  - `permissions: { contents: write, issues: write, pull-requests: write, id-token: write }`.
  - `actions/checkout@v4` with `fetch-depth: 0` (semantic-release needs full history).
  - `actions/setup-node@v4` (node 24, `cache: npm`), `npm ci`.
  - `cycjimmy/semantic-release-action@v4` with `GITHUB_TOKEN`; outputs
    `new_release_published`, `new_release_version`, `new_release_git_tag`.
- `publish` job: `needs: release`, `if: needs.release.outputs.new_release_published == 'true'`.
  - `permissions: { contents: read, packages: write }`.
  - `actions/checkout@v4` at `ref: ${{ needs.release.outputs.new_release_git_tag }}`.
  - `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v4`.
  - `docker/login-action@v4` → `registry: ghcr.io`, `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}`.
  - `docker/metadata-action@v6` (see tags below).
  - `docker/build-push-action@v7`: `context: .`, `platforms: linux/amd64,linux/arm64`,
    `push: true`, `tags`/`labels` from metadata, `cache-from/to: type=gha`, and the
    `PUBLIC_*` build-args (Dockerfile defaults).

### GHCR tag strategy (`docker/metadata-action@v6`)
Fed the released tag via `value=`, since the workflow is triggered by the push to
`main`, not by the tag ref:
```yaml
images: ghcr.io/rgoshen/ti-84
flavor: latest=true            # publish == newest release
tags: |
  type=semver,pattern={{version}},value=${{ needs.release.outputs.new_release_git_tag }}
  type=semver,pattern={{major}}.{{minor}},value=${{ needs.release.outputs.new_release_git_tag }}
  type=semver,pattern={{major}},value=${{ needs.release.outputs.new_release_git_tag }},enable=${{ !startsWith(needs.release.outputs.new_release_git_tag, 'v0.') }}
  type=sha
```
For `v0.2.0` → `0.2.0`, `0.2`, `latest`, `sha-<short>` (bare-major `0` suppressed
on 0.x; `{{major}}` begins emitting `1` automatically at v1.0.0).

### `.releaserc.json`
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json", "package-lock.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```
`@semantic-release/npm` with `npmPublish: false` bumps `package.json` version
without publishing (project stays `private`). `commit-analyzer`,
`release-notes-generator`, `npm`, and `github` ship with semantic-release core;
`changelog` and `git` are added as devDeps.

### `package.json` devDependencies (pinned)
Add: `semantic-release`, `@semantic-release/changelog`, `@semantic-release/git`,
`@astrojs/check` (the last makes `astro check` work in `_verify`). Pin exact
versions; let Dependabot/maintenance bump them.

### `CHANGELOG.md`
Seed a minimal stub (title + note that it is auto-generated); semantic-release
appends each release. Coexists with the repo's `SUMMARY.md` (internal rationale
log) — different audiences.

### `README.md`
Add CI + release status badges and a "Container image" section:
`docker pull ghcr.io/rgoshen/ti-84:latest` and a `docker run -p 8080:80` example.

## Manual GitHub settings (documented, not codified)
1. **Branch protection on `main`:** require the `ci` status check to pass before
   merge. (Repo Settings → Branches.)
2. **GHCR package visibility:** the first publish creates a private package;
   set it public if anonymous pulls are wanted. (Package Settings → Change
   visibility.) The workflow needs no change either way.

## Error handling / edge cases
- **No releasable commits** (only `docs`/`chore`/`test`): `release` produces no
  version; `publish` is skipped via the `if` guard. Expected, not an error.
- **Release loop:** prevented by `[skip ci]` on the bot commit.
- **Broken `main`:** `verify` fails → `release`/`publish` never run → no
  release/image for a red main.
- **Pre-1.0 image tags:** bare-major `0` intentionally suppressed.
- **First run from 0.1.0:** the first `feat` →
  `0.2.0`; the first `fix` → `0.1.1`; a breaking change pre-1.0 →
  `0.2.0` per SemVer 0.x convention (commit-analyzer default).

## Verification (this infra task)
- `actionlint` over `.github/workflows/*.yml` (syntax + action-pinning lint).
- `npx semantic-release --dry-run` (with a token, locally or in a scratch run) to
  preview the next version + notes without releasing.
- Local `docker build --build-arg ...` to confirm the Dockerfile still builds.
- A JSON-validity check of `.releaserc.json`.
(End-to-end pipeline behavior is only fully observable once merged to `main`; the
above are the pre-merge confidence checks.)

## Files touched
- `.github/workflows/_verify.yml` *(new)*
- `.github/workflows/ci.yml` *(new)*
- `.github/workflows/release.yml` *(new)*
- `.releaserc.json` *(new)*
- `CHANGELOG.md` *(new, stub)*
- `package.json` / `package-lock.json` *(add devDeps)*
- `README.md` *(badges + image usage)*
- `docs/` *(this spec; plan to follow)*
