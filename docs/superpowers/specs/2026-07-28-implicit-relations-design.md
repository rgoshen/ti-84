# Implicit Relations — Design

**Date:** 2026-07-28
**Status:** Approved
**Branch:** `feature/implicit-relations`
**Issue:** GH-26 (Phase 2)
**Follows:** `2026-07-28-full-equation-input-design.md` (Phase 1, shipped in v0.7.0)

## Objective

Phase 1 taught every equation input to accept equations linear in `y` — `3y + 2x = 6`
becomes `y = (6 − 2x)/3` and plots. It deliberately stopped short of issue #26's own
example, `x² + y² = 25`, because a circle is a **relation, not a function**: it fails
the vertical line test, and `evalAt`'s `number | null` contract cannot represent two y
values at one x.

This phase draws them. The Graphing Calculator renders relations through function-plot's
implicit sampler, and the per-equation features that assume one-x-one-y stand down for
those rows rather than reporting nonsense.

It also picks up **vertical lines** — `x = 3`, `2x + 3 = 7` — which fall out of the same
code path and which a physical TI-84 cannot graph in Func mode at all.

## Verified before designing

Phase 1's post-mortem was that reasoning about a library is where the defects came from,
so function-plot's implicit support was exercised in a real browser before any of this
was written. Injecting the 1.25.4 UMD bundle and rendering into a live DOM:

| Input | Result | Time |
|---|---|---|
| `x^2 + y^2 - 25` | renders | 25 ms |
| `x^2 - y^2 - 4` | renders | 22 ms |
| `y^2 - x` | renders | 6 ms |
| `exp(y) - x` | renders | 4 ms |
| `(x^2+y^2)^2 - 2*(x^2-y^2)` | renders | 9 ms |

A mixed plot of `sin(x)` (polyline), `x^2 + y^2 - 25` (implicit), and `0.5*x` (polyline)
produced **three `g.graph` groups in datum order with correct per-series colors**, and a
screenshot confirmed a circle, a sine wave, and a line drawn together correctly.

Critically, the implicit series leaves every structure the existing code depends on
intact: `g.canvas` (the margin transform the point overlay positions against),
two `.origin` paths (what `applyThemeToPlot` recolors), `rect.zoom-and-drag`, and live
`meta.xScale` / `meta.yScale`.

**The one structural difference:** the implicit path carries **2052 `M` commands** where
a polyline carries 1. It is a disjoint spray of short segments from interval
subdivision, not a continuous stroke. That — more than multi-valuedness — is why marker
snapping and path-length sampling are meaningless on it.

## Requirements

1. `x² + y² = 25` and other relations render on the Graphing Calculator.
2. Relations stack correctly alongside ordinary functions in one plot.
3. Vertical lines (`x = 3`, `2x + 3 = 7`) render.
4. `0 = 0` is still rejected; so are `MULTIPLE_EQUALS`, `INVALID`, and `EMPTY` inputs.
5. For relation rows: no value-table column, no point markers, no hover snap, no
   details-panel entry — and a short note saying why.
6. Relations DO appear in the export legend, because the exported graph shows them.
7. Both explorers still reject relations, with a message naming the Graphing Calculator.
8. Existing FUNCTION behavior is unregressed. Test updates are limited to assertions that
   encode behavior this phase deliberately changes — the shared relation message and the
   equation-list note are both reworded here, and the assertions pinning their old text
   move with them.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Signalling | `kind` discriminator on the SUCCESS branch | A relation parses successfully; modelling it as a failure would be a lie in the type |
| Degradation | Hide per-relation, keep for functions | Honest emptiness beats confident wrongness; smallest change |
| Domain/range for relations | Not computed | The path bbox equals domain × range only when the whole curve is visible; zooming would silently redefine it |
| Routing | Relations **and** vertical lines | Same code path, no extra machinery, and it's the case a real TI-84 refuses |
| Explorer message | Point to Graphing, keep decomposition hint | Answers both "how do I see it?" and "how do I analyse it here?" |
| New visual snapshot | None | Baselines are Linux/Docker-only and cannot be generated on the dev machine |

### Why the `kind` discriminator earns its churn

Adding an optional `implicitExpr` to the failure branch would leave both explorers
literally untouched, which is superficially attractive. It was rejected: a relation is a
successful parse that yields something renderable, and typing it as a failure misleads
the next reader.

The discriminator's apparent cost is the actual benefit. Every consumer of `expr` must
narrow on `kind`, so **the compiler enumerates the degradation work** — all five
single-valued call sites become type errors until they are handled explicitly. The
checklist is generated mechanically instead of from memory.

## Architecture

### Modified: `src/scripts/graphing/equation-input.ts`

