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

## [2026-07-11 15:00] Commit Summary

**Change Type:** Test
**Scope:** Transformation Explorer — end-to-end coverage (Task 8 of the implementation plan)

**Summary:**
Added `tests/e2e/transformation.spec.ts` (9 Playwright tests) covering the Transformation Explorer against the production build: default dashed-parent/solid-child render, slider-driven readout updates, reflect-toggle sign flip + `aria-pressed`, reset-to-identity, parent switching + reframing, custom `f(x)` plotting, the `b = 0` degenerate-collapse message, Explorers nav `aria-current`, and dark mode. Several `getByText(...)` assertions from the brief were scoped to `page.locator('li').filter({ hasText })` — the readout text is duplicated by a debounced `role="status"` live-region echo (and, for the identity message, also by the intro paragraph and picker label), which otherwise trips Playwright's strict-mode multi-match or races the 250ms debounce.

**Rationale:**
Kept every assertion accessible-name-first per the brief (`getByRole('slider', { name: ... })`, `getByRole('button', { name: ... })`) rather than falling back to CSS/id selectors, since that is what actually proves the controls are usable by assistive technology — the whole point of the gate.

**Bug Fix Context (if applicable):**
Not a fix — a finding. 2 of 9 tests ("moving a slider updates the readout", "b = 0 explains the collapse") fail (fast, 10s) because `getByRole('slider', { name })` never matches: `src/components/ui/slider.tsx` spreads `aria-label`/`id` onto `SliderPrimitive.Root` (a plain, roleless `<span>`), not `SliderPrimitive.Thumb` (the element that actually carries `role="slider"`). ARIA does not propagate `aria-label` from an ancestor to a descendant role, so every slider thumb in the app — this component's a/b/h/k here, and the Function Explorer's "x value" slider — has **no accessible name**, a WCAG 2.1 SC 4.1.2 (Name, Role, Value) failure. Verified with a throwaway diagnostic spec that the underlying *functional* behavior is correct (arrow keys do move the value and update the readout) — only the accessible name is missing. Left the two tests red on purpose per the task's explicit instruction not to weaken assertions to force a green run; tracked as a new TODO.md entry for follow-up.

**Verification:**
`npm run test:e2e -- transformation`: 7 passed, 2 failed (deterministic across 3 repeat runs — not flaky). Full `npm run test:e2e`: 22 passed, 2 failed, no regressions in `explorer.spec.ts`/`graphing.spec.ts`. `npm test`: 102 Vitest passed. `npm run astro -- check`: 0 errors/warnings. `npm run build`: 6 pages.

**References:**
- TODO.md: Fix — Accessible name missing on shadcn Slider thumbs
- Plan: docs/superpowers/plans/2026-07-11-transformation-explorer.md (Task 8)
- Report: .superpowers/sdd/task-8-report.md

## [2026-07-11 15:11] Commit Summary

**Change Type:** Feature
**Scope:** Explorers — Transformation Explorer (feature complete) + shared Slider a11y fix

**Summary:**
Completed the Transformation Explorer at `/explorers/transformations`: pick a parent function (or a custom f(x)), then shift/stretch/compress/reflect it with a/b/h/k sliders + reflect toggles and watch the solid transformed curve reshape live against a dashed "ghost" of the parent, with a plain-English readout naming each transformation. Delivered across 9 TDD tasks: pure modules `parents.ts` (catalog + per-parent windows) and `transform.ts` (`composeExpr` via mathjs node substitution; `describeTransform` narration with EPS-tolerant knob detection + degenerate messages); `theme.ts` `ghost` colour; `transform-render.ts` (two native function-plot series, dashed parent, unconditional zoom re-sync); the `TransformationExplorer.tsx` island (single-source base model, signed sliders, `role="status"` readout); route + hub card + config; and the `transformation.spec.ts` e2e suite. Also fixed a shared bug the e2e surfaced: `ui/slider.tsx` put `aria-label` on the roleless `SliderPrimitive.Root` instead of the `role="slider"` `Thumb`, so every slider in the app (both explorers) had no accessible name — forwarded the ARIA name to the Thumb (WCAG 2.1 SC 4.1.2).

