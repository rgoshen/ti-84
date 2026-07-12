# Concrete Equation Readout — Design

**Date:** 2026-07-11
**Status:** Approved
**Component:** Transformation Explorer (`/explorers/transformations`)
**Ships in:** PR #8 (added to `feature/parent-catalog-and-details`)

## Problem

The transform readout speaks only in abstract function notation. It renders
`g(x) = 2·f(x − 3) + 1`, and at the identity it degenerates to the tautology:

```
g(x) = f(x)
This is the parent function f(x) = x² — move a slider to transform it.
```

It never shows the actual equation, `g(x) = 2(x − 3)² + 1`. A student cannot read
off the thing they are being asked to learn to write.

## Objective

Show **both** forms, one above the other:

```
g(x) = 2·f(x − 3) + 1      ← unchanged: makes clear WHICH slider did what
g(x) = 2(x − 3)² + 1       ← new: the actual transformed equation
```

At the identity the two collapse onto one line, `g(x) = f(x) = x²`, killing the
tautology.

Out of scope: everything else. The sliders, reflect toggles, step list, dropdown,
details panel, window controls, plot, and value table keep their current behavior.

## Why this is a rendering problem, not a math problem

`composeExpr` already produces the correct transformed expression — but as a
*machine* string built for mathjs and function-plot to evaluate:
`(2) * ((x - (3))^2) + (1)`. Correct, and unreadable.

Pretty-printing that back into `2(x − 3)² + 1` would mean writing an
expression-tree formatter that re-derives operator precedence and
parenthesization. Instead, each parent renders *itself* around a given argument.
The catalog already knows its own notation (`label: 'x²'`); we simply let it apply
that notation to something other than a bare `x`. A dozen one-line templates, no
parser.

## Architecture

### 1. `src/scripts/explorer/parents.ts` — parents gain a `render` template

`Parent` gains a display template, sitting beside the existing `props.solve`
function (same idea — a function stored as catalog data, display instead of math):

```ts
interface Parent {
  // …existing: id, label, name, expr, window, props
  /** f applied to `inner`, as display text. MUST return an ATOMIC string — one
   *  safe to prefix with a coefficient without extra parentheses. */
  render: (inner: string) => string;
  /** Optional nicer form when |a| ≠ 1. Only the reciprocal needs it. */
  renderScaled?: (a: string, inner: string) => string;
}
```

| id | `render('x − 3')` | `render('x')` |
|---|---|---|
| `identity` | `(x − 3)` | `x` |
| `square` | `(x − 3)²` | `x²` |
| `sqrt` | `√(x − 3)` | `√x` |
| `cube` | `(x − 3)³` | `x³` |
| `cbrt` | `∛(x − 3)` | `∛x` |
| `recip` | `1/(x − 3)` | `1/x` |
| `abs` | `\|x − 3\|` | `\|x\|` |
| `exp` | `e^(x − 3)` | `eˣ` |
| `ln` | `ln(x − 3)` | `ln x` |
| `sin` | `sin(x − 3)` | `sin x` |
| `cos` | `cos(x − 3)` | `cos x` |

**Invariant: `render('x')` must equal the parent's `label`, for all 11.** A parent's
notation applied to a bare `x` is, by definition, the label it already advertises in
the dropdown. This makes the identity readout (`g(x) = f(x) = eˣ`) agree with the
picker, and it is a strong property a test can check across the whole catalog.

**The atomicity rule is load-bearing.** `identity.render` must parenthesize a
compound argument — returning `x − 3` would let the coefficient step produce
`2x − 3`, which means something entirely different from `2(x − 3)`. Templates for
`x²`, `√x`, `|x|`, `e^x` are atomic by construction; `identity` is the one that
must add parentheses itself.

**Parenthesization is decided per parent, not by a shared rule.** Every template
parenthesizes a *compound* argument and omits parens for a bare `x`, but the exact
form differs by notation: `x²` / `(x − 3)²`, `√x` / `√(x − 3)`, `eˣ` / `e^(x − 3)`,
`ln x` / `ln(x − 3)`. Each template spells its own policy out literally — a shared
"add parens if needed" helper would have to encode each notation's quirks anyway,
so it would be cleverness without leverage.

### 2. `src/scripts/explorer/equation.ts` — new pure module

