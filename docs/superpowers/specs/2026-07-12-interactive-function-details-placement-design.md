# Interactive Function Details Placement Design

**Date:** 2026-07-12
**Status:** Approved

## Objective

Move Function Details from the graph/result column into the left control column on all
three interactive graph tools. Export artifacts must remain unchanged.

## Placement

- Graphing Calculator: render Function Details directly after **Plotted equations**.
- Function Explorer: render Function Details directly after **Animate a limit**.
- Transformation Explorer: render Function Details directly after **Transform**.

Each details region remains a separate card or panel. Its existing content, empty
state, color ownership, semantics, test ID, and mathematical data remain unchanged.

## Scope Boundaries

- Move only the interactive JSX mount points.
- Do not change export snapshot builders or export artifact composition.
- Do not change mathematical analysis, formatting, controls, graph dimensions, value
  tables, or unrelated styling.
- Preserve DOM order so keyboard and assistive-technology reading order matches the
  visible left-column placement.

## Testing

- Add browser assertions that each details region belongs to the left column and is the
  immediate sibling after its named control card.
- Preserve existing live content and export parity assertions.
- Run focused browser tests, Astro diagnostics, the full Playwright suite, and the
  read-only export visual suite. No export baseline should change.

## Acceptance Criteria

1. All three interactive Function Details regions appear at the approved left-column
   positions.
2. Details no longer appear beneath the interactive graphs.
3. Export artifacts remain visually and semantically unchanged.
4. No other application behavior or layout is modified.