**Rationale:**
Built as a sibling explorer (not a mode) since transformations and limits share a rendering stack but almost no UI/logic. Executed subagent-driven with a per-task spec+quality review gate. Two defects were caught by the review loop rather than shipping: the plan's `composeExpr` used an untyped mathjs node guard that failed `astro check` (fixed to `instanceof SymbolNode`), and the plan's `zoomBound` render guard broke zoom re-sync on in-place re-renders (removed; `on('all:zoom')` now registers unconditionally per `render.ts`'s proven pattern). The slider a11y fix was in scope because the feature's own WCAG-AA constraint mandates labeled sliders.

**Bug Fix Context (if applicable):**
Slider accessible-name bug root cause: shadcn wrapper spread all props (incl. `aria-label`) onto `Slider.Root`, but `role="slider"` lives on `Slider.Thumb`, and ARIA names don't inherit from ancestors. Fix forwards `aria-label`/`aria-labelledby` to the Thumb. Verified: both explorers' sliders now resolve by accessible name; no visual/regression change.

**Verification:**
9/9 Transformation e2e, 24/24 full Playwright e2e (explorer + graphing + transformation, no regressions), 102/102 Vitest unit, `astro check` 0 errors, `npm run build` emits 6 pages.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-transformation-explorer-design.md (gaps G1–G9)
- Plan: docs/superpowers/plans/2026-07-11-transformation-explorer.md (Tasks 1–9)
- TODO.md: Feature — Transformation Explorer; Fix — Accessible name (RESOLVED)

## [2026-07-11 15:52] Commit Summary

**Change Type:** Feature | Fix
**Scope:** Site navigation — Explorers hub routing + header dropdown

**Summary:**
Two navigation corrections now that the Explorers section holds more than one tool. (1) **Fix:** the home page's third card was titled "Function Explorer" and linked straight to `/explorers/function`, skipping the hub — it is now an **"Explorers"** card linking to `/explorers` so you choose which explorer. (2) **Feature:** the header's "Explorers" nav item keeps its link to the hub but gains a caret that discloses a dropdown of the individual explorers (Function Explorer, Transformation Explorer), with the current explorer marked `aria-current`. New `tests/e2e/navigation.spec.ts` (7 tests) covers both.

**Rationale:**
Dropdown visibility is owned entirely by JS with three independent open reasons (`pinned` via the caret, `hovered`, and focus-inside-the-menu) rather than a CSS `:focus-within` reveal. Two reasons: a `:focus-within` menu cannot be dismissed with Escape while focus remains in the nav; and a caret that toggled on *current visibility* would open-then-instantly-close, because a pointer press fires `mouseenter` before `click` (and on touch a tap fires both, making the caret a dead no-op). Separating `pinned` from `hovered` makes the caret always open on first activation across mouse, touch, and keyboard.

**Bug Fix Context (if applicable):**
The e2e suite caught the mouseenter-before-click race on the first run (3 of 7 failing) — the fix was to stop deriving the toggle from `menu.hidden` and track the open reasons independently.

**Verification:**
`npm run test:e2e`: **31 passed** (24 existing + 7 new navigation; no regressions in graphing/explorer/transformation). `npm test`: 103 Vitest. `npm run astro -- check`: 0 errors. `npm run build`: clean.

**References:**
- Reported by user during review of PR #5 (Explorers navigation)

## [2026-07-11 16:02] Commit Summary

**Change Type:** Fix
**Scope:** Header nav — caret placement; Transformation Explorer intro copy

**Summary:**
The Explorers dropdown caret rendered as a *separate* pill next to the "Explorers" nav item (the link and the caret each carried their own padding/hover background), so it read as two chips instead of one nav item — not standard UI. Moved the pill styling to the wrapper so the label and caret share a single rounded background and one hover/active highlight: `[ Explorers ⌄ ]`. Added the standard caret-flip-on-open affordance via Tailwind's `aria-expanded:rotate-180` variant (the earlier Astro-scoped stylesheet rule never matched). Also fixed a missing space in the Transformation Explorer intro ("and**k**" → "and **k**") caused by Astro collapsing a line-break between text and a `<strong>`.

**Bug Fix Context:**
Root cause of the caret bug was purely visual and slipped through because the change was verified by behaviour (e2e) and type-checks, but never *looked at*. Caught only when the rendered header was screenshotted. Behaviour was correct throughout — all 7 navigation e2e tests passed both before and after the restyle.

**Verification:**
Visually confirmed via headless screenshots (closed + open, dark mode, Explorers active). `npm run test:e2e`: 31 passed. `npm test`: 103 Vitest. `npm run astro -- check`: 0 errors.

**References:**
- Reported by user during review of PR #5

## [2026-07-11 16:07] Commit Summary

**Change Type:** Fix
**Scope:** Header nav — Explorers dropdown was unreachable with the mouse

**Summary:**
The dropdown opened on hover but its items could not be clicked. The menu was positioned with `mt-1`, leaving a 4px margin gap between the nav item and the menu card. That gap belongs to neither element, so moving the cursor toward the menu left `[data-explorers-nav]`, fired `mouseleave`, and closed the menu before the pointer arrived. Replaced the margin with a **hover bridge**: the menu's outer box now starts flush at `top-full` (zero gap — hit areas touch) and carries the 4px visual offset as `pt-1` padding *inside* the hoverable region, with the bordered card nested in it. Verified geometrically: nav bottom = menu top = 49px (gap 0), card renders at 53px.

**Bug Fix Context:**
The existing e2e suite could not catch this: Playwright's `locator.hover()` **teleports** the cursor straight to the target, so it never traverses the dead space a real mouse crosses, and therefore never fires the `mouseleave` that closed the menu. Added `tests/e2e/navigation.spec.ts` → "the mouse can travel from the nav into the dropdown and click an item", which walks the cursor with `page.mouse.move(..., { steps: 25 })` and asserts the menu survives the journey, then presses the item. Proven non-vacuous: with the fix stashed the new test FAILS at exactly the "must NOT have closed on the way down" assertion; with it restored it passes.

**Verification:**
`npm run test:e2e`: **32 passed** (8 navigation incl. the new traversal test; no regressions). `npm test`: 103 Vitest. `npm run astro -- check`: 0 errors. Visually confirmed open/closed states via headless screenshot.

**References:**
- Reported by user during review of PR #5 ("you can't click on anything")

## [2026-07-11 16:23] Commit Summary

**Change Type:** Docs
**Scope:** Explorers — points toggle & value table design spec

**Summary:**
Design spec for bringing the graphing calculator's two missing features into **both** explorers: a **Show points** toggle (markers at whole-number gridline crossings) and a **value table** (one row per integer x in the window). Reuses the existing `gridlineCrossings` / `integerXs` / `evalAt` helpers and exports `plot.ts`'s private `makeMarker`; adds one shared presentational `ValueTable` component. The Transformation Explorer covers both curves — markers on parent and transformed, table columns `x | f(x) | g(x)` — so the transformation is readable numerically. On/off toggle only (no shape picker); points default off.

**Rationale:**
Architecture follows the codebase's existing "islands decide, renderers draw" rule: the islands compute and memoise the crossings and table values, and pass precomputed data down, so renderers and `ValueTable` contain no math. That both removes an internal contradiction in the first draft and creates the single lever the performance risk needs (`evalAt` re-parses its expression on every call, and a slider drag re-derives the crossings each tick).

**Process:**
Brainstormed (2 clickable decisions), then audited with **spec-gap-auditor** before any code. All load-bearing claims were verified against the source (`makeMarker` is private at `plot.ts:120`; `evalAt` re-parses per call; `gridlineCrossings`/`integerXs` are already unit-tested; graph's table has zero `scope=` attributes). Seven gaps (G1–G7) surfaced and closed; the one product decision (does hiding the parent curve also drop its table column? — no, the table keeps `f(x)`) was resolved with the user.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-explorer-points-and-value-table-design.md (gaps G1–G7)
- Plan: docs/superpowers/plans/2026-07-11-explorer-points-and-value-table.md (5 tasks; Task 5 is a mandatory visual + perf gate)

## [2026-07-11 16:33] Commit Summary

**Change Type:** Feature
**Scope:** Both Explorers — points toggle & value table

**Summary:**
Brought the graphing calculator's two missing features into **both** explorers. **Show points** marks every whole-number gridline crossing on the curve (reusing `gridlineCrossings`); a **value table** under each plot lists every integer x in the current window (`integerXs`) with `—` where the function is undefined. The Function Explorer gets one `f(x)` column; the **Transformation Explorer covers both curves** — markers on the parent (`ghost`) and the transformed (`curve`), and columns `x | f(x) | g(x)`, so the transformation reads numerically as well as visually. Points default off; on/off toggle only (no shape picker — the explorers have a fixed 1–2 curves already separated by colour and solid-vs-dashed). Exported `plot.ts`'s private `makeMarker` and added one shared, purely-presentational `ValueTable` component.

**Rationale:**
Follows the codebase's "islands decide, renderers draw" rule: the islands compute and **memoise** the crossings and table values and pass precomputed data down, so neither the renderers nor `ValueTable` ever call `evalAt` (which re-parses its expression on every call). That single decision is what keeps a slider drag cheap. "Show parent" governs the **plot only** — the `f(x)` column always shows, because the table is data, not decoration.

**Verification (all measured, not assumed):**
36 Playwright e2e (4 new, no regressions), 103 Vitest, `astro check` 0 errors, build clean. **Perf gate:** a real-cursor drag of the `a` slider with points ON sustained **121 fps** over 1.1 s (134 frames) — smooth. **Zoom:** settles (marker count stable across 700 ms) and recomputes crossings for the new window — no render loop. **Visual:** screenshotted both explorers with points on; markers sit on the curves in the right colours, the draggable point stays distinct, and the tables render correct values (`1/x^2` → `—` at x=0, `0.25` at x=±2; with k=−3, g = f − 3 across every row).

**References:**
- Spec: docs/superpowers/specs/2026-07-11-explorer-points-and-value-table-design.md (G1–G7 closed)
- Plan: docs/superpowers/plans/2026-07-11-explorer-points-and-value-table.md

## [2026-07-11 16:43] Commit Summary

**Change Type:** Feature
**Scope:** Both Explorers — point shape picker (parity with the graphing calculator)

**Summary:**
Added the circle/square/triangle **Shape** picker beside the *Show points* checkbox in both explorers, replicating the graphing calculator's existing control exactly (`Checkbox` + `Select` over the shared `PointShape` type and `SHAPES` list). `OverlayScene` and `TransformRenderOptions` each carry a `pointShape`, which is passed straight to the already-shared `makeMarker`. In the Transformation Explorer both curves use the picked shape and remain separated by **colour** — the same model graph uses to separate equations.

**Rationale:**
This corrects an earlier decision of mine. I had recommended an on/off toggle only, reasoning that the shape picker exists in graph to distinguish *stacked* equations while the explorers have a fixed 1–2 curves already separated by colour and solid-vs-dashed. That was wrong on two counts: consistency across the app matters more than a marginal YAGNI saving (the same feature should not have different controls in different tools), and the pattern was already implemented and tested in `GraphingCalculator.tsx` — so replicating it was cheaper than justifying its absence. No new abstraction was invented; the existing pattern was reused.

**Verification:**
38 Playwright e2e (2 new — picking Square in the Function Explorer renders `<rect>` markers and zero `<circle>`; picking Triangle in the Transformation Explorer renders `<path>` markers on **both** curves), 103 Vitest, `astro check` 0 errors, build clean. Visually confirmed both explorers with the picker (square in the Function Explorer, triangle in the Transformation Explorer) — as a bonus, the round draggable point now reads as clearly distinct from square/triangle crossing markers.

**References:**
- Reported by user during review of PR #5 ("why on the graph I have the option to pick the point shape and on the two explorers I don't?")

## [2026-07-11 16:51] Commit Summary

**Change Type:** Fix
**Scope:** Docker — wire the Transformation Explorer title build-arg

**Summary:**
`src/config.ts` gained `SITE_TITLE_TRANSFORMATION_EXPLORER` (reading `PUBLIC_SITE_TITLE_TRANSFORMATION_EXPLORER`) when the Transformation Explorer landed, but the variable was never added to the `Dockerfile` (ARG/ENV), `docker-compose.yml` (build args), or `.env.example` — unlike every other page title. The site still rendered (the constant falls back to a hardcoded default), so nothing broke; the env var was simply **silently ignored** in a containerised build. Now wired in all three places, restoring the established pattern.

**Bug Fix Context:**
Missed when the Transformation Explorer route was added — a config constant was introduced without following it through the Docker build-arg chain. Surfaced by the user asking about producing a container image to run via Docker.

**Verification:**
Built the image with an override — `docker build --build-arg PUBLIC_SITE_TITLE_TRANSFORMATION_EXPLORER="Transformations (custom)"` — ran it, and confirmed the custom string is baked into `<title>` on `/explorers/transformations` (it would not have been before this fix). All six routes serve HTTP 200 from the container: `/`, `/ti-84`, `/graphing`, `/explorers`, `/explorers/function`, `/explorers/transformations`.

**References:**
- Dockerfile, docker-compose.yml, .env.example

## [2026-07-11 17:07] Commit Summary

**Change Type:** Fix
**Scope:** Release — changelog title/ordering, backfilled 0.1.0; compose pull warning

**Summary:**
Three related fixes surfaced by the first automated release (v0.2.0).
(1) **Changelog title stranded at the bottom.** `@semantic-release/changelog` *prepends* new notes to the top of the file (it never overwrites), but it only preserves an existing header if `changelogTitle` is configured. It wasn't, so the 0.2.0 notes were inserted above the hand-written `# Changelog` header, pushing it to the foot of the file. Added `changelogTitle` to `.releaserc.json` (matching the header byte-for-byte, since the plugin uses `currentFile.startsWith(changelogTitle)`) and repaired the current file.
(2) **No 0.1.0 entry.** `v0.1.0` was a baseline tag cut *before* the changelog plugin existed, and semantic-release only writes notes for releases it creates — so the changelog began at 0.2.0. Backfilled a `# 0.1.0` section generated from the actual commits reachable from that tag (25 entries, same format as the generated 0.2.0 section), placed beneath 0.2.0 so newest stays first.
(3) **Misleading compose warning.** `docker compose up` printed `pull access denied for ti-84` on every run — compose tries to pull `image: ti-84:latest` before falling back to the local build, which reads as though a stale image was used. Set `pull_policy: build` so compose never attempts the pull.

**Bug Fix Context:**
Root cause of (1) is in the plugin's `lib/prepare.js`: `changelogTitle && currentFile.startsWith(changelogTitle) ? currentFile.slice(changelogTitle.length).trim() : currentFile`, then `writeFile(path, changelogTitle ? `${changelogTitle}\n\n${content}` : content)`. Without `changelogTitle` it blindly prepends above all existing content, header included.

**Verification:**
Replayed the plugin's exact `prepare.js` logic against the real repaired file and the real config, simulating a future 0.3.0 release: the title matches (`startsWith` → true), stays on top, is not duplicated, and both 0.2.0 and the backfilled 0.1.0 survive beneath it — final order `# Changelog → 0.3.0 → 0.2.0 → 0.1.0`. `docker compose config -q` valid, `.releaserc.json` parses, and `docker compose up -d` now builds with no pull warning; container serves `/`, `/explorers`, `/explorers/transformations` (200).

**References:**
- Reported by user: "is it overwriting or appending?", "there is no v0.1.0 entry"

## [2026-07-11 17:58] Commit Summary

**Change Type:** Fix
**Scope:** Docker — `docker-compose.yml` could never pull the released image

**Summary:**
Pointed the Compose service at the published image (`image: ghcr.io/rgoshen/ti-84:${TAG:-latest}`) and set `pull_policy: always`, replacing the local-only tag `ti-84:latest` and the `pull_policy: build` that had disabled pulling outright. One file now serves both flows: `docker compose up -d` **pulls** the release, `docker compose up -d --build` **builds** the working tree, and `TAG` pins a version. Documented in the README and added `TAG` to `.env.example`.

**Bug Fix Context:**
`docker-compose.yml` tagged its build `ti-84:latest` — an unqualified name that Docker resolves to Docker Hub, not GHCR — so `up` emitted `pull access denied for ti-84` and fell back to building. That warning was Compose genuinely trying to pull; the name was simply wrong. The earlier "fix" of adding `pull_policy: build` silenced the warning by *amputating the pull path*, encoding the bug into the config and making a separate pull-only compose file look necessary. Correcting the image name restores Compose's documented `build` + `image` behaviour, where `image` is both the pull source and the local build's tag, and one file covers both.

`pull_policy: always` is load-bearing, not decoration. Under the default policy Compose only asks whether the image is *cached*, not whether it is *current* — so after any `--build` (which overwrites the release tag locally) a subsequent plain `up -d` silently re-serves the stale local build. That is the same "why isn't it pulling the latest" symptom that opened this thread. `always` forces the refresh; an explicit `--build` still wins, so the dev path is unaffected. Trade-off: a plain `up -d` now requires network (use `--build` offline).

**Rationale:**
Chose to repair the existing file over keeping `docker-compose.ghcr.yml` (reverted). Two compose files for one service is not standard practice, duplicates `HOST_PORT`/`container_name`/`ports`, and invites drift; the `build`+`image` pair is Docker's documented mechanism for exactly this dev-vs-release split.

**Verification:**
With no `ti-84` image cached: plain `docker compose up -d` reported `Pulling → Pulled`, ran `ghcr.io/rgoshen/ti-84:latest` @ `sha256:6c50e8a2…`, and served all six routes 200. `up -d --build` reported `Building → Built` and honoured a `PUBLIC_SITE_TITLE_GRAPHING` override (baked into `<title>`), proving the build args still work. `TAG=0.2.0 up -d` pulled the pinned tag. The stale-build trap was reproduced directly: after a `--build` the site served `<title>STALE-LOCAL-BUILD</title>`, and a plain `up -d` re-pulled and recovered to `<title>Graphing Calculator Online</title>` — confirmed failing without `pull_policy: always` (Compose skipped the pull entirely and kept serving the stale build) and passing with it. `docker compose config -q` valid.

**References:**
- Reported by user: "why would you create a different docker compose file? ... why not just have the current docker compose file pull it"
- Docker Compose Build Specification, "Using build and image"; `pull_policy` in the Services top-level element
- docker-compose.yml, README.md, .env.example

## [2026-07-11 20:10] Commit Summary

**Change Type:** Feature
**Scope:** explorer/parents

**Summary:**
Grew the parent catalog from 8 to 11 — added identity (x), cube root (∛x) and natural
log (ln x) — and reordered it into teaching sequence. Added `defaultParent()` so the
explorer still opens on x² even though identity is now listed first.

**Rationale:**
Cube root is spelled `cbrt(x)`, not `x^(1/3)`: mathjs returns a complex number for
negative x, which would have silently erased the left half of the curve. Natural log is
`log(x)` — base-e in both mathjs and function-plot; `ln` does not exist in either.

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Spec: docs/superpowers/specs/2026-07-11-parent-catalog-and-function-details-design.md

## [2026-07-11 20:20] Commit Summary

**Change Type:** Feature
**Scope:** explorer/parents

**Summary:**
Gave each of the 11 parents in the catalog an analytic `props` block — pure data,
no consumer yet. Added the `Interval` union (`all` / `bound` / `exclude` / `between`)
and `ParentProps` (`domain`, `range`, optional `verticalAsymptote`/
`horizontalAsymptote`, and `solve(c)`), and `props: ParentProps` on `Parent`. `solve`
is each parent's inverse — every u with f(u) = c — which is what will let the next
task (a `details.ts` consumer) report exact x-intercepts instead of numerically
root-found ones.

**Rationale:**
Followed strict TDD: appended the failing spec first (round-trip, asymptote, and
domain-restriction assertions), watched it fail on the missing `props` field, then
implemented. The round-trip test — for every parent and probe c, assert
f(solve(c)) ≈ c — is the load-bearing check: it catches an inverted `solve` (e.g.
swapping cube's `Math.cbrt(c)` with cube root's `c ** 3`) that would otherwise pass
type-checking silently.

**Tests:**
5 new Vitest cases in `parents.test.ts` (props declared on all 11 parents,
solve()/f() round-trip across 6 probes × 11 parents, recip/exp/ln asymptotes,
sqrt/ln/recip domain restrictions, sin/cos periodic solve). Full suite: 112 Vitest
passing (0 failing). `npm run build` clean (6 pages, 0 type errors).

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Plan: docs/superpowers/plans referenced by .superpowers/sdd/task-2-brief.md (Task 2 of the plan)

## [2026-07-11 20:17] Commit Summary

**Change Type:** Test
**Scope:** explorer/parents

**Summary:**
Closed a vacuous-test gap in `parents.test.ts` flagged by code review. The existing
`solve() returns genuine solutions of f(u) = c` test only checks the solutions
`solve()` returns, but never asserts it returns any — five parents (square, sqrt,
recip, abs, exp) legitimately return `[]` on some branches, so if one of those
`solve` implementations regressed to unconditionally return `[]`, the round-trip
loop would simply never execute and the suite would still pass. Added
`solve() is reachable: returns a non-empty result for a probe in the parent's range`,
a table of one in-range probe `c` per parent (all 11), asserting `solve(c)` is
`'infinite'` (sin/cos) or a non-empty array — plus an assertion that the table's id
list matches `PARENTS` exactly, so a parent silently dropped from the table would
also fail.

**Rationale:**
Considered folding a "reachable" assertion into the existing round-trip test instead
of adding a new one, but that would re-couple the two concerns (round-trip validity
vs. reachability) the review called out as separately load-bearing; a standalone
test keeps the failure message unambiguous about which invariant broke.

**Bug Fix Context (if applicable):**
Not a runtime bug — `parents.ts` was verified correct by hand in review and was not
modified. This is a test-coverage gap: the round-trip test is structurally unable to
catch a `solve` that regresses to always returning `[]`.

**Tests:**
Added 1 Vitest case (14 total in the file, up from 13). Verified the new test is not
itself vacuous by temporarily sabotaging `sqrt`'s `solve` to unconditionally return
`[]`: the new test failed (`sqrt: solve(2) should not be empty: expected 0 to be
greater than 0`) while the pre-existing round-trip test kept passing, exactly
reproducing the gap under review. Reverted the sabotage (confirmed via `git diff`
showing no changes to `parents.ts`) and reran: 14/14 passing. Full suite (`npm test`):
9 files, 113 passed, 0 failed (up from 112).

**References:**
- Code review finding on `src/scripts/explorer/parents.test.ts`
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details

## [2026-07-11 20:23] Commit Summary

**Change Type:** Feature
**Scope:** explorer/details

**Summary:**
Added `src/scripts/explorer/details.ts`, a pure module that maps a parent's
declared domain/range/asymptotes/inverse (from `parents.ts`) through the
transform g(x) = a·f(b(x − h)) + k, producing display-ready `FunctionDetails`
(domain, range, x-intercepts, y-intercept, vertical/horizontal asymptote) for
both the untransformed parent and the live transformed curve. `mapInterval`
pushes an `Interval` through the affine map t ↦ m·t + c, flipping a `bound`'s
direction when the multiplier is negative; `formatInterval` renders each
interval shape as text; `xInterceptsOf` asks the parent's own `solve(−k/a)`
and maps solutions back via x = u/b + h — no numeric root-finding anywhere.
Degenerate transforms (|a| < EPS or |b| < EPS) render every field as "—".

**Rationale:**
Followed strict TDD: wrote the full test file first (17 cases covering
`mapInterval`, `formatInterval`, `parentDetails`, and `transformedDetails`),
confirmed it failed on the missing `./details` module, then implemented.
The transform is invertible by construction, so domain/range/intercepts are
derived algebraically from each parent's declared properties rather than
sampled or numerically searched — this keeps the panel's numbers exact and
stable as sliders move, and keeps the module dependency-free (no DOM, no
function-plot). The sign-flip rule for `mapInterval` (reflecting √x over the
y-axis must take x ≥ 0 to x ≤ 0; reflecting eˣ over the x-axis must take
y > 0 to y < 0) has dedicated tests since it's the part most likely to be
gotten backwards. All coefficient comparisons use `EPS` from `transform.ts`,
never `===`, since slider steps land on values like 0.9999999. All numbers
are formatted via `formatNumber` (ASCII hyphen) to keep ranges and intercepts
visually consistent with each other.

**Tests:**
17 new Vitest cases in `details.test.ts`: `mapInterval` (identity passthrough,
translate/scale, sign-flip on `bound`, re-sort on `between`, `exclude`
translation), `formatInterval` (all four interval shapes), `parentDetails`
(1/x, x², ln untransformed), and `transformedDetails` (the a=2,b=1,h=3,k=1
worked example on 1/x; √x and eˣ reflections; ln shifted right; eˣ shifted up
killing its x-intercept; x² shifted down/up gaining/losing x-intercepts;
periodic sin reporting "infinitely many"; degenerate a=0/b=0 collapsing every
field to "—"). Full suite (`npm test`): 10 files, 130 passed, 0 failed (up
from 113). `npm run build`: clean, 6 pages, 0 type errors.

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Plan: `.superpowers/sdd/task-3-brief.md` (Task 3 of the plan)

## [2026-07-11 20:32] Commit Summary

**Change Type:** Test
**Scope:** explorer/details

**Summary:**
Strengthened `details.test.ts` against a class of latent bugs the existing
suite could not detect: every catalog domain/range/asymptote is anchored at
0, where the affine map `t ↦ m·t + c` reduces to `m·0 + c === c` for ANY `m`
— making the multiplier unobservable — and every prior `transformedDetails`
test used `b ∈ {1, −1, 0}`, so a `b` vs `1/b` mix-up in the domain map would
pass unnoticed. Added three tests that each pin a previously-unobservable
multiplier: (1) `sin`'s range (the only non-zero-anchored catalog interval)
under `a = 3, k = 1`, killing a `c.a` → `1/c.a` swap in the range map; (2)
`square`'s x-intercepts under `b = 2`, killing a `u / c.b` → `u * c.b` swap
in the intercept back-map; (3) a synthetic `Parent` (spread from `ln`, with
`props.domain` and `props.verticalAsymptote` overridden to a non-zero anchor
of 2) under `b = 2, h = 1`, killing a `1 / c.b` → `c.b` swap in the domain
map — `transformedDetails` accepts any `Parent`, so this needed no change to
the real catalog. Also rewrote the degenerate-transform test to assert an
explicit named-field object instead of `Object.values(d)`, which silently
depended on property declaration order and named no field.

Also hardened `details.ts` purity per the same review: `transformedDetails`
now returns a fresh `{ ...DEGENERATE }` instead of the module-level singleton
(so a consumer can't mutate it and corrupt every future degenerate result),
and `mapInterval`'s `'all'` case returns a fresh `{ kind: 'all' }` instead of
the caller's object (which for a real parent is the shared `ALL` constant in
`parents.ts`). Both are copy-only changes with no behavioral effect.

**Rationale:**
Math was already correct; the review's point was that the tests couldn't
prove it, since every anchor in the catalog was 0. Rather than add a new
catalog parent just to get a non-zero anchor (`parents.ts` is out of scope
for this fix), the third test builds a synthetic `Parent` on the fly by
spreading a real one — `transformedDetails` only depends on the `Parent`
shape, not catalog membership. Each new test was verified against its
target mutation by hand (mutate → confirm the new test alone fails → revert
→ confirm `git diff details.ts` is empty) rather than assumed to be
effective, per the review's explicit ask. The two purity fixes were bundled
in because they touch the same file and are provably behavior-preserving
(structural equality, not identity, is all any test checks).

**Tests:**
Added 3 Vitest cases to `details.test.ts` (20 total, up from 17) and
rewrote 1 existing assertion for order-independence. Mutation-verified all
three: swapping `c.a` → `1/c.a` in the range map broke only the new sin
range test ('0.667 ≤ y ≤ 1.333' instead of '-2 ≤ y ≤ 4'); swapping
`u / c.b` → `u * c.b` in the intercept back-map broke only the new square
test ('x = -4, x = 4' instead of 'x = -1, x = 1'); swapping `1 / c.b` →
`c.b` in the domain map broke only the new synthetic-parent test ('x ≥ 5'
instead of 'x ≥ 2'), exactly matching the review's predicted mutant output
in all three cases. `git diff src/scripts/explorer/details.ts` confirmed
clean before applying the two purity fixes. Full suite (`npm test`): 10
files, 133 passed, 0 failed (up from 130).

**References:**
- Code review finding on `src/scripts/explorer/details.test.ts`
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details

## [2026-07-11 20:38] Commit Summary

**Change Type:** Feature
**Scope:** explorer/ui

**Summary:**
Replaced the Transformation Explorer's parent-function picker — a `PARENTS.map` row
of toggle `Button`s — with a shadcn `Select` dropdown, since 11 catalog entries no
longer fit as a button row. The dropdown reuses the existing `selectParent(id)`
handler unchanged as `onValueChange`; each `SelectItem` shows the math glyph
(`p.label`, monospace) and the spoken name (`p.name`, muted) side by side. The
trigger's value falls back to `parentId ?? ''`, and its placeholder ("Custom
function") surfaces automatically when a typed f(x) clears `parentId` to `null` —
no extra state needed.

**Rationale:**
A second `Select` on the page made the pre-existing shape-picker's unscoped
`page.getByRole('combobox')` e2e selector ambiguous under Playwright's strict mode
(now two comboboxes match). Fixed at the source instead of routing around it: gave
both `SelectTrigger`s an `aria-label` (`"Point shape"`, `"Parent function"`) so every
combobox on the page is addressable by name, keeping the shape-picker test's
assertions intact rather than weakening them. This was flagged as a known risk when
the catalog was grown to 11 parents (see TODO.md reference below).

**Tests:**
Rewrote `tests/e2e/transformation.spec.ts`'s `'picking a different parent reframes
and resets'` test for the dropdown (click the named combobox, pick the `option` by
name) — it still asserts the reframe is real by checking `xMin` moves off `-10` and
lands within 3 decimals of sin x's `-2π`, not merely that a label or pressed-state
changed. Added `'the new parents are selectable and reframe the view'`, picking
"cube root" and asserting both the readout text and the rendered curve count.
Scoped the shape-picker test's combobox query to `{ name: 'Point shape' }`. Swept
the other e2e spec files for unscoped `combobox` selectors — `explorer.spec.ts` has
one, but it targets the unrelated `/explorers/function` page (a different
component, still exactly one combobox there), so it was left as-is.
`npm test`: 10 files, 133 passed, 0 failed (unchanged). `npx playwright test
tests/e2e/transformation.spec.ts`: 13/13 passed. Full `npm run test:e2e`: 39/39
passed. `npm run build`: clean, 6 pages, 0 type errors.

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Plan: `.superpowers/sdd/task-4-brief.md` (Task 4 of the plan)

## [2026-07-11 20:44] Commit Summary

**Change Type:** Feature
**Scope:** explorer/ui

**Summary:**
Added the read-only "Function details" panel to the Transformation Explorer: a
`<table>` between the plot and the value table showing domain, range,
x/y-intercepts, and vertical/horizontal asymptotes for f(x) and the live g(x) side
by side. Two new memos (`parent`, `fDetails`, `gDetails`) derive from the existing
`parentId`/`coeffs` state and reuse the island's already-memoised `composed`
expression (never recomputed) via `parentDetails`/`transformedDetails` from
`scripts/explorer/details`. A typed custom f(x) clears `parentId` to `null`, so both
memos go `null` and the panel renders a fallback message instead of attempting to
compute details for a function with no declared properties.

**Rationale:**
The pedagogical point of the panel is that the g(x) column updates live as sliders
move while the f(x) column stays fixed — proving the transformation only shifts/
scales the parent, it doesn't change its qualitative shape. Building the table as a
real `<table>` with `<caption>` (sr-only) and `<th scope="col">`/`<th scope="row">`
(rather than a div grid) keeps it WCAG 2.1 AA compliant; it is intentionally
read-only with no inputs or controls.

**Tests:**
TDD: appended 3 failing e2e tests to `tests/e2e/transformation.spec.ts` first,
confirmed all 3 failed (`[data-testid="function-details"]` not found) via
`npx playwright test tests/e2e/transformation.spec.ts -g "details|ln shows|custom
function reports"`, then implemented and reran the same filter to green. Tests
cover: x² domain/range for both columns plus k=+2 lifting only g's range; switching
to natural log shows `x > 0` domain and the vertical asymptote following an h shift
(`x = 0` → `x = 2`); a custom f(x) shows the "not available" fallback text.
`npm test`: 10 files, 133 passed. Full `npm run test:e2e`: 42/42 passed (39
pre-existing + 3 new), no regressions. `npm run build`: clean, 6 pages, 0 type
errors.

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Plan: `.superpowers/sdd/task-5-brief.md` (Task 5 of the plan, final task)

## [2026-07-11 21:05] Commit Summary

**Change Type:** Fix
**Scope:** explorer

**Summary:**
Five Minor polish fixes from the whole-branch review of the Function Details panel.
(1) Rewrote `details.ts`'s stale `FunctionDetails` doc comment, which claimed '—'
meant "genuinely absent" — backwards from what the code does ('—' = not
applicable/collapsed transform; 'none' = applies but no such point). (2)
Pluralized `TransformationExplorer.tsx`'s x-intercepts row label ("x-intercept" →
"x-intercepts"), which mismatched plural data like "x = -2, x = 2"; the `key`
stays `xIntercepts` since e2e's `data-row` selectors depend on it. (3) Fixed an
accessibility gap: the sr-only live region announced the transform readout
("Shifted up 2") but never the resulting domain/range, so a screen-reader user
never heard that dragging `k` changed the range to "y ≥ 2" — the entire teaching
point of the panel. The 250ms-debounced announcement effect now appends
` Domain {gDetails.domain}. Range {gDetails.range}.` when a parent is selected,
with `gDetails` added to its dependency array. (4) Added a pinned regression test
in `details.test.ts` for a transformed function's out-of-domain y-intercept
(`sqrt(x − 3)` at x = 0), since mathjs returns a Complex there, not NaN, and
`evalAt`'s `typeof v === 'number'` guard is the only thing rejecting it. (5) Added
a test covering the two newest catalog parents (`identity`, `cbrt`), which had no
`details.test.ts` coverage at all, asserting hand-derived transformed values for
both.

