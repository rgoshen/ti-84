## [2026-06-29 17:00] Commit Summary

**Change Type:** Feature
**Scope:** Website + Docker

**Summary:**
Added a single-page website (`index.html`) embedding the TI-84 online calculator in an iframe with a light/dark theme toggle (Tailwind CSS via CDN, persisted to localStorage). Packaged with an Nginx Alpine Dockerfile for one-command hosting. Added README, .gitignore, and TODO documentation.

**Rationale:**
Static site with CDN Tailwind keeps the project simple and dependency-free while still offering a polished, theme-aware UI. Nginx Alpine image is tiny and reliable for serving static content.

**References:**
- TODO.md: 2026-06-29 TI-84 Calculator Website with Theme Toggle and Docker

## [2026-06-29 17:10] Commit Summary

**Change Type:** Docs
**Scope:** README + CONTRIBUTING

**Summary:**
Enhanced README.md with status badges, screenshot placeholders (light/dark), a Contributing section, and an updated project structure. Added CONTRIBUTING.md describing the GitHub Flow workflow, commit conventions, code style, testing expectations, PR checklist, and issue reporting. Added a docs/ folder with a README explaining screenshot capture.

**Rationale:**
A professional README with badges and screenshots makes the project more discoverable and trustworthy. A dedicated CONTRIBUTING.md lowers the barrier for contributors and enforces consistent workflows and commit messages.

**References:**
- README.md: badges, screenshots, contributing link
- CONTRIBUTING.md: GitHub Flow + Conventional Commits

## [2026-06-29 17:20] Commit Summary

**Change Type:** Docs
**Scope:** Docker instructions

**Summary:**
Updated all `docker run` commands across README.md, CONTRIBUTING.md, and docs/README.md to use `--name graphing-calculator` so the container has a predictable name instead of Docker's random generated name. Added stop/remove instructions to the README.

**Rationale:**
A named container is easier to stop, remove, and reference in scripts/logs than a random container name. Keeps the developer experience consistent and predictable.

**References:**
- README.md: Running locally with Docker
- CONTRIBUTING.md: Getting Started

## [2026-06-29 17:30] Commit Summary

**Change Type:** Docs
**Scope:** Docker instructions

**Summary:**
Added the `-d` (detached/headless) flag to all `docker run` commands in README.md, CONTRIBUTING.md, and docs/README.md so the container runs in the background. Added a note explaining detached mode and a `docker logs` command for viewing container output.

**Rationale:**
Detached mode is the standard way to run a long-lived web server container without blocking the terminal. Surfacing the logs command makes the headless workflow complete.

**References:**
- README.md: Running locally with Docker

## [2026-06-29 17:40] Commit Summary

**Change Type:** Docs
**Scope:** TODO.md planning

**Summary:**
Added a planned-feature entry to TODO.md for a custom equation graphing calculator (type an equation, render it, stack multiple equations on the same graph until cleared). Documented the recommended approach (static site + Tailwind + lightweight plotting lib such as Function Plot, no MUI/React migration) along with risks and tradeoffs.

**Rationale:**
Capturing the roadmap decision now preserves the stack rationale (avoid MUI + Tailwind dual-styling clash; defer React migration) and gives a concrete plan to execute against when implementation begins.

**References:**
- TODO.md: Planned Feature — Custom Equation Graphing Calculator

## [2026-06-29 17:50] Commit Summary

**Change Type:** Docs
**Scope:** TODO.md roadmap

**Summary:**
Added a planned-feature entry to TODO.md for an AI step-by-step math solver: user submits a math problem, an LLM returns structured JSON steps (expression + explanation), and the frontend renders an ordered steps panel. Documented approach (static frontend + separate API layer for key security, MathJax/LaTeX rendering, reuse theme toggle), tests (manual + backend unit tests + eval set), risks (backend dependency, cost/latency, hallucinations, key security, model choice), and dependencies (API layer decision; coordinate styling with the graphing calculator feature).

**Rationale:**
Logging the AI solver alongside the graphing calculator captures the full roadmap and the shared infrastructure decisions (avoid React/MUI, introduce a minimal API layer, keep static frontend). Preserves rationale for when implementation begins.

**References:**
- TODO.md: Planned Feature — AI Step-by-Step Math Solver

## [2026-06-29 18:00] Commit Summary

**Change Type:** Feature
**Scope:** Website — navigation + Graphing Calculator Online page

**Summary:**
Added a shared navigation menu to index.html with two options (TI-84, Graphing Calculator Online). Created graphing.html containing the provided marketing content for the Graphing Calculator Online, structured into themed sections (intro, why use, key features, how to use) with cards, lists, and ordered steps. Both pages share the light/dark theme toggle and persist theme choice via localStorage. Updated the Dockerfile to copy all *.html files so Nginx serves both pages. Updated README, docs/README, and TODO/SUMMARY accordingly.

**Rationale:**
A shared nav turns the single-page site into a small themed multi-page experience with consistent styling and theme behavior. Copying all HTML files via a glob keeps the Dockerfile simple while supporting multiple pages. The Graphing Calculator Online page is content-only for now; the interactive equation plotting feature remains planned in TODO.md.

**References:**
- index.html, graphing.html

## [2026-06-29 18:30] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator Online page

**Summary:**
Replaced the text-only graphing.html with a fully functional online graphing calculator. Uses Function Plot (D3-based, ~30KB, via CDN) to plot equations entered by the user. Supports stacking multiple equations on the same axes (each gets a distinct color and a removable chip in the list), a Clear all control, manual window/domain controls, and native zoom/pan (scroll + drag). The plot re-themes (background, grid, axes, text) when the light/dark toggle changes. The descriptive marketing content from the prior version is preserved inside a collapsible "About" details section below the calculator.

**Rationale:**
The previous version misinterpreted the requirement as a content page. This commit delivers the actual interactive graphing calculator that was requested, while keeping the static-site + CDN approach (no React/build step). Function Plot was chosen for its small size and native support for multiple functions, zoom, and pan.

**References:**
- TODO.md: Custom Equation Graphing Calculator (now implemented)

## [2026-06-29 19:00] Commit Summary

**Change Type:** Feature
**Scope:** Graphing Calculator Online — usability improvements

**Summary:**
Four improvements to the interactive graphing calculator:
1. Dark mode line visibility — explicitly set each function line's stroke color and width (2.5px) after Function Plot renders, so curves stay visible against the dark background.
2. Per-equation color picker — the color swatch in the plotted-equations list is now a label wrapping a hidden native `<input type="color">`; clicking it opens the OS color picker and re-themes that equation's line, swatch, and table header live.
3. Value table — added a table below the graph showing y values evaluated at every whole-number x in the current window (one column per plotted equation, color-coded to match the graph). Uses math.js (CDN) for safe expression evaluation (no eval).
4. Show points with shape — each equation has a "Show points" checkbox and a shape selector (circle / square / triangle). When enabled, points are drawn on the graph at each integer x using the equation's color and chosen shape via a custom SVG overlay.

