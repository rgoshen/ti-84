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
- DECISION (kept): equation/applied-window/theme changes recreate the plot, which resets an in-progress interactive zoom; zoom is mirrored to displayWindow for the table/inputs only. The original auto-persisted zoom across edits via shared mutable state. We deliberately keep the reset-on-edit behavior (cleaner applied/display split, lower risk; resetting the view on an equation change is a defensible default). Not a pending task.
- ~~Deferred: bold zero-axis gridlines (`boldGridAxes`)~~ — DONE: ported to `plot.ts` as `boldZeroAxes` (bolds the "0" tick line in each axis; re-applied on zoom). No in-island theme toggle (the page header has one).

**Status:** Implemented; left in working tree (not committed) for review.

## [2026-06-30] Fix: Dark-mode plot grid + bold axes legibility

**Objective:**
In dark mode the function-plot gridlines were nearly invisible and the x=0/y=0 axes did not read as bold (unlike light mode). Make the dark theme's grid visible and the origin cross prominent, with no change to the (already-good) light theme.

**Approach:**
- Root cause (confirmed by probing the live SVG, both themes): function-plot draws the origin axes as `.x.origin`/`.y.origin` paths stroked **solid black at 0.2 opacity** — `applyThemeToPlot` never recolored them, so on the dark `#0f172a` background they vanished (black@20% ≈ invisible; on white that same paint is the `#ccc` axis you see in light mode). Separately, every gridline is forced to `opacity: 0.1` by function-plot, where even white lands only ~24/255 above a near-black background, so the slate-500 grid was ~9/255 from the background — fainter than light's grid.
- Extracted the palette + colour math into a pure, node-testable `src/scripts/graphing/theme.ts` (`themeColors`, `hexToRgb`, `blendOver`, `relativeLuminance`, `lineContrast`, `lineDelta`). `ThemeColors` gains `gridOpacity` + `axisOpacity`.
- Dark theme: brighten grid to slate-400 and raise `gridOpacity` to 0.24; recolour the origin cross to slate-300 (`#cbd5e1`) at `axisOpacity` 0.55. Light theme reproduces function-plot's own defaults exactly (slate-400 grid @0.1, black origin @0.2) → pixel-identical.
- `applyThemeToPlot` now overrides stroke AND opacity for gridlines (`.axis line, .axis path`) and recolours the `.origin` cross. Re-applied after each zoom/pan (unchanged wiring).

**Tests:**
- Vitest `theme.test.ts` (new): blends-before-measuring contrast helpers; asserts dark origin WCAG contrast ≥ 2.0, dark grid sRGB delta ≥ 24, light remains visible, and dark ≥ light for both (the reported asymmetry). Started red against the pre-fix palette, green after.
- Playwright e2e (new test): loads /graphing in dark mode, asserts the `.origin` stroke is light (not black) at opacity ≥ 0.4 and gridline opacity ≥ 0.2 — guards the `applyThemeToPlot` wiring.

**Risks & Tradeoffs:**
- function-plot's `0.1` gridline opacity caps how much contrast colour alone can buy, so the fix raises opacity for dark; values were tuned and visually verified by screenshot in both themes.
- Selectors depend on function-plot's class names (`.origin`, `.axis line/path`); covered by the e2e guard so a future library upgrade that renames them fails loudly.

**Status:** Implemented on `feature/dark-mode-plot-contrast`.

## [2026-06-30] Feature: Hover coordinate tooltip

**Objective:**
Hovering over the plot shows a floating tooltip with the (x, y) value at the pointer. Two modes: hovering a discrete "Show points" marker shows that marker's exact coordinates; hovering along a plotted curve shows the computed (x, y) on the nearest curve at the pointer's x-coordinate.

