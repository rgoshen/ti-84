# Concrete Equation Readout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Transformation Explorer readout show the *actual* transformed equation (`g(x) = 2.1x²`) alongside the existing abstract form (`g(x) = 2.1·f(x)`), so `f(x)` is never left undefined on screen.

**Architecture:** Each parent gains a `render(inner)` display template — its own notation applied to an argument other than a bare `x`. A new pure module `equation.ts` composes `a`, that template, and `k` into the concrete equation. The inner-argument string (`x − 3`, `2x`, …) is extracted from the existing `formatEquation` so the abstract and concrete lines can never disagree.

**Tech Stack:** TypeScript, React island, vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-07-11-concrete-equation-readout-design.md`

## Global Constraints

- **Strict TDD.** Failing test first, every task.
- **Conventional Commits.** NO `Co-authored-by`, NO AI-generation tags.
- Branch `feature/parent-catalog-and-details` (this ships in the open PR #8). Never commit to main.
- Append a `SUMMARY.md` entry before every commit, matching the file's existing format.
- Never compare coefficients with `===`. Use `EPS` from `src/scripts/explorer/transform.ts` — slider steps land on values like `0.9999999`.
- Display numbers with `formatNumber` from `src/scripts/graphing/hover.ts`.
- Use the typographic minus `−` (U+2212) in equation text — it is what `transform.ts` already emits (`x − 3`, `− 4`). Do NOT use an ASCII hyphen here. (This is the opposite of `details.ts`, which is ASCII throughout to match `formatNumber` — the two modules are separate and stay that way.)
- **Do NOT modify:** `details.ts`, `transform-render.ts`, `math.ts`, `ValueTable.tsx`, the sliders, reflect toggles, window controls, dropdown, or the custom f(x) input.

**Deviation from the spec, deliberate:** the spec placed `innerArgument` in `equation.ts`. It goes in `transform.ts` instead, which already owns `Coeffs` and `EPS`; `equation.ts` imports it. Putting it in `equation.ts` would force `transform.ts` to import from `equation.ts` while `equation.ts` imports `EPS`/`Coeffs` back — a circular import. Same DRY outcome, no cycle.

**Commands:**
- Unit: `npm test` — single file: `npx vitest run src/scripts/explorer/equation.test.ts`
- E2E: `npx playwright test tests/e2e/transformation.spec.ts`
- Build: `npm run build`

---

### Task 1: Parents gain a `render` template

**Files:**
- Modify: `src/scripts/explorer/parents.ts`
- Modify: `src/scripts/explorer/parents.test.ts`

**Interfaces:**
- Produces: `Parent.render: (inner: string) => string`, `Parent.renderScaled?: (a: string, inner: string) => string`

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/parents.test.ts`:

```ts
describe('parent display templates', () => {
  // The catalog-wide invariant: a parent's notation applied to a bare `x` IS the
  // label it already advertises in the dropdown. This catches any future parent
  // whose template disagrees with its own label.
  it('render("x") reproduces the label, for every parent', () => {
    for (const p of PARENTS) {
      expect(p.render('x'), p.id).toBe(p.label);
    }
  });

  it('renders each parent around a compound argument', () => {
    const got = Object.fromEntries(PARENTS.map((p) => [p.id, p.render('x − 3')]));
    expect(got).toEqual({
      identity: '(x − 3)',
      square: '(x − 3)²',
      sqrt: '√(x − 3)',
      cube: '(x − 3)³',
      cbrt: '∛(x − 3)',
      recip: '1/(x − 3)',
      abs: '|x − 3|',
      exp: 'e^(x − 3)',
      ln: 'ln(x − 3)',
      sin: 'sin(x − 3)',
      cos: 'cos(x − 3)',
    });
  });

  // ATOMICITY. Every template must return a string that is safe to prefix with a
  // coefficient. `identity` is the one that must parenthesise itself — returning
  // 'x − 3' would let the caller build '2x − 3', which is a DIFFERENT function
  // from 2(x − 3). That is a plausible-but-wrong equation: worse than none.
  it('identity parenthesises a compound argument so a coefficient cannot bind wrongly', () => {
    expect(parentById('identity')?.render('x − 3')).toBe('(x − 3)');
    expect(parentById('identity')?.render('x')).toBe('x');
  });

  // Only the reciprocal overrides scaling: '2·1/(x − 3)' is not how anyone writes it.
  it('the reciprocal folds a coefficient into its numerator', () => {
    expect(parentById('recip')?.renderScaled?.('2', 'x − 3')).toBe('2/(x − 3)');
    expect(parentById('square')?.renderScaled).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: FAIL — `p.render is not a function`.

- [ ] **Step 3: Implement**

In `src/scripts/explorer/parents.ts`, add to the `Parent` interface (after `props`):

```ts
  /**
   * The parent's own notation applied to `inner`, as display text.
   * MUST return an ATOMIC string — one safe to prefix with a coefficient without
   * further parentheses. `render('x')` must equal `label`.
   */
  render: (inner: string) => string;
  /** Nicer form when |a| ≠ 1. Only the reciprocal needs it (2/(x−3), not 2·1/(x−3)). */
  renderScaled?: (a: string, inner: string) => string;
