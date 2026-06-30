## [2026-06-29] Feature: TI-84 Calculator Website with Theme Toggle and Docker

**Objective:**
Provide a simple, professional single-page site that embeds the online TI-84 calculator with a light/dark theme toggle, served from a Docker container.

**Approach:**
- Static `index.html` using Tailwind CSS via CDN with class-based dark mode and a `localStorage`-backed theme toggle.
- Embed the provided iframe (`https://ti84calc.com/ti84calc`) inside a responsive container.
- Package with an Nginx Alpine Docker image for one-command deployment.

**Tests:**
No automated tests (static site). Manual verification: theme toggle persists across reloads, iframe renders, Docker build and run succeed.

**Risks & Tradeoffs:**
- Tailwind via CDN is simplest but not recommended for production performance; acceptable for this lightweight page.
- Availability of the embedded iframe depends on the third-party site.

## [2026-06-29] Feature: Custom Equation Graphing Calculator

**Objective:**
Add a separate, in-house graphing calculator that lets the user type in an equation (e.g. `y = x^2`), renders it on a coordinate plane, and stacks multiple equations onto the same graph until the user clears them.

**Approach:**
- Keep the current static `index.html` + CDN Tailwind setup (no React/build-tool migration).
- Add a plotting library to render equations:
  - **Function Plot** (lightweight, ~30KB, D3-based) — preferred for simplicity and size. ✅ Used.
  - Alternative: **Desmos API** (drop-in calculator component, handles stacking natively) or **Plotly.js** (full-featured but heavier).
- Build the equation input and stacked-equation list (chips) in plain Tailwind + vanilla JS.
- Reuse the existing light/dark theme toggle; ensure the plot respects the active theme. ✅ Done.
- Provide a "Clear all" control to remove every stacked equation from the graph. ✅ Done.
- Manual window (x/y min/max) controls plus native scroll-to-zoom and drag-to-pan. ✅ Done.

**Tests:**
- Manual: typing a valid equation renders correctly; multiple equations stack on the same axes; invalid input shows a friendly error; Clear removes all equations; theme toggle updates plot colors. ✅ Verified in Docker (HTTP 200).
- If JS logic grows, add deterministic unit tests for the equation-input parsing/chip management.

**Risks & Tradeoffs:**
- Plotting library choice affects bundle size and API ergonomics; Function Plot is small but less capable than Desmos/Plotly.
- Parsing free-text equations safely (no eval) — Function Plot's built-in expression parser is used.
- Keeping the stack in sync between the chip list and the rendered plot requires careful state management in vanilla JS.
- Avoid MUI to prevent a dual-styling-system (CSS-in-JS vs Tailwind) clash and a premature React migration; revisit if the app grows well beyond this feature.

**Status:** Implemented in graphing.html.

## [2026-06-29] Fix + Feature: Point markers on the curve at whole-number gridline crossings

**Objective:**
1. (Bug) Plotted point markers were offset from the curve. Make markers sit exactly on the curve.
2. (Feature) Show a marker at every spot where the curve crosses a whole-number gridline — integer x OR integer y — and nowhere else. Examples: (-1, 0.5) ✓ (integer x), (-0.5, 1) ✓ (integer y), (-0.5, 0.5) ✗ (neither).

**Approach:**
- Bug: Function Plot draws the curve inside `<g class="canvas">` which carries a margin transform `translate(40,20)`. The overlay's pixel scales are derived from axis ticks measured in that canvas-local space, but markers were appended to the SVG root, so each point was offset by the margin. Fix: append the overlay into `g.canvas` so markers share the curve's coordinate space. ✅ Done & verified in-browser.
- Feature: New `gridlineCrossings(expr)` computes, within the window:
  - integer-x crossings: (x, f(x)) for each integer x, kept only if (x, y) is inside the window;
  - integer-y crossings: solve f(x)=k for each integer k by sampling f finely and bisecting at sign changes;
  - de-duplicate (a lattice point is found by both passes) and cap total markers per equation to avoid clutter on oscillating curves.