**Approach:**
Pure helpers in new `src/scripts/graphing/hover.ts` (named constants `DOT_HIT_RADIUS_PX`, `CURVE_HIT_RADIUS_PX`, `COORD_DECIMALS`, `GESTURE_SUPPRESS_MS`; the `HoverInfo` type; `formatNumber` and `nearestWithinThreshold` pure functions). `plot.ts` adds `attachHoverReadout`, a DOM handler that hit-tests the pointer against discrete markers (snap within 8px), else the nearest curve (within 20px pixel-y of the data-evaluated curve, picked via `nearestWithinThreshold`), emits `HoverInfo | null` via a new `onHover` callback (mirroring `onViewChange`), and is rAF-throttled with gesture-suppression (no tooltip during zoom/pan). `GraphingCalculator.tsx` renders one themed `<CoordTooltip />` (position: fixed, clamped to the plot bounds, Tailwind `bg-popover text-popover-foreground`, a curve-color swatch as a non-text accent). function-plot's native crosshair tip is suppressed via a scoped CSS rule in `global.css`. Reference spec at `docs/superpowers/specs/2026-06-30-hover-coordinate-tooltip-design.md` and plan at `docs/superpowers/plans/2026-06-30-hover-coordinate-tooltip.md`.

**Tests:**
Vitest unit suite for `hover.ts` covers `formatNumber` (integers, rounding, trailing-zero trim, -0 normalization) and `nearestWithinThreshold` (picking closest within threshold, null outside, deterministic tie-break). Playwright e2e (dark mode, 8 tests): native-tip suppression (`.inner-tip` has `display: none`); dot-hover exact coords (origin marker → `(0, 0)`); curve-hover on-curve coords (computed y matches sin(x)); pointer-leave hides tooltip; tooltip text uses popover-foreground (AA contrast), not curve color. Full suites green: Vitest 20 (11 math + 3 theme + 6 hover), Playwright 8 graphing e2e.

**Risks & Tradeoffs:**
Depends on function-plot's internal DOM structure and scale objects (`meta.xScale/yScale`, `.inner-tip`, `.canvas` group) — guarded and verified by the comprehensive e2e suite. Touch/no-hover devices are explicitly deferred (tooltip is a progressive enhancement for v1; future "tap to read" feature would follow). The rAF throttle + gesture-suppression window trade some near-miss responsiveness for stable UX mid-zoom/pan.

## [2026-06-30] Feature: CI/CD pipeline (semantic-release + GHCR)

**Objective:**
Automate testing, building, versioning, changelog generation, and Docker image publishing via a mature, Conventional Commits-driven release pipeline. Enable confident, repeatable releases with minimal manual steps.

**Approach:**
- **CI** (`.github/workflows/ci.yml`): runs on every PR — `astro check` (typecheck), `npm test` (Vitest), `npm run build`, and `npm run test:e2e` (Playwright). Fails fast if any step breaks.
- **Reusable `_verify.yml`**: a private workflow job wrapping the CI commands as a single gate. Pulled by `ci.yml` (via `jobs.verify`) and called after successful releases to prevent race conditions (semantic-release tag → rebuild image with the new version tag).
- **Release** (`.github/workflows/release.yml`): triggered on merge to `main`. Runs `semantic-release` which reads Conventional Commits since the last tag, bumps `package.json` + `CHANGELOG.md`, creates the `vX.Y.Z` tag + GitHub Release, then builds a multi-arch image (linux/amd64, linux/arm64) and pushes to `ghcr.io/rgoshen/ti-84:vX.Y.Z` (+ `:latest` alias). Uses `docker/metadata-action` to generate tags and `docker/build-push-action` with QEMU for cross-platform.
- `.releaserc.json`: semantic-release config (extends `@semantic-release/github`, `@semantic-release/npm`, `@semantic-release/git`).
- Docker push credentials: `GITHUB_TOKEN` (auto-provided by Actions; scoped to the repo).

**Tests:**
- Local: `npm test` (Vitest + Playwright) validates math, theming, hover, and zoom regression before pushing.
- CI: every PR runs the full `ci.yml` gate; merge to `main` triggers `release.yml` which rebuilds and tests one more time via `_verify.yml` before release.
- Manual: after first release, verify the image pulls from GHCR and runs.

