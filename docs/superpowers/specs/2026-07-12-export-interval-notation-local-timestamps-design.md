# Export Interval Notation and Local Timestamp Design

**Date:** 2026-07-12
**Status:** Implemented and verified on `feature/graph-result-export`

## Objective

Improve downloadable graph artifacts by displaying Graphing Calculator domain and
range values in standard interval notation where mathematically appropriate, and by
including the user's current local date and time in every supported export filename.

## Scope

- Change domain and range notation in Graphing Calculator export Function Details.
- Preserve existing intercept and asymptote notation such as `x = 2` and `y = 0`.
- Preserve the interactive Transformation Explorer's existing inequality notation.
- Apply local date-time filenames to PNG and PDF exports from Graphing Calculator,
  Function Explorer, and Transformation Explorer.
- Keep the embedded TI-84 excluded from exports.

## Interval Notation

Interval notation is derived from structured mathematical information in the graph
analysis layer, not by replacing text in React.

Exact domain and range examples:

| Mathematical set | Export notation |
|---|---|
| All real numbers | `(-infinity, infinity)` |
| Values greater than or equal to 0 | `[0, infinity)` |
| Values greater than 0 | `(0, infinity)` |
| All real values except 0 | `(-infinity, 0) union (0, infinity)` |
| Values from -1 through 1 | `[-1, 1]` |
| A single constant value 3 | `{3}` |

The rendered artifact uses the mathematical glyphs `∞` and `∪`, producing forms such
as `(-∞, ∞)` and `(-∞, 0) ∪ (0, ∞)`. Source-level documentation uses ASCII
descriptions where that improves portability.

Curated parent functions use their existing structured `Interval` metadata. Exact
constant, linear, and quadratic analysis creates interval or singleton-set output
directly. A rounded analytic bound retains its existing `Approx.` confidence label.

Numerical viewport sampling does not produce domain or range. Those are global
properties, so an expression outside exact global-analysis support renders
`Not determined` for both. Sampling remains available for visible-window intercept and
vertical-asymptote evidence, with every numerical result prefixed `Approx.` and
suffixed `in visible window`. Properties proven not applicable remain omitted.

## Local Filename Timestamp

Every supported download filename follows:

`<tool-slug>-YYYY-MM-DD-HHmmss.<format>`

Example:

`graphing-calculator-2026-07-12-181530.png`

The timestamp uses the browser user's local calendar fields. It does not use
`Date.prototype.toISOString()`, because ISO serialization is UTC and can produce a
different date from the user's local date. Every numeric field is zero-padded:

- month and day: two digits;
- hour, minute, and second: two digits;
- time: 24-hour format without punctuation so the filename is portable.

The existing download controller continues to create one `Date` at export time and
passes it to the pure filename formatter. PNG and PDF generated from separate user
actions receive their respective action times.

## Testing

Strict Red -> Green -> Refactor applies.

- Unit tests cover all-real, bounded, strict-bound, excluded-point, singleton, and
  approximate visible-window interval output.
- Unit tests construct a date from explicit local calendar components and verify the
  exact `YYYY-MM-DD-HHmmss` filename without depending on the test machine timezone.
- Existing filename tests for all export tools are updated to require the timestamp.
- Graphing browser assertions verify interval notation in the mounted export artifact.
- Fixed-clock Playwright tests verify the downloaded PNG and PDF filenames include
  local date and time.
- Approved raster baselines are regenerated only if the visible notation changes
  their pixels, then reviewed through the existing explicit snapshot workflow.
- Full coverage, Astro diagnostics, build, Playwright, visual, and production-audit
  gates remain required.

## Risks and Tradeoffs

- Numerical visible-window evidence is not a global mathematical proof; confidence and
  scope text are mandatory, and it is never used for domain or range.
- Exact analysis is deliberately bounded. Unsupported global properties remain
  `Not determined` until a sound symbolic analyzer is added.
- Seconds substantially reduce filename collisions, but two exports of the same tool
  and format within one second can still share a name. Milliseconds are intentionally
  excluded to keep filenames readable.

## Acceptance Criteria

1. Exact Graphing Calculator domain and range facts use interval notation where
   appropriate and singleton-set notation for constants.
2. Unsupported global domain and range facts render `Not determined`; they are never
   inferred from viewport bounds or sampled extrema.
3. Intercepts, asymptotes, omission rules, and `Not determined` behavior are preserved.
4. Every supported PNG and PDF filename includes the user's local date and time
   through seconds in a portable 24-hour format.
5. TI-84 remains excluded.
6. Automated and visual verification passes without tracking generated actual/diff
   screenshots.
