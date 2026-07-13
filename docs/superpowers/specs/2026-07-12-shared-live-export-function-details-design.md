# Shared Live and Export Function Details Design

**Date:** 2026-07-12
**Status:** Approved design; awaiting written-spec review

## Objective

Make Function Details a visible part of all three interactive graph tools and ensure
each tool's live details and downloaded artifact consume the same mathematical values.
All domain and range values use standard interval notation.

## Shared Data Contract

Mathematical policy remains in pure domain modules:

- Graphing Calculator and Function Explorer use `analyzeFunction(expression, window)`
  plus `functionAnalysisFacts(analysis)`.
- Transformation Explorer uses `parentDetails(parent)` and
  `transformedDetails(parent, coefficients, expression)`.
- Live React surfaces and export snapshot builders consume those results without
  re-deriving or rewriting mathematical strings.

The shared boundary is display-ready fact data, not a shared screenshot or export DOM.
Interactive pages may use semantic tables/lists while the fixed export renderer retains
capture-safe inline styles.

## Graphing Calculator

- After at least one equation is plotted, render a Function Details region directly
  below the graph and before the value table.
- Render one repeated section per equation, identified by its stable equation ID and
  left-border curve color.
- Each section title includes the displayed equation and each fact comes from
  `functionAnalysisFacts(analyzeFunction(...))`.
- Recompute memoized facts when equations or the displayed graph window change because
  visible-window intercept/asymptote evidence can change. Exact global domain/range does
  not change with the viewport.
- Do not render an empty details region before any equation is plotted.
- Export continues to use the same analysis functions and produces the same fact text.

## Function Explorer

- After a function is plotted, render a color-owned Function Details region directly
  below the graph and before the value table.
- Add a Function Details section to the export using the identical fact array.
- Preserve Current Readout, Asymptotes and End Behavior, Visible Guides, and value-table
  information as explorer-specific supplementary data.
- Before a function is plotted, do not render Function Details.
- Unsupported global domain/range displays `Not determined`; visible numerical evidence
  remains explicitly scoped.

## Transformation Explorer

- Preserve the existing live parent/transformed comparison table and export comparison
  section.
- Change only domain/range formatting at the shared `FunctionDetails` source:
  - all reals: `(-infinity, infinity)` rendered as `(-∞, ∞)`;
  - inclusive lower bound: `[a, infinity)`;
  - strict lower bound: `(a, infinity)`;
  - inclusive upper bound: `(-infinity, a]`;
  - strict upper bound: `(-infinity, a)`;
  - excluded point: `(-infinity, a) union (a, infinity)`;
  - closed finite interval: `[a, b]`.
- Intercepts and asymptotes retain `x = ...` / `y = ...` notation.
- Degenerate and custom-function unavailable states remain unchanged.
- Because live and export already consume the same `FunctionDetails`, both surfaces must
  show identical interval text without separate adapters.

## Presentation and Accessibility

- Use compact work-focused panels consistent with existing cards and tables; do not add
  instructional marketing copy.
- Use equation colors as non-text ownership cues while retaining text equation labels.
- Use semantic headings and definition-list or table relationships so property labels
  remain available to assistive technology.
- Long interval unions and equations wrap without changing graph dimensions.

## Testing

Strict Red -> Green -> Refactor applies.

- Unit tests change Transformation `formatInterval`, parent details, and transformed
  details expectations to interval notation.
- Component tests cover a reusable live fact presentation component, including color,
  equation title, wrapping, and empty-state behavior.
- Graphing browser tests verify live/export fact parity for `x^2` and `1/x^2`, multiple
  equation color ownership, and no live details before plotting.
- Function Explorer browser tests verify live/export parity for `1/x^2` and preserve its
  readout/asymptote export sections.
- Transformation browser tests verify the live table and mounted export contain the
  same interval values for parent and transformed functions.
- Update only raster baselines whose visible content changes; inspect every changed
  baseline through the explicit workflow.
- Run coverage, Astro diagnostics, production build, all Playwright tests, read-only
  visual tests, and production dependency audit.

## Risks and Tradeoffs

- `analyzeFunction` performs deterministic sampling for unsupported visible facts;
  memoization prevents repeated work on unrelated React renders.
- Transformation details still support only curated parents; custom functions remain
  explicitly unavailable rather than receiving a second inconsistent analyzer.
- Adding live details increases vertical page length but keeps the graph, controls, and
  value table dimensions stable.

## Acceptance Criteria

1. Graphing Calculator shows one live Function Details section per plotted equation.
2. Function Explorer shows live Function Details after plotting.
3. Transformation Explorer domain/range uses interval notation.
4. Every tool's live details and exported details show identical mathematical values.
5. `1/x^2` displays domain `(-∞, 0) ∪ (0, ∞)` and range `(0, ∞)` everywhere details are
   shown.
6. Existing export-only supplementary readouts, controls, and TI-84 exclusion remain
   unchanged.
7. Automated, accessibility, and reviewed visual verification passes without tracking
   generated actual/diff screenshots.
