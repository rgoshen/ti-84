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

**Status:** Done on `feature/graph-result-export`. Graphing Calculator export domains
and ranges now use structured interval or singleton-set notation, including approximate
visible-window unions around detected asymptotes. Every supported PNG and PDF filename
uses the user's local `YYYY-MM-DD-HHmmss` timestamp. Final verification: 176/176 Vitest
tests, 56/56 Playwright tests including 3/3 read-only visual baselines, zero Astro
diagnostics, six production pages built, 87.12% statements / 82.5% branches / 89.77%
functions / 89.98% lines, and zero production vulnerabilities. Only the reviewed
Graphing baseline changed; generated actual/diff PNGs remain ignored.
## [2026-07-12] Fix: Global Domain and Range Semantics

**Objective:**
Stop presenting viewport coverage as mathematical domain/range and add exact global
analysis for reciprocal powers such as `1/x^2` and `1/(x - 2)`.

**Approach:**
- Recognize nonzero constants divided by a positive integer power of a linear
  expression before numerical fallback.
- Return exact global domain, range, intercept, and asymptote results for supported
  reciprocal forms.
- Return `Not determined` for unsupported global domain/range while retaining clearly
  scoped visible-window evidence for intercepts and vertical asymptotes.
- Correct the specifications and artifact assertions that encoded viewport semantics.

**Tests:**
- TDD cases for `1/x^2`, `1/(x - 2)`, odd/even reciprocal powers, and unsupported
  `sin(x^2)` fallback.
- Mounted artifact and reviewed Graphing raster coverage.
- Full unit, coverage, Astro, build, Playwright, visual, and production-audit gates.

**Risks & Tradeoffs:**
- Exact support remains deliberately bounded; unsupported expressions prefer
  `Not determined` over plausible but false global claims.
- A reciprocal denominator root is excluded from the domain even when it lies outside
  the current graph window.

**Status:** Done on `feature/graph-result-export`. Supported reciprocal powers receive
exact global domain/range, intercept, and asymptote analysis; unsupported fallback
renders `Not determined` for domain/range. Final verification: 176/176 Vitest tests,
57/57 Playwright tests including the exact `1/x^2` export and 3/3 read-only visual
baselines, zero Astro diagnostics, six production pages built, 86.52% statements /
81.44% branches / 88.43% functions / 88.87% lines, and zero production
vulnerabilities. No approved raster baseline changed for this correction.
## [2026-07-12] Feature: Shared Live and Export Function Details

**Objective:**
Show Function Details in the interactive Graphing Calculator and Function Explorer,
and make live/export details across all three graph tools use the same values and proper
interval notation.

**Approach:**
- Reuse `analyzeFunction` facts for Graphing Calculator and Function Explorer live and
  export surfaces.
- Place compact live detail sections in each tool's left control column.
- Change Transformation Explorer's shared structured interval formatter so its live
  comparison table and export update together.
- Preserve explorer-specific readouts and custom/degenerate unavailable states.

**Tests:**
- Unit tests for all Transformation interval shapes and transformed details.
- Component coverage for live fact presentation and wrapping.
- Browser live/export parity tests for all three tools, including `1/x^2`.
- Reviewed raster baselines and full coverage, Astro, build, Playwright, and audit gates.

**Risks & Tradeoffs:**
- Unsupported visible-fact sampling must be memoized on expression/window changes.
- Details add page height but must not resize the graph or controls.
- Custom Transformation functions remain explicitly unavailable.

**Status:** Complete. Verified 178/178 Vitest tests, 57/57 Playwright tests including
3/3 reviewed export baselines, zero Astro diagnostics, six production pages built,
85.95% statements / 81.15% branches / 85.79% functions / 88.14% lines, and zero
production vulnerabilities.

## [2026-07-12] Feature: Interactive Function Details Placement

**Objective:**
Move live Function Details into the left control column at the user-approved position
for each graph tool without changing exports or any other behavior.

**Approach:**
- Move existing JSX mount points without changing their data or presentation logic.
- Place details after Plotted equations, Animate a limit, and Transform respectively.
- Preserve export snapshot builders and artifact composition exactly.

**Tests:**
- Browser DOM-order assertions for all three approved placements.
- Existing live/export parity coverage, full Playwright, Astro, and read-only export
  visual verification.