**Risks & Tradeoffs:**
- Depends on Conventional Commits discipline — a malformed commit (e.g., `fix` → patch) blocks semantic-release if the rule is wrong. Mitigated by commit lint (`.commitlintrc` deferred) and the reviewed PR process.
- Multi-arch build adds ~2–3 min per release (QEMU emulation); acceptable for a mature project.
- Initial release requires a manual `git tag v0.1.0` or first `.releaserc` run to seed the version baseline.
- GHCR package visibility must be toggled **Public** after the first release if anonymous `docker pull` is desired (GitHub setting, not code).

**References:**
- Spec: `docs/superpowers/specs/2026-06-30-cicd-pipeline-design.md`

## [2026-07-04] Feature: Function Explorer (limits & asymptotes)

**Objective:**
Add a new **Explorers** section whose first entry is a **Function Explorer**: type any function and explore its limit / asymptote behaviour interactively — drag a point along the curve, an x-slider, a live arrow-notation readout (`x → a⁻, f(x) → ∞`), animated limit sweeps toward auto-detected vertical asymptotes and `x→±∞`, and wall/floor/grid toggles. Generalises the standalone `reciprocal-square-explorer.html` (f(x)=1/x²) to any user expression, built on the app's existing **function-plot (SVG)** stack (not raw canvas). Core fix vs the original: the dragged point **pins at the window edge and never teleports across a vertical asymptote to the other branch**.

**Approach:**
- Pure, node-tested modules under `src/scripts/explorer/`: `limits.ts` (vertical-asymptote detection + end-behaviour classification), `branch.ts` (`branchOf`, `clampDragX` — the anti-teleport fix, `pinToWindow`, `sweepX`, `resolveX`), `notation.ts` (arrow-notation readout). Reuse `@/scripts/graphing/math` (`evalAt`, `bisect`).
- Extend `graphing/theme.ts` with `explorerColors(dark)` (WCAG-validated in both themes); export shared `plot.ts` helpers (`applyThemeToPlot`, `boldZeroAxes`, `asNumericScale`) for reuse.
- `src/scripts/explorer/render.ts`: function-plot wrapper (`disableZoom:false`) with a persistent SVG overlay in `g.canvas` (draggable point, sweep trail+arrowhead, dashed walls/floors) positioned via `instance.meta.xScale/yScale`, plus `on('all:zoom')` re-sync.
- `src/components/explorer/FunctionExplorer.tsx`: React island mirroring `GraphingCalculator` patterns (MutationObserver theme sync, `appliedWindow`/`displayWindow` split, mathjs validation). Pointer arbitration (drag-on-point moves the point, drag-elsewhere pans, wheel zooms); decoupled rAF sweep loop; shadcn `Slider` (new `src/components/ui/slider.tsx` over `radix-ui` — no new dep); coalesced `aria-live` readout.
- Explorers section: `src/pages/explorers/index.astro` (hub) + `function.astro`; Header 'Explorers' nav link (+ child-route active state); home landing card; config titles. `epsilon = 0.5%·(xMax−xMin)`, recomputed on window/zoom change.

**Tests:**
- Vitest (TDD-first, per slice): `limits.test.ts` (odd/even/multiple/no asymptote; `sin(x)/x` removable rejected; per-side end-behaviour), `branch.test.ts` (`clampDragX` never crosses a wall; degenerate narrow branch → midpoint; `resolveX` off-pole re-clamp; pin top/bottom/undefined; `sweepX` stops at wall/edge), `notation.test.ts` (wall/edge/value precedence, bands, tie-break), `theme.test.ts` extended (explorer palette ≥3:1 both themes).
- Playwright e2e (`tests/e2e/explorer.spec.ts`): default `1/x^2` renders; slider near 0 → `x→0⁺, f(x)→∞`; anti-teleport (drag never jumps branch); edge-pin at top inset; auto-detected sweep buttons + stop-at-wall; `tan(x)` many walls / `x^2` none; drag-vs-pan arbitration; wheel-zoom re-detects; dark boot+toggle; nav `aria-current`; `role="status"` readout + keyboard slider.