**Rationale:**
Dark mode lines were invisible because Function Plot's default styling faded against the dark SVG background; forcing stroke color per equation fixes it deterministically. Native color input gives a familiar, accessible picker with zero dependencies. The table and points features were explicitly requested and use math.js to evaluate expressions safely and consistently with the graph.

**References:**
- TODO.md: Custom Equation Graphing Calculator

## [2026-06-29 19:30] Commit Summary

**Change Type:** Feature
**Scope:** Docker / configuration

**Summary:**
Added docker-compose.yml with sensible default environment variables (HOST_PORT, SITE_TITLE_TI84, SITE_TITLE_GRAPHING, THEME_DEFAULT, TI84_IFRAME_SRC). Added .env.example documenting all variables. Refactored the Docker image to use a docker-entrypoint.sh that runs envsubst over the HTML templates at container start, so env vars actually flow into the served pages (titles, default theme, iframe source). Updated index.html and graphing.html to use ${VAR} placeholders for those values. Updated README with a Compose quick-start, a variables table, a .env example, and the plain docker run equivalent. .gitignore now excludes .env and .env.local while .env.example stays tracked.

**Rationale:**
Docker Compose gives a one-command, reproducible local run with named-container and port defaults baked in. Routing env vars through envsubst (vs. a static COPY) means the same image can be reused across environments (dev/staging/prod) with different titles, default themes, or iframe sources without rebuilding. Keeping .env out of version control protects any real overrides while .env.example documents the contract.

**References:**
- docker-compose.yml, .env.example, Dockerfile, docker-entrypoint.sh
- index.html, graphing.html (env var placeholders)

## [2026-06-29 19:45] Commit Summary

**Change Type:** Fix
**Scope:** Docker Compose port mapping

**Summary:**
Removed the stray `HOST_PORT: ${HOST_PORT:-8084}` entry from the docker-compose `environment` block, which had a conflicting default (8084) and was never used by the container (nginx listens on port 80). The external port is controlled solely by the `ports` mapping `${HOST_PORT:-8080}:80`. Also removed the unused `HOST_PORT` ENV default from the Dockerfile for consistency.

**Rationale:**
The dead `HOST_PORT` env var created an inconsistent default (8084 vs 8080) and confused the actual port mapping, which reads from `ports:`. The container has no use for `HOST_PORT` — only the host-side `ports` mapping matters. Single source of truth restores the exposed port.

**References:**
- docker-compose.yml, Dockerfile

## [2026-06-29 19:50] Commit Summary

**Change Type:** Fix
**Scope:** Docker Compose default port

**Summary:**
Restored the default host port to 8084 in docker-compose.yml (`${HOST_PORT:-8084}:80`), .env.example, and all docs (README, CONTRIBUTING, docs/README). The previous "fix" wrongly reverted to 8080; 8084 was intentional because 8080 is already in use on the host.

**Rationale:**
Respect the user's explicit port choice. 8084 is the project default going forward.

**References:**
- docker-compose.yml, .env.example, README.md, CONTRIBUTING.md, docs/README.md

## [2026-06-29 19:55] Commit Summary

**Change Type:** Docs
**Scope:** README — .env instructions

**Summary:**
Added a "Overriding defaults with a .env file" subsection to the README with explicit step-by-step instructions: copy .env.example to .env, edit values, run docker compose up -d (which reads .env automatically), and recreate the container for changes to apply. Added a tip about inline single-value overrides and noted that .env is gitignored.

**Rationale:**
The README referenced .env.example without explaining the copy/edit/run workflow, leaving users to guess. Explicit steps remove the ambiguity.

**References:**
- README.md: Overriding defaults with a .env file

## [2026-06-29 20:00] Commit Summary

**Change Type:** Fix
**Scope:** Theme default logic

**Summary:**
Simplified the theme-default logic in index.html and graphing.html. Removed the dead `|| (systemDark ? 'dark' : 'light')` branch that confused the source of the default. Now: `defaultTheme = '${THEME_DEFAULT}' || 'dark'`, then `theme = stored || defaultTheme`. A user's previously saved localStorage theme is honored; the env THEME_DEFAULT applies on first visit (or after clearing localStorage). Verified served HTML contains the correct substituted default.

**Rationale:**
The previous expression was syntactically valid but had a dead branch that obscured the real default source. Clarifying it makes the env-var flow obvious and confirms THEME_DEFAULT reaches the page correctly. The user-reported light-mode issue was caused by a previously saved localStorage value, not by the env var failing to apply — this is the intended, documented behavior (user choice wins).

**References:**
- index.html, graphing.html (theme init script)
- README.md: THEME_DEFAULT row

## [2026-06-29 20:15] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — dark mode lines + pretty-printed equations

**Summary:**
1. Dark mode line visibility — rewrote applyThemeToPlot to force each function line's stroke to the equation color, stroke-width 3px, fill none, opacity 1. Added a fallback that targets any non-axis/non-grid path when Function Plot's g.content groups aren't found. Lines are now clearly visible against the dark SVG background.
2. Pretty-printed equations — added KaTeX (CSS + JS, CDN) and used math.js's node.toTex() to render the equation label in the plotted-equations list and the value-table header as proper math notation (e.g. y = x², y = sin(x)) instead of plain monospace text. Falls back to plain text if KaTeX or math.js fails to load. Added a small style block so KaTeX inherits the equation's color and stays compact in both locations.

**Rationale:**
The prior g.content selector was unreliable across Function Plot versions, leaving some lines invisible in dark mode. Forcing stroke properties on every function path (with a fallback) is deterministic. Pretty-printing was explicitly requested and uses the already-loaded math.js to convert expressions to LaTeX, so no extra parsing logic is needed.

**References:**
- graphing.html: applyThemeToPlot, prettyExpr, renderList, renderTable

## [2026-06-29 20:20] Commit Summary

**Change Type:** Revert
**Scope:** Graphing Calculator — function-line forcing

**Summary:**
Reverted the function-line forcing logic added in the previous commit (the g.content selector, the fallback path-targeting block, and the stroke-width 3 / fill none / opacity 1 overrides). applyThemeToPlot now only themes background, axis/tic strokes, grid color, and text fill — leaving function line styling to Function Plot's defaults. KaTeX pretty-printing from the prior commit is retained.

**Rationale:**
The function-line forcing changes were not the requested fix and may have interfered with Function Plot's rendering. The actual reported issue is grid-line visibility in dark mode, which is a separate concern to be addressed next.