```

Add these helpers above `PARENTS`:

```ts
/** A bare `x` needs no parentheses; anything else (x − 3, 2x, −x) does. */
const bare = (inner: string): boolean => inner === 'x';
const wrap = (inner: string): string => (bare(inner) ? inner : `(${inner})`);
```

Then add a `render` to each of the eleven parent literals:

```ts
// identity  — wrap() is what stops a caller building '2x − 3' from '2' + 'x − 3'
render: (i) => wrap(i),
// square
render: (i) => `${wrap(i)}²`,
// sqrt
render: (i) => `√${wrap(i)}`,
// cube
render: (i) => `${wrap(i)}³`,
// cbrt
render: (i) => `∛${wrap(i)}`,
// recip
render: (i) => `1/${wrap(i)}`,
renderScaled: (a, i) => `${a}/${wrap(i)}`,
// abs — the bars ARE the delimiters, so no extra parens ever
render: (i) => `|${i}|`,
// exp — 'eˣ' bare (matching the label), 'e^(x − 3)' otherwise
render: (i) => (bare(i) ? 'eˣ' : `e^${wrap(i)}`),
// ln — 'ln x' bare (matching the label), 'ln(x − 3)' otherwise
render: (i) => (bare(i) ? 'ln x' : `ln${wrap(i)}`),
// sin
render: (i) => (bare(i) ? 'sin x' : `sin${wrap(i)}`),
// cos
render: (i) => (bare(i) ? 'cos x' : `cos${wrap(i)}`),
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/scripts/explorer/parents.test.ts` → PASS.

- [ ] **Step 5: SUMMARY.md + commit**

```bash
git add src/scripts/explorer/parents.ts src/scripts/explorer/parents.test.ts SUMMARY.md
git commit -m "feat(explorer): give each parent a display template for its own notation"
```

---

### Task 2: `equation.ts` — compose the concrete equation

**Files:**
- Modify: `src/scripts/explorer/transform.ts` (extract `innerArgument`)
- Create: `src/scripts/explorer/equation.ts`
- Create: `src/scripts/explorer/equation.test.ts`
- Modify: `src/scripts/explorer/transform.test.ts` (only if the two existing `equation` assertions need it — they should NOT; see Step 4)

**Interfaces:**
- Consumes: `Parent.render` / `Parent.renderScaled` (Task 1); `Coeffs`, `EPS` from `./transform`
- Produces:
  - `innerArgument(c: Coeffs): string` — exported from `./transform`
  - `concreteEquation(p: Parent, c: Coeffs): string | null` — exported from `./equation`

- [ ] **Step 1: Write the failing tests**

Create `src/scripts/explorer/equation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { concreteEquation } from './equation';
import { innerArgument, type Coeffs } from './transform';
import { PARENTS, parentById, type Parent } from './parents';

const P = (id: string): Parent => {
  const p = parentById(id);
  if (!p) throw new Error(`no parent ${id}`);
  return p;
};
const C = (a: number, b: number, h: number, k: number): Coeffs => ({ a, b, h, k });
const ID = C(1, 1, 0, 0);

describe('innerArgument', () => {
  it('renders b(x − h) as readable text', () => {
    expect(innerArgument(ID)).toBe('x');
    expect(innerArgument(C(1, 1, 3, 0))).toBe('x − 3');
    expect(innerArgument(C(1, 1, -3, 0))).toBe('x + 3');
    expect(innerArgument(C(1, -1, 0, 0))).toBe('−x');
    expect(innerArgument(C(1, 2, 0, 0))).toBe('2x');
    expect(innerArgument(C(1, 2, 1, 0))).toBe('2(x − 1)');
    expect(innerArgument(C(1, -1, 3, 0))).toBe('−(x − 3)');
  });
});