**Risks & Tradeoffs:**
- Heuristic asymptote detection can alias on oscillating functions (`sin(1/x)`); degrade gracefully (cap count; a missed pole just omits a button — drag/pin still work). Removable discontinuities rejected via a divergence probe.
- Pointer arbitration must cooperate with function-plot's internal d3-drag; prototyped first (spike) with a `disableZoom`-toggle fallback.
- Exporting helpers from `plot.ts` is visibility-only; guarded by existing graphing suites + a re-export smoke test.
- Shared `Header` `isActive` change (child-route match) guarded by an e2e assertion so existing links don't double-highlight.

**References:**
- Design: `docs/superpowers/specs/2026-07-04-function-explorer-design.md`
- Source (functionality reference only): `~/Downloads/reciprocal-square-explorer.html`

**Status:** Done on `feature/function-explorer` (spec-gap-auditor'd; gaps G1–G11 closed). Pure logic TDD'd across 6 modules; function-plot renderer + island with pointer arbitration; new Explorers section. Full suite green — 86 Vitest unit + 15 Playwright e2e (7 explorer + 8 graphing, no regressions). Verified headless (0 console errors; anti-teleport, sweeps, arbitration, dark mode).

## [2026-07-11] Feature: Transformation Explorer

**Objective:**
A second Explorers-section tool at `/explorers/transformations` that makes g(x)=a·f(b(x−h))+k tangible: pick a parent function, drag a/b/h/k, and watch the transformed curve reshape live against a dashed "ghost" of the parent, with a plain-English readout naming each transformation (shift / stretch / compress / reflect).

**Approach:**
Pure logic in `parents.ts` (8-parent catalog + per-parent default windows) and `transform.ts` (`composeExpr` via mathjs node substitution; `describeTransform` narration with EPS-tolerant knob detection and degenerate-case messages). DOM in `transform-render.ts` (two native function-plot series — dashed ghost parent + solid transformed — with unconditional `on('all:zoom')` re-sync). React island `TransformationExplorer.tsx` (single-source base model: preset fills+overrides / custom Plot deselects; signed a/b sliders + reflect toggles; window controls; `role="status"` readout). Route + hub card + config title; Header unchanged (child-route match). Reuses the shipped graphing/theme/plot helpers and shadcn controls.

**Tests:**
Vitest: `parents.test.ts`, `transform.test.ts` (compose numeric-equivalence + full narration branch/degenerate/tolerance coverage), `theme.test.ts` ghost contrast. Playwright `transformation.spec.ts` (9): dashed-parent render, slider→readout, reflect toggles, reset→identity, parent switch, custom fn, b=0 collapse message, nav `aria-current`, dark mode.

**Risks & Tradeoffs:**
Parent-series dashing depends on function-plot's `g.graph` datum order (verified). No draggable point / no animation in v1 (YAGNI). E2E uncovered a shared-Slider a11y bug — fixed (see the Fix entry below).

**Status:** Done on `feature/function-explorer` — brainstormed → spec-gap-auditor'd (gaps G1–G9 closed) → 9-task TDD plan executed subagent-driven with per-task review. Final: 9/9 transformation e2e, 24/24 full e2e, 102/102 Vitest, astro check clean, build emits 6 pages.

## [2026-07-11] Feature: Points toggle & value table in both Explorers

**Objective:**
Give both Explorers the two features the Graphing Calculator already had: a **Show points** toggle (markers at every whole-number gridline crossing) and a **value table** (one row per integer x in the current window). In the Transformation Explorer both curves are covered — markers on the parent and the transformed, and table columns `x | f(x) | g(x)` — so a transformation can be read numerically, not just seen.

**Approach:**
Reuse `gridlineCrossings` / `integerXs` / `evalAt`; export `plot.ts`'s private `makeMarker` so both explorers draw identical circle markers; add one shared, purely-presentational `ValueTable` component (real `<table>`, `scope="col"` headers). Islands compute and memoise the crossings + table values and pass **precomputed** data down — renderers and the table contain no math, which keeps `evalAt` (it re-parses on every call) out of the render path. Points default off; on/off toggle only. "Show parent" hides the parent's curve and markers but **not** its table column.

**Tests:**
4 new Playwright e2e: Function Explorer (checkbox disabled + empty table with no function; markers appear on toggle; `1/x^2` at x=2 → 0.25; `scope="col"` headers) and Transformation Explorer (markers on both curves; hiding the parent drops its markers but keeps its column; k=+2 → every g(x) = f(x) + 2). Plus a measured perf gate and a visual check.

**Risks & Tradeoffs:**
`evalAt` re-parses per call, so recomputing crossings during a slider drag was the main risk — mitigated by memoising in the island and measured at **121 fps** during a real drag with points on. Table rows are uncapped (mirrors graph); container scrolls. The graphing calculator was deliberately NOT refactored onto the shared `ValueTable` (shipped code, out of scope) — optional follow-up.

**Status:** Done on `feature/function-explorer` — brainstormed → spec-gap-auditor'd (G1–G7 closed) → 5-task plan → implemented, with the visual + perf gate passed. 36 e2e, 103 Vitest, astro check clean.

## [2026-07-11] Feature: Parent Catalog Expansion + Function Details

**Objective:**
Grow the Transformation Explorer's parent catalog from 8 to 11 (adding identity, cube
root, natural log), move the picker from buttons to a dropdown, and add a read-only
panel showing domain, range, intercepts, and asymptotes for f(x) and the live g(x).

