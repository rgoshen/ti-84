# Parent Catalog Expansion + Function Details — Design

**Date:** 2026-07-11
**Status:** Approved
**Component:** Transformation Explorer (`/explorers/transformations`)

## Objective

Two changes to the Transformation Explorer, and nothing else:

1. **Expand the parent-function catalog** from 8 to 11, and move the picker from a
   row of buttons to a dropdown (the row no longer fits at 11).
2. **Add a read-only "Function details" panel** showing domain, range, x- and
   y-intercepts, and vertical/horizontal asymptotes — for both the parent f(x) and
   the transformed g(x), updating live as the sliders move.

Explicitly out of scope: the custom f(x) input, the sliders, the reflect toggles,
the window controls, the points/shape pickers, the value table, and the renderer.
All keep their current behavior.

## Requirements

- Catalog is the nine parents requested, in this order, with the existing `sin`/`cos`
  appended: identity, x², √x, x³, ∛x, 1/x, |x|, eˣ, ln x, sin x, cos x.
- The six that already exist (x², √x, x³, 1/x, |x|, eˣ) are kept as-is — not
  redefined, not reordered relative to the new list, not removed.
- x² remains the parent shown on first load, even though identity is listed first.
- Function details are read-only. No new inputs.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| sin/cos | Keep, append after the nine | "No other functionality touched" — removing them would lose working parents |
| Load default | x², not identity | Preserves today's landing state; identity is merely first in the list |
| Details subject | Live for g(x), beside f(x) | A panel that goes stale under the sliders teaches the wrong thing |
| x-intercepts | Solved exactly per parent | Numeric root-finding makes intercepts flicker as the window pans |
| Value format | Decimals via `formatNumber` | Consistent with the rest of the app |

## Architecture

Three units, each independently testable.

### 1. `src/scripts/explorer/parents.ts` (extended)

`Parent` gains a `props` block declaring the **parent's own** shape analytically.
Pure data — no behavior.

```ts
type Interval =
  | { kind: 'all' }
  /** dir 'ge' = x ≥ v, 'le' = x ≤ v; strict makes it > or <. A reflection flips dir. */
  | { kind: 'bound'; value: number; dir: 'ge' | 'le'; strict: boolean }
  | { kind: 'exclude'; value: number }                   // x ≠ v
  | { kind: 'between'; lo: number; hi: number };         // lo ≤ y ≤ hi

interface ParentProps {
  domain: Interval;
  range: Interval;
  verticalAsymptote?: number;    // x = v
  horizontalAsymptote?: number;  // y = w
  /** Solutions u of f(u) = c. 'infinite' for the periodic parents. */
  solve: (c: number) => number[] | 'infinite';
}
```