```ts
/** The inner argument b(x − h) as display text: 'x', 'x − 3', '−2x', '2(x − 3)'. */
export function innerArgument(c: Coeffs): string;

/** The concrete equation, e.g. 'g(x) = 2(x − 3)² + 1'. Null when it cannot be
 *  rendered (degenerate transform, or a custom f(x) with no template). */
export function concreteEquation(p: Parent, c: Coeffs): string | null;
```

`innerArgument` is **extracted from the existing `formatEquation`** in
`transform.ts`, which already builds exactly this string for the f-notation line —
it is not reimplemented. Both lines then derive from one source, so they can never
disagree with each other.

Composition, given the rendered atomic parent `P`:
- `a = 1` → `P`; `a = −1` → `−P`; otherwise `aP` (juxtaposed, e.g. `2(x − 3)²`).
- `k` appended as ` + 1` / ` − 4`, omitted when 0.
- The reciprocal's `renderScaled` folds the coefficient into the numerator:
  `2/(x − 3)` rather than the generic `2·1/(x − 3)`, which no textbook writes.

All identity/zero tests use the existing `EPS` from `transform.ts`, never float
`===` — slider steps land on values like `0.9999999`.

### 3. `src/components/explorer/TransformationExplorer.tsx` — readout

The readout box renders the f-notation line (unchanged) and, beneath it, the
concrete line. At the identity the two merge into `g(x) = f(x) = x²`.

The concrete equation also joins the plot's `aria-label` and the existing sr-only
live-region announcement, so it is not sighted-only.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Replace or both? | **Both** | f-notation shows *which slider* did what; concrete shows the result. Connecting the two forms is the lesson. |
| Identity | One line: `g(x) = f(x) = x²` | Kills the tautology that prompted this. |
| Degenerate `a = 0` / `b = 0` | f-notation line only, no concrete line | Otherwise `ln` prints `ln(0)`. The step list already says the graph collapses; matches the details panel showing "—". |
| Custom typed f(x) | f-notation only, as today | It has no template. The graph is unaffected. |
| Reciprocal scaling | `renderScaled` override | `2·1/(x − 3)` is not how anyone writes it. Only parent needing this. |
| Number format | Existing `formatNumber` | Consistent with the rest of the app. |

## Testing

Unit (vitest, TDD — both new units are pure):

- `parents.test.ts` — **the catalog-wide invariant: for every parent,
  `render('x') === label`.** One assertion, all 11 parents, and it catches any new
  parent added later whose template disagrees with the notation it advertises.
  Also: every `render` returns a non-empty string for a compound argument.
- `equation.test.ts`:
  - `innerArgument`: `x` (identity), `x − 3`, `x + 3` (negative h), `−x` (b = −1),
    `2(x − 3)`, `2x` (h = 0).
  - **Atomicity/precedence guard:** `identity` with a = 2, h = 3 renders
    `g(x) = 2(x − 3)`, **not** `2x − 3`. This is the defect the design is most
    likely to produce; it gets its own test.
  - All 11 parents at a = 2, b = 1, h = 3, k = 1 — the full table above.
  - Reciprocal scaling: `g(x) = 2/(x − 3) + 1`, not `2·1/(x − 3) + 1`.
  - `a = −1` → leading minus: `g(x) = −(x − 3)² + 1`.
  - Identity coefficients → the concrete equation equals the parent's own label.
  - Degenerate `a = 0` and `b = 0` → returns `null`.

E2E (playwright), added to `tests/e2e/transformation.spec.ts`:
- Default view shows `g(x) = f(x) = x²` — the tautology is gone.
- Dragging `k` to +2 shows `g(x) = x² + 2`.
- Selecting `1/x` and shifting right 3 shows `g(x) = 1/(x − 3)`.

## Risks & Tradeoffs

- **Precedence bugs are the whole risk here.** A template that returns a
  non-atomic string produces a *plausible but wrong* equation — `2x − 3` instead of
  `2(x − 3)` — which is worse than no equation at all in a teaching tool. Mitigated
  by the atomicity rule and its dedicated test.
- **Two sources of truth for the inner argument** would let the f-notation and
  concrete lines drift apart. Mitigated by extracting `innerArgument` and having
  both consume it.
- **The readout box grows by one line.** Accepted.
- The rendered equation is presentation only; it is never parsed or evaluated. The
  graph continues to be drawn from `composeExpr`'s machine string, so a rendering
  bug can never affect the curve.