**References:**
- graphing.html: applyThemeToPlot

## [2026-06-29 20:30] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — axes, points, triangles

**Summary:**
1. Bold origin axes — added drawOriginAxes() that draws x=0 (vertical) and y=0 (horizontal) lines at 2px stroke on top of the plot, themed to the axis color, only when 0 is within the current x/y domain. The rest of the grid stays thinner.
2. Inverse points fix — reversed the yScale range from [padT, height-padB] to [height-padB, padT] because SVG y grows downward. Points were being plotted at the mirrored y-coordinate; now they sit on the actual function curve.
3. Triangles fix — switched the triangle marker from a <polygon> (whose points attribute was rendering unreliably) to a <path> with an explicit M/L/L/Z d attribute, slightly enlarged so triangles render reliably.

**Rationale:**
SVG coordinate space has y increasing downward, so a d3 scale mapping yMin→top and yMax→bottom inverts the plot. Reversing the range aligns pixel positions with the math. The origin axes are a standard graphing-calculator convention (the x and y axes should be more prominent than grid lines). The polygon→path switch makes triangle rendering deterministic across browsers.

**References:**
- graphing.html: getYScale, drawOriginAxes, makeMarker

## [2026-06-29 20:45] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — points/axes alignment with Function Plot

**Summary:**
Replaced the hardcoded padding constants (padL/padR/padT/padB) in getXScale/getYScale with a new readAxisTicks() function that reads Function Plot's actual rendered x/y axis tick values and pixel positions from the SVG, then builds d3 scales from those real positions. Updated drawOriginAxes to derive its line endpoints from the scales (xScale(state.xMin/Max), yScale(state.yMin/Max)) instead of hardcoded padding. Points overlay and bold origin axes now align with Function Plot's own axes. Kept the hardcoded-padding scales only as a fallback if ticks can't be read.

**Rationale:**
The points and origin axes were offset from the real plot because Function Plot's internal margins differ from the guessed 35/20/20/35 padding. Reading the actual tick transforms from the rendered SVG makes the overlay scales match the plot exactly, including after zoom/pan and window changes.

**References:**
- graphing.html: getXScale, getYScale, readAxisTicks, drawOriginAxes

## [2026-06-29 20:50] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — bold grid axes

**Summary:**
Replaced the overlay origin-axis lines (`drawOriginAxes`) with a new `boldGridAxes()` function that finds Function Plot's existing grid lines at x=0 and y=0 and increases their stroke-width to 2px. The x/y axis grid lines now stand out bolder than the rest of the coordinate grid, matching standard graphing calculator conventions. Uses the same `readAxisTicks()` from the previous commit to locate the zero-position ticks accurately.

**Rationale:**
The previous approach drew new lines on top, but the request was to make the *existing* grid lines bolder. Restyling Function Plot's actual grid lines is cleaner and matches the visual intent exactly.

**References:**
- graphing.html: boldGridAxes, applyThemeToPlot

## [2026-06-29 20:55] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — point markers off the curve

**Summary:**
Appended the `.points-overlay` group into Function Plot's `<g class="canvas">` group instead of the SVG root (`drawPointsOverlay`). Markers now share the curve's coordinate space.

**Rationale:**
Function Plot draws the curve inside `<g class="canvas" transform="translate(40,20)">`. The overlay's pixel scales (`getXScale`/`getYScale`) are derived from axis ticks measured in that canvas-local space, but the overlay was being appended to the SVG root — outside the margin — so every marker was offset from the curve by exactly the canvas margin (~1.2 x-units left, ~0.4 y-units up at the default window).

**Bug Fix Context:**
Root cause: a two-coordinate-space mismatch. Earlier alignment commits fixed the scale's *slope* (reading real ticks) but never the *origin offset*, which lives in the parent `g.canvas` transform the tick-reader doesn't traverse. Verified in a headless browser: the vertex of y=2x² aligns to dy=0 and every marker is ≤1px from the rendered curve.

**References:**
- graphing.html: drawPointsOverlay
- TODO.md: Fix + Feature: Point markers on the curve at whole-number gridline crossings


## [2026-06-29 20:58] Commit Summary

**Change Type:** Feature
**Scope:** Graphing Calculator — markers at whole-number gridline crossings

**Summary:**
Added `gridlineCrossings(expr)` and a `bisect()` root-finder, and rewired `drawPointsOverlay` to plot a marker at every point where the curve crosses a whole-number gridline within the window — integer x (direct evaluation) or integer y (solve f(x)=k by sampling f once and bisecting at sign changes). Points are de-duplicated, clipped to the window, and capped at 200 per equation. `integerXs()` is retained for the value table.

**Rationale:**
Per the requested rule, a marker should appear wherever the curve meets a whole-number line — e.g. (-1, 0.5) (integer x) and (-0.5, 1) (integer y) — but not where it meets neither (e.g. (-0.5, 0.5)). Integer-y crossings generally occur at irrational x (2x²=1 at x=±0.707), so they are found by numerical root-finding rather than enumeration. Sampling f once per equation and reusing it across all k-lines keeps the cost low.

**Tests:**
Verified headless (Playwright/MCP) for 2x², -0.5x, sin(x): every marker lies on the curve (y≈f(x)), every marker has integer x OR integer y, none have both coordinates fractional, all fall inside the window. Known limitation: tangent gridline touches (e.g. sin peaks at y=±1) are not marked because sign-change detection requires a crossing.

**References:**
- graphing.html: gridlineCrossings, bisect, drawPointsOverlay
- TODO.md: Fix + Feature: Point markers on the curve at whole-number gridline crossings


## [2026-06-29 21:10] Commit Summary

**Change Type:** Fix
**Scope:** Graphing Calculator — keep point markers on the curve during zoom/pan

**Summary:**
Captured the Function Plot instance in `renderPlot` (as `plotInstance`) and subscribed to its `all:zoom` event. New `syncOverlayToView()` reads the live domain from `plotInstance.meta.xScale/yScale` after each interactive zoom/pan, mirrors it into `state`, updates the Window input boxes (`syncWindowInputs()`), and redraws the overlay + value table. Throttled with `requestAnimationFrame`; it does not call `renderPlot`, which would reset the user's zoom.

**Bug Fix Context:**
Root cause: Function Plot's interactive scroll-zoom and drag-pan (bound to its `rect.zoom-and-drag` via d3-zoom) redraw the curve and axes internally but never re-run our separate point overlay, and `state` was never updated to the new domain. So markers froze in place and drifted off the curve (~12px after a single wheel zoom, worse with more zoom). Subscribing to the library's own zoom event and re-syncing from its live scales keeps the two render passes in lockstep. Verified headless: marker-to-curve distance stays ≤ ~2px through zoom and pan.