- `drawPointsOverlay` plots the returned points instead of integer-x only. `integerXs()` stays for the value table.

**Tests:**
- No JS test harness exists for this static page; verify behaviourally with headless Playwright (MCP):
  - every marker lies on the curve (marker y ≈ f(marker x));
  - every marker has integer x OR integer y (none with both fractional);
  - all markers fall inside the window;
  - known cases: y=2x² shows (±1,2),(0,0) plus integer-y crossings (±0.707,1),(±1.22,3),…
- Manual: toggle "Show points", change window, switch shapes/colors.

**Risks & Tradeoffs:**
- Sign-change root-finding misses tangent gridline touches (e.g. sin(x) peaks at y=±1, where the curve grazes the line without crossing); acceptable for scope — the user's examples are all transversal crossings.
- Fine sampling (1000 pts) × integer-y lines costs CPU; mitigated by precomputing f once per equation, a density cap, and skipping the horizontal scan when extremely zoomed out.

**Status:** Done & verified in headless browser. Markers sit on the curve (≤1.03px from the rendered polyline, sub-pixel vs the 4px marker), and appear only at integer-x or integer-y gridline crossings (verified for 2x², -0.5x, sin(x); none with both coordinates fractional).

## [2026-06-29] Fix: Keep point markers on the curve through zoom/pan

**Objective:**
After the alignment + gridline-crossing work, markers still drifted off the curve once the user scrolled to zoom or dragged to pan.

**Approach:**
Root cause: Function Plot owns interactive zoom/pan (a `rect.zoom-and-drag` with its own d3-zoom). It redraws the curve and axes internally but never re-runs our `drawPointsOverlay`, and our `state` never learned the new domain — so markers froze and drifted (measured ~12px after one wheel zoom). Fix: capture the Function Plot instance, subscribe to its `all:zoom` event, and on each gesture read the live domain from `instance.meta.xScale/yScale`, mirror it into `state`, sync the Window inputs, and redraw the overlay + table. Throttled with `requestAnimationFrame`; deliberately does not call `renderPlot` (which would reset the zoom).

**Tests:**
Headless (Playwright/MCP): after a wheel-zoom and after a drag-pan, max marker-to-curve distance stays ≤ ~2px (was 12px and growing); `state` and the Window input boxes track the zoomed domain.

**Risks & Tradeoffs:**
- Couples the overlay refresh to Function Plot's `all:zoom` event + `meta` scales (verified against the loaded library, not docs — context7 lacks this package). If we swap the plotting library later, this hook moves with it.
- Markers mark whole-number crossings only; the half-unit minor gridlines Function Plot adds at high zoom are intentionally not marked (matches the stated rule). Revisit if "follow the visible gridlines" is wanted.

**Status:** Done & verified.

## [2026-06-29] Migration: Static HTML → Astro + TypeScript (Phase 0 + 1)

**Objective:**
Move the project onto Astro + TypeScript as a multi-page STATIC site (simple landing, /ti-84, /graphing) to support SEO, maintainability, and a test suite — incrementally, without throwing away working behavior. Scope: the two existing features only (TI-84 page + graphing calculator). The AI solver is explicitly OUT of scope for now, so output stays `static` (no SSR/adapter). Decision record: goal = real product; first move = tests + build, keep function-plot; interactivity = **React islands + shadcn/ui** (Radix primitives on Tailwind, no MUI). NOTE: earlier TODO entries that say "avoid MUI / avoid React migration" predate this decision and are superseded — they were written under the old "stay a static HTML page" plan.