**Approach:**
Parents declare their domain/range/asymptotes/inverse as data. A new pure module
`details.ts` maps those through g(x) = a·f(b(x − h)) + k by affine interval mapping,
so x-intercepts are exact (solve f(u) = −k/a) rather than numerically root-found.

**Tests:**
Unit: catalog integrity + inverse round-trip; details mapping (sign flips under
reflection, asymptote translation, intercepts, degenerate a=0/b=0).
E2E: dropdown selection reframes; ln shows domain x > 0; dragging h moves the VA.

**Risks & Tradeoffs:**
A second combobox breaks the existing unscoped `getByRole('combobox')` e2e selector —
must be scoped. Values render as decimals, not fractions. sin/cos report "infinitely
many" x-intercepts rather than enumerating nπ.

**Status:** Done — 11 parents (identity, ∛x, ln x added), dropdown picker, and the live
read-only details panel are implemented and verified. 135 unit / 42 e2e passing, clean
build. Whole-branch review confirmed the mapping mathematics numerically across all 11
parents. Verified in-browser: ∛x renders on both sides of the origin (the `x^(1/3)`
complex-number trap avoided), ln x renders only right of the y-axis, and shifting h
moves its vertical asymptote in step with the panel (domain x > 0 → x > 3, VA x = 0 →
x = 3, x-intercept x = 1 → x = 4).

**Deferred (deliberate):** with a = 0 and b ≠ 0 the domain does not truly collapse, yet
all six detail rows render "—". Spec chose this over special-casing each row.

## [2026-07-11] Fix: Accessible name missing on shadcn Slider thumbs

**Objective:**
`src/components/ui/slider.tsx` spreads `{...props}` (including `aria-label`, `id`) onto `SliderPrimitive.Root`, a plain `<span>` with no ARIA role. The actual interactive element — `SliderPrimitive.Thumb`, which carries `role="slider"` — receives no accessible name. This is a WCAG 2.1 SC 4.1.2 (Name, Role, Value) failure: every slider in the app (Transformation Explorer's a/b/h/k, Function Explorer's "x value") is unlabelled for assistive technology and fails `getByRole('slider', { name })` queries. Discovered while writing `tests/e2e/transformation.spec.ts` (Task 8 of the Transformation Explorer plan) — see `.superpowers/sdd/task-8-report.md` for the full diagnosis, including confirmation that the underlying slider *functionality* (value changes, readout updates) is correct and unaffected.