**References:**
- graphing.html: renderPlot, syncOverlayToView, syncWindowInputs, plotInstance
- TODO.md: Fix: Keep point markers on the curve through zoom/pan


## [2026-06-29 21:24] Commit Summary

**Change Type:** Feature (build/tooling)
**Scope:** Astro + TypeScript migration — Phase 0 scaffold + tested math core

**Summary:**
Introduced an Astro 7 + TypeScript (strict) + Tailwind v4 (@tailwindcss/vite) project alongside the existing static HTML, with pinned dependency versions. Added Vitest (via astro/config getViteConfig) and a placeholder landing page. Extracted the graphing calculator's pure math into a typed, framework-free module `src/scripts/graphing/math.ts` (evalAt, integerXs, bisect, gridlineCrossings) and covered it with 11 unit tests written test-first (RED → GREEN). `npm run build` and `npm test` both pass.

**Rationale:**
Per the agreed migration (real product; incremental; tests-first; keep function-plot), Phase 0 stands up the toolchain and Phase 1 begins by isolating the correctness-critical math so it is unit-testable independent of the DOM/plot library and reusable from the upcoming React island. The math module is a faithful, typed port of the verified logic in graphing.html. Interactivity decision updated to React islands + shadcn/ui (no MUI); the old TODO.md anti-React/MUI notes predate this route and are superseded.

**Tests:**
Vitest: 11 passing — gridlineCrossings rule (integer x OR integer y, none both-fractional, on-curve, in-window, de-dup), bisect root-finding, evalAt, integerXs.

**References:**
- package.json, astro.config.mjs, tsconfig.json, vitest.config.ts, src/styles/global.css, src/pages/index.astro
- src/scripts/graphing/math.ts, src/scripts/graphing/math.test.ts
- TODO.md: Migration: Static HTML → Astro + TypeScript (Phase 0 + 1)

## [2026-06-29 21:52] Commit Summary

**Change Type:** Feature
**Scope:** Graphing calculator — React island (Astro port)

**Summary:**
Ported graphing.html into a React island. Added `src/scripts/graphing/plot.ts` (framework-free function-plot wrapper: render, point overlay, theme, throttled zoom/pan sync), `src/components/graphing/GraphingCalculator.tsx` (shadcn/ui controls, equation list, window panel, value table; KaTeX labels with plain-text fallback), `src/pages/graphing.astro` (dark, KaTeX CSS, `client:only="react"`), plus `playwright.config.ts` and `tests/e2e/graphing.spec.ts`. Reuses the tested `@/scripts/graphing/math` unchanged. `npm run build`, `npm test` (11), and the Playwright e2e all pass. Not committed — left in working tree for review.

**Rationale:**
Point-on-curve alignment is achieved by appending the overlay into function-plot's `g.canvas` and positioning markers with the instance's own `meta.xScale`/`yScale` (no tick-reading), and zoom/pan stays in sync by reading the live domain in a rAF-throttled `all:zoom` handler that redraws the overlay and reports the new view via `onViewChange` (never recreating the plot). Plot recreation is keyed to [equations, appliedWindow, dark]; the zoom-mirrored displayWindow feeds only the value table + window inputs.

**Bug Fix Context (if applicable):**
function-plot is CommonJS (`exports.default = functionPlot`); the ESM default import resolved to a namespace wrapper under Vite/esbuild dev (TypeError: functionPlot is not a function). Normalized the import to the callable (`.default ?? default`), verified working in both dev and production builds.

**References:**
- src/scripts/graphing/plot.ts, src/components/graphing/GraphingCalculator.tsx, src/pages/graphing.astro
- playwright.config.ts, tests/e2e/graphing.spec.ts
- TODO.md: Graphing Calculator React Island (Astro port)

## [2026-06-29 22:10] Commit Summary

**Change Type:** Feature
**Scope:** Astro migration Phase 2 — shared shell, pages, Docker cutover, legacy removal

**Summary:**
Completed the Astro migration. Added `src/config.ts` (build-time site config reading
`import.meta.env.PUBLIC_*` with safe fallbacks — replaces the old Docker `envsubst`
vars). Added a shared shell: `src/layouts/Base.astro` (full HTML doc, favicon link,
pre-paint inline theme bootstrap via `define:vars`, `bg-background text-foreground`
body, `<Header />` + centered `<main class="mx-auto max-w-6xl px-6 py-8">`) and
`src/components/Header.astro` (sticky nav with Home/TI-84/Graphing, `aria-current`
active state from `Astro.url.pathname`, sun/moon theme toggle that persists
`localStorage.theme`). Rebuilt all three pages on Base: `index.astro` (hero + two
cards), new `ti-84.astro` (lazy-loaded iframe from `TI84_IFRAME_SRC`), and
`graphing.astro` (now just Base + KaTeX CSS + the island, standalone `<html>`/header
removed). Added `public/favicon.svg` (parabola-on-axes glyph). Made the graphing
island theme-reactive: `dark` is now state updated by a `MutationObserver` on the
`<html>` `class` attribute, so the header toggle re-themes the plot. Docker cutover:
multi-stage `Dockerfile` (`node:24-alpine` build → `nginx:alpine` serve `dist/`) with
`PUBLIC_*` build args; new `nginx.conf` (clean URLs via `try_files $uri $uri/
$uri.html`); `docker-compose.yml` switched from runtime `environment:` to
`build.args`; deleted `docker-entrypoint.sh`. Updated `.env.example` to the `PUBLIC_*`
build-arg contract. Removed the legacy `index.html` and `graphing.html`. Updated
README (removed the migration callout, refreshed the structure tree, rewrote the
Docker section), docs/README link, TODO checklist/status. `npm run build` emits `/`,
`/ti-84`, `/graphing`; `npm test` green (11). Not committed — left in the working tree.

**Rationale:**
Build-time `PUBLIC_*` config keeps the site fully static (no entrypoint/`envsubst`
layer) while preserving per-environment overrides via Docker build args. A single
Base layout + Header removes the duplicated `<html>`/header that each legacy page
carried, and centralizes the theme bootstrap so there is no light/dark flash. The
MutationObserver makes the previously read-once `dark` flag track the live theme so
the new header toggle actually re-themes the plot, with no change to the plot effect
(which already depends on `dark`).

**References:**
- src/config.ts, src/layouts/Base.astro, src/components/Header.astro
- src/pages/index.astro, src/pages/ti-84.astro, src/pages/graphing.astro
- src/components/graphing/GraphingCalculator.tsx (theme-reactive `dark`)
- public/favicon.svg
- Dockerfile, nginx.conf, docker-compose.yml, .env.example (deleted docker-entrypoint.sh)
- Deleted: index.html, graphing.html
- README.md, docs/README.md, TODO.md
- TODO.md: Migration: Static HTML → Astro + TypeScript (Phase 2)


