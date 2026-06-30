# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A GitHub Actions pipeline that gates PRs on the full test suite and, on merge to `main`, auto-versions via semantic-release (SemVer + CHANGELOG + GitHub Release) and publishes a multi-arch image to GHCR with SemVer tags.

**Architecture:** One reusable test gate (`_verify.yml`) called by `ci.yml` (PRs) and by `release.yml` (on `main`). `release.yml` sequences `verify → release (semantic-release) → publish (GHCR)`, where `publish` runs only when a release was cut and is fed the new version via the release job's outputs (no PAT, no tag-triggered second workflow).

**Tech Stack:** GitHub Actions; `cycjimmy/semantic-release-action@v6`; semantic-release plugins (commit-analyzer, release-notes-generator, changelog, npm[no-publish], git, github); `docker/metadata-action@v6` + `docker/build-push-action@v7` (buildx/QEMU, GHCR); `@astrojs/check`; existing Vitest + Playwright + multi-stage Dockerfile.

## Global Constraints

- **No red-green TDD here** — infra config is verified by `actionlint`, JSON-validity, `astro check`, and local `docker build` (each task ends with a concrete check + expected output). This substitutes for unit tests, which don't apply to workflow YAML.
- **Pin versions** — GitHub Actions pinned to majors from context7 (`checkout@v4`, `setup-node@v4`, `cache@v4`, `cycjimmy/semantic-release-action@v6`, `docker/login-action@v4`, `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v4`, `docker/metadata-action@v6`, `docker/build-push-action@v7`); `extra_plugins` pinned to exact versions; `@astrojs/check` installed with `--save-exact`.
- **No new app dependencies** beyond `@astrojs/check` (a devDep). semantic-release + plugins live in the action, not `package.json`.
- **Conventional Commits**; **no co-author / AI-generation trailers**.
- **GitFlow** — all work on `feature/cicd-pipeline` (already checked out). No direct commits to `main`.
- **Image name is lowercase**: `ghcr.io/rgoshen/ti-84`.
- **Node 24** in CI (matches the Dockerfile's `node:24-alpine`).

---

## File Structure

- `.github/workflows/_verify.yml` *(new)* — reusable gate: install → astro check → vitest → build → playwright e2e.
- `.github/workflows/ci.yml` *(new)* — `on: pull_request` → calls `_verify`.
- `.github/workflows/release.yml` *(new)* — `on: push: main` → `verify` → `release` → `publish`.
- `.releaserc.json` *(new)* — semantic-release config.
- `CHANGELOG.md` *(new, stub)* — auto-maintained thereafter.
- `package.json` / `package-lock.json` *(modify)* — add `@astrojs/check` devDep.
- `README.md` *(modify)* — badges, container-image usage, CI/CD & releases + manual settings.
- `SUMMARY.md` / `TODO.md` *(modify)* — record the feature.

Note on verification tooling: `actionlint` is the workflow linter. Install on macOS with `brew install actionlint` (one-time). If unavailable, fall back to a YAML-validity check: `python3 -c "import sys,yaml; [yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml` (requires PyYAML) — note in the report that full actionlint wasn't run.

---

## Task 1: semantic-release config, CHANGELOG stub, and `@astrojs/check`

**Files:**
- Modify: `package.json`, `package-lock.json` (add `@astrojs/check`)
- Create: `.releaserc.json`
- Create: `CHANGELOG.md`

**Interfaces:**
- Produces: `.releaserc.json` consumed by `cycjimmy/semantic-release-action@v6` in Task 3; `astro check` made runnable for Task 2's `_verify`.

- [ ] **Step 1: Install `@astrojs/check` (pinned exact)**

Run: `npm install --save-dev --save-exact @astrojs/check`
Expected: `package.json` `devDependencies` gains `"@astrojs/check": "<exact version>"`, lockfile updated. (`typescript` is already a devDep.)

- [ ] **Step 2: Verify `astro check` now runs**

Run: `npx astro check`
Expected: it runs to completion and reports `0 errors` (warnings about `baseUrl` deprecation are acceptable). If it reports type errors, STOP and report — that's a pre-existing issue to surface, not something to silence here.

- [ ] **Step 3: Create `.releaserc.json`**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      { "changelogFile": "CHANGELOG.md" }
    ],
    [
      "@semantic-release/npm",
      { "npmPublish": false }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json", "package-lock.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

- [ ] **Step 4: Create `CHANGELOG.md` stub**

```markdown
# Changelog

All notable changes to this project are documented in this file. It is generated
automatically by [semantic-release](https://github.com/semantic-release/semantic-release)
from [Conventional Commits](https://www.conventionalcommits.org/) — do not edit by hand.
```

- [ ] **Step 5: Verify `.releaserc.json` is valid JSON**

Run: `python3 -m json.tool .releaserc.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .releaserc.json CHANGELOG.md
git commit -m "ci: add semantic-release config and astro check dependency"
```

---

## Task 2: Reusable verify workflow + CI workflow

**Files:**
- Create: `.github/workflows/_verify.yml`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes (from Task 1): `astro check` runnable.
- Produces: `_verify.yml` (reusable, `workflow_call`, job id `verify`) consumed by `ci.yml` and by Task 3's `release.yml`.

- [ ] **Step 1: Create `.github/workflows/_verify.yml`**

```yaml
name: Verify

on:
  workflow_call:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npx astro check

      - name: Unit tests
        run: npx vitest run

      - name: Build
        run: npm run build

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright (chromium)
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npx playwright test
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    uses: ./.github/workflows/_verify.yml
```

- [ ] **Step 3: Lint the workflows**

Run (install actionlint first if needed: `brew install actionlint`):
`actionlint .github/workflows/_verify.yml .github/workflows/ci.yml`
Expected: no output (exit 0). If `actionlint` isn't installed and can't be, run the PyYAML fallback from the file-structure note and record that in the report.

- [ ] **Step 4: Sanity-check the gate commands locally (they must already pass)**

Run: `npx astro check && npx vitest run && npm run build`
Expected: astro check `0 errors`; vitest `28 passed`; build succeeds. (These mirror the workflow steps; the e2e step is exercised by the existing suite — no need to re-run here.)

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/_verify.yml .github/workflows/ci.yml
git commit -m "ci: add reusable verify gate and PR CI workflow"
```

---

## Task 3: Release workflow (semantic-release + GHCR publish)

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes (from Task 2): `./.github/workflows/_verify.yml`.
- Consumes (from Task 1): `.releaserc.json`.
- Produces: the release + GHCR publish pipeline. No symbols consumed downstream.

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  verify:
    uses: ./.github/workflows/_verify.yml

  release:
    name: Release
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    outputs:
      published: ${{ steps.release.outputs.new_release_published }}
      git_tag: ${{ steps.release.outputs.new_release_git_tag }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: true

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Semantic Release
        id: release
        uses: cycjimmy/semantic-release-action@v6
        with:
          extra_plugins: |
            @semantic-release/changelog@6.0.3
            @semantic-release/git@10.0.1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  publish:
    name: Publish image to GHCR
    needs: release
    if: needs.release.outputs.published == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout released tag
        uses: actions/checkout@v4
        with:
          ref: ${{ needs.release.outputs.git_tag }}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Log in to GHCR
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/rgoshen/ti-84
          flavor: latest=true
          tags: |
            type=semver,pattern={{version}},value=${{ needs.release.outputs.git_tag }}
            type=semver,pattern={{major}}.{{minor}},value=${{ needs.release.outputs.git_tag }}
            type=semver,pattern={{major}},value=${{ needs.release.outputs.git_tag }},enable=${{ !startsWith(needs.release.outputs.git_tag, 'v0.') }}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Note: no `build-args` are passed — the Dockerfile's `PUBLIC_*` defaults already are the production values (they match `docker-compose.yml`). Add a `build-args:` block later only if a release needs non-default config.

- [ ] **Step 2: Lint the workflow**

Run: `actionlint .github/workflows/release.yml`
Expected: no output (exit 0). (If `actionlint` flags the `${{ }}` inside the `tags` heredoc as an expression-in-string, that is expected for metadata-action and is not an error; only fix real syntax errors. Use the PyYAML fallback if actionlint is unavailable, and say so.)

- [ ] **Step 3: Confirm the Dockerfile still builds (single-arch sanity for the publish job)**

Run: `docker build -t ti-84:cicd-check .`
Expected: build succeeds through both stages (this is what the `publish` job runs, multi-arch). Clean up: `docker image rm ti-84:cicd-check`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow with semantic-release and GHCR publish"
```

---

## Task 4: README badges + image usage + CI/CD docs + SUMMARY/TODO

**Files:**
- Modify: `README.md`
- Modify: `SUMMARY.md`, `TODO.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Add status badges to the top of `README.md`**

Place directly under the main title (adjust if badges already exist there):

```markdown
[![CI](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml)
[![Release](https://github.com/rgoshen/ti-84/actions/workflows/release.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/release.yml)
```

- [ ] **Step 2: Add a "Container image" section to `README.md`**

```markdown
## Container image

Released images are published to the GitHub Container Registry, built for
`linux/amd64` and `linux/arm64`:

```bash
docker pull ghcr.io/rgoshen/ti-84:latest      # newest release
docker pull ghcr.io/rgoshen/ti-84:0.2         # latest 0.2.x
docker pull ghcr.io/rgoshen/ti-84:0.2.0       # exact version
docker run --rm -p 8080:80 ghcr.io/rgoshen/ti-84:latest   # http://localhost:8080
```
```

- [ ] **Step 3: Add a "CI/CD & releases" section to `README.md`**

```markdown
## CI/CD & releases

- **CI** (`.github/workflows/ci.yml`) runs on every pull request: typecheck
  (`astro check`), unit tests (Vitest), build, and Playwright e2e.
- **Releases** are automated by
  [semantic-release](https://github.com/semantic-release/semantic-release) on
  merge to `main`: it reads the [Conventional Commits](https://www.conventionalcommits.org/)
  since the last release, computes the next SemVer (`feat` → minor, `fix` →
  patch, `!`/`BREAKING CHANGE` → major), updates `CHANGELOG.md`, bumps
  `package.json`, creates the `vX.Y.Z` tag + GitHub Release, then builds and
  pushes the GHCR image.

### One-time repository settings

These are GitHub settings, not files:

1. **Branch protection** (Settings → Branches → add rule for `main`): require the
   status check **`ci / verify`** to pass before merging.
2. **Package visibility** (after the first release, on the `ti-84` package page →
   Package settings): set to **Public** if you want anonymous `docker pull`.
```

- [ ] **Step 4: Append entries to `SUMMARY.md` and `TODO.md`**

Read the last ~20 lines of each to match the existing format, then append:
- `TODO.md`: a `## [2026-06-30] Feature: CI/CD pipeline (semantic-release + GHCR)` entry (Objective / Approach / Tests / Risks), referencing the spec `docs/superpowers/specs/2026-06-30-cicd-pipeline-design.md`.
- `SUMMARY.md`: a `## [2026-06-30 HH:MM] Commit Summary` entry (Change Type: CI; Scope: GitHub Actions / release automation) describing the reusable gate, semantic-release auto-versioning + changelog, and multi-arch GHCR publishing.

- [ ] **Step 5: Verify markdown link/badge formatting**

Run: `grep -nE 'actions/workflows/(ci|release)\.yml/badge\.svg|ghcr\.io/rgoshen/ti-84' README.md`
Expected: the two badge URLs and the `ghcr.io/rgoshen/ti-84` references are present and well-formed.

- [ ] **Step 6: Commit**

```bash
git add README.md SUMMARY.md TODO.md
git commit -m "docs(ci): document CI/CD pipeline, GHCR usage, and release settings"
```

---

## Task 5: Finish the branch

- [ ] **Step 1: Final local verification** — `npx astro check && npx vitest run && npm run build` all green; all workflow files lint clean; `docker build` succeeds.
- [ ] **Step 2: Finish** — invoke `superpowers:finishing-a-development-branch`. Recommend opening a **pull request** for this one (not a local merge): the whole point is to see `ci.yml` run on the PR, and the first `release.yml` run happens when the PR merges to `main`. After merge, confirm the first release + GHCR image, then apply the two one-time repo settings from the README.

---

## Self-Review

**Spec coverage:**
- Reusable `_verify` + `ci.yml` + `release.yml` (verify→release→publish) → Tasks 2, 3.
- semantic-release config (changelog, npm no-publish, git `[skip ci]`, github) → Task 1 Step 3.
- cycjimmy@v6 + `extra_plugins` pinned + outputs → Task 3 Step 1.
- GHCR multi-arch + semver/latest/sha tags + v0 major suppression → Task 3 Step 1 (metadata-action).
- `@astrojs/check` devDep → Task 1 Steps 1–2.
- CHANGELOG stub → Task 1 Step 4.
- README badges + image usage + branch-protection/visibility docs → Task 4.
- Verification (actionlint, JSON validity, astro check, docker build) → Tasks 1–3 verify steps.
- Manual GitHub settings → Task 4 Step 3 (documented, as the spec requires).

**Placeholder scan:** none — every file's full content is inline; doc-entry steps name the exact sections/format.

**Consistency:** job id `verify` in `_verify.yml` is referenced consistently; `release` job `outputs.published`/`outputs.git_tag` are defined in Task 3 Step 1 and consumed in the same file's `publish` job; image name `ghcr.io/rgoshen/ti-84` is identical across `release.yml` and README; `node-version: 24` matches the Dockerfile across both `_verify.yml` and `release.yml`.