**Rationale:**
All five were flagged Minor by the whole-branch review (no Critical/Important
findings) and each had a concrete, reviewer-specified fix. Grouping them into one
commit keeps the fix atomic and scoped to exactly what the review called out — no
math in `details.ts` changed, and the deliberate a=0/b=0 degenerate-collapse
behavior (all six rows '—') is unchanged.

**Bug Fix Context:**
(3) is the only behavior-affecting fix; the announcement effect previously omitted
`gDetails` from its own state and its dependency array, so `setAnnounced` never
saw a domain/range update no matter how many times a slider moved.

**Tests:**
Added 2 Vitest cases to `details.test.ts` (135 total, up from 133): the transformed
`sqrt` y-intercept-under-complex regression, and the identity/cbrt coverage test
(hand-derived: identity `g(x)=2·4·(x−1)+6=8x−2` → root x=0.25, y(0)=-2; cbrt
`g(x)=∛(8(x−1))−2` → root x=2, y(0)=-4; both domain/range "all real numbers", both
asymptote rows '—'). `npm test`: 10 files, 135 passed, 0 failed. `npm run build`:
clean, 6 pages, 0 type errors. Full `npm run test:e2e`: 42/42 passed, no
regressions — confirmed no e2e test depended on the old singular label text or
the announcement string (both are matched via `data-row`/`data-testid`, not
visible text).

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Whole-branch review: 5 Minor findings, no Critical/Important