**Approach (Phase 0 + 1 only):**
- Phase 0 — Tooling: hand-authored Astro project (npm create is interactive) with pinned deps. Astro + TypeScript (strict) + Tailwind v4 via @tailwindcss/vite + global.css `@import "tailwindcss"`. Vitest (via astro/config getViteConfig) for unit tests; Playwright for e2e. Replace CDN libs (function-plot, mathjs, katex, d3) with pinned npm deps.
- Phase 1 — Port /graphing: src/pages/graphing.astro hosts a React island (`client:only="react"`):
  - `src/scripts/graphing/math.ts` — pure, framework-free: evalAt, integerXs, bisect, gridlineCrossings (unit-tested). ✅ Done.
  - `src/scripts/graphing/plot.ts` — framework-free function-plot wrapper: render, tick-reading scales, overlay-in-canvas, zoom/pan sync. Called from React via a ref/effect.
  - React component(s) for the controls (equation input, plotted list, window, value table) built on shadcn/ui (Input, Button, Select, Checkbox, Card); the plot rendered into a ref'd div.
- Tests: Vitest units for math.ts (gridlineCrossings rule + bisect); Playwright e2e: markers on curve, stay on curve through zoom + pan.

**Tests / DoD:**
`npm run build` succeeds; `npm test` (Vitest) green; Playwright e2e green; the ported /graphing page matches current behavior (markers on curve at whole-number crossings, survive zoom/pan).

