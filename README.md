# Online Calculators (TI-84 + Graphing)

[![CI](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/ci.yml)
[![Release](https://github.com/rgoshen/ti-84/actions/workflows/release.yml/badge.svg)](https://github.com/rgoshen/ti-84/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A small multi-page site with two browser-based calculators:

- **TI-84 Calculator** — a familiar scientific/graphing calculator.
- **Graphing Calculator** — plot equations, stack multiple functions, mark whole-number gridline crossings, and zoom/pan, all in the browser.

The site is built with **Astro + TypeScript** — a shared layout and header wrap three
routes (`/` landing, `/ti-84`, `/graphing`), with the interactive graphing calculator
rendered as a React island (shadcn/ui on Tailwind v4).

## Tech stack

- **[Astro 7](https://astro.build/)** — static, content-focused multi-page site (`output: 'static'`).
- **[TypeScript](https://www.typescriptlang.org/)** (strict).
- **[Tailwind CSS v4](https://tailwindcss.com/)** via `@tailwindcss/vite`.
- **React + [shadcn/ui](https://ui.shadcn.com/)** — interactive UI as Astro islands (Radix primitives on Tailwind).
- **[function-plot](https://mauriciopoppe.github.io/function-plot/)** (D3-based plotting), **[mathjs](https://mathjs.org/)** (expression evaluation), **[KaTeX](https://katex.org/)** (equation rendering).
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
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run the Playwright end-to-end tests (added during the UI port). |

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
│   │   └── ui/                 # shadcn/ui primitives
│   ├── pages/                  # Routes: index (landing), ti-84, graphing
│   ├── scripts/graphing/
│   │   ├── math.ts             # Pure, framework-free math (tested)
│   │   ├── math.test.ts        # Vitest unit tests for the math core
│   │   └── plot.ts             # Framework-free function-plot wrapper
│   └── styles/global.css       # @import "tailwindcss" + theme tokens
├── public/favicon.svg          # Site icon
├── Dockerfile, nginx.conf      # Multi-stage build (Node build → nginx serves dist/)
├── docker-compose.yml          # Compose service with PUBLIC_* build args
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

The image is a **multi-stage build**: a `node:24-alpine` stage runs `npm ci` and
`npm run build`, then an `nginx:alpine` stage serves the static `dist/` output
(`nginx.conf` enables clean URLs via `try_files`, so `/ti-84` and `/graphing`
resolve without the `.html` suffix).

Site configuration (page titles, default theme, the TI-84 iframe source) is applied
at **build time** through `PUBLIC_*` environment variables — read by `src/config.ts`
via `import.meta.env` and baked into the static output. This replaces the old runtime
`envsubst` approach, so there is no entrypoint script.

```bash
# Build and run with the defaults.
docker compose up -d --build      # serves on http://localhost:8084
```

To override the defaults, copy `.env.example` to `.env` and edit the values, then
rebuild (the values are compiled in, so a rebuild is required for changes to apply):

```bash
cp .env.example .env
docker compose up -d --build
```

| Variable | Purpose | Default |
|---|---|---|
| `HOST_PORT` | Host port mapped to the container's port 80. | `8084` |
| `PUBLIC_SITE_TITLE_TI84` | Title/heading for the TI-84 page. | `TI-84 Calculator` |
| `PUBLIC_SITE_TITLE_GRAPHING` | Title/heading for the graphing page. | `Graphing Calculator Online` |
| `PUBLIC_TI84_IFRAME_SRC` | Source URL for the embedded TI-84 iframe. | `https://ti84calc.com/ti84calc` |
| `PUBLIC_THEME_DEFAULT` | First-visit theme (`dark` or `light`). | `dark` |

`HOST_PORT` is consumed by Compose's port mapping; the `PUBLIC_*` variables are
passed to the build as build args. The same image can be rebuilt per environment
with different titles, default theme, or iframe source.

## CI/CD & releases

- **CI** (`.github/workflows/ci.yml`) runs on every pull request: typecheck
  (`astro check`), unit tests (Vitest), build, and Playwright e2e.
- **Releases** are automated by
  [semantic-release](https://github.com/semantic-release/semantic-release) on
  merge to `main`: it reads the [Conventional Commits](https://www.conventionalcommits.org/)
  since the last release, computes the next SemVer (`feat` → minor, `fix` →
  patch, `!`/`BREAKING CHANGE` → major), publishes a **GitHub Release** with the
  `vX.Y.Z` tag (the release notes are the changelog), then builds and pushes the
  GHCR image. The git tag is the source of truth for the version; `package.json`'s
  version field is not auto-bumped. Release notes:
  [GitHub Releases](https://github.com/rgoshen/ti-84/releases).

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

2. **Branch protection** — configured as a repository ruleset on `main`: requires a
   pull request and the **`ci / verify`** status check, and blocks force-push and
   deletion (repository admins bypass). (Settings → Rules → Rulesets.)
3. **Package visibility** (after the first release, on the `ti-84` package page →
   Package settings): set to **Public** if you want anonymous `docker pull`.

## Contributing

Contributions are welcome — please read the [Contributing Guide](CONTRIBUTING.md)
for workflow and code-style details.

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com);
all rights to the embedded content belong to their respective owners. The project's
own source code is distributed under the [MIT License](LICENSE).
