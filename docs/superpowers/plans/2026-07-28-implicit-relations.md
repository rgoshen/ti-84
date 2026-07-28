# Implicit Relations (GH-26 Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render implicit relations (`x^2 + y^2 = 25`) and vertical lines (`x = 3`) on the Graphing Calculator, with the per-equation features that assume one y per x standing down for those rows.

**Architecture:** `parseEquationInput` gains a `kind: 'function' | 'relation'` discriminator on its success branch; a relation's `expr` is `(lhs) - (rhs)` in x and y, which is what function-plot's `fnType: 'implicit'` consumes. `plot.ts` branches its datum builder one line and skips relations in the marker overlay and hover loop. The Graphing Calculator drops relations from the details panel and value table but keeps them in the export legend. Both explorers reject relations.

**Tech Stack:** TypeScript, mathjs 15.2.0, function-plot 1.25.4 (`fnType: 'implicit'` + `graphType: 'interval'`), React 19, Astro 7, Vitest 4 (node env), Playwright 1.61.

## Global Constraints

- **Vitest runs in the `node` environment with no jsdom**, and `include` is `src/**/*.{test,spec}.ts` — only `.ts`. All branching logic must live in pure `src/scripts/**` modules or it cannot be unit-tested at all.
- **TDD, scoped by task type** (same split that governed Phase 1, forced by the environment above):
  - **Tasks 1–2 (new logic in pure modules):** strict Red → Green → Refactor. Write the failing test, run it, watch it fail, then implement. Non-negotiable.
  - **Tasks 3–5 (component wiring):** the *refactor* leg. There is no new logic to test; behavior is pinned by Tasks 1–2's unit tests. The red condition is that **the existing suite must stay green**. Reviewers: absence of a new failing test is correct here, not a defect.
  - **Task 6 (integration):** regression coverage added after the wiring exists.
- **≥80% coverage on changed code.**
- **Commits:** Conventional Commits. **No `Co-authored-by` and no AI-generation tags** — hard project rule.
- **GitFlow:** all work stays on `feature/implicit-relations`. Never commit to `main`.
- **Before every commit:** append an entry to `SUMMARY.md` per `~/.claude/CLAUDE.md` §11.5.
- **Do NOT regenerate visual snapshot baselines** and do NOT add a new visual snapshot test. `tests/e2e/export-visual.spec.ts` baselines are Linux/Docker-only; regenerating them natively on macOS breaks CI deterministically. Its 3 local failures are pre-existing and expected.
- Phase 1's existing test suite must pass with only the deliberate updates named in Task 2.

---

### Task 1: Report whether a y-less equation is degenerate

`solveLinearY` currently returns a bare `NO_Y_PRESENT` for both `2x + 3 = 7` (a vertical line, which Phase 2 will draw) and `0 = 0` (true everywhere, nothing to draw). Task 2 needs to tell them apart.

**Files:**
- Modify: `src/scripts/graphing/equation-input.ts` (`SolveResult` at `:38-40`; the `NO_Y_PRESENT` return at `:134`)
- Test: `src/scripts/graphing/equation-input.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export type SolveResult =
    | { ok: true; expr: string }
    | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'INVALID' }
    | { ok: false; reason: 'NO_Y_PRESENT'; degenerate: boolean };
  ```
  `degenerate: true` means `B` was identically zero as well as `A` — the equation reduces to `0 = 0`.

- [ ] **Step 1: Write the failing test**

The existing `describe('solveLinearY', ...)` block has three cases asserting `{ ok: false, reason: 'NO_Y_PRESENT' }` via `it.each`. Replace that `it.each` block with these three tests:

```ts
  // `2x + 3 = 7` and `x = 3` describe the vertical line x = 2 and x = 3. There is no y,
  // but there IS a curve — Phase 2 draws them implicitly.
  it.each([
    ['2*x + 3', '7'],
    ['x', '3'],
  ])('reports %s = %s as having no y but not degenerate', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({
      ok: false,
      reason: 'NO_Y_PRESENT',
      degenerate: false,
    });
  });

  // `0 = 0` is true at every point, so there is nothing to draw at all.
  it('reports 0 = 0 as degenerate', () => {
    expect(solveLinearY('0', '0')).toEqual({
      ok: false,
      reason: 'NO_Y_PRESENT',
      degenerate: true,
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: FAIL — the returned objects lack the `degenerate` key, so `toEqual` reports a missing property.

- [ ] **Step 3: Write minimal implementation**

Replace the `SolveResult` type at `:38-40`:

```ts
export type SolveResult =
  | { ok: true; expr: string }
  | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'INVALID' }
  | { ok: false; reason: 'NO_Y_PRESENT'; degenerate: boolean };