```ts
export type EquationKind = 'function' | 'relation';

export type EquationParse =
  | { ok: true; kind: 'function'; expr: string; input?: string }
  | { ok: true; kind: 'relation'; expr: string; input: string }
  | { ok: false; reason: ParseFailure; message: string };
```

For `kind: 'relation'`, `expr` is `(lhs) - (rhs)` — an expression in **x and y**, which
is exactly what `fnType: 'implicit'` consumes. `splitEquation` already returns both
sides, so no new parsing is needed.

`input` is REQUIRED for a relation: there is no solved form to fall back on, so the label
must show what the student typed.

#### Routing table

Applied after `solveLinearY` returns, in `parseEquationInput`:

| Solver result | Verdict | Example |
|---|---|---|
| `ok` | `kind: 'function'` (unchanged) | `3y + 2x = 6` |
| `NOT_LINEAR_IN_Y` | `kind: 'relation'` | `x²+y²=25`, `y²=x`, `e^y=x`, `sin(y)=x` |
| `NO_Y_PRESENT`, `B` not identically zero | `kind: 'relation'` | `x = 3`, `2x + 3 = 7` |
| `NO_Y_PRESENT`, `B` identically zero | reject (unchanged) | `0 = 0` |
| `MULTIPLE_EQUALS` / `INVALID` / `EMPTY` | reject (unchanged) | `y = x = 3`, `@@@`, `` |

The `B`-identically-zero test reuses the existing `ZERO_TOL` sampling already used for
the `A`-identically-zero guard, so no new numerical machinery is introduced. Like that
guard it is *sampled*, not proven: a contrived `B` vanishing at all eight sample x values
would be misread as degenerate. Accepted, on the same grounds as the existing guard.

`solveLinearY` must report whether `B` was identically zero, which its current
reason-only failure shape cannot carry:

```ts
export type SolveResult =
  | { ok: true; expr: string }
  | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'INVALID' }
  | { ok: false; reason: 'NO_Y_PRESENT'; degenerate: boolean };
```

`degenerate: true` means `B` was also identically zero (`0 = 0`) and the input is
rejected; `false` means a vertical line and routes to `kind: 'relation'`.

#### Validation must branch on kind

Phase 1's `validate()` calls `evaluate(expr, { x: 1 })`. A relation's `expr` contains
`y`, which is unbound, so mathjs throws and **every relation would be rejected as
INVALID before reaching the renderer**. Relations must instead be validated with both
variables bound:

```ts
evaluate(expr, { x: 1, y: 1 });
```

This is not a detail that can be left to the implementer to discover: without it the
feature cannot work at all, and the failure looks like a parser bug rather than a
missing branch.

### Modified: `src/scripts/graphing/plot.ts`

`PlotEquation` gains `kind: EquationKind`. The datum builder branches:

```ts
const data: FunctionPlotDatum[] = equations.map((eq) =>
  eq.kind === 'relation'
    ? { fn: eq.expr, color: eq.color, fnType: 'implicit', graphType: 'interval' }
    : { fn: eq.expr, color: eq.color, graphType: 'polyline' },
);
```

Two functions in this file must skip relations:

- **`drawPointsOverlay`** — `gridlineCrossings` walks `evalAt` across integer x, which is
  meaningless for a relation, and markers on a 2052-subpath spray would be too.
- **`attachHoverReadout`** — its nearest-curve loop calls `evalAt(eq.expr, dataX)`. A
  relation's `expr` contains `y`, so mathjs throws on **every pointer move**. Skipping is
  required for correctness, not tidiness.

Theming, zero-axis bolding, and the zoom handler need no change; the probe confirmed the
DOM they depend on is unchanged.

### Modified: `src/components/graphing/GraphingCalculator.tsx`

`EquationItem` inherits `kind` through `PlotEquation`.

| Site | Change |
|---|---|
| `buildEquationDetails` | Skip relations — emit no entry |
| Live value table | No column for a relation |
| Export table | Same omission, so exported columns match the screen |
| Export legend | **Include** relations — the graph shows them, so the color needs a key |
| Points checkbox | Hidden on relation rows |
| Equation list | Note under the label explaining the missing features |

`EquationLabel` takes a `kind` prop and must **suppress the solved-form line for
relations**. Relations always carry `input`, so the entered-form line comes for free
through `equationToTex`, which already handles `=` by rendering each side separately — but
the second line the two-line label draws beneath it is `y = <expr>`, and a relation's
`expr` is `(lhs) - (rhs)`, which is *not* what y equals. Left in, it renders
`y = (x^2 + y^2) - (25)` for `x^2 + y^2 = 25` and `y = (x) - (3)` for `x = 3`: false
mathematics in a teaching tool, and spoken aloud too, since KaTeX emits MathML. A relation
gets the entered-form line only; functions keep both.