**Approach:**
Forward `aria-label`/`aria-labelledby` (and any other `Thumb`-relevant ARIA props) from the `Slider` wrapper's props onto `SliderPrimitive.Thumb` instead of (or in addition to) `Root`. For a single-thumb slider a plain `aria-label` prop threaded to the one `Thumb` is sufficient; Radix's docs pattern for multi-thumb sliders takes an array of labels — not needed here since every current usage is single-thumb. Needs manual verification (or an e2e assertion) that both `FunctionExplorer.tsx`'s "x value" slider and `TransformationExplorer.tsx`'s a/b/h/k sliders still resolve by name after the change.

**Tests:**
Re-enable the two currently-red assertions in `tests/e2e/transformation.spec.ts` (`getByRole('slider', { name: /k — vertical shift/i })`, `getByRole('slider', { name: /b — horizontal stretch/i })`) as the acceptance check — no new test file needed. Also add an equivalent named-role query to `tests/e2e/explorer.spec.ts` for the Function Explorer's slider (currently queried by bare `[role="slider"]`, which never caught this).

**Risks & Tradeoffs:**
`slider.tsx` is a shared primitive used by both explorers — verify the visual/`data-slot` styling hooks (`slider-thumb` class, focus ring) are unaffected by moving the prop. Low risk, single-file change, but touches every existing slider consumer.

**Status:** ✅ RESOLVED (2026-07-11, commit 8fcddea). Forwarded `aria-label`/`aria-labelledby` to `SliderPrimitive.Thumb`; both explorers' sliders now resolve by accessible name (Function Explorer's "x value" slider fixed as a bonus). The two transformation e2e assertions pass (9/9 transformation, 24/24 full e2e, no regression); styling/`data-slot` hooks unaffected. Optional follow-up remaining: add a named-role query for the Function Explorer slider in `explorer.spec.ts` (currently `[role="slider"]`).

## [2026-07-12] Feature: Graph Result Export

**Objective:**
Allow users to preserve a completed graph from the Graphing Calculator, Function
Explorer, or Transformation Explorer as one self-contained artifact. The exported
file must retain the graph and its relevant mathematical information while omitting
navigation, buttons, inputs, sliders, and other editing controls. The TI-84 remains
out of scope.

**Approach:**
- Add an accessible Export menu to each supported React island with PNG and PDF
  choices.
- Render a shared, read-only export surface at a fixed 1,440px desktop width from an
  immutable state snapshot. Render the graph off-screen at 960x560 in a light palette
  through each tool's existing renderer so mobile and desktop exports match.
- Keep one artifact per action: PNG downloads the complete surface; PDF fits that
  same surface within margins on one standard Letter landscape page.
- Use pinned, MIT-licensed `html-to-image` and `jsPDF` dependencies behind a small
  export adapter so browser conversion can be stubbed in unit tests.

**Tests:**
- Unit tests first for filenames, dimensions, export state, and the PNG/PDF adapter.
- Playwright tests for each supported tool: menu availability, successful PNG/PDF
  download, correct extension/signature, and absence from the TI-84 page.
- Visual verification at desktop and mobile browser widths to confirm the artifact
  always uses desktop proportions and contains no interactive controls.
- Representative-row selection tests and an active-animation export test for
  immutable Function Explorer captures.
- Run Vitest, Astro typecheck, production build, and the complete Playwright suite.

**Risks & Tradeoffs:**
- DOM capture relies on SVG `foreignObject`; current Chrome, Firefox, and Safari are
  supported. The artifact selects at most nine representative rows to keep capture
  dimensions bounded.