```

Replace the single-line return at `:134`:

```ts
    if (aSamples > 0 && aAllZero) return { ok: false, reason: 'NO_Y_PRESENT' };
```

with:

```ts
    if (aSamples > 0 && aAllZero) {
      // A is identically zero, so there is no y. If B is identically zero too the whole
      // equation reduces to `0 = 0` — true at every point, so there is no curve at all.
      // Otherwise B(x) = 0 describes a vertical line, which Phase 2 renders implicitly.
      // Sampled, like the A guard above: a contrived B vanishing at all eight samples
      // would be misread, which is accepted on the same grounds.
      let bSamples = 0;
      let bAllZero = true;
      for (const x of SAMPLE_XS) {
        const b = at(B, x);
        if (b === null) continue;
        bSamples += 1;
        if (Math.abs(b) >= ZERO_TOL) {
          bAllZero = false;
          break;
        }
      }
      return { ok: false, reason: 'NO_Y_PRESENT', degenerate: bSamples > 0 && bAllZero };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: PASS. The `parseEquationInput` block still passes unchanged — it calls `fail(solved.reason)`, which ignores the extra key.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/equation-input.ts src/scripts/graphing/equation-input.test.ts
git commit -m "feat(graphing): distinguish a vertical line from a degenerate equation"
```

---

### Task 2: Route relations and vertical lines to a `kind` discriminator

**Files:**
- Modify: `src/scripts/graphing/equation-input.ts` (`ParseFailure` `:142-147`; `EquationParse` `:149-151`; `MESSAGES` `:157-165`; `validate` `:173-181`; `parseEquationInput` `:190` onward)
- Test: `src/scripts/graphing/equation-input.test.ts`

**Interfaces:**
- Consumes: `SolveResult` with `degenerate` (Task 1)
- Produces:
  ```ts
  export type EquationKind = 'function' | 'relation';

  export type ParseFailure = 'EMPTY' | 'MULTIPLE_EQUALS' | 'DEGENERATE' | 'INVALID';

  export type EquationParse =
    | { ok: true; kind: 'function'; expr: string; input?: string }
    | { ok: true; kind: 'relation'; expr: string; input: string }
    | { ok: false; reason: ParseFailure; message: string };

  export const RELATION_NOT_SUPPORTED_MESSAGE: string;
  ```
  For `kind: 'relation'`, `expr` is `(lhs) - (rhs)` — an expression in **x and y**.

**Note on two removed failure reasons.** `NOT_LINEAR_IN_Y` now always routes to a relation and `NO_Y_PRESENT` only survives as the degenerate case, so both leave `ParseFailure`. `DEGENERATE` replaces them. This deliberately changes existing test expectations; Step 1 updates them.

- [ ] **Step 1: Write the failing test**

First, UPDATE these existing tests in the `describe('parseEquationInput', ...)` block, which assert the old rejections.

Replace the test titled `'explains that a relation is not a function'` and the one titled `'explains that an equation without y cannot be plotted'` with:

```ts
  // A relation parses fine — it just is not a function. It routes to the implicit
  // renderer rather than being rejected.
  it.each([
    ['x^2 + y^2 = 25', '(x^2 + y^2) - (25)'],
    ['y^2 = x', '(y^2) - (x)'],
    ['e^y = x', '(e^y) - (x)'],
    ['sin(y) = x', '(sin(y)) - (x)'],
  ])('routes %s to the implicit renderer', (raw, expected) => {
    expect(parseEquationInput(raw)).toEqual({
      ok: true,
      kind: 'relation',
      expr: expected,
      input: raw,
    });
  });

  // No y, but still a curve: the vertical line x = 3.
  it.each([
    ['x = 3', '(x) - (3)'],
    ['2x + 3 = 7', '(2x + 3) - (7)'],
  ])('routes %s to the implicit renderer as a vertical line', (raw, expected) => {
    expect(parseEquationInput(raw)).toMatchObject({
      ok: true,
      kind: 'relation',
      expr: expected,
    });
  });

  it('still rejects an equation that is true everywhere', () => {
    expect(parseEquationInput('0 = 0')).toMatchObject({ ok: false, reason: 'DEGENERATE' });
  });
```

Then update the test titled `'every failure carries a non-empty message'` — its raw list contains inputs that now succeed. Replace its array with:

```ts
    for (const raw of ['', 'y = x = 3', '0 = 0', '@@@']) {
```

Then ADD these new tests to the same block:

```ts
  // Functions keep their existing shape, now explicitly tagged.
  it.each([
    ['sin(x)', 'sin(x)'],
    ['y = sin(x)', 'sin(x)'],
    ['3y + 2x = 6', '(6 - 2 * x) / 3'],
  ])('tags %s as a function', (raw, expr) => {
    expect(parseEquationInput(raw)).toMatchObject({ ok: true, kind: 'function', expr });
  });

  // A relation's expression contains y. Binding only x — as the function path does —
  // would make mathjs throw and reject every relation as INVALID.
  it('validates a relation with both x and y bound', () => {
    expect(parseEquationInput('x^2 + y^2 = 25')).toMatchObject({ ok: true });
  });
```

Finally, update the two existing tests that assert on functions to expect the `kind` key. Find the tests titled `'passes a bare expression through unchanged'`, `'accepts a y-prefixed equation without marking it as rearranged'`, `'accepts an uppercase Y prefix'`, and `'records the entered form when a real rearrangement happened'`. Each currently uses `toEqual` against an object without `kind`; add `kind: 'function'` to each expected object. For example the first becomes:

```ts
  it('passes a bare expression through unchanged', () => {
    expect(parseEquationInput('sin(x)')).toEqual({ ok: true, kind: 'function', expr: 'sin(x)' });
  });
```

Apply the same addition to the other three, and to the `it.each` blocks added during Phase 1's fix wave that use `toEqual` (`'passes %s through untouched'` and `'does not rewrite the expression on the y= path'`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: FAIL — many failures, including `kind` missing from success objects and `DEGENERATE` not being a valid reason.

- [ ] **Step 3: Write minimal implementation**

Replace `ParseFailure` (`:142-147`), `EquationParse` (`:149-151`) and `MESSAGES` (`:153-165`) with:

```ts
export type EquationKind = 'function' | 'relation';

export type ParseFailure = 'EMPTY' | 'MULTIPLE_EQUALS' | 'DEGENERATE' | 'INVALID';

export type EquationParse =
  | { ok: true; kind: 'function'; expr: string; input?: string }
  | { ok: true; kind: 'relation'; expr: string; input: string }
  | { ok: false; reason: ParseFailure; message: string };

const MESSAGES: Record<ParseFailure, string> = {
  EMPTY: 'Enter an equation first.',
  MULTIPLE_EQUALS: 'Enter a single equation with one = sign.',
  DEGENERATE: 'That equation is true at every point, so there’s no curve to draw.',
  INVALID: 'Invalid expression.',
};

/**
 * Shown by the explorers when a relation is entered. They reject relations because
 * their x-slider drag, vertical asymptotes and end-behaviour panels are all defined by
 * one y per x. The Graphing Calculator renders them, so the message points there first;
 * the two-function decomposition is kept because it is the real TI-84 workflow AND the
 * only way to use these explorers' analysis panels on a circle.
 */
export const RELATION_NOT_SUPPORTED_MESSAGE =
  'That’s a relation, not a function — some x values have two y values. ' +
  'Graph it on the Graphing Calculator, or enter it here as two functions: ' +
  'y = sqrt(25-x^2) and y = -sqrt(25-x^2).';
```

Replace `validate` (`:173-181`):

```ts
/** Confirm the expression parses and evaluates, mirroring the pre-existing check. */
function validate(expr: string, kind: EquationKind): EquationParse | null {
  try {
    // A relation's expression contains y. Binding only x would make mathjs throw on
    // every relation, rejecting the whole feature as INVALID.
    evaluate(expr, kind === 'relation' ? { x: 1, y: 1 } : { x: 1 });
    return null;
  } catch (e) {
    return fail('INVALID', `Invalid expression: ${(e as Error).message}`);
  }
}
```

In `parseEquationInput`, update the two existing success returns to tag `kind: 'function'` and pass the kind to `validate`:

```ts
  if (split.kind === 'expression') {
    return validate(split.expr, 'function') ?? { ok: true, kind: 'function', expr: split.expr };
  }
```

and, inside the `split.lhs === 'y'` short-circuit:

```ts
    return validate(split.rhs, 'function') ?? { ok: true, kind: 'function', expr: split.rhs };
```

Then replace the block that handles the solver result (currently `const solved = solveLinearY(...)` through the final return) with:

```ts
  const solved = solveLinearY(split.lhs, split.rhs);
  if (!solved.ok) {
    // A relation parses successfully — it simply is not a function. Route it to the
    // implicit renderer instead of rejecting it. `0 = 0` is the one exception: it is
    // true at every point, so there is no curve to draw.
    const renderable =
      solved.reason === 'NOT_LINEAR_IN_Y' ||
      (solved.reason === 'NO_Y_PRESENT' && !solved.degenerate);
    if (!renderable) return fail('DEGENERATE');

    // `lhs - rhs` is exactly the form fnType: 'implicit' consumes.
    const implicitExpr = `(${split.lhs}) - (${split.rhs})`;
    return (
      validate(implicitExpr, 'relation') ?? {
        ok: true,
        kind: 'relation',
        expr: implicitExpr,
        // Always set: a relation has no solved form to fall back on, so the label must
        // show what the student typed.
        input: `${split.lhs} = ${split.rhs}`,
      }
    );
  }

  const invalid = validate(solved.expr, 'function');
  if (invalid) return invalid;

  const rearranged = split.lhs !== 'y';
  return rearranged
    ? { ok: true, kind: 'function', expr: solved.expr, input: `${split.lhs} = ${split.rhs}` }
    : { ok: true, kind: 'function', expr: solved.expr };
```

Also update the comment in the module's `splitEquation` region that still refers to rejecting relations, if present, so it does not contradict the new behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: PASS. If a relation `expr` literal differs from the plan's (e.g. spacing inside the parentheses), use the ACTUAL string — the implementation builds it by template, so the test should pin what it really produces.

- [ ] **Step 5: Verify nothing else in the suite broke**

Run: `npx vitest run`
Expected: all files pass. `equation-tex.test.ts` uses `splitEquation`, which is untouched.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/graphing/equation-input.ts src/scripts/graphing/equation-input.test.ts
git commit -m "feat(graphing): route relations and vertical lines to the implicit renderer"
```

---

### Task 3: Reject relations in both explorers

The explorers' analysis panels are function-only by Phase 1's design.

**Files:**
- Modify: `src/components/explorer/FunctionExplorer.tsx` (the `plot()` handler)
- Modify: `src/components/explorer/TransformationExplorer.tsx` (the `plotCustom()` handler)

**Interfaces:**
- Consumes: `parseEquationInput` returning `kind`, and `RELATION_NOT_SUPPORTED_MESSAGE` (Task 2)
- Produces: nothing consumed later

- [ ] **Step 1: Update the Function Explorer import**

In `src/components/explorer/FunctionExplorer.tsx`, change the existing import to bring in the message too:

```ts
import {
  parseEquationInput,
  RELATION_NOT_SUPPORTED_MESSAGE,
} from '@/scripts/graphing/equation-input';
```

- [ ] **Step 2: Reject relations in `plot()`**

In `plot()`, immediately after the `if (!parsed.ok) { ... }` block and BEFORE `stopSweep()`, insert:

```ts
    // This surface's slider drag, vertical asymptotes and end-behaviour panels are all
    // defined by one y per x, so a relation would blank most of the UI.
    if (parsed.kind === 'relation') {
      setError(RELATION_NOT_SUPPORTED_MESSAGE);
      return;
    }
```

- [ ] **Step 3: Apply the same change to the Transformation Explorer**

In `src/components/explorer/TransformationExplorer.tsx`, update the import the same way:

```ts
import {
  parseEquationInput,
  RELATION_NOT_SUPPORTED_MESSAGE,
} from '@/scripts/graphing/equation-input';
```

and in `plotCustom()`, after the `if (!parsed.ok) { ... }` block and BEFORE `setBaseExpr(...)`, insert:

```ts
    // A transformed relation has no meaningful a·f(b(x−h))+k composition.
    if (parsed.kind === 'relation') {
      setError(RELATION_NOT_SUPPORTED_MESSAGE);
      return;
    }
```

- [ ] **Step 4: Verify**

Run: `npx astro check && npx vitest run`
Expected: 0 errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/FunctionExplorer.tsx src/components/explorer/TransformationExplorer.tsx
git commit -m "feat(explorer): point relations at the graphing calculator"
```

---

### Task 4: Render relations in the plot

**Files:**
- Modify: `src/scripts/graphing/plot.ts` (`PlotEquation` at `:26-31`; `drawPointsOverlay` loop at `:177`; `attachHoverReadout` candidate loop at `:272`; the datum builder at `:327-331`)

**Interfaces:**
- Consumes: `EquationKind` from `@/scripts/graphing/equation-input` (Task 2)
- Produces: `PlotEquation` now requires `kind: EquationKind`

**Background — verified before this plan was written.** function-plot 1.25.4 renders `fnType: 'implicit'` with `graphType: 'interval'` in 4–25 ms, and mixes with polyline series in one plot preserving datum order and per-series colour. `g.canvas`, the `.origin` paths, `rect.zoom-and-drag` and the live scales are all still present, so theming, zero-axis bolding and the zoom handler need no changes. The implicit path carries ~2000 `M` commands (a disjoint spray of segments) where a polyline carries 1.

- [ ] **Step 1: Add `kind` to `PlotEquation`**

Add the import at the top of `src/scripts/graphing/plot.ts`:

```ts
import type { EquationKind } from '@/scripts/graphing/equation-input';
```

Replace the `PlotEquation` interface (`:26-31`):

```ts
/** One plotted curve and its presentation options. */
export interface PlotEquation {
  expr: string;
  /** 'function' expressions are in x alone; 'relation' expressions are in x AND y. */
  kind: EquationKind;
  color: string;
  showPoints: boolean;
  pointShape: PointShape;
}
```

- [ ] **Step 2: Branch the datum builder**

Replace the `data` assignment in `renderGraph` (`:327-331`):

```ts
  const data: FunctionPlotDatum[] = equations.map((eq) =>
    eq.kind === 'relation'
      ? // The interval sampler tests rectangles for sign changes rather than marching
        // left to right, which is what lets it draw a curve with two y values at one x.
        { fn: eq.expr, color: eq.color, fnType: 'implicit', graphType: 'interval' }
      : { fn: eq.expr, color: eq.color, graphType: 'polyline' },
  );
```

- [ ] **Step 3: Skip relations in the marker overlay**

In `drawPointsOverlay`, replace the loop guard at `:177-178`:

```ts
  for (const eq of equations) {
    if (!eq.showPoints) continue;
```

with:

```ts
  for (const eq of equations) {
    // gridlineCrossings walks evalAt across integer x, which has no meaning for a
    // relation — and its path is a spray of disjoint segments, not a stroke, so there
    // is nothing coherent to place markers on.
    if (eq.kind === 'relation' || !eq.showPoints) continue;
```

- [ ] **Step 4: Skip relations in the hover readout**

In `attachHoverReadout`, replace the candidate loop at `:272-277`:

```ts
    for (const eq of getEquations()) {
      const y = evalAt(eq.expr, dataX);
      if (y === null) continue; // undefined / asymptote
```

with:

```ts
    for (const eq of getEquations()) {
      // A relation's expression contains an unbound y, so evalAt would throw — and this
      // runs on every pointer move.
      if (eq.kind === 'relation') continue;
      const y = evalAt(eq.expr, dataX);
      if (y === null) continue; // undefined / asymptote
```

- [ ] **Step 5: Verify**

Run: `npx astro check`
Expected: errors in `GraphingCalculator.tsx` reporting that `kind` is missing from the object literal it builds. That is expected — Task 5 fixes it. Confirm the ONLY errors are that missing property, and that `plot.ts` itself is clean.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/graphing/plot.ts
git commit -m "feat(graphing): draw relations with function-plot's implicit sampler"
```

---

### Task 5: Degrade the per-equation features for relations

**Files:**
- Modify: `src/components/graphing/GraphingCalculator.tsx` (`buildEquationDetails` `:62-76`; `addEquation`; the equation list item; the value table header and body; the export snapshot)

**Interfaces:**
- Consumes: `EquationParse.kind` (Task 2), `PlotEquation.kind` (Task 4)
- Produces: nothing consumed later

- [ ] **Step 1: Store the kind when adding an equation**

In `addEquation`, the `EquationItem` literal currently sets `expr`, `input`, `color`, `showPoints`, `pointShape`. Add `kind`:

```ts
      kind: parsed.kind,
```

`EquationItem extends PlotEquation`, which now requires it, so no separate interface change is needed.

- [ ] **Step 2: Drop relations from the details panel**

Replace `buildEquationDetails` (`:62-76`):

```ts
function buildEquationDetails(
  equations: EquationItem[],
  window: Window2D,
): FunctionDetailsPanelEntry[] {
  return equations
    // A relation has no single-valued domain, range, intercepts, or asymptotes to
    // report — analyzeFunction assumes one y per x throughout.
    .filter((equation) => equation.kind === 'function')
    .map((equation) => ({
      id: equation.id,
      title: `Function details · ${
        equation.input
          ? formatExportEquation(equation.input)
          : `y = ${formatExportEquation(equation.expr)}`
      }`,
      color: equation.color,
      facts: functionAnalysisFacts(analyzeFunction(equation.expr, window)),
    }));
}
```

- [ ] **Step 3: Derive the table's equations once**

At `:347-348` the component currently reads:

```ts
  const tableXs = integerXs(displayWindow);
  const showTable = equations.length > 0 && tableXs.length > 0;
```

Replace those two lines with:

```ts
  const tableXs = integerXs(displayWindow);
  // The value table has one column per equation, which only makes sense when each x maps
  // to a single y. Relations are omitted rather than shown as a column of blanks.
  const tableEquations = equations.filter((eq) => eq.kind === 'function');
  const showTable = tableEquations.length > 0 && tableXs.length > 0;
```

- [ ] **Step 4: Use it in the table header and body**

In the table's `<thead>`, change the header map from `equations.map((eq) => (` to `tableEquations.map((eq) => (`.

In the `<tbody>`, change the cell map from `equations.map((eq) => {` to `tableEquations.map((eq) => {`.

- [ ] **Step 5: Match the export to the screen**

In `createExportSnapshot`, add a filtered list right after `snapshotEquations` is built:

```ts
    const snapshotTableEquations = snapshotEquations.filter((eq) => eq.kind === 'function');
```

In the export `table.headers` array, replace `snapshotEquations.map(` with `snapshotTableEquations.map(`.
In the export table's row builder, replace `...snapshotEquations.map((equation) => formatExportValue(evalAt(equation.expr, x)))` with `...snapshotTableEquations.map((equation) => formatExportValue(evalAt(equation.expr, x)))`.

Leave the `legend` mapping over the FULL `snapshotEquations` — the exported graph image shows the relation, so its colour needs a key.

- [ ] **Step 6: Hide the points controls and add the note**

Inside each equation's `<li>`, immediately after the `</div>` that closes the row containing the Remove button, there is a controls block that opens with exactly this line (around `:489`):

```tsx
                  <div className="mt-2 flex items-center gap-3 text-xs">
```

It contains the "Show points" `<Checkbox>` label and the "Shape:" `<Select>` label, and closes with a `</div>` just before `</li>`.

Wrap that ENTIRE block in a conditional. Change its opening line to:

```tsx
                  {eq.kind === 'relation' ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      A relation — two y values at some x, so the table and details don’t
                      apply.
                    </p>
                  ) : (
                  <div className="mt-2 flex items-center gap-3 text-xs">
```

and change its closing `</div>` (the one immediately before `</li>`) to:

```tsx
                  </div>
                  )}
```

Do not alter the checkbox or shape-picker markup between those anchors. Re-indent the wrapped block if your formatter does so automatically, but make no other changes to it.

- [ ] **Step 7: Verify**

Run: `npx astro check && npx vitest run`
Expected: 0 errors; all tests pass.

- [ ] **Step 8: Manual smoke check**

Run: `npm run dev`, open the Graphing page, and confirm by eye:
- `x^2 + y^2 = 25` draws a circle
- adding `sin(x)` afterwards draws both together in different colours
- the relation has no value-table column, no details panel entry, and no Show points checkbox
- `x = 3` draws a vertical line

Stop the dev server when done.

- [ ] **Step 9: Commit**

```bash
git add src/components/graphing/GraphingCalculator.tsx
git commit -m "feat(graphing): stand down single-valued features for relations"
```

---

### Task 6: End-to-end coverage and full verification

**Files:**
- Modify: `tests/e2e/graphing.spec.ts` (append)
- Modify: `tests/e2e/explorer.spec.ts` (append)

**Interfaces:**
- Consumes: everything above
- Produces: nothing

- [ ] **Step 0: Delete the obsolete Phase 1 rejection test**

`tests/e2e/graphing.spec.ts` contains a test written in Phase 1, when the Graphing Calculator refused relations. This phase deliberately reverses that, so the test now fails and must be DELETED — not repaired. Find and remove this entire test:

```ts
test('rejects a relation with guidance to enter it as two functions', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.getByText(/two y values/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
});
```

Its replacement is the `'a relation gets no markers, no details panel and no table column'` test added in Step 1, which asserts the new behavior. The equivalent rejection assertion still lives on the explorers and is covered by Step 2.

- [ ] **Step 1: Write the graphing e2e tests**

Append to `tests/e2e/graphing.spec.ts`:

```ts
test('plots a relation as an implicit curve', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  // An implicit path is a spray of disjoint subpaths from interval subdivision, where a
  // polyline is one continuous M...L run. Many M commands is the signature.
  const moveCount = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="plot"] g.graph path');
    return ((p?.getAttribute('d') ?? '').match(/M/g) ?? []).length;
  });
  expect(moveCount).toBeGreaterThan(50);
});

test('a relation gets no markers, no details panel and no table column', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  await expect(page.locator('[data-testid="plot"] .points-overlay circle')).toHaveCount(0);
  await expect(page.getByText(/Function details/)).toHaveCount(0);
  await expect(page.getByText(/two y values at some x/)).toBeVisible();
});

test('a relation and a function plot together', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();
  await page.locator('#eq-input').fill('sin(x)');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] g.graph')).toHaveCount(2);
  // The function still gets its details panel; the relation still does not.
  await expect(page.getByText(/Function details/)).toHaveCount(1);
});

test('plots a vertical line', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x = 3');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] g.graph path')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
});

test('rejects an equation that is true everywhere', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('0 = 0');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.getByText(/true at every point/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
});
```

- [ ] **Step 2: Write the explorer e2e test**

Append to `tests/e2e/explorer.spec.ts`:

```ts
test('a relation is rejected and points at the graphing calculator', async ({ page }) => {
  await page.goto('/explorers/function');
  await page.locator('#fx-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.getByText(/Graph it on the Graphing Calculator/)).toBeVisible();
});
```

If the Function Explorer's plot button has a different accessible name, use the name the neighbouring tests in that file already use.

- [ ] **Step 3: Run the new e2e tests**

Run: `npx playwright test tests/e2e/graphing.spec.ts tests/e2e/explorer.spec.ts`
Expected: PASS. If an assertion fails, fix the component — do not weaken the assertion. If `toHaveCount(1)` on the vertical line fails because function-plot emits a different node count, inspect the actual DOM and pin what it really produces.

- [ ] **Step 4: Run the complete verification suite**

```bash
npx astro check          # expect 0 errors, 0 warnings
npx vitest run           # expect all unit tests pass
npm run test:integration # expect 4/4
npx playwright test --grep-invert "approved downloaded PNG"   # expect all pass
```

**Do NOT run `--update-snapshots`, and do NOT run `export-visual.spec.ts`.** Its 3 failures are pre-existing macOS-vs-Linux font rasterization, verified against the pre-branch commit; baselines are Linux/Docker-only.

- [ ] **Step 5: Check coverage on the changed module**

Run: `npx vitest run --coverage`
Expected: `equation-input.ts` ≥80% statements and branches. The default reporter hides fully-covered files via `skipFull`; read `coverage/coverage-final.json` if a file does not appear.

- [ ] **Step 6: Update SUMMARY.md**

Append an entry per `~/.claude/CLAUDE.md` §11.5 — `**Change Type:** Feature`, `**Scope:** src/scripts/graphing, src/components`, what shipped, the rationale (why `kind` on the success branch rather than an optional field on the failure branch; why relations lose the table and details rather than showing "not applicable"), and references to GH-26, the TODO entry, and the spec.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/graphing.spec.ts tests/e2e/explorer.spec.ts SUMMARY.md
git commit -m "test(graphing): cover implicit relations end to end"
```

---

## Not in this plan

- Pushing the branch or opening a PR — outward-facing, handled separately after a final review.
- Domain, range, or intercepts for relations (see the spec's Out of Scope).
- A visual snapshot test for an exported relation — baselines are Linux/Docker-only.
- Relations in the explorers, inequalities, parametric or polar input.