## [2026-07-11 21:40] Commit Summary

**Change Type:** Feature
**Scope:** explorer/parents

**Summary:**
Gave each of the 11 parents a `render(inner)` display template — its own notation
applied to an argument other than a bare `x` (`x²` → `(x − 3)²`). The reciprocal also
gets a `renderScaled` so a coefficient folds into its numerator.

**Rationale:**
Every template must return an ATOMIC string, safe to prefix with a coefficient. This is
why `identity` parenthesises a compound argument: returning `x − 3` would let a caller
build `2x − 3`, which is a different function from `2(x − 3)`. A plausible-but-wrong
equation is worse than no equation in a teaching tool. Pinned by a test, plus a
catalog-wide invariant that `render('x')` reproduces each parent's `label`.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md

## [2026-07-11 21:48] Commit Summary

**Change Type:** Feature
**Scope:** explorer/equation

**Summary:**
New pure module `equation.ts` composing the concrete transformed equation
(`g(x) = 2(x − 3)² + 1`) from a parent's `render` template and the coefficients.
Extracted `innerArgument` out of `formatEquation` in transform.ts and exported it.

**Rationale:**
`innerArgument` is EXTRACTED rather than reimplemented so the abstract line
(`g(x) = 2·f(x − 3) + 1`) and the concrete line derive the argument from one source and
can never drift apart. It lives in transform.ts, not equation.ts as the spec sketched,
because transform.ts already owns Coeffs and EPS — putting it in equation.ts would
create a circular import for the same DRY outcome.

