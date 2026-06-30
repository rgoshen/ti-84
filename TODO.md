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

## [2026-06-29] Planned Feature: Custom Equation Graphing Calculator

**Objective:**
Add a separate, in-house graphing calculator that lets the user type in an equation (e.g. `y = x^2`), renders it on a coordinate plane, and stacks multiple equations onto the same graph until the user clears them.

**Approach:**
- Keep the current static `index.html` + CDN Tailwind setup (no React/build-tool migration).
- Add a plotting library to render equations:
  - **Function Plot** (lightweight, ~30KB, D3-based) — preferred for simplicity and size.
  - Alternative: **Desmos API** (drop-in calculator component, handles stacking natively) or **Plotly.js** (full-featured but heavier).
- Build the equation input and stacked-equation list (chips) in plain Tailwind + vanilla JS — approximately 50 lines of JS.
- Reuse the existing light/dark theme toggle; ensure the plot respects the active theme.
- Provide a "Clear all" control to remove every stacked equation from the graph.

**Tests:**
- Manual: typing a valid equation renders correctly; multiple equations stack on the same axes; invalid input shows a friendly error; Clear removes all equations; theme toggle updates plot colors.
- If JS logic grows, add deterministic unit tests for the equation-input parsing/chip management.

**Risks & Tradeoffs:**
- Plotting library choice affects bundle size and API ergonomics; Function Plot is small but less capable than Desmos/Plotly.
- Parsing free-text equations safely (no eval) — use the library's built-in expression parser or a small safe-math evaluator.
- Keeping the stack in sync between the chip list and the rendered plot requires careful state management in vanilla JS.
- Avoid MUI to prevent a dual-styling-system (CSS-in-JS vs Tailwind) clash and a premature React migration; revisit if the app grows well beyond this feature.

**Status:** Planned — not yet started.