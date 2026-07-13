# Online Math Tools (TI-84, Graphing, Explorers)

[![CI](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml)
[![Release](https://github.com/rgoshen/ti-84/actions/workflows/release.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A small multi-page site with four browser-based math tools:

- **TI-84 Calculator** — a familiar scientific/graphing calculator.
- **Graphing Calculator** — plot equations, stack multiple functions, mark whole-number gridline crossings, and zoom/pan, all in the browser.
- **Function Explorer** — an interactive limits & asymptotes explorer: type any function, drag a point along the curve (it pins to the window edge near a vertical asymptote instead of clipping), animate limits toward auto-detected walls and ±∞, and read the behaviour in arrow notation. It's the first entry in a new **Explorers** section for interactive concept tools.
- **Transformation Explorer** — choose a parent function, adjust a/b/h/k, compare the parent and transformed graphs, and inspect the resulting equation, domain, range, intercepts, asymptotes, and value table.

The site is built with **Astro + TypeScript** — a shared layout and header wrap the
routes (`/` landing, `/ti-84`, `/graphing`, and the `/explorers` hub plus its two tools),
with the graphing calculator and both explorers rendered as React islands (shadcn/ui
on Tailwind v4).

## Tech stack

- **[Astro 7](https://astro.build/)** — static, content-focused multi-page site (`output: 'static'`).
- **[TypeScript](https://www.typescriptlang.org/)** (strict).
- **[Tailwind CSS v4](https://tailwindcss.com/)** via `@tailwindcss/vite`.
- **React + [shadcn/ui](https://ui.shadcn.com/)** — interactive UI as Astro islands (Radix primitives on Tailwind).
- **[function-plot](https://mauriciopoppe.github.io/function-plot/)** (D3-based plotting), **[mathjs](https://mathjs.org/)** (expression evaluation), **[KaTeX](https://katex.org/)** (equation rendering).
- **[html-to-image](https://github.com/bubkoo/html-to-image)** and **[jsPDF](https://github.com/parallax/jsPDF)** — client-side, one-file PNG/PDF graph exports.
- **[Vitest](https://vitest.dev/)** (unit) and **[Playwright](https://playwright.dev/)** (end-to-end) for tests.

## Prerequisites

- **[Node.js](https://nodejs.org/) ≥ 24** and npm (for development and builds).
- **[Docker](https://www.docker.com/)** (only needed for containerized deployment).

## Development

```bash
npm install        # install pinned dependencies
npm run dev         # start the Astro dev server (http://localhost:4321)
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload. |
| `npm run build` | Build the static site to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the Vitest unit tests once. |
| `npm run test:coverage` | Run Vitest with V8 coverage. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run the Playwright end-to-end tests (added during the UI port). |
| `npm run test:e2e:visual` | Compare downloaded graph PNGs with approved baselines. |
| `npm run test:e2e:update-snapshots` | Intentionally replace the three approved export baselines. |

## Exporting graph results

After plotting a function, use **Export** in the Graphing Calculator, Function
Explorer, or Transformation Explorer and choose **Download PNG** or **Download PDF**.
Each action creates one content-only artifact containing the fixed desktop graph,
equations, current window, tool-specific analysis, and up to nine representative
whole-number values. Controls and navigation are omitted, and exports always use a
light presentation palette even when the site is dark or opened on mobile.

The Graphing Calculator and Function Explorer show color-coded Function Details below
their live graphs and reuse those exact facts in exports. The Transformation Explorer
uses the same domain/range strings in its live comparison and export. Common parents,
degree-two-or-lower polynomials, and supported reciprocal powers such as `1/x^2` show
exact global properties where values can be rendered without loss; rounded derived
values are labeled `Approx.`. Unsupported global domain or range renders
`Not determined` rather than using viewport samples. Numerical visible-window
analysis remains available for crossings and vertical asymptotes, with explicit
scope. Properties proven not applicable are omitted. Domain and range use interval
notation where appropriate, such as `(-∞, ∞)`, `[0, ∞)`, and
`(-∞, 0) ∪ (0, ∞)`; a constant range uses singleton-set notation such as `{3}`.

PNG downloads preserve the wide 1,440px artifact. PDF downloads fit the same content
within margins on one standard Letter landscape page. The embedded TI-84 does not
support exports. Filenames include the user's local date and 24-hour time through
seconds, for example `graphing-calculator-2026-07-12-181530.png`.

### Reviewing export baselines

`npm run test:e2e:visual` is read-only. It compares the actual downloaded PNG from
each supported graph tool with the reviewed files under
`tests/e2e/__snapshots__/export-visual.spec.ts/`. A mismatch fails with expected,
actual, and diff evidence under the ignored `test-results/` directory; subsequent
test-generated PNGs are never committed.

Use `npm run test:e2e:update-snapshots` only after an intentional export-design
change. Review all three replacement PNGs visually before committing them. Ordinary
`npm run test:e2e` and CI runs never update approved images.

## Project structure

```
.
├── astro.config.mjs            # Astro config (static output, Tailwind Vite plugin)
├── tsconfig.json               # Extends astro/tsconfigs/strict
├── vitest.config.ts            # Vitest via astro/config getViteConfig
├── package.json                # Pinned dependencies + scripts
├── src/
│   ├── config.ts               # Build-time site config (reads PUBLIC_* env vars)
│   ├── layouts/Base.astro      # Shared HTML shell: head, theme bootstrap, header, main
│   ├── components/
│   │   ├── Header.astro        # Sticky nav + theme toggle
│   │   ├── graphing/           # GraphingCalculator React island
│   │   ├── explorer/           # Function + Transformation Explorer islands
│   │   ├── export/             # Shared artifact + export controller
│   │   └── ui/                 # shadcn/ui primitives
│   ├── pages/                  # Routes: index, ti-84, graphing, explorers/*
│   ├── scripts/
│   │   ├── graphing/           # Pure math + function-plot wrapper (math/plot/theme/hover .ts) + tests
│   │   ├── explorer/           # Pure explorer domain logic + function-plot renderers
│   │   └── export/             # Pure export contract + PNG/PDF adapters
│   └── styles/global.css       # @import "tailwindcss" + theme tokens
├── public/favicon.svg          # Site icon
├── Dockerfile, nginx.conf      # Multi-stage build (Node build → nginx serves dist/)
├── docker-compose.yml          # One service: pulls the GHCR release, or builds with --build
├── TODO.md, SUMMARY.md         # Plan and change log
└── README.md
```

## Container image

Released images are published to the GitHub Container Registry, built for
`linux/amd64` and `linux/arm64`:

```bash
docker pull ghcr.io/rgoshen/ti-84:latest      # newest release
docker pull ghcr.io/rgoshen/ti-84:0.2         # latest 0.2.x
docker pull ghcr.io/rgoshen/ti-84:0.2.0       # exact version
docker run --rm -p 8080:80 ghcr.io/rgoshen/ti-84:latest   # http://localhost:8080
```

## Deployment (Docker)

`docker-compose.yml` covers both ways to run the site — **pulling the release** or
**building your working tree** — and which one you get is decided by `--build`:

```bash
docker compose up -d                # PULL the released image from GHCR  → http://localhost:8084
docker compose up -d --build        # BUILD from this working tree instead
TAG=0.2.1 docker compose up -d      # pull an exact release (default: latest)
```

The service sets both `image:` and `build:`, so `image:` acts as the pull source *and* as
the tag a local build is stamped with — no separate "pull" compose file is needed.
`pull_policy: always` keeps the two from colliding: a `--build` overwrites the local tag,
and without it the next plain `up -d` would silently reuse that stale build instead of the
release. The trade-off is that a plain `up -d` needs network; use `--build` offline.

The image itself is a **multi-stage build**: a `node:24-alpine` stage runs `npm ci` and
`npm run build`, then an `nginx:alpine` stage serves the static `dist/` output
(`nginx.conf` enables clean URLs via `try_files`, so `/ti-84` and `/graphing`
resolve without the `.html` suffix).

### Configuration

Site configuration (page titles, default theme, the TI-84 iframe source) is applied
at **build time** through `PUBLIC_*` environment variables — read by `src/config.ts`
via `import.meta.env` and baked into the static output. This replaces the old runtime
`envsubst` approach, so there is no entrypoint script.

Because the values are compiled in, the `PUBLIC_*` overrides only take effect on the
`--build` path; the released image is built by CI with the defaults. To customise them,
copy `.env.example` to `.env`, edit, and rebuild:

```bash
cp .env.example .env
docker compose up -d --build
```

| Variable | Purpose | Default |
|---|---|---|
| `HOST_PORT` | Host port mapped to the container's port 80. | `8084` |
| `TAG` | Which released image a plain `up -d` pulls (`latest`, `0.2`, `0.2.1`). | `latest` |
| `PUBLIC_SITE_TITLE_TI84` | Title/heading for the TI-84 page. | `TI-84 Calculator` |
| `PUBLIC_SITE_TITLE_GRAPHING` | Title/heading for the graphing page. | `Graphing Calculator Online` |
| `PUBLIC_SITE_TITLE_EXPLORERS` | Title/heading for the Explorers hub page. | `Explorers` |
| `PUBLIC_SITE_TITLE_FUNCTION_EXPLORER` | Title/heading for the Function Explorer page. | `Function Explorer` |
| `PUBLIC_SITE_TITLE_TRANSFORMATION_EXPLORER` | Title/heading for the Transformation Explorer page. | `Transformation Explorer` |
| `PUBLIC_TI84_IFRAME_SRC` | Source URL for the embedded TI-84 iframe. | `https://ti84calc.com/ti84calc` |
| `PUBLIC_THEME_DEFAULT` | First-visit theme (`dark` or `light`). | `dark` |

`HOST_PORT` and `TAG` are consumed by Compose directly; the `PUBLIC_*` variables are
passed to the build as build args. The same image can be rebuilt per environment
with different titles, default theme, or iframe source.

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

1. **Seed the version baseline** (once, before the first release): semantic-release
   starts a fresh project at `1.0.0` unless a baseline tag exists. To keep this
   project on 0.x, tag the current release point and push it:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

   After this, the first `feat` merged to `main` releases `0.2.0` and the first
   `fix` releases `0.1.1`. (Already done for this repo — `v0.1.0` is pushed.)

2. **Release token (`RELEASE_TOKEN`)** — required so semantic-release can commit
   `CHANGELOG.md` + the version bump back to the protected `main`. Create a
   **fine-grained PAT** (Settings → Developer settings → Personal access tokens →
   Fine-grained tokens) scoped to the `ti-84` repository with **Repository
   permissions → Contents: Read and write** (Metadata: Read is included
   automatically), then add it as an **Actions secret named `RELEASE_TOKEN`**
   (Settings → Secrets and variables → Actions). The release workflow then
   authenticates as you (a repo admin), which is what lets its commit bypass the
   ruleset. Release comments are disabled so the token needs no Issues/PR scope.
3. **Branch protection** — configured as a repository ruleset on `main`: requires a
   pull request and the **`ci / verify`** status check, and blocks force-push and
   deletion (repository admins bypass). (Settings → Rules → Rulesets.)
4. **Package visibility** (after the first release, on the `ti-84` package page →
   Package settings): set to **Public** if you want anonymous `docker pull`.

## Contributing

Contributions are welcome — please read the [Contributing Guide](CONTRIBUTING.md)
for workflow and code-style details.

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com);
all rights to the embedded content belong to their respective owners. The project's
own source code is distributed under the [MIT License](LICENSE).