Pretty-printing composeExpr's machine string ('(2) * ((x - (3))^2) + (1)') would need a
real expression-tree formatter that re-derives precedence. Asking each parent to render
its own notation is a dozen one-liners and no parser.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md

## [2026-07-11 21:52] Commit Summary

**Change Type:** Feature
**Scope:** explorer/ui

**Summary:**
The readout now shows the concrete equation beneath the abstract one — 'g(x) = 2.1·f(x)'
followed by 'g(x) = 2.1x²'. At the identity the two merge into 'g(x) = f(x) = x²'.
The concrete form also joins the plot's aria-label and the sr-only live region.

**Rationale:**
'g(x) = 2.1·f(x)' is meaningless to a student who does not already know what f is, and at
the identity it degenerated to the tautology 'g(x) = f(x)'. Both forms are kept because
the abstract one shows WHICH slider produced which part of the equation, while the
concrete one shows the result — connecting the two is the lesson. The readout box is
aria-hidden, so the live region is the only path to a screen reader; the equation was
added there rather than left sighted-only.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md

## [2026-07-11 22:30] Commit Summary

**Change Type:** Feature
**Scope:** explorer/ui

**Summary:**
The readout now shows ONLY the real equation — `g(x) = 2.1x²`. The abstract form
(`g(x) = 2.1·f(x)`) is removed entirely, not shown alongside it. `formatEquation` and
`TransformReadout.equation` are deleted as dead code, and `describeTransform` no longer
takes a `parentLabel` (its step text dropped the redundant "f(x) = x²" caption).