Note text: *"A relation — it doesn't give exactly one y for each x, so the table and
details don't apply."* Phrased about the failed one-y-per-x test rather than "two y values
at some x", which is true of a circle but false of a vertical line — where most x have no
y at all and one x has infinitely many.

### Modified: `FunctionExplorer.tsx` and `TransformationExplorer.tsx`

Both reject `kind: 'relation'`, since Phase 1 established their panels are function-only —
the x-slider drag, vertical asymptotes, and end-behavior classification all assume one y
per x.

The shared `NOT_LINEAR_IN_Y` message is rewritten, since the old advice to hand-decompose
is now advice for a problem the student no longer has:

> That's a relation, not a function — it doesn't give exactly one y for each x.
> Graph it on the Graphing Calculator, or enter it here as two functions:
> `y = sqrt(25-x^2)` and `y = -sqrt(25-x^2)`.

The first clause names the failed *definition* of a function rather than the circle's
symptom, because the explorers route vertical lines here too: for `2x + 3 = 7` there is no
y at all except at one x, so "some x values have two y values" would be simply untrue.

Both halves earn their place: the first is the direct answer to "how do I see it?", the
second is the real TI-84 skill AND the only way to use *this* explorer's analysis panels
on a circle.

## Testing

**Unit** (`equation-input.test.ts`) — the routing table above, case by case: each of
`x^2+y^2=25`, `y^2=x`, `e^y=x`, `sin(y)=x` yields `kind: 'relation'` with `expr` equal to
`(lhs) - (rhs)`; `x=3` and `2x+3=7` likewise; `0=0` still fails; every Phase 1 function
case still yields `kind: 'function'` with its existing `expr`.

**E2E** (`graphing.spec.ts`) — plot `x^2+y^2=25` and assert: a `g.graph path` exists whose
`d` contains many `M` commands, no `.points-overlay` markers, no details-panel entry, and
no value-table column for it. Plot it **alongside** `sin(x)` to pin that mixing works, and
`x=3` for the vertical line.

**E2E** (`explorer.spec.ts`) — `x^2+y^2=25` is still rejected and the message names the
Graphing Calculator.

**Regression** — existing function behavior must be unregressed. Any failure on a case
this phase did not deliberately change means `kind: 'function'` did not preserve existing
behavior. Assertions that pin wording this phase rewrites (the relation message, the
equation-list note) are updated with the wording, not treated as regressions.

**Not added: a visual snapshot for relations.** `export-visual.spec.ts` baselines are
Linux/Docker-only and cannot be generated on the development machine. If exporting a
relation warrants visual coverage, that is a separate task run in Docker.

## Risks & Tradeoffs

**The hover loop is the sharpest edge.** `evalAt` on a relation's `expr` throws because
`y` is unbound, and it runs on every pointer move. Missing the skip would not be subtle —
it would throw continuously — but it is the one change where forgetting produces a
visibly broken page rather than a quiet omission.

**Implicit sampling cost scales with plot area, not equation count.** 22–25 ms per
relation at 600×400 in the probe. Several relations at once, re-sampled on every zoom
frame, could feel sluggish. Not mitigated up front — the zoom handler is already
rAF-throttled, and optimising before measuring would be premature. Worth watching in the
e2e run.

**Interval sampling can miss thin features.** Very sharp or near-degenerate curves may
render with visible gaps. This is inherent to the sampler, not something this design
introduces, and the alternative (a hand-written marching-squares implementation) is far
out of proportion to the need.

**`kind` touches every consumer of `expr`.** That is deliberate — see Decisions — but it
does mean a wider diff than Phase 2's user-visible surface suggests.

## Out of Scope

- **Domain, range, and intercepts for relations.** The rendered path's bounding box equals
  domain × range only when the entire curve is inside the window; zooming would silently
  redefine it, which is worse than showing nothing in a teaching tool.
- **Relations in the explorers.** Their analysis panels are function-only by Phase 1's
  design.
- **Contradiction relations drawing an empty plot with no feedback.** `1 = 2` and
  `x^2 = -1` route to the implicit renderer and draw nothing. An empty solution set IS the
  mathematically correct picture, and detecting emptiness reliably would need
  window-scoped sampling that false-positives on a legitimate curve sitting off-window.
- **Inequalities** (`y >= x`) as shaded regions.
- **Parametric or polar input.**
- **Cross-page equation passing** (an "open this in the Graphing Calculator" link) — the
  app has no such pattern today, and adding one for a convenience is disproportionate.

## References

- Issue: GH-26
- Phase 1 spec: `docs/superpowers/specs/2026-07-28-full-equation-input-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-07-28-full-equation-input.md`
- `node_modules/function-plot/dist/types.d.ts:142` — the `fnType` union
- `src/scripts/graphing/math.ts:16` — `evalAt`'s single-valued contract, the constraint this phase works around
