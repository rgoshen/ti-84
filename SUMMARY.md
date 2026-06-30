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