**Risks & Tradeoffs:**
- The 340px control column requires existing long-value wrapping to remain intact.
- DOM movement must not accidentally move details into export capture markup.

**Status:** Complete. Verified 178/178 Vitest tests, 57/57 Playwright tests, 3/3
unchanged export visual baselines, zero Astro diagnostics, and six production pages
built. No export snapshot or approved PNG changed.

## [2026-07-23] Feature: Angle Explorer (degrees ↔ radians)

**Objective:**
Add `/explorers/angles`: sweep an angle on an adjustable-radius circle, read it five
ways at once (degrees, turn fraction, ×2π, exact π-multiple, decimal radians) plus
arc length, and convert in both directions via linked degree/radian fields.

**Approach:**
Three pure modules — `angle.ts` (exact arithmetic), `angle-parse.ts` (input parsing
with a whitelist guard before mathjs), `angle-render.ts` (SVG path geometry) — behind
one React component rendering hand-authored SVG. Not function-plot: the diagram is
polar, not y = f(x).

**Tests:**
Unit: fraction reduction incl. 180°→π and 37°→37π/180; parser valid/invalid/injection
cases; arc paths at >180° and exactly ±360°. E2E: slider drives readout, `pi/3` → 60°,
`1` rad → 57.2958°, invalid input leaves the diagram intact, reset restores defaults.

**Risks & Tradeoffs:**
A full ±360° arc cannot be drawn with one SVG `A` command and must be split. Exact
π forms must be suppressed for non-integer degrees or the readout prints absurd
fractions. mathjs `evaluate` on raw input is a known injection surface.

## [2026-07-27] Feature: Unit Circle Coordinates

**Objective:**
Add the terminal point `(x, y)` to the Angle Explorer in the three-part form the
standard unit-circle reference chart uses — degrees, radian measure, and exact
coordinates (`30° — π/6 — (√3/2, 1/2)`) — so moving the angle or radius slider shows
not just how far around the circle the sweep goes, but where it lands.

**Approach:**
- New pure module `src/scripts/explorer/unit-circle.ts` holding an `ExactValue` type
  (`sign · √radicand / denominator`) that covers all five chart magnitudes:
  `0, 1/2, √2/2, √3/2, 1`. Stores only the first quadrant (0/30/45/60/90) and derives
  the other twelve angles by reference angle plus quadrant sign.
- Latex / plain-text / spoken formatter trio, mirroring the one `angle.ts` already
  establishes for π multiples, so the KaTeX readout, plain-text export, and
  screen-reader live region each get their own output channel.
- Coordinate label pinned beside the terminal dot in `angle-diagram.ts`, with placement
  clamped to the edge rather than clipping the viewBox. Because that builder is shared,
  the label reaches the exported PNG/PDF for free.
- Readout block in `AngleExplorer.tsx` with the chart-style triple line plus worked
  equations written out concretely: `x = r·cos θ = 1.2 × √3/2 ≈ 1.0392`.
- Export gains a `Point (x, y)` fact and two Representations table rows (7 of 9 max).

**Tests:**
- `unit-circle.test.ts`: all 16 angles cross-checked against `Math.cos`/`Math.sin`;
  negative and past-360° normalisation; `null` for non-special and non-integer degrees;
  every formatter across zero / unit / radical / negative; no `-0` in any output.
- `angle-diagram.test.ts`: label present; anchor stays inside the viewBox across the
  full `r × θ` extremes; clamp engages with the anchor unchanged at the overflow
  boundary; label never crosses the origin or overlaps its own terminal dot; exact pair
  at `r = 1` on a special angle, decimals otherwise.
- Component: `1 ×` prefix dropped at `r = 1`; `cos 37°` rather than a radical for a
  non-special angle; spoken string includes coordinates.
- E2E: coordinates block updates on radius-slider movement; new rows present in the
  exported artifact.

**Risks & Tradeoffs:**
Deriving twelve angles from five risks a sign error a literal table would not — mitigated
by cross-checking every angle against `Math.cos`/`Math.sin`. The coordinate label can
crowd a whole-radian tick label near the terminal side; accepted, since true collision
avoidance needs text metrics a pure string builder does not have. Coordinates are
measured from θ and ignore β, so with β ≠ 0 the label travels with the dot while
reporting θ's values — intentional, because using `β + θ` would kill exact radicals for
every non-zero β. Overflow detection uses `labelWidth(text)`, a character-count estimate
rather than measured text, since the builder has no access to font metrics; when the
outward anchor would overflow the viewBox, the anchor clamps at the edge rather than
flipping inward — flipping would grow the text toward the centre and, at mid radii near
the horizontal, run it across the origin and onto the far side of its own dot — and a
12px vertical nudge (away from the horizontal) keeps the clamped label clear of the
terminal dot it would otherwise sit on top of.

