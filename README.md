# Online Calculators (TI-84 + Graphing)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A small multi-page site with two browser-based calculators:

- **TI-84 Calculator** — a familiar scientific/graphing calculator.
- **Graphing Calculator** — plot equations, stack multiple functions, mark whole-number gridline crossings, and zoom/pan, all in the browser.

> **⚠️ Migration in progress.** This project is moving from single-file static HTML
> to an **Astro + TypeScript** site (React islands + shadcn/ui for the interactive
> UI, Tailwind v4 for styling). What is done and what is pending is tracked in
> [`TODO.md`](TODO.md). Today the toolchain, the unit-tested math core, and a
> landing page are in place; the calculator UI port and the Docker cutover are
> still underway. The legacy static pages (`index.html`, `graphing.html`) remain in
> the repo until each page is ported.

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
│   ├── pages/                  # Routes: index (landing), ti-84, graphing
│   ├── styles/global.css       # @import "tailwindcss"
│   └── scripts/graphing/
│       ├── math.ts             # Pure, framework-free math (tested)
│       └── math.test.ts        # Vitest unit tests for the math core
├── index.html, graphing.html   # Legacy static pages (being ported, then removed)
├── Dockerfile, docker-compose.yml  # Deployment (multi-stage cutover pending)
├── TODO.md, SUMMARY.md         # Plan and change log
└── README.md
```

## Deployment (Docker)

The container is being moved to a **multi-stage build** — a Node stage runs
`npm run build`, and an `nginx:alpine` stage serves the static `dist/` output.
Site configuration (titles, default theme, the TI-84 iframe source) moves from
the old runtime `envsubst` approach to **build-time** Astro environment variables.

Until that cutover lands, the existing `Dockerfile` / `docker-compose.yml` still
build and serve the **legacy static pages**. See [`TODO.md`](TODO.md) for status.

## Contributing

Contributions are welcome — please read the [Contributing Guide](CONTRIBUTING.md)
for workflow and code-style details.

## License

This project embeds a third-party calculator from [ti84calc.com](https://ti84calc.com);
all rights to the embedded content belong to their respective owners. The project's
own source code is distributed under the [MIT License](LICENSE).
