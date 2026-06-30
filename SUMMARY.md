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