**References:**
- Spec: docs/superpowers/specs/2026-07-27-unit-circle-coordinates-design.md

## [2026-07-27] Fix: HTML cache headers in the nginx image

**Objective:**
Stop the container serving stale pages after a release. `nginx.conf` sets no
`Cache-Control`, so browsers fall back to heuristic freshness (RFC 9111 §4.2.2) and
treat cached HTML as fresh for roughly 10% of its age at `Last-Modified` — without
revalidating. Astro fingerprints its bundles (`AngleExplorer.DVuvR4UI.js`), so a stale
HTML document keeps pointing at the previous bundle name and the newly built one is
never requested. Symptom: a correct `docker compose up --build` appears to change
nothing.

**Approach:**
- `Cache-Control: no-cache` on HTML documents — permits caching but forces
  revalidation, so a changed page is picked up on the next load. Not `no-store`, which
  would forbid caching entirely and discard the cheap 304 path.
- `Cache-Control: public, max-age=31536000, immutable` on `/_astro/` — those filenames
  are content-hashed, so a changed file is a changed URL and can never go stale.

**Tests:**
Integration test running `nginx:alpine` against this repo's real `nginx.conf` over a
fixture root, asserting both header policies plus the existing clean-URL behaviour.
Testing through the Playwright suite would be false confidence — it serves the site
with `astro preview`, which never loads `nginx.conf`.

**Risks & Tradeoffs:**
- Adds a Docker dependency to a new `test:integration` script. Kept out of `npm test`
  so the unit loop stays fast and daemon-free; wired into CI separately.
- `immutable` is unsafe for any non-fingerprinted asset, so the long-cache rule is
  scoped to `/_astro/` rather than by file extension.

**References:**
- RFC 9111 §4.2.2 (heuristic freshness)

## [2026-07-27] Fix: whole-radian tick label collides with the coordinate readout

**Objective:**
Around θ ≈ 1 rad the `1 rad` tick label and the terminal point's coordinate readout
render on top of each other, leaving both unreadable. Measured on the built site, the
overlap runs from roughly 55° to 70°, worst at 60–65° (~28–34px of horizontal overlap).

**Approach:**
The collision is structural, not a rounding artifact: the tick label sits at
`(r + 0.22) · unit` from centre and the coordinate anchor at `r · unit + LABEL_GAP` —
about 5px apart radially on the same circle — so as θ approaches 1 rad the only
separation left is angular, and it goes to zero. Pushing either label outward is not
available: at the maximum radius 1.5 the tick label already sits 151px from centre in a
160px half-viewBox.

Suppress the tick's *text* while it would overlap, keeping its tick *line* drawn, so the
radian position stays marked. Implemented by giving the coordinate label a single
geometry function that both the markup builder and the overlap test consume, so the two
cannot disagree about where the label is.

**Tests:**
Unit tests over the pure builder: text dropped at 60°, kept at 30° and 90°, kept at 60°
when no coordinate label is drawn at all, and the tick line present in every case.
Verified against the built site by measuring rendered bounding boxes across a θ sweep.

**Risks & Tradeoffs:**
- Loses the radian cue at the angles where degrees-vs-radians is most instructive; the
  tick line remains as the positional marker.
- Width is estimated from character count (no font metrics in a pure string builder), so
  the band is approximate. Erring wide costs a slightly early suppression, which is the
  cheaper failure than two overlapping labels.

**References:**
- Screenshot: Angle Explorer at 30°, reported 2026-07-27

## [2026-07-28] Feature: Full Equation Input (Phase 1 — linear in y)

**Objective:**
Accept any equation linear in `y` on all three equation inputs — Graphing Calculator,
Function Explorer, Transformation Explorer — rearranging it into `y = f(x)` and showing
both forms. Closes the Phase 1 half of GH-26. Today all three carry a duplicated regex
that strips a leading `y =`, so `2y = x + 4` is rejected outright even though the
rearrangement is exactly the Algebra I lesson the tool exists to teach.