A custom typed f(x) has no notation template, so mathjs `simplify` collapses the
composed machine string into a readable equation instead — so `f(x)` never appears
anywhere in the UI, for any input.

**Rationale:**
The user could not read `g(x) = 2.1·f(x)`: "i don't know what f(x) means in this."
Showing both forms was the first attempt; they asked for replacement, not addition.
Abstract placeholders are a defect in a tool that teaches, not a style choice.

Degenerate transforms now also produce a real equation rather than a blank line:
a = 0 gives `g(x) = k`, and b = 0 gives the constant a·f(0) + k — returning null only
when f(0) genuinely does not exist (ln, 1/x), where nothing is the honest answer.

**References:**
- Spec: docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md

## [2026-07-12 12:41] Commit Summary

**Change Type:** Docs
**Scope:** Graph result export design

**Summary:**
Documented the approved content-only, desktop-width export experience for the
Graphing Calculator and both Explorers. Defined one-file PNG/PDF artifacts, exact
tool-specific content, a shared read-only capture architecture, error handling,
accessibility, dependency boundaries, and a strict TDD verification strategy. Added
the required TODO entry and ignored temporary visual-companion output.

**Rationale:**
The existing page layouts mix result readouts with interactive controls, so hiding
controls in place would lose useful mathematical context. A temporary read-only
surface fed by current tool state preserves the website's style while excluding UI
that cannot function in a downloaded file. Capturing that surface once and reusing it
for PNG and PDF guarantees that both formats remain a single, equivalent artifact.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md

## [2026-07-12 12:54] Commit Summary

**Change Type:** Docs
**Scope:** Graph result export specification audit

**Summary:**
Resolved all eight material gaps from the requested `spec-gap-auditor` review. The
contract now defines fixed artifact and graph dimensions, a dedicated light export
render, immutable snapshots, per-tool eligibility, a 201-row table boundary, precise
Function Explorer asymptote content, and marker-setting ownership.

**Rationale:**
Capturing the responsive live graph contradicted both fixed desktop output and the
light export palette: mobile geometry and dark theming would leak into the file. An
off-screen render through the existing tool renderer keeps the graph behavior DRY
while making dimensions, theme, and animation consistency deterministic. The
auditor's suggested 1,001-row cap was tightened to 201 because a 1,440px-wide image
with 1,001 table rows can exceed practical browser canvas limits.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
- Spec audit: 8 findings resolved

## [2026-07-12 13:01] Commit Summary

**Change Type:** Docs
**Scope:** Graph result export implementation plan

**Summary:**
Added a seven-task, TDD-first implementation plan covering the pure export contract,
dependency-injected PNG/PDF conversion, fixed read-only artifact, accessible menu and
lifecycle, one integration slice per supported tool, TI-84 exclusion, full automated
verification, coverage, and cross-viewport visual QA.

**Rationale:**
The plan isolates browser conversion from domain mapping so pure behavior remains
fast and deterministic to test. Each tool owns its state-to-artifact adapter while
reusing the existing plot renderer and the shared export surface, which avoids both
duplicated graph math and a generic shared module coupled to explorer internals.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
- Plan: docs/superpowers/plans/2026-07-12-graph-result-export.md

## [2026-07-12 13:05] Commit Summary

**Change Type:** Feature
**Scope:** Export contract and dependencies

**Summary:**
Added the pure graph-export contract with fixed artifact/graph dimensions, the
201-row eligibility boundary, deterministic input-free filenames, numeric display
formatting, and typed artifact/snapshot models. Added four TDD unit tests and pinned
`html-to-image` 1.11.13 plus `jsPDF` 4.2.1.

**Rationale:**
Keeping export policy in a browser-free module makes the user-visible limits and file
contract independently testable. Tool components can supply domain-specific content
without redefining dimensions, eligibility messages, or filename behavior.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 1

## [2026-07-12 13:06] Commit Summary

**Change Type:** Feature
**Scope:** Export download adapters

**Summary:**
Added a dependency-injected export boundary that captures the artifact once at the
audited dimensions, downloads that capture directly as PNG, or embeds the identical
image into a zero-margin custom-size PDF. Added two TDD orchestration tests and lazy
browser imports for `html-to-image` and `jsPDF`.

**Rationale:**
Injecting conversion and save operations keeps unit tests deterministic and prevents
browser/canvas behavior from leaking into export policy. A single capture path also
guarantees PNG/PDF visual parity and avoids loading the PDF library during normal use.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 2

## [2026-07-12 13:09] Commit Summary

**Change Type:** Feature
**Scope:** Shared export artifact and controller

**Summary:**
Added the fixed-width, light read-only artifact shell; an accessible Radix Export menu
with PNG/PDF commands; and the off-screen snapshot lifecycle with busy, success, and
recoverable error states. Added static-markup TDD coverage proving audited dimensions,
result content, disabled guidance, and the absence of interactive controls.

**Rationale:**
The shared shell owns presentation and conversion timing while each math tool retains
ownership of its state mapping and plot renderer. Mounting only during export avoids
duplicate accessible content, and the disabled/busy states prevent invalid or
duplicate captures.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 3

## [2026-07-12 13:55] Commit Summary

**Change Type:** Feature
**Scope:** Graphing Calculator export

**Summary:**
Added optional plot heights without changing interactive defaults and integrated the
Graphing Calculator with immutable, light export snapshots. The artifact includes
every equation, per-equation marker state, current zoom window, and complete value
table. Added Playwright coverage for empty/oversized disabling, PNG signature and
1,440px width, deterministic filename, and PDF signature.

**Rationale:**
Rendering into a fixed off-screen target through the existing graph renderer preserves
curve and marker correctness while making mobile and desktop output deterministic.
Copying equations/window/table inputs before rendering prevents live edits or zoom
from changing an export in progress.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 4

## [2026-07-12 13:58] Commit Summary

**Change Type:** Feature
**Scope:** Function Explorer export

**Summary:**
Integrated immutable Function Explorer exports containing the function, current
point/readout, precise vertical asymptote and tail behavior, visible guide/marker
settings, fixed light graph, and complete value table. Added Playwright coverage for
mobile dark-mode capture during an active limit animation, light output, fixed PNG
width/signature, and the 201-row limit; extracted shared download-test helpers.

**Rationale:**
Copying the moving point, analysis objects, overlay points, and table inputs before
off-screen rendering prevents the live sweep loop from changing the artifact during
capture. The export deliberately omits the transient sweep trail while preserving the
mathematical readout at the snapshot moment.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 5

## [2026-07-12 14:06] Commit Summary

**Change Type:** Feature
**Scope:** Transformation Explorer export

**Summary:**
Integrated Transformation Explorer exports containing the selected parent, concrete
transformed equation, a/b/h/k values, transformation steps, parent/transformed
details, visibility and marker state, fixed light graph, and both value-table columns.
Added Playwright coverage for real PNG output after a coefficient change, the row
limit, and explicit TI-84 export exclusion.

**Rationale:**
The tool-specific adapter keeps transformation domain knowledge out of the shared
export shell while copying every renderer input before capture. Hidden parent curves
and their suppressed markers are reported explicitly instead of being silently absent
from the artifact.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 6

## [2026-07-12 14:16] Commit Summary

**Change Type:** Fix
**Scope:** Export progress accessibility

**Summary:**
Removed the export controller's unconditional `role="status"` while retaining its
polite live-region announcement. Added a static regression assertion and verified all
five existing explorer/graph tooltip status tests.

**Rationale:**
Every supported tool already owns a status landmark, and the graphing tooltip adds one
conditionally. The export controller's second landmark made role queries ambiguous
and duplicated the accessibility contract. `aria-live="polite"` provides progress
announcements without claiming another status role.

**Bug Fix Context:**
The full Playwright suite found five strict-mode failures because the new empty export
status and the existing tool/tooltip status resolved simultaneously.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Full-suite regression found during Plan Task 7

## [2026-07-12 15:24] Commit Summary

**Change Type:** Test
**Scope:** Export coverage verification

**Summary:**
Pinned `@vitest/coverage-v8` 4.1.9, added the repeatable `npm run test:coverage`
command, and ignored generated coverage output. Measured 86.08% statements, 82.36%
branches, 86.88% functions, and 88.07% lines across the exercised unit modules.

**Rationale:**
The repository required at least 80% coverage on changed work but previously had no
coverage provider. Pinning the provider to the installed Vitest version makes the
verification reproducible instead of relying on an unrecorded local tool.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Plan: Task 7