## [2026-06-29 22:30] Commit Summary

**Change Type:** Fix
**Scope:** Docker/nginx — /ti-84 and /graphing navigation broke behind the published port

**Summary:**
nginx served `/ti-84/index.html`, so a request to `/ti-84` (no trailing slash) got a 301 to add the slash. nginx built that redirect as an ABSOLUTE URL using its internal listen port (`:80`, omitted as the http default), ignoring the published port (`:8084`) — so the Location was `http://localhost/ti-84/` (port 80), where nothing listens. Clicking the TI-84/Graphing card or nav item followed it to a dead URL (a Chrome error page). Worse, it was a permanent 301, so browsers cached it. Fix in `nginx.conf`: serve the directory index directly with `try_files $uri $uri/index.html $uri.html =404;` (no trailing-slash redirect at all) and `absolute_redirect off;` as defense. Now `/ti-84` and `/graphing` return 200 directly on the correct port; real 404s preserved.

**Bug Fix Context:**
Root cause = nginx absolute-redirect behind a port mapping, confirmed via `curl -I` (Location: http://localhost/ti-84/ → after fix: 200, no redirect). Already-affected browsers must hard-refresh once to drop the cached 301.

**References:**
- nginx.conf: try_files + absolute_redirect


## [2026-06-29 22:34] Commit Summary

**Change Type:** Feature
**Scope:** Graphing calculator — restore bold zero-axis gridlines

**Summary:**
Ported graphing.html's `boldGridAxes` into `plot.ts` as `boldZeroAxes`. With `grid: true`, function-plot 1.25.4 draws gridlines as the axis tick lines (no separate `g.grid`), so we bold the line of the "0" tick in each of `g.x.axis` / `g.y.axis`. Called on initial render and re-applied in the `all:zoom` handler (function-plot recreates the axes on each gesture), alongside a theme re-apply so axis/grid/text colors also survive zoom.

**Rationale:**
The x=0 / y=0 axes should stand out from the grid (standard graphing-calculator convention) — a feature from the original that was deferred during the React port. The earlier `g.grid line` approach found nothing under function-plot 1.25.4; inspecting the live SVG showed the 0 tick's line spans the plot (x-axis 0-tick y2=-520, y-axis 0-tick x2=662), so bolding that line is the correct, version-accurate fix.

**Tests:**
Verified headless: the "0" tick line has stroke-width 2 in both axes while others are default, and it persists after a wheel-zoom.

**References:**
- src/scripts/graphing/plot.ts: boldZeroAxes, renderGraph zoom handler


## [2026-06-29 22:36] Commit Summary

**Change Type:** Test
**Scope:** Graphing e2e — zoom regression test + robust webServer

**Summary:**
Extracted the on-curve measurement into a `maxMarkerToCurvePx(page)` helper and added a second Playwright test that drives function-plot's scroll-zoom (wheel on `rect.zoom-and-drag`), then asserts the markers are still on the curve (≤5px) and the x-min window input changed (the view tracked the zoom). Switched the playwright webServer from `npm run dev` to `npm run build && npm run preview` with `reuseExistingServer: false`.

**Bug Fix Context:**
`npm run dev` is unreliable as an e2e webServer because Astro 7 keeps a persistent dev-server daemon: the command detects "already running" and exits, so Playwright reports "webServer exited early," and a stale daemon serves old content (the page had no `#eq-input`, both tests timed out). `preview` has no daemon and serves the fresh production build; `reuseExistingServer: false` prevents reusing a stray server. Both tests pass.

**References:**
- tests/e2e/graphing.spec.ts, playwright.config.ts


## [2026-06-30 12:38] Commit Summary

**Change Type:** Fix
**Scope:** Graphing — dark-mode plot theming (grid + bold axes)

**Summary:**
Made the dark-mode graph legible: gridlines are now clearly visible and the x=0/y=0 origin cross reads as a bold axis, matching light mode. Extracted plot colours + colour math into a new pure module `src/scripts/graphing/theme.ts` (`themeColors`, `hexToRgb`, `blendOver`, `relativeLuminance`, `lineContrast`, `lineDelta`); `ThemeColors` gained `gridOpacity` and `axisOpacity`. `applyThemeToPlot` now recolours function-plot's `.x.origin`/`.y.origin` cross and overrides both stroke and opacity on gridlines. Added a Vitest contrast suite and a dark-mode e2e guard. Light theme reproduces function-plot's defaults exactly and is unchanged.

**Rationale:**
The bug had two distinct mechanisms, both found by probing the live SVG rather than guessing: (1) the visible axis cross is function-plot's `.origin` paths, painted **solid black @ 0.2 opacity** and never themed — fine as `#ccc` on white, invisible on the dark background; (2) gridlines are pinned to `opacity: 0.1`, where colour alone can't lift a near-black background, so the dark grid sat ~9/255 from its background (fainter than light's). Fixing required theming `.origin` and raising dark opacities, not swapping hex values. Splitting the palette into a DOM-free module makes the contrast decisions unit-testable in node (no browser/jsdom) and keeps `applyThemeToPlot` as the single DOM-mutation seam.

**Bug Fix Context:**
Root cause: `applyThemeToPlot`'s selectors (`.tic path, .axis path, .axis line, .grid, text`) excluded `.origin`, and the `.grid` selector matched nothing, so the origin cross kept function-plot's hardcoded black and gridlines kept the 0.1 default opacity. Fix: dark grid → slate-400 @0.24, origin → slate-300 (`#cbd5e1`) @0.55; light unchanged. Verified: contrast unit tests go red→green, dark/light screenshots confirm the hierarchy, full Vitest (20) and Playwright (3) suites pass, production build succeeds, types clean.

**References:**
- src/scripts/graphing/theme.ts (new), src/scripts/graphing/theme.test.ts (new)
- src/scripts/graphing/plot.ts (applyThemeToPlot, themeColors import)
- tests/e2e/graphing.spec.ts (dark-mode rendering test)
- TODO.md: 2026-06-30 Fix: Dark-mode plot grid + bold axes legibility

## [2026-06-30 14:45] Commit Summary

**Change Type:** Feature
**Scope:** Graphing — hover coordinate readout

**Summary:**
Added a floating coordinate tooltip that appears when hovering the plot. Two modes: hovering a discrete "Show points" marker shows that marker's exact (x, y); hovering along a curve shows the computed (x, y) on the nearest curve. Pure `hover.ts` module (`HoverInfo` type, named constants, `formatNumber`, `nearestWithinThreshold` — node-testable). `plot.ts` gains `attachHoverReadout`, a rAF-throttled hover handler that snap-hits discrete markers within 8px, else the nearest curve within 20px pixel-y, emits via new `onHover` callback, and suppresses the tooltip for 150ms after zoom/pan. `GraphingCalculator.tsx` holds `hover` state and renders `CoordTooltip` (position: fixed, clamped to plot bounds, themed). function-plot's native crosshair (`.inner-tip`) is suppressed via a persistent CSS rule in `global.css`.

**Rationale:**
Keeps coordinate math in a node-testable pure module (no DOM/function-plot dependency), separates the plot's hover handler as a single, focused seam (`attachHoverReadout`), and renders the tooltip as a React component so theming is automatic and the text color never regresses below WCAG AA (curve color is a visual swatch only, never text). The pure-helpers split allows unit-testing `formatNumber` and `nearestWithinThreshold` without a browser. Gesture suppression (rAF throttle + 150ms post-zoom blackout) prevents tooltip flicker during interactive pan/zoom. Test coverage is deep: unit tests on the pure functions, plus e2e on both snap-to-marker and curve-hover modes, pointer-leave, native-tip suppression, and color-contrast a11y.

**References:**
- Spec: `docs/superpowers/specs/2026-06-30-hover-coordinate-tooltip-design.md`
- Plan: `docs/superpowers/plans/2026-06-30-hover-coordinate-tooltip.md`
- Files: `src/scripts/graphing/hover.ts`, `src/scripts/graphing/hover.test.ts`, `src/scripts/graphing/plot.ts`, `src/components/graphing/GraphingCalculator.tsx`, `src/styles/global.css`, `tests/e2e/graphing.spec.ts`
- Unit tests: 20 passing (11 math + 3 theme + 6 hover)
- E2E tests: 8 passing (native-tip suppression, dot-hover, curve-hover, pointer-leave, a11y)

## [2026-06-30 22:40] Commit Summary

**Change Type:** CI
**Scope:** GitHub Actions / release automation

**Summary:**
Added GitHub Actions CI/CD pipeline: `.github/workflows/ci.yml` (runs on every PR: astro check, vitest, build, playwright e2e), reusable `.github/workflows/_verify.yml` (invoked post-release to prevent race conditions), and `.github/workflows/release.yml` (triggered on main: semantic-release handles versioning, changelog, tag, and pushes multi-arch GHCR image). Added `.releaserc.json` (semantic-release config). Documented in README.md: new "Container image" section (pull commands for ghcr.io/rgoshen/ti-84) and "CI/CD & releases" section with one-time GitHub settings (branch protection, package visibility).

**Rationale:**
A mature, automated release pipeline reduces manual effort and human error, and Conventional Commits + semantic-release are industry standard for language-agnostic projects. Multi-arch GHCR publishing makes the image accessible across dev and production hardware. A reusable _verify gate ensures the release artifact is tested before publish, closing a window where the tag and image could diverge.

**References:**
- Spec: `docs/superpowers/specs/2026-06-30-cicd-pipeline-design.md`
- TODO.md: 2026-06-30 Feature: CI/CD pipeline (semantic-release + GHCR)

## [2026-07-04 19:15] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — theme palette

**Summary:**
Added `explorerColors(dark)` + the `ExplorerColors` interface to `src/scripts/graphing/theme.ts` — the overlay palette (curve, wall, floor, arrow, point, pointStroke) for the new Function Explorer, with a dark (bright chart hues on near-black) and light (original reciprocal-square palette on white) variant. Extended `theme.test.ts` (TDD, red→green): curve/wall/floor/arrow each clear 3:1 non-text contrast (WCAG 1.4.11) against the plot background in both themes, the point is visible against the background, and its halo separates it from the curve. Also scaffolded the feature docs: TODO.md entry and `docs/superpowers/specs/2026-07-04-function-explorer-design.md`.

**Rationale:**
Palette + contrast math lives in the single already-tested `theme.ts` module (its stated charter) rather than a new file, so all colour decisions stay in one WCAG-validated place. Full-opacity overlay marks are held to the 3:1 non-text threshold in both themes so the explorer is legible in dark mode — the app's known weak spot.

**References:**
- Design: `docs/superpowers/specs/2026-07-04-function-explorer-design.md`
- TODO.md: 2026-07-04 Feature: Function Explorer (limits & asymptotes)
- Plan slice 1 of 11

## [2026-07-04 19:20] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — branch geometry (anti-teleport fix)

**Summary:**
Added pure, node-tested `src/scripts/explorer/branch.ts` (+ `branch.test.ts`, 24 tests, TDD): `branchOf` (the open interval between neighbouring walls/window edges), `pinToWindow` (the off-page clamp reporting top/bottom/undefined status), `clampDragX` (**the core bug fix** — a drag stays inside the branch it's on and can never cross a vertical asymptote to the other side; a branch narrower than 2·epsilon collapses to its midpoint [G11]), and `resolveX` (re-seats the point off a new pole / back in-window when the function or window changes [G4]). All in data coordinates on `poles: number[]`, decoupled from asymptote detection.

**Rationale:**
The user's headline requirement — "drag toward the wall pins at the edge and never teleports to the other branch" — is isolated into a single pure function (`clampDragX`) reused by the drag, slider, and animation sweeps, so it's fixed in exactly one tested place. Branch logic needs only wall x-positions, not their blow-up signs, so it takes `number[]` and stays independent of `limits.ts`.

**References:**
- Design: `docs/superpowers/specs/2026-07-04-function-explorer-design.md`
- Plan slices 2–3 of 11

## [2026-07-04 19:27] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — asymptote & limit detection

**Summary:**
Added pure `src/scripts/explorer/limits.ts` (+ `limits.test.ts`, 10 tests, TDD): `findVerticalAsymptotes` (three candidate signals — reciprocal sign-change for odd poles, null-gap and same-sign local-|f|-peak for even poles — merged, then confirmed by a divergence probe that rejects removable/jump discontinuities), `classifyEndBehavior` (finite / posInf / negInf / unknown as x→±∞), and `classifyOneSided`. Verified: 1/x² (even, both →+∞), 1/x (odd, ∓∞), tan(x) (two walls, +∞/−∞), x² (none), sin(x)/x (removable → rejected).

**Bug Fix Context:**
Initial `blowupFactor=10` (bigMag = 10·windowHeight) missed shallow residue-1 poles like 1/x on a tall window — a pole's nearest-sample magnitude is ~1/dx (sampling-bound), not height-bound. Lowered to 3; the divergence probe, not the candidate gate, is the real false-positive filter.

**Rationale:**
`evalAt` returns null for both undefined points and non-finite results, so a pole and a domain edge are indistinguishable from one sample — the growth-probe separates them. Kept fully pure/node-tested so the heuristic thresholds are pinned by tests.

**References:**
- Design: `docs/superpowers/specs/2026-07-04-function-explorer-design.md`
- Plan slice 4 of 11

## [2026-07-04 19:29] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — limit-sweep path

**Summary:**
Added `sweepX(t, sweep, w, poles, epsilon)` + the `Sweep` type to `branch.ts` (+4 tests, 28 total). Given animation progress t∈[0,1], returns the leading x that walks across the relevant branch toward its target — a wall (`approach`, stopping at a∓epsilon) or a window edge (`end`, x→±∞) — routed through the same `clampDragX` so the walk can never cross a wall out of its branch.

**Rationale:**
Reusing `clampDragX` for the animation (not just the drag) means the "never cross a wall" guarantee holds for the limit sweeps too, from one tested source.

**References:**
- Plan slice 5 of 11

## [2026-07-04 19:31] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — arrow-notation readout

**Summary:**
Added pure `src/scripts/explorer/notation.ts` (+ `notation.test.ts`, 8 tests, TDD): `describeReadout(ReadoutInput)` and the `formatApproach`/`formatInfinity`/`formatLimitValue`/`toSuperscript` formatters. Precedence: nearest wall within the wall band (one-sided arrow from its blow-up sign, tie-break smaller x) → x-edge end-behaviour message → plain `f(x)=value`. A pinned-off-screen point renders `→ ∞`/`→ −∞` instead of a clipped number; an `unknown` tail gets a neutral "keeps oscillating" note, not a false arrow. Reuses `formatNumber` from `hover.ts`.

**Rationale:**
This is both the teaching payload and the accessible text (destined for an aria-live region), so it's a pure function with the display precedence pinned by tests — the DOM layer just renders its two strings. Full unit suite now 86 green.

**References:**
- Plan slice 6 of 11

## [2026-07-04 19:33] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — shared plot helpers + Slider primitive

**Summary:**
Exported the reusable low-level helpers from `src/scripts/graphing/plot.ts` (`SVG_NS`, `NumericScale`, `asNumericScale`, `applyThemeToPlot`, `boldZeroAxes`) so the explorer renderer can share them (visibility-only; `renderGraph` behaviour unchanged). Added `src/components/ui/slider.tsx` — a shadcn (new-york) `Slider` wrapper over the already-installed `radix-ui` `Slider` primitive (no new dependency), keyboard-accessible out of the box. `astro check` clean (33 files).

**Rationale:**
DRY — the explorer reuses the graphing calculator's SVG theming + scale-narrowing instead of duplicating them. The exports are non-breaking; correctness is guarded by the existing graphing unit/e2e suites plus the typecheck (and the explorer's own upcoming e2e).

**References:**
- Plan slices 7–8 of 11

## [2026-07-04 19:42] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — renderer, island, and Explorers section

**Summary:**
Added the DOM/integration layer and wired it into a new **Explorers** section. `src/scripts/explorer/render.ts`: a function-plot wrapper (`disableZoom:false`) that draws the SVG overlay (draggable point, one-polyline sweep trail + arrowhead, dashed walls / up-to-two floors) into `g.canvas` via the live D3 scales, re-syncs on `all:zoom`, and exposes `pointerToData`/`localOf` for hit-testing. `src/components/explorer/FunctionExplorer.tsx`: the React island — MutationObserver theme sync, `appliedWindow`/`displayWindow` split, memoised asymptote/end-behaviour scans, **pointer arbitration** (capture-phase pointerdown on the point grabs it and blocks function-plot's pan; elsewhere pans; wheel zooms), a decoupled rAF sweep loop (cancelled on rebuild/zoom/manual interaction), `prefers-reduced-motion` support, a coalesced `role="status"` aria-live readout, and shadcn controls incl. the new keyboard `Slider`. Added routes `src/pages/explorers/{index,function}.astro`, `SITE_TITLE_EXPLORERS`/`SITE_TITLE_FUNCTION_EXPLORER` config, a Header "Explorers" link with child-route active state, and a home-page card (grid widened to 3 up).

**Rationale:**
The reuse boundary stays at the logic layer — this DOM code just renders decisions from the pure, tested modules. Keeping zoom/pan (user's choice) let the explorer reuse the graphing calculator's `all:zoom` re-sync and window-mirroring almost verbatim; the arbitration is the only genuinely new interaction.

**Verification:**
Built (5 pages) and driven headless: 0 console errors; point renders and pins; `1/x^2` → walls/floor + `x→0⁻/0⁺/±∞` buttons; the `x → 0⁺` sweep animates and **stops at +0.04 (a+ε), pinned to the top edge — never crossing the wall**; readout settles to `x → 0⁺, f(x) → ∞`; `tan(x)` → two walls at ±1.571 with per-side buttons. Screenshot confirms dark-mode rendering.

**References:**
- Plan slices 9–10 of 11

## [2026-07-04 19:47] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer — end-to-end tests

**Summary:**
Added `tests/e2e/explorer.spec.ts` (7 Playwright tests): default `1/x^2` renders with the four auto-detected limit buttons; **the anti-teleport bug fix via a real mouse drag** (grab the point, drag 400px past the wall — reported x stays ≥ 0, never jumps branch, and pins to the top edge); a limit sweep animates and stops on the correct side; **pointer arbitration** (a drag on the point moves it without panning, a drag on the background pans the window); asymptote detection follows the function (`tan(x)` → per-side wall buttons, `x^2` → none); the aria-live status region carries the arrow text and the slider is keyboard-operable; and the Explorers nav link is `aria-current` on the explorer page.

**Rationale:**
Playwright's real pointer events exercise the capture-phase arbitration and `setPointerCapture` path that a synthetic `dispatchEvent` can't — so the drag-vs-pan and anti-teleport guarantees are verified against the actual library, not a mock.

**Verification:**
Full suite green — 86 Vitest unit + 15 Playwright e2e (7 explorer + 8 graphing); the shared `Header.isActive` change did not regress existing nav/e2e.

**References:**
- Plan slice 11 of 11

## [2026-07-04 19:50] Commit Summary

**Change Type:** Docs
**Scope:** README, TODO, Docker/env config

**Summary:**
Updated documentation for the Function Explorer: README now lists three tools (adds the Function Explorer + Explorers section), the routes, an updated project-structure tree (`components/explorer/`, `scripts/explorer/`), and two new env rows. Wired `PUBLIC_SITE_TITLE_EXPLORERS` and `PUBLIC_SITE_TITLE_FUNCTION_EXPLORER` through the Dockerfile (ARG/ENV), docker-compose build args, and `.env.example` so the documented Docker overrides are real. Marked the TODO.md feature entry Done with the verification summary.

**Rationale:**
Keep the docs accurate to the shipped feature — the README's Docker env table must match what the build actually accepts.

**References:**
- TODO.md: 2026-07-04 Feature: Function Explorer (limits & asymptotes)

## [2026-07-04 19:55] Commit Summary

**Change Type:** Fix
**Scope:** Function Explorer — limit-sweep pacing

**Summary:**
Added an ease-out (cubic) to `sweepX` so a limit animation decelerates as it nears the target. Previously the sweep moved linearly in x; because a curve blows up steeply right beside a wall, the point rode the gentle far part of the curve for almost the whole animation and only reached the window edge in the final frame, so the along-the-edge travel to the asymptote was a single invisible flick. With ease-out, the near-wall x-slice (where the point pins to the edge and glides to the wall) now occupies ~45% of the animation. New unit test pins the pacing (87 Vitest total).

**Bug Fix Context:**
Reported: "when in animation mode, when it hits the window edge it should stop [rising] but continue along the window edge until it hits the asymptote." Root cause was pacing, not geometry — the point already pinned and slid correctly (verified by frame sampling), but linear-in-x timing compressed the edge-glide from ~110ms to imperceptible. Ease-out redistributes the time to the interesting segment. Verified by re-sampling the trajectory headless: 7 of 14 frames now pinned at the edge, gliding from x≈0.39 to x≈0.04.

**References:**
- Plan slice 5 (sweepX) — follow-up refinement

## [2026-07-04 20:53] Commit Summary

**Change Type:** Fix
**Scope:** Function Explorer — no default function + stop-at-window-edge interaction

**Summary:**
Two user-requested corrections. (1) **No default function** — the explorer now starts empty (no hardcoded `1/x^2`); controls are disabled and the plot shows only axes until the user plots a function. (2) **The point stops at the window edge** instead of pinning-and-sliding along it to the asymptote. Introduced `src/scripts/explorer/visible.ts` (+ `visible.test.ts`, 10 tests): `visibleRange` (the on-screen curve segment within a branch), `clampToVisible` (drag/slider stop at the edge crossing), `sweepEndpoints` (animate to the edge, then stop), `resolveVisibleX` (re-seat onto the visible curve). This replaces the wall-standoff `clampDragX`/`sweepX`/`resolveX` + `epsilon` — removed from `branch.ts` (now just the pure `branchOf` + `pinToWindow`). Sweeps animate linearly (dropped the ease-out). Updated the island, e2e (now asserts the point stops at the top-edge crossing ~0.378, not the wall), and the design doc.

**Bug Fix Context:**
Earlier feedback "when it hits the window edge it should stop … until it hits the asymptote" was ambiguous; I first made the point travel *along* the edge to the wall. The user clarified (screenshot, green box): it should STOP at the window edge, not travel along it. Root model: the point may only occupy the *visible* part of the curve — it halts where the curve exits the window. Because a pole sends the curve off-screen before the wall, this also guarantees no wall-crossing (the original anti-teleport requirement) without any standoff epsilon.

**Verification:**
80 Vitest unit + 15 Playwright e2e green; `astro check` clean; build emits 5 pages. Headless: empty on load (no point), plot `1/x^2` → the `x → 0⁺` sweep rides the curve and stops at x = 0.378 (the y=7 edge crossing), pin `onscreen`, with no horizontal edge-travel (screenshot confirmed).

**References:**
- Design doc revision note (2026-07-04, post-implementation)

## [2026-07-11 13:38] Commit Summary

**Change Type:** Docs
**Scope:** Explorers — Transformation Explorer design spec

**Summary:**
Added the design spec for a new **Transformation Explorer**, a second sibling tool in the Explorers section that teaches the general form g(x) = a·f(b(x − h)) + k. A curated parent-function picker (x², x³, |x|, √x, 1/x, sin x, cos x, eˣ) plus a custom f(x) box feed one base expression; four signed sliders (a, b, h, k) with reflect toggles reshape a bold transformed curve live against a dashed "ghost" of the parent, with a plain-English readout naming each active transformation. Pure logic is split into `parents.ts` (catalog + per-parent default windows) and `transform.ts` (`composeExpr` via mathjs node-substitution + `describeTransform` narration), with DOM glue in `transform-render.ts` (two native function-plot series). No draggable point and no animation in v1.

**Rationale:**
Kept as a new sibling rather than a mode inside the 522-line limits component because the two are pedagogically orthogonal and share a rendering stack but almost no UI/logic. Reuses the shipped `applyThemeToPlot`/`boldZeroAxes`/`explorerColors`/`evalAt` infrastructure and shadcn controls; nav is zero-touch because `Header.astro` already matches child routes.

**Process:**
Design produced via the brainstorming skill (5 clickable decisions), then audited with the spec-gap-auditor against the Software Code Review Checklist **before** writing the spec. All load-bearing codebase claims were verified (multi-series function-plot, mathjs parse+transform, shadcn Slider). Nine gaps (G1–G9) were surfaced and closed inline; the Material gap (base-function state model) and two product decisions (degenerate-case handling, per-parent windows) were resolved with the user.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-transformation-explorer-design.md
- Continues the Explorers section (follows the shipped Function Explorer)

## [2026-07-11 13:47] Commit Summary

**Change Type:** Docs
**Scope:** Explorers — Transformation Explorer implementation plan

**Summary:**
Added the TDD implementation plan for the Transformation Explorer: 9 tasks. Tasks 1–4 are pure, Vitest-driven red→green cycles (`parents.ts` catalog + per-parent windows; `theme.ts` `ghost` colour with contrast test; `composeExpr` with numeric-equivalence tests; `describeTransform` narration with full branch/degenerate/tolerance coverage). Tasks 5–7 are DOM integration (`transform-render.ts` two-native-series renderer that dashes the parent's `g.graph` group; `TransformationExplorer.tsx` island; route + hub card + config), gated by `astro check` + build. Task 8 is the Playwright suite; Task 9 updates SUMMARY/TODO. Every code step contains complete code.

**Rationale:**
Grounded the plan in verified codebase facts: function-plot classes each series as `<g class='graph'>` (so the parent dash is a real selector), re-calling `functionPlot()` does an in-place d3 data-join (smooth slider updates), and mathjs `parse().transform()` substitutes x safely. Renderer/island have no node unit test by design — matching the shipped `render.ts`, they are verified by e2e + a live dev check.

**References:**
- Plan: docs/superpowers/plans/2026-07-11-transformation-explorer.md
- Spec: docs/superpowers/specs/2026-07-11-transformation-explorer-design.md (gaps G1–G9)