**Approach:**
New pure module `src/scripts/graphing/equation-input.ts` exporting
`parseEquationInput(raw): EquationParse`, a discriminated union. Any equation linear in
`y` is `A(x)·y + B(x) = 0`, so `B = simplify(F, {y:0})`, `A = F(y=1) − B`, and the solved
form is `simplify(-(B)/(A))` — mathjs substitutes `y` symbolically while leaving `x`
free, so the result is a string and every downstream consumer is untouched. Linearity is
verified by checking `F(y=2) ≡ 2A + B` at sample x values; `A ≡ 0` means no `y` is
present. `EquationItem` gains an additive `input?: string` used only for labels. The
three duplicated `normalizeExpr` copies are deleted — `y = sin(x)` is subsumed by the
general solver.

**Tests:**
Unit tests over the pure module in the node env: the full verified case table
(`2y = x+4`, `3y + 2x = 6`, `x*y = 1` → `1/x`, `y^2 = x` rejected, `2x + 3 = 7`
rejected), backward compatibility for `sin(x)` / `y = sin(x)` / `Y = sin(x)`, and
rejection of `y >= x` and `y = x = 3`. Full existing suite must pass unmodified — `expr`
keeps its shape by design, so any failure signals the additive-field guarantee broke.
One Playwright spec for the two-line label, asserting on text not `svg` descendants.

**Risks & Tradeoffs:**
- Uppercase `Y` is the most likely silent regression: today's regex is case-insensitive
  but mathjs treats `Y` and `y` as distinct symbols. Explicit normalization plus a
  pinning test.
- Linearity is sampled at four x values, not proven symbolically. An equation undefined
  at all four is misclassified as nonlinear — a false negative that rejects valid input
  rather than plotting something wrong, which is the safe direction to fail.
- `simplify` output is correct but occasionally clumsy (`(y-1)/2 = x` → `2 * (x + 1/2)`).
  Accepted rather than writing an expression-tree pretty-printer, which this codebase
  deliberately avoids elsewhere.
- Three components change at once; the shared module carries all logic and the existing
  suite covers each surface.

**References:**
- Issue: GH-26
- Spec: docs/superpowers/specs/2026-07-28-full-equation-input-design.md

## [2026-07-28] Fix: Clear the technical debt parked during GH-26 Phase 1

**Objective:**
Correct every deferred finding from the Phase 1 review loop rather than filing them.
Seven items were parked as "SHIP with follow-up"; standing policy is to fix debt when
it is encountered, while the context that found it is still loaded.

**Approach:**
- **Accessibility (WCAG 2.1 AA).** KaTeX ran with `output: 'html'`, which marks its
  visual spans `aria-hidden` and emits no MathML — every rendered equation on the site
  was silent to screen readers. Consolidated all 8 `renderToString` call sites into one
  pure `src/scripts/katex-html.ts` using `htmlAndMathml`. Fixes the a11y defect and the
  DRY violation in a single move, and being DOM-free it is unit-testable in the node env.
- **Reason accuracy.** `solveLinearY` checked `usable < MIN_USABLE_SAMPLES` before
  `!linear`, so an equation that is provably non-linear but defined at only one sample
  (`sqrt(x-4.05)*y^2 = x`) was reported INVALID. A mismatch at any defined sample is
  positive proof, so `!linear` is now checked first.
- **Double evaluation.** `A(x)` was evaluated twice per sample. Cached from the first
  pass; semantics unchanged because every sample's value is recorded, skipped or not.
- **Exhaustiveness.** `equationToTex` used if/if/return-null; now a `switch` with a
  `never` default, so a new `SplitResult` variant is a compile error, not a silent null.
- **Function Explorer export.** Its on-screen card showed both entered and solved forms
  while its exported legend and details title showed only the solved form. Threaded
  `entered` through, matching the Graphing Calculator: entered form in the legend and
  details title, solved form retained in the table header (that column holds f(x)).
- **LINEARITY_TOL.** Investigated and deliberately NOT changed — documented instead.

**Tests:**
New `katex-html.test.ts` (5 tests) asserting a MathML track is emitted and the visual
track stays `aria-hidden`. Two new `solveLinearY` cases pinning NOT_LINEAR_IN_Y vs
INVALID. Full suite 334/334, integration 4/4, e2e 83/83.