- The PDF is a raster rendering of the same PNG surface. This guarantees visual
  parity and a single page, but its text is not selectable.
- Export uses a light presentation palette for predictable sharing and printing,
  independent of the active application theme.

**Status:** Reopened by the export-preview correction below. The first implementation
passed automated checks but did not match the approved visual target when the user
inspected the actual downloaded PNG and PDF.

## [2026-07-12] Fix: Match the Approved Export Preview

**Objective:**
Correct the export artifact so it matches the approved wide desktop preview instead
of producing a tall generic report with raw machine values and an oversized portrait
PDF.

**Approach:**
- Format graph-window bounds to at most three decimal places and render integer
  exponents with readable superscripts in equation labels.
- Keep the graph dominant and replace the complete value-table dump with at most nine
  representative values selected across the visible x window.
- Keep PNG as the shared visual source, but place it with margins on a standard Letter
  landscape PDF page instead of creating a custom page from the captured pixel size.
- Preserve the content-only layout, fixed desktop graph, light palette, tool-specific
  information, and TI-84 exclusion.

**Tests:**
- Unit tests first for coordinate formatting, equation display formatting,
  representative row selection, and landscape PDF image fitting.
- Update Playwright assertions to verify rounded output-model values and a standard
  landscape PDF MediaBox.
- Inspect actual PNG and PDF exports from all three tools against the approved preview.
- Re-run Vitest, Astro check, build, coverage, and the full Playwright suite.

**Risks & Tradeoffs:**
- The artifact intentionally shows representative table values rather than every row;
  the interactive page remains the complete data source.
- Raster PDF text remains non-selectable because PNG/PDF visual parity is retained.

**Status:** Done on `feature/graph-result-export` after the user review correction.
The actual Graphing PNG is 1,440x1,139 with rounded bounds, superscript notation, and
nine selected values; its PDF is one 792x612pt Letter landscape page. Actual Function
and Transformation PNGs are 1,440x1,354 and 1,440x1,420. The repeated
`spec-gap-auditor` review led to mounted-artifact content checks for all three tools,
all-tool PDF coverage, wide-window export coverage, exponent normalization, and
long-expression wrapping. Final verification: 164/164 Vitest tests, 51/51 Playwright
tests, zero Astro diagnostics, six production pages built, 86.13% statements / 82.14%
branches / 87.69% functions / 88.33% lines, and zero production vulnerabilities.

## [2026-07-12] Test: Approved Export Raster Baselines

**Objective:**
Protect the user-approved graph export composition with automated visual regression
tests that compare the actual downloaded PNG for every supported tool. This closes
the planning gap that allowed the original implementation to diverge from the shown
artifact while still passing structural tests.

**Approach:**
- Add one focused Playwright visual suite for Graphing Calculator, Function Explorer,
  and Transformation Explorer; keep TI-84 excluded.
- Freeze date-dependent content and bundle the Inter font already named by the export
  so local and Linux CI compare the same raster inputs.
- Store platform-independent approved PNGs in the test tree and allow updates only
  through an explicit npm command.
- Retain semantic artifact assertions for precise failure diagnosis.

**Tests:**
- First run the new suite without baselines and confirm the expected missing-snapshot
  failure.
- Generate reviewed baselines, rerun the visual suite without update mode, and prove
  a deliberate pixel mutation fails comparison.
- Run Vitest, Astro check, build, the full Playwright suite, and production audit.

**Risks & Tradeoffs:**
- Raster checks are sensitive to font and browser changes; both inputs are pinned and
  baseline replacements require explicit review.
- The 0.1% pixel tolerance absorbs minor antialiasing but intentionally rejects
  meaningful composition or content drift.