## [2026-07-12 15:24] Commit Summary

**Change Type:** Docs
**Scope:** Graph result export completion

**Summary:**
Documented how to export one PNG/PDF artifact from each supported graph tool, the
201-row boundary, light fixed-width behavior, and TI-84 exclusion. Updated the project
structure and test commands, and marked the TODO complete with exact unit, e2e,
coverage, build, visual-QA, and production-audit evidence.

**Rationale:**
Export behavior includes deliberate constraints that users and maintainers need to
understand: the file is content-only, uses desktop proportions regardless of viewport,
and refuses oversized tables rather than silently truncating mathematical data.

**References:**
- TODO.md: [2026-07-12] Graph Result Export
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
- Plan: docs/superpowers/plans/2026-07-12-graph-result-export.md

## [2026-07-12 15:43] Commit Summary

**Change Type:** Docs
**Scope:** Export preview correction

**Summary:**
Reopened graph export after the user's downloaded PNG/PDF showed that the first
implementation did not match the approved preview. Revised the contract to require
rounded bounds, readable exponent notation, at most nine representative values, and
a standard Letter landscape PDF with margins.

**Rationale:**
The original complete-table/custom-page choices turned a graph-first desktop artifact
into a tall data dump and portrait PDF. The approved visual hierarchy is the source of
truth; complete table data remains available in the interactive tool.

**Bug Fix Context:**
The reported PNG was 1,440x1,542 with 14-16 decimal window values. Its 6.6 MB PDF used
a custom 1,080x1,156.5pt portrait page instead of a standard landscape page.

**References:**
- TODO.md: [2026-07-12] Fix: Match the Approved Export Preview
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
- User-provided PNG/PDF from 2026-07-12

## [2026-07-12 15:50] Commit Summary

**Change Type:** Fix
**Scope:** Graph result export presentation

**Summary:**
Replaced raw graph bounds and calculator exponent syntax with report formatting,
selected at most nine representative table rows across each visible window, removed
the obsolete 201-row export rejection, and fitted PDF captures within an 18pt margin
on a standard Letter landscape page. Applied the corrected snapshot mapping to the
Graphing Calculator, Function Explorer, and Transformation Explorer.

**Rationale:**
The first export passed its technical checks while producing a different artifact
from the approved preview. Moving the presentation rules into the shared export model
keeps PNG and PDF content consistent and prevents each tool from reintroducing raw
values or unbounded tables.

**Bug Fix Context:**
The rejected PNG was taller than it was wide because it rendered every whole-number
x row. The PDF then copied that raster height into a custom portrait MediaBox. The
corrected tests require a wide PNG, representative values, readable notation, and a
792x612pt Letter landscape PDF.

**References:**
- TODO.md: [2026-07-12] Fix: Match the Approved Export Preview
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md

## [2026-07-12 15:57] Commit Summary

**Change Type:** Fix
**Scope:** Export artifact composition

**Summary:**
Kept the primary tool summary beside the graph and moved secondary analysis panels
into a two-column details band below it. Added a browser assertion that the most
content-heavy Transformation Explorer export remains wider than it is tall and
ignored generated visual-QA files under `output/playwright`.

**Rationale:**
Real artifact inspection found that stacking every information panel in the narrow
sidebar made the Transformation Explorer 1,470px tall. The horizontal details band
preserves every required fact while restoring the approved desktop composition.

**Bug Fix Context:**
This issue was visible only in the downloaded Transformation Explorer PNG; unit and
signature checks did not reveal that the sidebar was controlling the grid height.