**Risks & Tradeoffs:**
- The MathML change was the only real risk, since it alters KaTeX's DOM and the export
  path rasterises the DOM to PNG. Verified by same-platform A/B: exported PNGs are
  BYTE-IDENTICAL with and without MathML, so visual baselines cannot shift. This is
  stronger evidence than a Docker run, being platform-independent.
- `LINEARITY_TOL` stays absolute. A relative tolerance would not fix the reported case
  (`1e-10*y^2 + y = x` differs from linear by ~2e-10 against values of order 1, i.e. a
  relative error ~1e-10, below any epsilon that still tolerates float noise). Catching
  it needs ~1e-12 absolute, which invites false rejections. The limit is documented in
  the code rather than traded for a worse failure mode.

**References:**
- Issue: GH-26 (PR #27)
- Ledger: .superpowers/sdd/2026-07-28-full-equation-input/progress.md

## [2026-07-28] Feature: Implicit Relations (GH-26 Phase 2)

**Objective:**
Render true relations — `x² + y² = 25`, `y² = x`, `e^y = x` — on the Graphing Calculator
via function-plot's implicit sampler, closing the half of GH-26 that Phase 1 deliberately
deferred. Also picks up vertical lines (`x = 3`), which fall out of the same path and
which a physical TI-84 cannot graph in Func mode at all.

**Approach:**
`parseEquationInput` gains a `kind: 'function' | 'relation'` discriminator on its SUCCESS
branch; a relation's `expr` is `(lhs) - (rhs)` in x and y, exactly what `fnType: 'implicit'`
consumes. `NOT_LINEAR_IN_Y` routes to relation, as does `NO_Y_PRESENT` unless `B` is also
identically zero (`0 = 0` stays rejected). `plot.ts` branches its datum builder one line;
`drawPointsOverlay` and `attachHoverReadout` skip relations. The details panel, value
table, export table and points checkbox stand down for relation rows, which instead show
a short note; the export legend still lists them because the exported graph shows them.
Both explorers reject relations with a message naming the Graphing Calculator.

**Tests:**
Unit coverage of the full routing table (relations, vertical lines, degenerate `0 = 0`,
and every Phase 1 function case still `kind: 'function'`). E2E: a circle renders with many
subpaths, no markers, no details entry, no table column; mixed with `sin(x)` to pin
stacking; `x = 3` for the vertical line; explorer rejection message. Phase 1's suite must
pass unmodified. No new visual snapshot — baselines are Linux/Docker-only.

**Risks & Tradeoffs:**
- `attachHoverReadout` is the sharpest edge: `evalAt` on a relation throws because `y` is
  unbound, and it runs on every pointer move.
- `validate()` must bind BOTH x and y for relations, or every relation is rejected as
  INVALID before reaching the renderer. Caught during spec self-review.
- Implicit sampling costs 22–25 ms per relation at 600×400 (measured); several at once
  re-sampled per zoom frame could feel sluggish. Not pre-optimised — the zoom handler is
  already rAF-throttled.
- Interval sampling can miss very thin features. Inherent to the sampler.
- `kind` touches every consumer of `expr` — deliberate, so the compiler enumerates the
  degradation work, but a wider diff than the user-visible surface suggests.

**References:**
- Issue: GH-26 (Phase 2)
- Spec: docs/superpowers/specs/2026-07-28-implicit-relations-design.md

## [2026-07-29] Feature: Angle Explorer Wave Projection

**Objective:**
Teach the step the Angle Explorer stops short of — that sweeping an angle and recording one
coordinate generates a wave. A `Wave` radio group (`none` · `sin θ` · `cos θ`, defaulting to
`none`) reveals a strip below the circle, and the angle slider traces the selected wave from
0 out to θ. Also moves the explorer's default angle from 30° to 0°, so the first drag of the
slider is the one that draws the wave from nothing.

**Approach:**
New pure builder `angle-wave.ts` (DOM-free string concatenation, mirroring `angle-diagram.ts`)
draws the strip: x-domain −2π…2π matching the angle slider's range, ticks at all 17 multiples
of π/4 with labels staggered onto two baselines, y-domain fixed at ±1.5, and the curve traced
in 2° steps from 0 toward θ. The wave plots `r·sin θ` / `r·cos θ`, so its height agrees with
the coordinate readout already on screen; the strip's caption reuses `coords.yLatex` /
`coords.xLatex` rather than formatting the value a second time. Stacked layout forecloses a
tie-line, so `buildAngleDiagramSvg` gains an optional `projection` that highlights the
matching reference-triangle leg in a new `ExplorerColors.wave`. `buildReadout` and the two
plain-text formatters are extracted out of the component first — they are untestable inside a
`.tsx` under the node test env, which is what currently blocks fixing the θ = 0 readout.

**Tests:**
Unit: tick positions and exact-π labels, both scales, `wavePath`'s zero gate and direction,
amplitude scaling with r, sin's oddness and cos's evenness, sin-vs-cos at θ = 0, and a domain
sweep for NaN. The core invariant — the projection leg's length equals `r·|sin θ|` / `r·|cos θ|`
for any β — is asserted directly. Plus `wave`'s 3:1 non-text contrast in both themes and the
θ = 0 readout collapse. E2E: default `none` with no strip in the DOM, reveal/remove, radio
arrow keys, curve growth under slider drag, cos's non-zero marker at θ = 0, amplitude under
the radius slider, and reset. Seven existing assertions depend on the 30° default and are
updated without weakening any of them. No visual snapshot — this explorer has no baseline.

**Risks & Tradeoffs:**
- 17 π/4 labels is the tightest thing in the design; staggering is the mitigation and
  labelling only π/2 multiples is the retreat.
- Losing the tie-line is an accepted cost of the stacked layout. The projection leg and a
  shared marker colour carry the link, and that needs a browser check before done.
- `wave`'s hex must clear 3:1 in both themes (test-enforced) *and* read distinctly from the
  initial-side blue (needs eyes). Green is the fallback family.
- The exported circle shrinks 560 → 360 px when a wave is included, to stay inside the
  template's 560 budget.
- `buildReadout` is extracted while untestable, so it is characterised with tests before the
  θ = 0 change lands, keeping the two commits separable.

**References:**
- Spec: docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md
- Extends: docs/superpowers/plans/2026-07-23-angle-explorer.md

**Status:** Done on `feature/angle-wave-projection` — ten-task TDD plan executed
task-by-task with per-task review. `Wave` radio group (`none` · `sin θ` · `cos θ`,
default `none`) reveals the strip and traces it from 0 to θ as the angle slider is
dragged; the projection leg highlights the matching reference-triangle side on the
circle; the default angle moved from 30° to 0°. The exported PNG/PDF carries both
figures — the circle at 360px plus the wave strip at its own 960×190 viewBox — with
a conditional `Wave` legend entry and details section. Page copy updated. Final
verification: 407/407 Vitest, `astro check` clean, 100/103 Playwright (the 3 failures
are pre-existing `export-visual.spec.ts` macOS-vs-Linux baseline mismatches,
unrelated to this feature and not regenerated per this project's Linux/Docker-only
baseline rule), production build green. Browser-verified (task 9): the circle's
projection leg and the wave strip's curve/drop-line share one colour and read
clearly linked at the default β = 0°; the link weakens (accepted risk) when β is
rotated off-axis since the leg rotates with the circle while the strip stays flat;
all 17 π/4 tick labels are legible at desktop and 375px mobile widths; the wave
teal stays distinct from the initial-side blue in both themes.

## [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units

**Objective:**
Let the Angle Explorer show the chart students are actually asked to memorise. Adds a
**Circle labels** selector (Degrees | Radians) governing every angle label on the figure,
and a **Show standard angles** toggle that draws the full sixteen-mark reference ring
(multiples of 30° and 45°) labelled in the selected unit.

**Approach:**
- New pure module `angle-standard.ts` — `AngleUnit`, `STANDARD_ANGLES`, and
  `standardAngleLabel`. Radian labels delegate to the existing
  `formatPiText(piMultiple(deg))`, so the feature introduces no new arithmetic.
- `angle-render.ts` gains `countingTicks(thetaDeg, unit)`: radians delegates to today's
  `tickAngles` unchanged; degrees emits quarter turns (90°/180°/270°) toward θ.
- `angle-diagram.ts` gains `unit` and `showStandardAngles`. Standard labels share the
  counting ticks' `r + 0.22` label radius so the two read as one ring, and all marks are
  positioned at `betaRad + angle` so β rotates them rigidly.
- Label collisions resolve by a total priority order — coordinate label > standard-angle
  label > counting-tick text — generalising the suppression rule already in the file. Only
  text is ever dropped; tick lines always survive.
- `AngleExplorer.tsx` gains a bordered control panel matching the Wave group, both settings
  in `DEFAULTS` for `Reset`, and both carried into the export snapshot.

**Tests:**
- `angle-standard.test.ts` — all sixteen labels in both units, edges `0 → "0"`,
  `180 → "π"`, `330 → "11π/6"`; set is ascending, sixteen long, duplicate-free.
- `angle-render.test.ts` — degrees quarter-turns, always-at-least-one floor, negative θ
  direction; radians behaviour asserted unchanged.
- `angle-diagram.test.ts` — absent when off, sixteen when on, labels track the unit, β
  rotates them, every row of the priority table, plus a domain sweep over
  r ∈ [0.5, 1.5] × θ ∈ [−360, 360] in both units asserting no label leaves the viewBox.
- `tests/e2e/angle.spec.ts` — toggle on and count marks, Degrees mode reads `30°`, `Reset`
  restores both defaults.

**Risks & Tradeoffs:**
- Three label systems on one ring; the priority order is the mitigation and the domain
  sweep is the proof. Escape hatch if it still crowds: drop the standard label to font-size
  8, which changes no architecture.
- Suppression means a counting label can blink as θ sweeps past a standard mark. Accepted
  over hiding the counting ticks entirely, because showing both lessons at once is the
  point of the feature.
- Defaults (Radians, standard angles off) preserve today's rendering, which is what keeps
  the Linux/Docker-only visual PNG baselines valid. Changing those defaults later forces a
  baseline regeneration.

**References:**
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
- Extends: docs/superpowers/plans/2026-07-23-angle-explorer.md,
  docs/superpowers/specs/2026-07-29-angle-wave-projection-design.md

**Status:** Spec approved on `feature/angle-standard-angles`; implementation plan pending.

## [2026-08-02] Feature: Angle Explorer Tangent Wave

**Objective:**
Add `tan θ` as a fourth option in the Angle Explorer's `Wave` selector, keeping `none`,
`sin θ`, and `cos θ` unchanged. Reverses the `tan θ` exclusion recorded in the 2026-07-29
wave-projection design.

**Approach:**
- Per-function y-domain: ±4 for tan, ±1.5 for sin/cos, derived from `fn` inside the builder
  so a caller cannot pair the wrong domain with a function.
- Dashed vertical asymptotes at ±π/2 and ±3π/2; the traced path breaks at each one, with the
  break point computed exactly at `atan(domain)` rather than interpolated.
- `waveValue` returns `number | null` so the compiler forces every call site to handle the
  undefined value at ±90°/±270°.
- Circle highlights the tangent segment on the unit circle at x = 1, whose length is exactly
  `tan θ` — preserving the leg-equals-plotted-height invariant sin/cos already carry.
- Caption shows the full cancellation chain `tan θ = y/x = (r sin θ)/(r cos θ) = …`, which
  explains why the radius slider does not move the tan curve.
- Widen `ExactValue.denominator` to `1 | 2 | 3` so `√3/3` has an exact form; the three
  formatters already interpolate the value generically and need no change.

**Tests:**
- Unit: `exactTangent` cross-checked against `Math.tan` at all sixteen chart angles;
  `exactCoordinates` proven never to emit denominator 3; r-cancellation asserted
  (`waveValue('tan', θ, 0.5) === waveValue('tan', θ, 1.5)`); no subpath spans an asymptote;
  subpath endpoints land on the domain edge; tangent segment length `=== |tan θ| · unit` for
  any β and any r.
- E2E: dragging the radius leaves tan's `d` unchanged but changes sin's; 90° shows undefined
  with no marker; sweeping past 90° yields multiple `M` commands; reset clears the strip;
  export carries the tan wave.

**Risks & Tradeoffs:**
- Switching sin ↔ tan rescales the box, so equal pixel heights mean different values.
- The radius slider looks inert while tan is selected — correct, but needs a browser check
  that the caption actually explains it.
- Widening `denominator` touches a type on the coordinate path; mitigated by a sweep test.
- A clamped tangent segment near 90° could be misread as a real value.

**References:**
- Spec: `docs/superpowers/specs/2026-08-02-angle-wave-tangent-design.md`
