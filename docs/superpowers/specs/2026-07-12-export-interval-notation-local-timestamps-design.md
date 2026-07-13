# Export Interval Notation and Local Timestamp Design

**Date:** 2026-07-12
**Status:** Approved design; awaiting written-spec review

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

Numerical fallback remains explicitly limited to the visible window:

- a function sampled as defined across the full x-window reports an approximate
  closed interval using the visible x bounds;
- detected vertical asymptotes split that visible domain into interval pieces with
  open endpoints at the approximate asymptote positions;
- sampled range reports an approximate closed interval from the observed minimum to
  maximum;
- every numerical result remains prefixed `Approx.` and suffixed
  `in visible window`.

If reliable interval endpoints cannot be determined, the existing `Not determined`
state remains unchanged. Properties proven not applicable remain omitted.

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

- Numerical interval output describes sampled visible-window behavior, not a global
  mathematical proof; the confidence label and scope text are mandatory.
- A union of visible-domain intervals can become long when many asymptotes are
  detected. Existing wrapping protects the fixed-width artifact, and unreliable
  cases may remain `Not determined`.
- Seconds substantially reduce filename collisions, but two exports of the same tool
  and format within one second can still share a name. Milliseconds are intentionally
  excluded to keep filenames readable.

## Acceptance Criteria

1. Exact Graphing Calculator domain and range facts use interval notation where
   appropriate and singleton-set notation for constants.
2. Approximate domain and range facts use interval notation, `Approx.`, and visible
   window scope.
3. Intercepts, asymptotes, omission rules, and `Not determined` behavior are preserved.
4. Every supported PNG and PDF filename includes the user's local date and time
   through seconds in a portable 24-hour format.
5. TI-84 remains excluded.
6. Automated and visual verification passes without tracking generated actual/diff
   screenshots.