**Risks & Tradeoffs:**
- function-plot + bundler + d3 integration (it's a UMD-era lib); verify import works, refactor `d3.scaleLinear` → import from `d3-scale`.
- Env-var title injection (current Docker envsubst of `${SITE_TITLE_*}`) must move to Astro env / config; Docker/deploy changes deferred to Phase 2.
- Scope discipline: Phase 2 (shared shell + simple landing + ti-84 page) is a separate slice. AI solver is out of scope entirely for now (keeps output static).

**Remaining deliverables (checklist):**
- [x] Phase 0 toolchain (Astro + TS + Tailwind v4 + Vitest), pinned deps, build green.
- [x] Pure math core extracted + unit-tested (math.ts, 11 tests).
- [x] React + shadcn/ui set up (@astrojs/react, components.json, cn util, base components).
- [x] function-plot wrapper module (plot.ts): instance-scale overlay-in-canvas, zoom/pan sync. (Independently verified: markers ≤2.6px from curve; ≤1px after zoom; window inputs track zoom.)
- [x] /graphing ported as a React island (controls via shadcn/ui; plot via ref).
- [x] /ti-84 page ported (iframe src via build-time env, `src/config.ts` → `TI84_IFRAME_SRC`).
- [x] Playwright e2e: markers on curve, AND a zoom regression test (markers stay on curve through an interactive zoom + window inputs track it). webServer switched to build+preview to avoid Astro 7's persistent dev daemon.
- [x] README updated for the new stack (callout removed; structure tree + Docker section rewritten).
- [x] Favicon (`public/favicon.svg`, linked from the Base layout — kills the /favicon.ico 404).
- [x] Docker cutover: multi-stage build (node build → nginx serve dist/), env → build-time `PUBLIC_*`, legacy envsubst/entrypoint removed, `nginx.conf` clean URLs.
- [x] Remove legacy root index.html / graphing.html (deleted — fully replaced by the Astro pages).

**Status:** Done — Phase 0 (toolchain), Phase 1 (graphing React island), and Phase 2
(shared Base layout + Header, landing + /ti-84 pages, favicon, Docker multi-stage
cutover, legacy HTML removed) all complete. `npm run build` emits `/`, `/ti-84`, and
`/graphing`; `npm test` green (11). The graphing island is now theme-reactive (a
MutationObserver on `<html class>` re-themes the plot when the header toggle flips).

## [2026-06-29] Planned Feature: AI Step-by-Step Math Solver

**Objective:**
Add an AI component that accepts a math problem from the user and displays a clear, step-by-step walkthrough of how to solve it. This is a companion feature to the custom graphing calculator and lives on the same site.

**Approach:**
- Keep the static `index.html` + CDN Tailwind foundation (no React/build-tool migration).
- Frontend: a text input for the problem and a rendered "steps" panel (ordered list, Tailwind-styled) showing each step with its reasoning.
- Backend: a small serverless/API route that proxies requests to an LLM (e.g. OpenAI, Anthropic, or a local model via Ollama). The frontend never holds API keys.
  - Because the current deployment is a static Nginx container, this requires introducing a lightweight API layer (e.g. an Azure Function, Cloudflare Worker, or a small Node/Express sidecar). The static site can call the API via `fetch`.
- Prompt design: instruct the model to return structured JSON (array of `{ step_number, expression, explanation }`) so the frontend can render consistent, formatted steps rather than free-form text.
- Consider LaTeX/MathJax rendering for the math expressions in each step.
- Reuse the existing light/dark theme toggle for the solver panel.

**Tests:**
- Manual: submitting a sample problem (e.g. `2x + 5 = 13`) renders multiple ordered steps with correct math; invalid/empty input shows a friendly error; theme toggle updates the panel.
- Unit tests (if backend is added): deterministic tests for request validation, prompt construction, and JSON-response parsing.
- Evaluation set: a small set of canonical problems with expected final answers to catch regressions in model output.

**Risks & Tradeoffs:**
- Introduces a backend/API dependency — breaks the pure-static-site simplicity. Mitigate by keeping the static site as-is and adding the API as a separate deployable.
- LLM cost and latency per request; consider caching common problems and streaming responses for perceived speed.
- Hallucinated/incorrect steps — mitigate via a strong system prompt, JSON schema validation, and (optionally) a verifier pass. Surface a disclaimer that steps should be verified.
- API key security — keys must live server-side only; never embed in the static site.
- Model choice affects quality of step-by-step reasoning; a reasoning-capable model is preferred. Evaluate before committing.
- Avoid MUI (React-only) for the UI; Tailwind is sufficient for the input and steps panel.

**Dependencies:**
- Requires the API layer decision (serverless vs. sidecar) before implementation.
- Coordinate with the graphing calculator feature so both share a consistent input/panel styling system.

**Status:** Planned — not yet started.
## [2026-06-29] Feature: Graphing Calculator React Island (Astro port)

**Objective:**
Port the vanilla-JS graphing calculator (graphing.html) into a React island inside the Astro + TypeScript project, preserving its behavior — equation input (y= or bare expr), plotted-equation list (color picker, remove, show-points, point shape), window panel, plot area, and whole-number value table. Default window x[-10,10] y[-5,5]; default dark theme.

**Approach:**
- `src/scripts/graphing/plot.ts`: framework-free wrapper around function-plot. Owns render, point overlay (appended into `g.canvas` and positioned with the instance's own `meta.xScale`/`yScale` so markers sit on the curve), theme port, and throttled `all:zoom` sync via `onViewChange`.
- `src/components/graphing/GraphingCalculator.tsx`: React island. State = equations[], appliedWindow (drives plot recreation), displayWindow (mirrors zoom; feeds value table + window inputs without rebuilding). shadcn/ui controls; native `<input type=color>` swatch; KaTeX equation labels with plain-text fallback.
- `src/pages/graphing.astro`: imports global + KaTeX CSS, `<html class="dark">`, renders `<GraphingCalculator client:only="react" />`.
- Reuse tested `@/scripts/graphing/math` (evalAt, integerXs, gridlineCrossings); do not modify it.

**Tests:**
- Playwright e2e (`tests/e2e/graphing.spec.ts`): loads /graphing, plots `2x^2`, enables Show points, asserts markers exist and lie on the curve (screen-space geometric check vs the function path). Passing.
- Existing Vitest math suite (11) remains green.

**Risks & Tradeoffs:**
- function-plot ships CJS (`exports.default`); ESM interop differs between dev (esbuild) and build (Rollup). Normalized the default import to the callable in plot.ts.
- Per the wiring design, equation/applied-window/theme changes recreate the plot (resetting interactive zoom); zoom is mirrored to displayWindow for the table/inputs only. Original auto-persisted zoom across edits via shared mutable state — deferred in favor of the cleaner applied/display split.
- ~~Deferred: bold zero-axis gridlines (`boldGridAxes`)~~ — DONE: ported to `plot.ts` as `boldZeroAxes` (bolds the "0" tick line in each axis; re-applied on zoom). No in-island theme toggle (the page header has one).

**Status:** Implemented; left in working tree (not committed) for review.