**References:**
- TODO.md: [2026-07-12] Fix: Match the Approved Export Preview
- Visual QA: output/playwright/*-corrected.png

## [2026-07-12 16:08] Commit Summary

**Change Type:** Fix
**Scope:** Export audit closure and documentation

**Summary:**
Closed the post-implementation `spec-gap-auditor` findings with real capture-path
content assertions for every tool, PDF coverage for both explorers, wide-window
export checks, flexible integer-power normalization, and defensive wrapping for long
equations. Updated the README, specification, implementation-plan warning, and TODO
to describe the corrected artifact rather than the rejected complete-table design.

**Rationale:**
File signatures and outer dimensions alone could not prove that the downloaded
artifact contained rounded values, readable equations, a dominant graph, or no
controls. Inspecting the exact mounted node passed to `html-to-image` verifies that
wiring while keeping raster output tests deterministic and independent of OCR.

**Bug Fix Context:**
The first correction fixed the user's specific graph but the audit found that spaced
or parenthesized powers could still show caret notation and long equations could
expand fixed-width regions. Both cases now have regression coverage.

**References:**
- TODO.md: [2026-07-12] Fix: Match the Approved Export Preview
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
- `spec-gap-auditor` post-implementation review

## [2026-07-12 16:20] Commit Summary

**Change Type:** Docs
**Scope:** Export visual regression design

**Summary:**
Added the previously omitted raster-baseline contract for all three downloadable
graph artifacts. Defined canonical fixtures, deterministic date and font inputs, a
0.1% pixel tolerance, platform-independent baseline paths, and an explicit-only
approval command. Added the required TDD task to TODO.md.

**Rationale:**
The original plan treated visual comparison as a manual completion check, which could
not protect the approved artifact from later drift. Committed golden PNGs turn that
approved composition into an executable contract while semantic assertions continue
to explain failures.

**Bug Fix Context:**
The first implementation passed signature, dimension, and content tests despite not
matching the preview shown to the user. This design addresses that planning defect
directly.

**References:**
- TODO.md: [2026-07-12] Test: Approved Export Raster Baselines
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md

## [2026-07-12 16:22] Commit Summary

**Change Type:** Docs
**Scope:** Export raster baseline plan

**Summary:**
Added a two-task implementation plan for deterministic downloaded-PNG snapshots and
their review workflow. The plan defines the exact Playwright fixtures, red/green
commands, bundled Inter weights, platform-independent snapshot path, explicit update
script, verification gates, and atomic commits.

**Rationale:**
The approved visual design needs an executable maintenance workflow, not only a
baseline requirement. Separating read-only comparison from intentional replacement
makes visual changes reviewable and prevents normal tests from approving regressions.

**References:**
- TODO.md: [2026-07-12] Test: Approved Export Raster Baselines
- Plan: docs/superpowers/plans/2026-07-12-export-raster-baselines.md

## [2026-07-12 16:27] Commit Summary

**Change Type:** Test
**Scope:** Approved export raster baselines

**Summary:**
Added a dedicated Playwright visual suite that freezes the export date, downloads the
real PNG from each supported graph tool, and compares it with a platform-independent
approved baseline at a 0.1% differing-pixel tolerance. Pinned OFL-1.1 Inter 5.2.8 and
loaded its regular, semibold, and bold weights so local macOS and Linux CI use the
same export typography. Added separate read-only and explicit-update npm commands.

**Rationale:**
Structural checks explain artifact content but cannot protect visual hierarchy. The
golden files encode the approved composition, while fixed time, font, graph geometry,
theme, and Chromium version remove the major sources of irrelevant raster drift.

**References:**
- TODO.md: [2026-07-12] Test: Approved Export Raster Baselines
- Plan: Task 1

## [2026-07-12 16:32] Commit Summary

**Change Type:** Docs
**Scope:** Export visual baseline review

**Summary:**
Documented the read-only comparison and explicit replacement commands, baseline
location, required human review, and ignored mismatch evidence. Marked the raster
baseline task complete with exact unit, browser, coverage, typecheck, build, audit,
and clean-worktree evidence.

**Rationale:**
Maintainers need a clear distinction between running visual tests and approving a new
design. Normal and CI runs now have an explicit documented guarantee that they cannot
modify or add tracked PNG expectations.

**References:**
- TODO.md: [2026-07-12] Test: Approved Export Raster Baselines
- Plan: Task 2

## [2026-07-12 16:45] Commit Summary

**Change Type:** Docs
**Scope:** Graph export Function Details

**Summary:**
Defined and planned per-equation mathematical analysis for Graphing Calculator
exports. The contract covers exact curated parents and degree-two polynomials,
visible-window numerical fallback, explicit confidence states, color ownership,
omission rules, and removal of the old viewport-summary panel.

**Rationale:**
Window bounds and function counts describe the renderer, not the mathematics the user
wants to preserve. A typed pure-analysis boundary keeps uncertainty explicit and
prevents React presentation code from making unsupported mathematical claims.

**References:**
- TODO.md: [2026-07-12] Feature: Mathematical Function Details in Graph Export
- Plan: docs/superpowers/plans/2026-07-12-graph-export-function-details.md

## [2026-07-12 17:39] Commit Summary

**Change Type:** Feature
**Scope:** Graph function analysis

**Summary:**
Added a pure graph-analysis module that returns typed exact, approximate,
not-applicable, or not-determined results for domain, range, intercepts, and vertical
and horizontal asymptotes. Curated parent functions and constant, linear, and
quadratic polynomials receive exact results; other valid expressions use deterministic
visible-window sampling with every inferred value labeled as approximate.

**Rationale:**
The export needs mathematically useful facts without presenting numerical guesses as
global truths. Keeping confidence in the result type makes omission and labeling rules
testable before the values reach the report UI.

**References:**
- TODO.md: [2026-07-12] Feature: Mathematical Function Details in Graph Export
- Plan: Task 1

## [2026-07-12 17:44] Commit Summary

**Change Type:** Feature
**Scope:** Graphing Calculator export

**Summary:**
Replaced the Graph Information viewport/count panel with one color-coded Function
Details section per plotted equation. The export now presents domain, range,
intercepts, and applicable asymptotes from the typed analysis engine, and the browser
test rejects the former panel. Updated the reviewed PNG baselines after inspecting all
three actual downloadable artifacts.

**Rationale:**
The report should preserve useful mathematics rather than repeat window bounds already
shown in its header. Equation-colored sections retain ownership when multiple functions
are exported, while omitted and not-determined states avoid misleading `N/A` rows.

**References:**
- TODO.md: [2026-07-12] Feature: Mathematical Function Details in Graph Export
- Plan: Tasks 2 and 3

## [2026-07-12 18:01] Commit Summary

**Change Type:** Fix
**Scope:** Graph export Function Details confidence

**Summary:**
Prevented discontinuities from being reported as numerical x-intercepts by excluding
detected asymptote intervals and verifying each bisection result against the function.
Changed polynomial properties from exact to approximate whenever three-decimal display
rounding loses information, retained legitimate small coefficients, added required
visible-window scope, and gave every equation-owned export section a stable ID.

**Rationale:**
Confidence labels are part of the mathematical result, not presentation decoration.
Property-level confidence prevents a structurally analyzable polynomial from making an
incorrect exact-value claim, while root verification distinguishes zero crossings from
sign changes caused by poles. Stable IDs preserve color ownership for duplicate plots.

**Bug Fix Context:**
The spec-gap audit reproduced `1/(x - 2.0013)` as a false x-intercept and identified
that `x^2 - 2` rendered `±1.414` without an approximation label.

**References:**
- TODO.md: [2026-07-12] Feature: Mathematical Function Details in Graph Export
- Plan: Tasks 1 through 3

## [2026-07-12 18:04] Commit Summary

**Change Type:** Docs
**Scope:** Graph export Function Details completion

**Summary:**
Marked the implementation plan and feature TODO complete with the final audited unit,
browser, visual, static-analysis, build, coverage, and production-audit evidence.

**Rationale:**
The completion record now distinguishes exact and approximate property confidence and
captures the additional safeguards required by the spec-gap review, so future changes
can reproduce the same definition of done.

**References:**
- TODO.md: [2026-07-12] Feature: Mathematical Function Details in Graph Export
- Plan: docs/superpowers/plans/2026-07-12-graph-export-function-details.md
## [2026-07-12 18:16] Commit Summary

**Change Type:** Docs
**Scope:** Export interval notation and filename timestamps

**Summary:**
Defined the approved contract for interval-notation Graphing Calculator export facts
and local `YYYY-MM-DD-HHmmss` timestamps on every supported PNG and PDF filename.
Documented exact, approximate, singleton, excluded-point, and visible-window behavior,
along with TDD and visual-regression requirements.

**Rationale:**
Structured interval formatting preserves mathematical meaning and confidence, while
local calendar fields ensure the saved filename matches the user's date and time rather
than UTC.

**References:**
- TODO.md: [2026-07-12] Feature: Export Interval Notation and Local Timestamps
- Spec: docs/superpowers/specs/2026-07-12-export-interval-notation-local-timestamps-design.md
## [2026-07-12 18:26] Commit Summary

**Change Type:** Docs
**Scope:** Export interval notation and local timestamps plan

**Summary:**
Added the three-task TDD implementation plan for structured exact and visible-window
interval notation, local `YYYY-MM-DD-HHmmss` filenames, mounted-artifact assertions,
reviewed raster updates, and full completion verification.

**Rationale:**
Separating mathematical notation, local-time naming, and artifact approval gives each
behavior an independent red/green cycle and keeps visual baseline replacement behind
the existing explicit review command.

**References:**
- TODO.md: [2026-07-12] Feature: Export Interval Notation and Local Timestamps
- Spec: docs/superpowers/specs/2026-07-12-export-interval-notation-local-timestamps-design.md
- Plan: docs/superpowers/plans/2026-07-12-export-interval-notation-local-timestamps.md
## [2026-07-12 18:29] Commit Summary

**Change Type:** Feature
**Scope:** Graph export interval notation

**Summary:**
Added a pure structured interval formatter for all-real, bounded, excluded-point,
between, closed sampled, and visible-domain union notation. Integrated it into exact
parent and polynomial analysis plus approximate visible-window domain/range facts,
while preserving intercept, asymptote, omission, and confidence behavior.

**Rationale:**
Formatting structured sets avoids fragile inequality string parsing and prevents a
finite sampled interval from being confused with a proven global domain. Singleton
polynomial ranges use set notation because a single value is not an interval.

**References:**
- TODO.md: [2026-07-12] Feature: Export Interval Notation and Local Timestamps
- Plan: Task 1
## [2026-07-12 18:32] Commit Summary

**Change Type:** Feature
**Scope:** Export download filenames

**Summary:**
Changed the shared filename formatter to append local date and 24-hour time through
seconds as `YYYY-MM-DD-HHmmss`. Updated pure PNG/PDF tests and browser contracts for
Graphing Calculator, Function Explorer, and Transformation Explorer, including PDF
filename assertions that were previously absent for the two explorers.

**Rationale:**
Local calendar getters make the filename match the user's actual date and time; UTC
ISO serialization changed a Phoenix evening export from July 12 to July 13. Seconds
keep repeated downloads distinct without making filenames unreadable.

**References:**
- TODO.md: [2026-07-12] Feature: Export Interval Notation and Local Timestamps
- Plan: Task 2
## [2026-07-12 18:38] Commit Summary

**Change Type:** Docs
**Scope:** Interval notation and local timestamp completion

**Summary:**
Documented the completed interval-notation and local filename behavior, the reviewed
Graphing raster replacement, unchanged explorer baselines, and final unit, browser,
coverage, typecheck, build, and production-audit evidence.

**Rationale:**
The completion record makes the mathematical notation boundary, local-time semantics,
and explicit visual approval reproducible for future maintainers.

**References:**
- TODO.md: [2026-07-12] Feature: Export Interval Notation and Local Timestamps
- Spec: docs/superpowers/specs/2026-07-12-export-interval-notation-local-timestamps-design.md
- Plan: Task 3
## [2026-07-12 18:58] Commit Summary

**Change Type:** Fix
**Scope:** Graph export domain and range contract

**Summary:**
Corrected the specifications and task record so domain and range are always global
properties. Defined exact support for reciprocal powers of linear expressions and
required `Not determined` instead of viewport-derived domain/range for unsupported
expressions.

**Rationale:**
Visible-window sampling can provide evidence about displayed crossings and asymptotes,
but it cannot prove a function's global domain or range.

**Bug Fix Context:**
The implementation labeled sampled x/y viewport bounds as domain/range, causing
mathematically incorrect report facts for expressions outside exact analysis support.

**References:**
- TODO.md: [2026-07-12] Fix: Global Domain and Range Semantics
- Spec: docs/superpowers/specs/2026-07-12-graph-result-export-design.md
## [2026-07-12 19:03] Commit Summary

**Change Type:** Fix
**Scope:** Graph function global analysis

**Summary:**
Added exact analysis for nonzero constants divided by positive integer powers of a
linear expression. Reciprocal domains now exclude the denominator root globally,
range follows odd/even power parity and numerator sign, and intercept/asymptote facts
are exact when losslessly displayable. Unsupported fallback now returns
`Not determined` for domain/range instead of sampled viewport bounds.

**Rationale:**
Domain and range are global set properties. Viewport sampling cannot establish either,
whereas the supported reciprocal form has a small exact algebraic solution.

**Bug Fix Context:**
`1/x^2` previously reported `[-4, 0) ∪ (0, 4]` and a sampled y-range for a
`[-4, 4]` window. It now reports domain `(-∞, 0) ∪ (0, ∞)` and range
`(0, ∞)` independently of the current graph window.

**References:**
- TODO.md: [2026-07-12] Fix: Global Domain and Range Semantics