Per-parent table (the `solve` column is the parent's inverse):

| id | label | expr | domain | range | VA | HA | solve f(u) = c |
|---|---|---|---|---|---|---|---|
| `identity` | x | `x` | all | all | — | — | `[c]` |
| `square` | x² | `x^2` | all | y ≥ 0 | — | — | `c > 0 → [−√c, √c]`; `c = 0 → [0]`; else `[]` |
| `sqrt` | √x | `sqrt(x)` | x ≥ 0 | y ≥ 0 | — | — | `c ≥ 0 → [c²]`; else `[]` |
| `cube` | x³ | `x^3` | all | all | — | — | `[∛c]` |
| `cbrt` | ∛x | `cbrt(x)` | all | all | — | — | `[c³]` |
| `recip` | 1/x | `1/x` | x ≠ 0 | y ≠ 0 | x = 0 | y = 0 | `c ≠ 0 → [1/c]`; else `[]` |
| `abs` | \|x\| | `abs(x)` | all | y ≥ 0 | — | — | `c > 0 → [−c, c]`; `c = 0 → [0]`; else `[]` |
| `exp` | eˣ | `exp(x)` | all | y > 0 | — | y = 0 | `c > 0 → [ln c]`; else `[]` |
| `ln` | ln x | `log(x)` | x > 0 | all | x = 0 | — | `[eᶜ]` |
| `sin` | sin x | `sin(x)` | all | −1 ≤ y ≤ 1 | — | — | `\|c\| ≤ 1 → 'infinite'`; else `[]` |
| `cos` | cos x | `cos(x)` | all | −1 ≤ y ≤ 1 | — | — | `\|c\| ≤ 1 → 'infinite'`; else `[]` |

**Expression gotchas, verified against both evaluators:**

- Cube root **must** be `cbrt(x)`. `x^(1/3)` returns a *complex* number for x < 0 in
  mathjs, which would silently erase the left half of the curve.
- `log(x)` is the **natural** log in both mathjs and function-plot's
  `built-in-math-eval` — it is the correct spelling for ln x.
- Outside its domain, `log` yields a mathjs Complex (value table) and `NaN`
  (renderer). `evalAt`'s `typeof v === 'number' && isFinite(v)` guard already
  collapses both to `null`, which `ValueTable` renders as "—" and function-plot
  renders as a gap. **No changes needed to the math, table, or render layers.**

Default windows for the three new parents:

| id | window |
|---|---|
| `identity` | x ∈ [−10, 10], y ∈ [−10, 10] |
| `cbrt` | x ∈ [−10, 10], y ∈ [−5, 5] |
| `ln` | x ∈ [−2, 10], y ∈ [−5, 5] |

### 2. `src/scripts/explorer/details.ts` (new — pure logic)

Maps a `Parent`'s declared props through `Coeffs` to produce the details of
g(x) = a·f(b(x − h)) + k.

```ts
interface FunctionDetails {
  domain: string;
  range: string;
  xIntercepts: string;
  yIntercept: string;
  verticalAsymptote: string;   // '—' when none
  horizontalAsymptote: string; // '—' when none
}

function parentDetails(p: Parent): FunctionDetails;
function transformedDetails(p: Parent, c: Coeffs, composedExpr: string): FunctionDetails;
```

Four mapping rules:

- **Domain** — u = b(x − h) must lie in f's domain, so `x = u/b + h`.
  **The inequality reverses when b < 0** (dividing by a negative), i.e. a `bound`
  flips `dir` from `ge` to `le`: reflecting √x over the y-axis takes its domain from
  x ≥ 0 to x ≤ 0. `between` swaps lo/hi. `strict` is preserved.
- **Range** — `y = a·Y + k`; a `bound` flips `dir` when a < 0. Reflecting eˣ over the
  x-axis takes its range from y > 0 to y < 0.
- **Asymptotes** — vertical `x = v` → `v/b + h`; horizontal `y = w` → `a·w + k`.
- **x-intercepts** — g(x) = 0 ⟹ a·f(u) + k = 0 ⟹ f(u) = −k/a, so
  `x = solve(−k/a)/b + h` for each solution. Exact; no root-finding.
- **y-intercept** — `evalAt(composed, 0)`, reusing the existing helper. `null` (out
  of domain) renders as "none".

All "is this knob active?" comparisons use the existing `EPS` from `transform.ts`,
never float `===` — slider steps land on values like `0.9999999`.

**Degenerate transforms.** When `|a| < EPS` or `|b| < EPS` the graph collapses; every
row renders "—" and the panel defers to the transform readout, which already explains
the collapse. This is a deliberate simplification over special-casing each row.

**Custom f(x).** A typed function has no declared props. The panel renders
"Not available for a custom function." The graph is unaffected.

### 3. `src/components/explorer/TransformationExplorer.tsx` (modified)

- The parent `Button` row becomes a shadcn `Select` — the same component the point
  shape picker already uses. Options show label + name (`x²  quadratic`).
- A new read-only `Card`, "Function details", renders a two-column table: f(x) beside
  g(x), six rows. Read-only text; no inputs; `aria` labels on the table.

No other part of the component changes.

## Testing

Unit (vitest, TDD — details is pure):

- `parents.test.ts` — 11 ids in the agreed order; every expr evaluates finite at a
  sensible in-domain x; every default window is valid; `cbrt(-8) === -2` (guards the
  `x^(1/3)` trap); `log` is natural (`log(e) === 1`).
- `details.test.ts` — the mapping rules, one test per rule:
  - domain/range under identity coeffs equal the parent's own
  - **b < 0 reverses an `atLeast` domain** (√x reflected)
  - **a < 0 reverses an `atLeast` range**
  - 1/x with a=2, b=1, h=3, k=1 → domain x ≠ 3, range y ≠ 1, VA x = 3, HA y = 1,
    x-int x = 1, y-int 0.33 (the worked example from the design)
  - ln shifted right 2 → VA x = 2, domain x > 2
  - eˣ shifted up 3 → HA y = 3, no x-intercept (range y > 3)
  - x² with k = −4 → two x-intercepts (±2); with k = +4 → none
  - sin → 'infinitely many'
  - a = 0 and b = 0 → all rows "—"

E2E (playwright) — updates to existing specs, since the picker changed shape:

- `picking a different parent reframes and resets` — rewritten for the dropdown
  (`getByRole('combobox', {name: /parent/i})` → `getByRole('option', {name: /sin/i})`).
- `the point shape picker changes the markers` — its `getByRole('combobox')` is
  currently **unscoped** and will now match two comboboxes (strict-mode failure).
  Must be scoped by accessible name. This is a required fix, not optional.
- New: selecting ln x shows "Domain: x > 0"; dragging h moves the vertical asymptote.

## Risks & Tradeoffs

- **Two comboboxes on the page** breaks the existing unscoped selector. Known,
  addressed above.
- **Identity first, x² default** is a small asymmetry in the catalog (a `default` flag
  or an explicit index). Accepted to preserve the current landing state.
- **Decimals, not fractions** — a y-intercept of ⅓ shows as `0.33`. Consistent with
  the app; exact-fraction rendering is not worth a rational-arithmetic dependency.
- **sin/cos x-intercepts** report "infinitely many" rather than enumerating `nπ`.
  YAGNI; the graph already shows them.
