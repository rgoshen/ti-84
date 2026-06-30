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