describe('concreteEquation', () => {
  // The case that prompted this feature: 'g(x) = 2.1·f(x)' told the student nothing.
  it('shows the real equation for a bare vertical stretch', () => {
    expect(concreteEquation(P('square'), C(2.1, 1, 0, 0))).toBe('g(x) = 2.1x²');
  });

  it('renders every parent at a = 2, b = 1, h = 3, k = 1', () => {
    const c = C(2, 1, 3, 1);
    const got = Object.fromEntries(PARENTS.map((p) => [p.id, concreteEquation(p, c)]));
    expect(got).toEqual({
      identity: 'g(x) = 2(x − 3) + 1',
      square: 'g(x) = 2(x − 3)² + 1',
      sqrt: 'g(x) = 2√(x − 3) + 1',
      cube: 'g(x) = 2(x − 3)³ + 1',
      cbrt: 'g(x) = 2∛(x − 3) + 1',
      recip: 'g(x) = 2/(x − 3) + 1', // renderScaled — NOT '2·1/(x − 3) + 1'
      abs: 'g(x) = 2|x − 3| + 1',
      exp: 'g(x) = 2e^(x − 3) + 1',
      ln: 'g(x) = 2ln(x − 3) + 1',
      sin: 'g(x) = 2sin(x − 3) + 1',
      cos: 'g(x) = 2cos(x − 3) + 1',
    });
  });

  // THE precedence guard. '2x − 3' is a different function from '2(x − 3)'.
  it('never lets a coefficient bind into a compound argument', () => {
    expect(concreteEquation(P('identity'), C(2, 1, 3, 0))).toBe('g(x) = 2(x − 3)');
    expect(concreteEquation(P('identity'), C(2, 1, 3, 0))).not.toContain('2x − 3');
  });

  it('at the identity, the equation is just the parent itself', () => {
    expect(concreteEquation(P('square'), ID)).toBe('g(x) = x²');
    expect(concreteEquation(P('ln'), ID)).toBe('g(x) = ln x');
  });

  it('a = −1 renders as a leading minus, not "−1·"', () => {
    expect(concreteEquation(P('square'), C(-1, 1, 3, 1))).toBe('g(x) = −(x − 3)² + 1');
  });

  it('a negative k subtracts', () => {
    expect(concreteEquation(P('square'), C(1, 1, 0, -4))).toBe('g(x) = x² − 4');
  });

  it('returns null when the transform collapses (a = 0 or b = 0)', () => {
    expect(concreteEquation(P('square'), C(0, 1, 0, 0))).toBeNull();
    expect(concreteEquation(P('ln'), C(1, 0, 0, 0))).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scripts/explorer/equation.test.ts`
Expected: FAIL — cannot resolve `./equation`; `innerArgument` is not exported from `./transform`.

- [ ] **Step 3: Extract `innerArgument` in `transform.ts`**

In `src/scripts/explorer/transform.ts`, add this exported function above `formatEquation`:

```ts
/**
 * The inner argument b(x − h) as display text: 'x', 'x − 3', '−x', '2(x − 3)'.
 * Shared by the abstract readout and the concrete equation so the two lines can
 * never disagree about the same quantity.
 */
export function innerArgument(c: Coeffs): string {
  const hPart = Math.abs(c.h) < EPS ? 'x' : c.h > 0 ? `x − ${fmt(c.h)}` : `x + ${fmt(-c.h)}`;
  const compound = Math.abs(c.h) >= EPS; // hPart is 'x − 3', not a bare 'x'
  if (Math.abs(c.b - 1) < EPS) return hPart;
  if (Math.abs(c.b + 1) < EPS) return compound ? `−(${hPart})` : '−x';
  return compound ? `${fmt(c.b)}(${hPart})` : `${fmt(c.b)}x`;
}
```

Then rewrite `formatEquation` to consume it (deleting its own inline `hPart`/`inner`):

```ts
function formatEquation(c: Coeffs): string {
  const fPart = `f(${innerArgument(c)})`;
  const aPart =
    Math.abs(c.a - 1) < EPS ? fPart : Math.abs(c.a + 1) < EPS ? `−${fPart}` : `${fmt(c.a)}·${fPart}`;
  const kPart = Math.abs(c.k) < EPS ? '' : c.k > 0 ? ` + ${fmt(c.k)}` : ` − ${fmt(-c.k)}`;
  return `g(x) = ${aPart}${kPart}`;
}
```

Note this slightly *improves* the abstract line too: `f(−x)` and `f(2x)` instead of the old `f(−(x))` and `f(2(x))`. Neither existing assertion in `transform.test.ts` covers those, so both must still pass unchanged.

- [ ] **Step 4: Confirm the existing transform tests still pass**

Run: `npx vitest run src/scripts/explorer/transform.test.ts`
Expected: PASS — including the two that pin the abstract equation:
`'g(x) = f(x)'` and `'g(x) = 3·f(2(x − 1)) − 4'`.
If either fails, STOP: the extraction changed behavior it should not have.

- [ ] **Step 5: Create `equation.ts`**

```ts
/**
 * The concrete transformed equation, e.g. 'g(x) = 2(x − 3)² + 1'.
 *
 * `composeExpr` already produces the correct transformed expression — but as a
 * MACHINE string for mathjs to evaluate: '(2) * ((x - (3))^2) + (1)'. Correct, and
 * unreadable. Rather than write an expression-tree pretty-printer that re-derives
 * precedence, we ask each parent to render ITSELF around an argument: the catalog
 * already knows its own notation, so we just apply it to something other than `x`.
 *
 * Presentation only. The curve is still drawn from composeExpr's machine string, so
 * a bug here can never move the graph — only mislabel it.
 */
import { formatNumber } from '@/scripts/graphing/hover';
import { EPS, innerArgument, type Coeffs } from './transform';
import type { Parent } from './parents';

const fmt = (n: number): string => formatNumber(n);

/**
 * g(x) = a·f(b(x − h)) + k, written out concretely.
 * Returns null when it cannot be written: a = 0 or b = 0 collapses the graph, and
 * spelling that out would print nonsense like 'ln(0)'. The step list already
 * explains the collapse.
 */
export function concreteEquation(p: Parent, c: Coeffs): string | null {
  if (Math.abs(c.a) < EPS || Math.abs(c.b) < EPS) return null;

  const inner = innerArgument(c);
  const unit = Math.abs(c.a - 1) < EPS;
  const negUnit = Math.abs(c.a + 1) < EPS;

  // p.render returns an ATOMIC string, so juxtaposing the coefficient is safe:
  // '2' + '(x − 3)²' → '2(x − 3)²'. The reciprocal opts out, folding the
  // coefficient into its numerator instead ('2/(x − 3)', not '2·1/(x − 3)').
  let body: string;
  if (!unit && !negUnit && p.renderScaled) {
    body = p.renderScaled(fmt(c.a), inner);
  } else {
    const base = p.render(inner);
    body = unit ? base : negUnit ? `−${base}` : `${fmt(c.a)}${base}`;
  }

  const kPart = Math.abs(c.k) < EPS ? '' : c.k > 0 ? ` + ${fmt(c.k)}` : ` − ${fmt(-c.k)}`;
  return `g(x) = ${body}${kPart}`;
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm test`
Expected: PASS — `equation.test.ts` green, and `transform.test.ts` / `details.test.ts` / `parents.test.ts` all still green.

- [ ] **Step 7: SUMMARY.md + commit**

```bash
git add src/scripts/explorer/transform.ts src/scripts/explorer/equation.ts \
        src/scripts/explorer/equation.test.ts SUMMARY.md
git commit -m "feat(explorer): compose the concrete transformed equation"
```

---

### Task 3: Show it in the readout

**Files:**
- Modify: `src/components/explorer/TransformationExplorer.tsx`
- Modify: `tests/e2e/transformation.spec.ts`

**Interfaces:**
- Consumes: `concreteEquation(p, c): string | null` from `@/scripts/explorer/equation`; the component's existing `parent` memo (Task 5 of the previous plan) and `coeffs` state.

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/transformation.spec.ts`:

```ts
test('the readout shows the real equation, not just f(x)', async ({ page }) => {
  await goto(page);
  const readout = page.locator('[data-testid="equation-readout"]');

  // At the identity the two forms collapse — no more bare 'g(x) = f(x)' tautology.
  await expect(readout).toContainText('g(x) = f(x) = x²');

  // A vertical stretch must show the ACTUAL equation, not 'g(x) = 2·f(x)'.
  const a = page.getByRole('slider', { name: /a — vertical stretch/i });
  await a.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight'); // 1 → 2 at step 0.1
  await expect(readout).toContainText('g(x) = 2·f(x)'); // abstract form kept
  await expect(readout).toContainText('g(x) = 2x²'); // and the real one shown
});

test('the concrete equation follows the parent and the shifts', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /reciprocal/i }).click();

  const readout = page.locator('[data-testid="equation-readout"]');
  await expect(readout).toContainText('g(x) = f(x) = 1/x');

  // Shift right 3 → 1/(x − 3). Parenthesised: 1/x − 3 would be a different function.
  const h = page.getByRole('slider', { name: /h — horizontal shift/i });
  await h.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight'); // +3.0
  await expect(readout).toContainText('g(x) = 1/(x − 3)');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test tests/e2e/transformation.spec.ts -g "real equation|follows the parent"`
Expected: FAIL — `[data-testid="equation-readout"]` does not exist.

- [ ] **Step 3: Implement**

In `src/components/explorer/TransformationExplorer.tsx`:

Add the import:

```ts
import { concreteEquation } from '@/scripts/explorer/equation';
```

Add these memos next to the existing `fDetails` / `gDetails` memos:

```ts
  const concrete = useMemo(
    () => (parent ? concreteEquation(parent, coeffs) : null),
    [parent, coeffs],
  );
  // Identity → the abstract and concrete forms say the same thing; merge them onto
  // one line so the readout never shows the tautology 'g(x) = f(x)' on its own.
  const isIdentity = useMemo(
    () =>
      Math.abs(coeffs.a - 1) < EPS &&
      Math.abs(coeffs.b - 1) < EPS &&
      Math.abs(coeffs.h) < EPS &&
      Math.abs(coeffs.k) < EPS,
    [coeffs],
  );
```

Replace the readout box (the `<div className="rounded-md bg-accent/60 p-3" aria-hidden="true">` block) with:

```tsx
          <div
            className="rounded-md bg-accent/60 p-3"
            data-testid="equation-readout"
            aria-hidden="true"
          >
            {isIdentity && parent ? (
              <p className="font-mono text-sm font-medium text-accent-foreground">
                g(x) = f(x) = {parent.label}
              </p>
            ) : (
              <>
                <p className="font-mono text-sm font-medium text-accent-foreground">
                  {readout.equation}
                </p>
                {concrete ? (
                  <p className="font-mono text-sm font-medium text-accent-foreground">
                    {concrete}
                  </p>
                ) : null}
              </>
            )}
            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
              {readout.steps.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
```

`EPS` is already imported in this file (from `@/scripts/explorer/transform`) — no new import needed for it.

- [ ] **Step 4: Put it in the accessible names too — it must not be sighted-only**

The readout box is `aria-hidden`, so the concrete equation reaches screen readers only via the plot's label and the live region.

Update the plot's `aria-label` (the `div` with `data-testid="transform-plot"`):

```tsx
            aria-label={`Graph of parent f(x) = ${parentLabel} (dashed) and transformed ${concrete ?? readout.equation}`}
```

And append it to the announcement effect — add `concrete` to both the string and the dependency array:

```ts
  useEffect(() => {
    const id = setTimeout(
      () =>
        setAnnounced(
          [readout.equation, concrete, ...readout.steps].filter(Boolean).join('. '),
        ),
      250,
    );
    return () => clearTimeout(id);
  }, [readout, concrete]);
```

NOTE: if the announcement effect already appends g's domain and range (added in the previous feature's polish commit), KEEP that — append `concrete` to the existing string rather than replacing it. Read the current effect before editing.

- [ ] **Step 5: Run everything**

Run: `npm test` → PASS.
Run: `npm run test:e2e` → PASS (full suite; the readout markup changed, so other transformation tests must be re-confirmed).
Run: `npm run build` → clean.

- [ ] **Step 6: SUMMARY.md + commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx tests/e2e/transformation.spec.ts SUMMARY.md
git commit -m "feat(explorer): show the concrete equation in the readout"
```

---

### Task 4: Verify in the browser and update PR #8

- [ ] **Step 1: Look at it**

`npm run dev`, open `/explorers/transformations`, and confirm by eye:
- Default: `g(x) = f(x) = x²` — the tautology is gone.
- Drag `a` to 2.1: shows both `g(x) = 2.1·f(x)` and `g(x) = 2.1x²`.
- Pick `1/x`, shift right 3: shows `g(x) = 1/(x − 3)` — parenthesised.
- Pick `ln x`, set a = −1: shows `g(x) = −ln x`.

- [ ] **Step 2: Push (PR #8 updates automatically)**

```bash
git push
```

Then update the PR #8 description to mention the readout change.

---

## Notes for the implementer

**The one bug that matters.** Every `render` template must return an *atomic* string — safe to prefix with a coefficient. If `identity.render('x − 3')` returned `x − 3` instead of `(x − 3)`, the readout would print `g(x) = 2x − 3`, which is a **different function** from `2(x − 3)`. A plausible-but-wrong equation in a teaching tool is worse than no equation at all. That is why `identity` parenthesises itself and why it has its own test.

**Why not pretty-print `composeExpr`'s output?** Because `(2) * ((x - (3))^2) + (1)` would need a real expression-tree formatter that re-derives operator precedence. Asking each parent to render its own notation is a dozen one-liners and no parser. The catalog already knows it is `x²`; we just let it say so around an argument.