**Status:** Done on `feature/graph-result-export`. The TDD red run failed three times
only because baselines were absent; the explicit update command generated the reviewed
1,440px PNGs, and two subsequent read-only runs passed 3/3 without changing Git state.
Final verification: 164/164 Vitest tests, 54/54 Playwright tests, zero Astro
diagnostics, six production pages built, 86.13% statements / 82.14% branches / 87.69%
functions / 88.33% lines, and zero production vulnerabilities. Only the three
approved baselines are tracked; subsequent actual/expected/diff PNGs remain under the
ignored `test-results/` path.

## [2026-07-12] Feature: Mathematical Function Details in Graph Export

**Objective:**
Replace the Graphing Calculator export's viewport-summary panel with useful
mathematical analysis for every plotted equation: domain, range, x-intercepts,
y-intercept, vertical asymptotes, and horizontal asymptotes.

**Approach:**
- Produce one color-coded Function Details section per equation.
- Reuse curated parent metadata for exact common-function results and add exact
  constant/linear/quadratic polynomial analysis from the `mathjs` syntax tree.
- Fall back to deterministic numerical analysis for unsupported expressions, clearly
  labeling every inferred result `Approx.` and scoping viewport-bound claims.
- Omit properties proven not applicable and show `Not determined` only when exact and
  approximate analysis are both unreliable.
- Keep graph-window bounds in the artifact header and remove the old range/count panel.

**Tests:**
- Unit tests first for result states, parent functions, polynomials, numerical roots,
  visible domain/range, vertical asymptotes, and unknown results.
- Static artifact coverage for color-coded Function Details sections.
- Playwright capture assertions plus regenerated, visually reviewed golden PNGs.
- Full Vitest, coverage, Astro, build, Playwright, and production-audit verification.

**Risks & Tradeoffs:**
- Numerical domain and range are never global claims; they are explicitly limited to
  the visible window.
- Oscillatory or pathological functions may remain `Not determined` rather than
  receive a plausible but misleading answer.
- Per-equation panels can increase artifact height when many functions are plotted;
  the graph remains fixed at 960x560 and the artifact remains one file.

**Status:** Done on `feature/graph-result-export`. The old Graph Information panel is
removed and every plotted equation owns a stable color-coded Function Details section.
Exact curated-parent and polynomial results remain unqualified only when display is
lossless; rounded or numerical results use `Approx.` with visible-window scope where
required. The spec-gap audit led to direct root verification around discontinuities,
per-property polynomial confidence, stable duplicate-equation IDs, and browser coverage
for approximate/unresolved states. Final verification: 172/172 Vitest tests, 56/56
Playwright tests including 3/3 read-only visual baselines, zero Astro diagnostics, six
production pages built, 86.43% statements / 81.56% branches / 89.34% functions /
89.37% lines, and zero production vulnerabilities. Subsequent actual/diff PNGs remain
ignored; only the three explicitly reviewed baselines are tracked.
## [2026-07-12] Feature: Export Interval Notation and Local Timestamps

**Objective:**
Use standard interval notation for Graphing Calculator export domain/range facts and
append the user's current local date and time through seconds to every supported export
filename.

**Approach:**
- Derive interval notation from structured parent and polynomial analysis rather than
  presentation-time string replacement.
- Keep numerical interval claims approximate and scoped to the visible window.
- Format filenames from local `Date` fields as `YYYY-MM-DD-HHmmss` for PNG and PDF.
- Preserve existing UI notation outside the Graphing Calculator export.

**Tests:**
- Unit coverage for exact, excluded, bounded, singleton, and approximate intervals.
- Local-calendar filename tests plus browser filename assertions for PNG and PDF.
- Mounted-artifact assertions, reviewed raster baselines, and full verification gates.

**Risks & Tradeoffs:**
- Numerical intervals remain observations within the visible window, not global proofs.
- Seconds reduce but do not eliminate collisions from repeated downloads.
- Multi-interval domains must wrap within the fixed artifact width.

**Status:** In progress. Structured interval notation and local filename timestamps are
implemented under TDD; reviewed raster and final completion verification remain.
