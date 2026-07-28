# Full Equation Input — Design

**Date:** 2026-07-28
**Status:** Approved
**Branch:** `feature/full-equation-input`
**Issue:** GH-26

## Objective

Every equation input on the site today assumes the student has already done the
algebra. `GraphingCalculator.tsx:72`, `FunctionExplorer.tsx:77`, and
`TransformationExplorer.tsx:53` each carry an identical regex that strips a leading
`y =` and throws it away — which means `sin(x)` and `y = sin(x)` are accepted, but
`2y = x + 4` is rejected outright.

That is backwards for a teaching tool. Rearranging `3y + 2x = 6` into
`y = 2 − (2/3)x` *is* the Algebra I lesson; requiring the student to have finished
it before the calculator will help them is the one moment the tool should be most
useful.

This phase makes every equation input accept any equation that is **linear in y**,
rearrange it, and show both forms so the rearrangement is visible rather than
implied.

Issue #26's literal example, `x^2 + y^2 = 25`, is deliberately **not** covered here.
It is a relation, not a function — it fails the vertical line test — and supporting
it requires a parallel rendering path. That is Phase 2 (see [Out of Scope](#out-of-scope)).

## Requirements

1. Any equation linear in `y` is accepted on all three equation inputs and plotted
   as its solved form.
2. Equations that are not linear in `y` (`x^2+y^2=25`, `y^2=x`, `e^y=x`) are rejected
   with a message that teaches the TI-84 workaround: enter it as two functions.
3. Equations containing no `y` (`2x + 3 = 7`) are rejected as not being functions of x.
4. Existing behavior is preserved exactly: bare expressions (`sin(x)`) and `y =`-prefixed
   input (`y = sin(x)`, `Y = sin(x)`) continue to work.
5. When a rearrangement occurs, both the entered equation and the solved form are shown.
6. The plotted expression string keeps its current shape, so every existing downstream
   consumer — `evalAt`, `analyzeFunction`, the value table, export — is untouched.
7. The duplicated `normalizeExpr` regex is removed from all three components.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Phased: linear-in-y now, implicit relations later | Banks working value early instead of gating everything behind the hard part |
| Solve depth | Linear in `y` only | Excluded cases still *render* in Phase 2 — this decides which get the table/details panel, not which graph at all |
| Surfaces | All three inputs | The module is written once; gating two of three inputs creates an unexplainable inconsistency |
| Function Explorer + relations | Reject | Its slider-drag, asymptote, and end-behavior panels are all defined by one-x-one-y; a relation would blank most of the UI |
| Label | Show input **and** solved form | The rearrangement is the pedagogical content; showing only one side hides either the work or the ownership |
| State shape | Additive `input?: string` field | Replacing `expr` with a richer type churns ~8 call sites for zero user-visible gain |
| Solver mechanism | Symbolic probe at y=0,1,2 | No CAS dependency; ~40 lines; verified against 20 cases before writing the spec |

### Why "linear in y" is the right cut

An equation linear in `y` has exactly one `y` for each `x`, so it is still a function
and every existing feature keeps working unchanged. Nonlinear-in-`y` equations are
either multi-valued (`y^2 = x` → ±√x) or need a hand-maintained inverse table with
domain guards (`sqrt(y) = x` is only valid for x ≥ 0). The first group genuinely
belongs in Phase 2; the second is rare enough in Algebra I/II that Phase 2's implicit
renderer is an acceptable home for it.

Note that this cut is more generous than it first appears: `x*y = 1` is linear in `y`
and solves to `1/x`, so hyperbolas come along for free.

## Architecture

### New module: `src/scripts/graphing/equation-input.ts`

Pure, dependency-light, no DOM. This placement is not stylistic — vitest runs in the
**node environment with no jsdom**, and only collects `.ts`. Branching logic left in a
`.tsx` component cannot be unit-tested at all in this repo.

```ts
export type ParseFailure =
  | 'EMPTY'            // nothing typed
  | 'MULTIPLE_EQUALS'  // "y = x = 3"
  | 'NO_Y_PRESENT'     // "2x + 3 = 7" — a vertical line, not a function of x
  | 'NOT_LINEAR_IN_Y'  // "x^2+y^2=25" — a relation; Phase 2 candidate
  | 'INVALID';         // mathjs threw

export type EquationParse =
  | { ok: true;  expr: string; input?: string }
  | { ok: false; reason: ParseFailure; message: string };

export function parseEquationInput(raw: string): EquationParse;
```

`expr` holds the plotted `y = f(x)` expression and keeps exactly the shape the current
`expr` field holds. `input` is populated **only** when a genuine rearrangement happened
(the left-hand side was not a bare `y`), and is consumed by labels alone — never by
evaluation.

#### Pipeline

1. Trim; empty → `EMPTY`.
2. Normalize a leading uppercase `Y` **that is immediately followed by `=`** to `y` —
   matching today's `^y\s*=\s*` regex exactly, so `Y = sin(x)` keeps working while
   `2Y = x` stays unsupported as it is today (see [Risks](#risks--tradeoffs)).
3. Split on a **bare** `=`, using a regex that excludes `>=`, `<=`, `==`, `!=`.
4. Zero `=` → today's behavior verbatim: `{ ok: true, expr: trimmed }`, no `input`.
5. Two or more bare `=` → `MULTIPLE_EQUALS`.
6. Bare-`y` short-circuit: when the left-hand side is exactly `y`, return the
   right-hand side verbatim as `expr` after validating it evaluates, reporting an
   empty right-hand side as `EMPTY` rather than falling through to the solve probe.
7. Run the solve probe (below).
8. Validate the emitted expression evaluates; otherwise `INVALID`.

#### The solve probe

Any equation linear in `y` can be written `F(x, y) = lhs − rhs = A(x)·y + B(x)`.
Therefore:

- `B(x) = F(x, 0)` — obtained via `simplify(F, { y: 0 })`, which substitutes `y`
  **symbolically** while leaving `x` free
- `A(x) = F(x, 1) − F(x, 0)`
- linearity holds iff `F(x, 2) ≡ 2A(x) + B(x)`, checked numerically at sample x values
- the solved form is `simplify(-(B) / (A))`

Two guards are load-bearing:

- **Linearity check fails** → `NOT_LINEAR_IN_Y`. Without it, `x^2+y^2=25` silently
  produces a wrong curve rather than an error.
- **`A ≡ 0` at every sample** → `NO_Y_PRESENT`. Without it, `2x + 3 = 7` divides by
  zero and yields the literal string `Infinity * (4 - 2*x)`. This was found by running
  the probe, not by reading it.

Note `A(x)` being zero at *some* x is fine and must not trigger the guard — `x*y = 1`
has `A = x`, and the resulting `1/x` handles its own asymptote through `evalAt`'s
existing null return.

#### Verified behavior

Confirmed against mathjs 15.2.0 before this spec was written:

| Input | A(x) | Verdict | Stored `expr` |
|---|---|---|---|
| `2y = x + 4` | `2` | ok | `(x + 4) / 2` |
| `y - x^2 = 0` | `1` | ok | `x ^ 2` |
| `3y + 2x = 6` | `3` | ok | `(6 - 2 * x) / 3` |
| `x + y = 5` | `1` | ok | `5 - x` |
| `(y-1)/2 = x` | `1/2` | ok | `2 * (x + 1/2)` |
| `y = sin(x)` | `1` | ok | `sin(x)` |
| `y + y = x` | `2` | ok | `x / 2` |
| `2 = y` | `-1` | ok | `2` |
| `y = 5` | `1` | ok | `5` |
| `x*y = 1` | `x` | ok | `1 / x` |
| `y^2 = x` | — | NOT_LINEAR_IN_Y | — |
| `x^2 + y^2 = 25` | — | NOT_LINEAR_IN_Y | — |
| `e^y = x` | — | NOT_LINEAR_IN_Y | — |
| `sin(y) = x` | — | NOT_LINEAR_IN_Y | — |
| `2x + 3 = 7` | `0` | NO_Y_PRESENT | — |
| `x = 3` | `0` | NO_Y_PRESENT | — |

The `y = sin(x)` and `y = 5` rows show what the solve probe *would* compute for a
bare-`y` left-hand side — but neither input actually reaches it. `parseEquationInput`
special-cases `split.lhs === 'y'` and returns the right-hand side verbatim, without
sampling and without `simplify()`. The three duplicated regexes are still deletable,
but not because the general solver subsumes their case: this short-circuit
**reimplements** what they did, once, in the shared module.

That short-circuit is necessary, not merely an optimization. Routing `y = <expr>`
through the solve probe rejects any expression whose domain excludes every sample
point — `y = sqrt(x-5)` is undefined at all eight default samples, so a probe built to
verify linearity has nothing defined to check and would misreport a perfectly valid
input as a failure. And even where the probe does succeed, `simplify()` reorders and
reformats the student's own terms: `y = x^2-4x+3` would come back as
`x ^ 2 + 3 - 4 * x`, which is defensible algebra but not what the student wrote. The
short-circuit sidesteps both failure modes by never handing the right-hand side to
mathjs's solver machinery at all.

### Modified: `src/components/graphing/GraphingCalculator.tsx`

- Delete `normalizeExpr` (`:72`).
- `addEquation` (`:245`) calls `parseEquationInput`, sets `error` from `message` on
  failure, and stores `input` alongside `expr` on success.
- `EquationItem` gains `input?: string`.
- `EquationLabel` (`:107`) renders a second line when `input` is present.
- `buildEquationDetails` (`:63`) titles with `input ?? \`y = ${expr}\``.
- Export legend (`:321`) uses `input ?? \`y = ${expr}\``.
- Export **table header** (`:330`) is deliberately left as the solved form — that
  column contains y values, so `y = <solved>` is the honest header.

### Modified: `FunctionExplorer.tsx` and `TransformationExplorer.tsx`

- Delete both `normalizeExpr` copies (`:77`, `:53`).
- `plot()` (`FunctionExplorer.tsx:404`) and the equivalent handler in
  `TransformationExplorer.tsx:155` call `parseEquationInput` and surface `message`
  through their existing error state.
- The **Function Explorer** displays the entered form alongside the solved form,
  consistent with the Graphing Calculator.
- The **Transformation Explorer** displays only the composed function. Its label has to
  track `a·f(b(x−h))+k`, which changes on every slider move, so a fixed entered-form line
  would contradict the curve as soon as a slider is touched.

### Label rendering

`mathjs.parse()` **throws** on `=` (`Invalid left hand side of assignment operator`),
so the existing `exprToKatex` cannot render the entered equation. The input line
instead splits on the bare `=`, calls `toTex({ implicit: 'hide' })` per side, and
rejoins with `=`. Verified: `3y + 2x = 6` → `3~ y+2~ x = 6`.

Falls back to plain text if either side fails to parse, mirroring the existing
`EquationLabel` fallback at `:112`.

### Error messages

| Reason | Message |
|---|---|
| `NOT_LINEAR_IN_Y` | "That's a relation, not a function — some x values have two y values. Graph it as two equations, e.g. `y = sqrt(25-x^2)` and `y = -sqrt(25-x^2)`." |
| `NO_Y_PRESENT` | "This equation has no y, so there's nothing to plot as y = f(x)." |
| `MULTIPLE_EQUALS` | "Enter a single equation with one = sign." |
| `EMPTY` | Existing per-surface wording ("Enter an equation first." / "Enter a function first.") |
| `INVALID` | Existing mathjs message passthrough |

All messages are **static strings**; the circle in the `NOT_LINEAR_IN_Y` text is a fixed
illustrative example, not derived from the user's input. Deriving the two halves would
require solving for `y` in the general case, which is exactly what this phase does not do.

The `NOT_LINEAR_IN_Y` message is not an apology for a limitation — entering a circle as
two functions is precisely what a physical TI-84 requires in Func mode, so the message
teaches the calculator's real workflow.

## Testing

Strict TDD, red → green → refactor.

**Unit — `src/scripts/graphing/equation-input.test.ts`** (node env, no jsdom)

- Every row of the verified-behavior table above.
- Backward compatibility: `sin(x)`, `y = sin(x)`, `Y = sin(x)`, `  y=x^2  ` (whitespace).
- Rejections: `y >= x` (must not split on `>=`), `y = x = 3`, `""`, `"   "`.
- `x*y = 1` → `1/x`, asserting the A-is-sometimes-zero case is *not* caught by the
  `NO_Y_PRESENT` guard.
- `input` is populated for `2y = x + 4` and absent for both `sin(x)` and `y = sin(x)`.

This is where the ≥80%-coverage-on-changed-code bar is met; the module is pure, so
coverage there is meaningful rather than incidental.

**Regression**

The entire existing suite must pass unmodified. `expr` keeps its shape by design, so
any existing-test failure is a signal that the additive-field guarantee was broken —
this is the primary safety net for the refactor.

**E2E — Playwright**

One spec asserting the two-line label: enter `3y + 2x = 6`, assert both the entered
and solved forms are present. Assertions target text content, not descendant `svg`
selectors, because KaTeX rewrites that subtree.

**Not run natively**

Visual snapshot baselines (`export-visual.spec.ts`) regenerate on Linux/Docker only.
If the two-line label shifts export layout, baselines are refreshed in that
environment as a separate step — never natively on macOS.

## Risks & Tradeoffs

**Uppercase `Y` regression.** Today's regex is case-insensitive, so `Y = sin(x)` works.
mathjs treats `Y` and `y` as distinct symbols, so without the normalization step in
pipeline stage 2 the solver would return `NO_Y_PRESENT` for it. Mitigated by an
explicit normalization and a pinning test. This is the single most likely silent
regression in the change.

**Linearity sampled, not proven.** The check evaluates at four sample x values rather
than proving linearity symbolically. An equation undefined at all four samples (e.g.
`y*sqrt(x-100) = 1`) would be misclassified `NOT_LINEAR_IN_Y` — a false negative that
rejects valid input rather than plotting something wrong, which is the safe direction
to fail. Mitigated by choosing samples spread across positive, negative, and fractional
values.

**`simplify` output is not always pretty.** `(y-1)/2 = x` solves to `2 * (x + 1/2)`
rather than `2x + 1`. Correct but slightly clumsy. Accepted: the solved form is
rendered through KaTeX, and chasing prettier output means an expression-tree
pretty-printer, which `equation.ts:1-12` already documents as deliberately avoided
elsewhere in this codebase.

**Three components change at once.** Touching all three inputs widens the blast radius
versus doing one. Mitigated by the shared module carrying all the logic and by the
existing suite covering each surface.

## Out of Scope

Deferred to **Phase 2** (separate spec):

- Implicit relations via function-plot's `fnType: 'implicit'` + `graphType: 'interval'`
  (confirmed available in function-plot 1.25.4 at `dist/types.d.ts:142`), on the
  Graphing Calculator only.
- What the value table, hover readout, point overlay, and function-details panel do
  when a relation is active — most are undefined for multi-valued curves and need
  either rework or explicit disabling.
- Revisiting the `NOT_LINEAR_IN_Y` message once relations render on the Graphing page.

Not planned:

- Inequalities (`y >= x`) — rejected, not rendered as shaded regions.
- Inverse-function forms (`y^3 = x`, `e^y = x`) getting the full table/details
  treatment; they will render via Phase 2's implicit path.
- Parametric or polar input.

## References

- Issue: GH-26 "Equation input should be able to accept full equation"
- `src/scripts/graphing/math.ts:16` — `evalAt`, the one-x-one-y contract this phase preserves
- `src/scripts/graphing/plot.ts:327` — where `expr` reaches function-plot
- `node_modules/function-plot/dist/types.d.ts:142` — `fnType` union, Phase 2 groundwork
- `src/scripts/explorer/equation.ts:1-12` — prior art on avoiding expression pretty-printers
