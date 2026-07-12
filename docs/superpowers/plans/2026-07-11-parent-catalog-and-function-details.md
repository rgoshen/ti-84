# Parent Catalog + Function Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Transformation Explorer's parent catalog from 8 to 11 functions, move the picker to a dropdown, and add a read-only panel showing domain, range, intercepts, and asymptotes for both f(x) and the live transformed g(x).

**Architecture:** Each parent declares its own domain, range, asymptotes, and inverse (`solve`) as pure data in `parents.ts`. A new pure module `details.ts` maps those declarations through the transform g(x) = a·f(b(x − h)) + k using affine interval mapping — so x-intercepts are solved exactly rather than root-found. The React island consumes both and renders a read-only table. The renderer, value table, and math layers are not touched.

**Tech Stack:** Astro + React islands, TypeScript, mathjs, function-plot, shadcn/ui (Radix `Select`), vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-07-11-parent-catalog-and-function-details-design.md`

## Global Constraints

- **Strict TDD.** Red → Green → Refactor. Failing test before implementation, every task.
- **Conventional Commits.** `feat:`, `fix:`, `test:`, `docs:`, `refactor:`. **No `Co-authored-by` and no AI-generation tags in any commit or PR.**
- **Append to `SUMMARY.md` before every commit** using the repo's existing entry format.
- Branch is `feature/parent-catalog-and-details`. No direct commits to `main`.
- **Cube root MUST be spelled `cbrt(x)`.** `x^(1/3)` returns a complex number for x < 0 in mathjs and would silently erase the left half of the curve.
- **Natural log is `log(x)`** — in both mathjs and function-plot's `built-in-math-eval`, `log` is base-e. Do not use `ln(x)`; it does not exist.
- Never compare coefficients with `===`. Use `EPS` from `src/scripts/explorer/transform.ts` — slider steps land on values like `0.9999999`.
- Format all numbers for display with `formatNumber` from `src/scripts/graphing/hover.ts` (3 decimals).
- Do not modify: the renderer (`transform-render.ts`), `math.ts`, `ValueTable.tsx`, the sliders, the reflect toggles, the window controls, or the custom f(x) input.

**Commands:**
- Unit: `npm test` (vitest run) — single file: `npx vitest run src/scripts/explorer/details.test.ts`
- E2E: `npm run test:e2e` — single file: `npx playwright test tests/e2e/transformation.spec.ts`

---

### Task 0: Record the plan in TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Append the feature entry**

Match the existing format in `TODO.md`:

```md
## [2026-07-11] Feature: Parent Catalog Expansion + Function Details

**Objective:**
Grow the Transformation Explorer's parent catalog from 8 to 11 (adding identity, cube
root, natural log), move the picker from buttons to a dropdown, and add a read-only
panel showing domain, range, intercepts, and asymptotes for f(x) and the live g(x).

**Approach:**
Parents declare their domain/range/asymptotes/inverse as data. A new pure module
`details.ts` maps those through g(x) = a·f(b(x − h)) + k by affine interval mapping,
so x-intercepts are exact (solve f(u) = −k/a) rather than numerically root-found.

**Tests:**
Unit: catalog integrity + inverse round-trip; details mapping (sign flips under
reflection, asymptote translation, intercepts, degenerate a=0/b=0).
E2E: dropdown selection reframes; ln shows domain x > 0; dragging h moves the VA.

**Risks & Tradeoffs:**
A second combobox breaks the existing unscoped `getByRole('combobox')` e2e selector —
must be scoped. Values render as decimals, not fractions. sin/cos report "infinitely
many" x-intercepts rather than enumerating nπ.
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: plan parent catalog expansion and function details"
```

---

### Task 1: Expand the catalog to 11 parents

Adds identity, cube root, and natural log; reorders to the agreed sequence; keeps x² as the load default even though identity is now first.

**Files:**
- Modify: `src/scripts/explorer/parents.ts`
- Modify: `src/scripts/explorer/parents.test.ts`
- Modify: `src/components/explorer/TransformationExplorer.tsx` (initial state only)

**Interfaces:**
- Consumes: `Window2D` from `@/scripts/graphing/math`
- Produces: `PARENTS: Parent[]` (11, in order), `parentById(id): Parent | undefined`, `defaultParent(): Parent`, `Parent` now carries `name: string`

- [ ] **Step 1: Write the failing tests**

Replace the first test in `src/scripts/explorer/parents.test.ts` and add two new ones:

```ts
describe('parent catalog', () => {
  it('exposes the eleven toolkit parents in teaching order with unique ids', () => {
    const ids = PARENTS.map((p) => p.id);
    expect(ids).toEqual([
      'identity', 'square', 'sqrt', 'cube', 'cbrt',
      'recip', 'abs', 'exp', 'ln', 'sin', 'cos',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every parent has a label and a name for the dropdown', () => {
    for (const p of PARENTS) {
      expect(p.label.length, p.id).toBeGreaterThan(0);
      expect(p.name.length, p.id).toBeGreaterThan(0);
    }
  });

  // Guards the x^(1/3) trap: it returns a COMPLEX number for negative x, which
  // would silently erase the left half of the cube-root curve.
  it('cube root uses cbrt and is real on the negative branch', () => {
    expect(parentById('cbrt')?.expr).toBe('cbrt(x)');
    expect(evalAt('cbrt(x)', -8)).toBe(-2);
  });

  // Guards the ln spelling: mathjs `log` is base-e, and `ln` does not exist.
  it('natural log uses log (base e)', () => {
    expect(parentById('ln')?.expr).toBe('log(x)');
    expect(evalAt('log(x)', Math.E)).toBeCloseTo(1, 10);
  });

  it('defaults to x², not the first entry', () => {
    expect(defaultParent().id).toBe('square');
    expect(PARENTS[0].id).toBe('identity');
  });
});
```

Update the existing "sensible x" test so the new domain-restricted parents are probed inside their domains:

```ts
  it('every parent expression evaluates to a finite number at a sensible x', () => {
    for (const p of PARENTS) {
      const x = p.id === 'sqrt' ? 4 : p.id === 'recip' ? 2 : p.id === 'ln' ? Math.E : 1;
      const v = evalAt(p.expr, x);
      expect(Number.isFinite(v), `${p.id} @ x=${x}`).toBe(true);
    }
  });
```

Update the import line at the top of the file:

```ts
import { PARENTS, parentById, defaultParent } from './parents';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: FAIL — `defaultParent is not a function`, and the id-order assertion mismatches.

- [ ] **Step 3: Implement the catalog**

Rewrite the body of `src/scripts/explorer/parents.ts` (keep the existing file header comment, extend it):

```ts
import type { Window2D } from '@/scripts/graphing/math';

export interface Parent {
  /** Stable id used by the picker + tests. */
  id: string;
  /** Math glyph, e.g. 'x²'. Used in the readout and the value-table header. */
  label: string;
  /** Spoken name for the dropdown, e.g. 'quadratic'. */
  name: string;
  /** mathjs / function-plot expression, e.g. 'x^2'. */
  expr: string;
  /** Default view that frames this parent well. */
  window: Window2D;
}

const TAU = 2 * Math.PI;

/** The parent shown on first load. Identity is listed first, but x² is the classic
 *  teaching parent and is what the explorer has always opened with. */
export const DEFAULT_PARENT_ID = 'square';

export const PARENTS: Parent[] = [
  { id: 'identity', label: 'x', name: 'identity', expr: 'x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'square', label: 'x²', name: 'quadratic', expr: 'x^2',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'sqrt', label: '√x', name: 'square root', expr: 'sqrt(x)',
    window: { xMin: -2, xMax: 10, yMin: -2, yMax: 8 } },
  { id: 'cube', label: 'x³', name: 'cubic', expr: 'x^3',
    window: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 } },
  // cbrt, NOT x^(1/3): mathjs returns a complex number for negative x.
  { id: 'cbrt', label: '∛x', name: 'cube root', expr: 'cbrt(x)',
    window: { xMin: -10, xMax: 10, yMin: -5, yMax: 5 } },
  { id: 'recip', label: '1/x', name: 'reciprocal', expr: '1/x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'abs', label: '|x|', name: 'absolute value', expr: 'abs(x)',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'exp', label: 'eˣ', name: 'exponential', expr: 'exp(x)',
    window: { xMin: -3, xMax: 3, yMin: -1, yMax: 10 } },
  // `log` is base-e in both mathjs and function-plot. `ln` does not exist.
  { id: 'ln', label: 'ln x', name: 'natural log', expr: 'log(x)',
    window: { xMin: -2, xMax: 10, yMin: -5, yMax: 5 } },
  { id: 'sin', label: 'sin x', name: 'sine', expr: 'sin(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'cos', label: 'cos x', name: 'cosine', expr: 'cos(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
];

export function parentById(id: string): Parent | undefined {
  return PARENTS.find((p) => p.id === id);
}

/** The parent the explorer opens with. Throws if the catalog loses it. */
export function defaultParent(): Parent {
  const p = parentById(DEFAULT_PARENT_ID);
  if (!p) throw new Error(`Default parent "${DEFAULT_PARENT_ID}" is missing from PARENTS`);
  return p;
}
```

- [ ] **Step 4: Keep x² as the load default in the island**

In `src/components/explorer/TransformationExplorer.tsx`, change the import:

```ts
import { PARENTS, parentById, defaultParent } from '@/scripts/explorer/parents';
```

Add below the other tunables (near `const IDENTITY: Coeffs = ...`):

```ts
const DEFAULT_PARENT = defaultParent();
```

Then replace every `PARENTS[0]` in the `useState` initializers with `DEFAULT_PARENT` (six occurrences, lines ~44-52):

```ts
  const [baseExpr, setBaseExpr] = useState(DEFAULT_PARENT.expr);
  const [exprInput, setExprInput] = useState(DEFAULT_PARENT.expr);
  const [parentId, setParentId] = useState<string | null>(DEFAULT_PARENT.id);
  const [parentLabel, setParentLabel] = useState(DEFAULT_PARENT.label);
  const [coeffs, setCoeffs] = useState<Coeffs>(IDENTITY);
  const [error, setError] = useState<string | null>(null);
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(DEFAULT_PARENT.window);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(DEFAULT_PARENT.window);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(DEFAULT_PARENT.window));
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — all parents tests green, no other unit suite affected.

Run: `npx playwright test tests/e2e/transformation.spec.ts`
Expected: PASS — the picker is still a button row (now 11 buttons); x² is still the default, so every existing e2e assertion holds.

- [ ] **Step 6: Update SUMMARY.md and commit**

Append to `SUMMARY.md` (every task in this plan does the same, varying the content):

```md
## [2026-07-11 HH:MM] Commit Summary

**Change Type:** Feature
**Scope:** explorer/parents

**Summary:**
Grew the parent catalog from 8 to 11 — added identity (x), cube root (∛x) and natural
log (ln x) — and reordered it into teaching sequence. Added `defaultParent()` so the
explorer still opens on x² even though identity is now listed first.

**Rationale:**
Cube root is spelled `cbrt(x)`, not `x^(1/3)`: mathjs returns a complex number for
negative x, which would have silently erased the left half of the curve. Natural log is
`log(x)` — base-e in both mathjs and function-plot; `ln` does not exist in either.

**References:**
- TODO.md: [2026-07-11] Parent Catalog Expansion + Function Details
- Spec: docs/superpowers/specs/2026-07-11-parent-catalog-and-function-details-design.md
```

```bash
git add src/scripts/explorer/parents.ts src/scripts/explorer/parents.test.ts \
        src/components/explorer/TransformationExplorer.tsx SUMMARY.md
git commit -m "feat(explorer): add identity, cube root and natural log parents"
```

---

### Task 2: Declare each parent's analytic properties

Pure data. No consumer yet — Task 3 is the consumer.

**Files:**
- Modify: `src/scripts/explorer/parents.ts`
- Modify: `src/scripts/explorer/parents.test.ts`

**Interfaces:**
- Produces: `Interval`, `ParentProps`; `Parent` now carries `props: ParentProps`

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/parents.test.ts`:

```ts
describe('parent properties', () => {
  it('every parent declares props', () => {
    for (const p of PARENTS) {
      expect(p.props, p.id).toBeDefined();
      expect(p.props.domain.kind, p.id).toBeTruthy();
      expect(p.props.range.kind, p.id).toBeTruthy();
    }
  });

  // The strongest invariant we have: solve() must actually be f's inverse.
  // For every u it returns, f(u) must equal the c we asked about.
  it('solve() returns genuine solutions of f(u) = c', () => {
    const probes = [-2, -0.5, 0, 0.5, 1, 2];
    for (const p of PARENTS) {
      for (const c of probes) {
        const sol = p.props.solve(c);
        if (sol === 'infinite') continue;
        for (const u of sol) {
          const back = evalAt(p.expr, u);
          expect(back, `${p.id}: f(${u}) should be ${c}`).not.toBeNull();
          expect(back as number, `${p.id}: f(solve(${c})) round-trip`).toBeCloseTo(c, 6);
        }
      }
    }
  });

  it('declares the asymptotes of the two parents that have them', () => {
    expect(parentById('recip')?.props.verticalAsymptote).toBe(0);
    expect(parentById('recip')?.props.horizontalAsymptote).toBe(0);
    expect(parentById('exp')?.props.horizontalAsymptote).toBe(0);
    expect(parentById('exp')?.props.verticalAsymptote).toBeUndefined();
    expect(parentById('ln')?.props.verticalAsymptote).toBe(0);
    expect(parentById('ln')?.props.horizontalAsymptote).toBeUndefined();
    expect(parentById('square')?.props.verticalAsymptote).toBeUndefined();
  });

  it('restricts the domains of sqrt, ln and 1/x only', () => {
    expect(parentById('sqrt')?.props.domain).toEqual({ kind: 'bound', value: 0, dir: 'ge', strict: false });
    expect(parentById('ln')?.props.domain).toEqual({ kind: 'bound', value: 0, dir: 'ge', strict: true });
    expect(parentById('recip')?.props.domain).toEqual({ kind: 'exclude', value: 0 });
    expect(parentById('square')?.props.domain).toEqual({ kind: 'all' });
  });

  it('sin and cos have no finite solution list', () => {
    expect(parentById('sin')?.props.solve(0)).toBe('infinite');
    expect(parentById('cos')?.props.solve(0.5)).toBe('infinite');
    expect(parentById('sin')?.props.solve(2)).toEqual([]); // |c| > 1: unreachable
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: FAIL — `p.props` is undefined (TypeScript will also error: `props` is not on `Parent`).

- [ ] **Step 3: Implement the property types and data**

Add to `src/scripts/explorer/parents.ts`, above `interface Parent`:

```ts
/**
 * A set of real numbers, expressive enough for every toolkit parent's domain and
 * range. Deliberately not a general interval algebra — these four shapes are all
 * eleven parents need, and an affine map takes each one to another of the same kind.
 */
export type Interval =
  | { kind: 'all' }
  /** dir 'ge' → x ≥ v (or x > v when strict); 'le' → x ≤ v. A reflection flips dir. */
  | { kind: 'bound'; value: number; dir: 'ge' | 'le'; strict: boolean }
  | { kind: 'exclude'; value: number }
  | { kind: 'between'; lo: number; hi: number };

export interface ParentProps {
  domain: Interval;
  range: Interval;
  /** x = v, when the parent has one. */
  verticalAsymptote?: number;
  /** y = w, when the parent has one. */
  horizontalAsymptote?: number;
  /**
   * The parent's inverse: every u with f(u) = c. This is what makes x-intercepts
   * EXACT — g(x) = 0 unwinds to f(u) = −k/a — instead of numerically root-found,
   * which would make intercepts flicker as the window pans.
   * 'infinite' for the periodic parents.
   */
  solve: (c: number) => number[] | 'infinite';
}
```

Add `props: ParentProps;` to the `Parent` interface (after `window`).

Define the shared interval shapes above `PARENTS`:

```ts
const ALL: Interval = { kind: 'all' };
const NON_NEG: Interval = { kind: 'bound', value: 0, dir: 'ge', strict: false }; // ≥ 0
const POSITIVE: Interval = { kind: 'bound', value: 0, dir: 'ge', strict: true };  // > 0
const NOT_ZERO: Interval = { kind: 'exclude', value: 0 };
const UNIT: Interval = { kind: 'between', lo: -1, hi: 1 };
const PERIODIC = (c: number): number[] | 'infinite' => (Math.abs(c) <= 1 ? 'infinite' : []);
```

Then give each parent a `props`. Add these to the eleven literals from Task 1:

```ts
// identity
props: { domain: ALL, range: ALL, solve: (c) => [c] },

// square
props: {
  domain: ALL, range: NON_NEG,
  solve: (c) => (c > 0 ? [-Math.sqrt(c), Math.sqrt(c)] : c === 0 ? [0] : []),
},

// sqrt
props: { domain: NON_NEG, range: NON_NEG, solve: (c) => (c >= 0 ? [c * c] : []) },

// cube
props: { domain: ALL, range: ALL, solve: (c) => [Math.cbrt(c)] },

// cbrt
props: { domain: ALL, range: ALL, solve: (c) => [c ** 3] },

// recip
props: {
  domain: NOT_ZERO, range: NOT_ZERO,
  verticalAsymptote: 0, horizontalAsymptote: 0,
  solve: (c) => (c !== 0 ? [1 / c] : []), // 1/u is never 0
},

// abs
props: {
  domain: ALL, range: NON_NEG,
  solve: (c) => (c > 0 ? [-c, c] : c === 0 ? [0] : []),
},

// exp
props: {
  domain: ALL, range: POSITIVE, horizontalAsymptote: 0,
  solve: (c) => (c > 0 ? [Math.log(c)] : []),
},

// ln
props: {
  domain: POSITIVE, range: ALL, verticalAsymptote: 0,
  solve: (c) => [Math.exp(c)],
},

// sin
props: { domain: ALL, range: UNIT, solve: PERIODIC },

// cos
props: { domain: ALL, range: UNIT, solve: PERIODIC },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: PASS — in particular the round-trip test, which proves every `solve` really is the parent's inverse.

- [ ] **Step 5: Update SUMMARY.md and commit**

```bash
git add src/scripts/explorer/parents.ts src/scripts/explorer/parents.test.ts SUMMARY.md
git commit -m "feat(explorer): declare domain, range, asymptotes and inverse per parent"
```

---

### Task 3: The `details.ts` pure module

The heart of the feature. Maps a parent's declared properties through g(x) = a·f(b(x − h)) + k.

**Files:**
- Create: `src/scripts/explorer/details.ts`
- Create: `src/scripts/explorer/details.test.ts`

**Interfaces:**
- Consumes: `Parent`, `Interval` from `./parents`; `Coeffs`, `EPS` from `./transform`; `evalAt` from `@/scripts/graphing/math`; `formatNumber` from `@/scripts/graphing/hover`
- Produces:
  - `FunctionDetails` — `{ domain, range, xIntercepts, yIntercept, verticalAsymptote, horizontalAsymptote }`, all `string`
  - `mapInterval(iv: Interval, m: number, c: number): Interval`
  - `formatInterval(iv: Interval, v: 'x' | 'y'): string`
  - `parentDetails(p: Parent): FunctionDetails`
  - `transformedDetails(p: Parent, c: Coeffs, composedExpr: string): FunctionDetails`

- [ ] **Step 1: Write the failing tests**

Create `src/scripts/explorer/details.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapInterval, formatInterval, parentDetails, transformedDetails } from './details';
import { parentById, type Parent } from './parents';
import { composeExpr, type Coeffs } from './transform';

const P = (id: string): Parent => {
  const p = parentById(id);
  if (!p) throw new Error(`no parent ${id}`);
  return p;
};
const C = (a: number, b: number, h: number, k: number): Coeffs => ({ a, b, h, k });
const ID = C(1, 1, 0, 0);
/** Details of g for a parent + coeffs, composing the expression the same way the UI does. */
const G = (id: string, c: Coeffs) => transformedDetails(P(id), c, composeExpr(P(id).expr, c));

describe('mapInterval', () => {
  it('leaves "all" alone', () => {
    expect(mapInterval({ kind: 'all' }, -3, 7)).toEqual({ kind: 'all' });
  });

  it('translates and scales a bound', () => {
    expect(mapInterval({ kind: 'bound', value: 0, dir: 'ge', strict: false }, 2, 5))
      .toEqual({ kind: 'bound', value: 5, dir: 'ge', strict: false });
  });

  // The sign rule: dividing/multiplying an inequality by a negative REVERSES it.
  it('flips the direction of a bound under a negative multiplier', () => {
    expect(mapInterval({ kind: 'bound', value: 0, dir: 'ge', strict: true }, -1, 0))
      .toEqual({ kind: 'bound', value: 0, dir: 'le', strict: true });
  });

  it('keeps a "between" ordered under a negative multiplier', () => {
    expect(mapInterval({ kind: 'between', lo: -1, hi: 1 }, -2, 0))
      .toEqual({ kind: 'between', lo: -2, hi: 2 });
  });

  it('moves an excluded point', () => {
    expect(mapInterval({ kind: 'exclude', value: 0 }, 1, 3))
      .toEqual({ kind: 'exclude', value: 3 });
  });
});

describe('formatInterval', () => {
  it('renders each shape', () => {
    expect(formatInterval({ kind: 'all' }, 'x')).toBe('all real numbers');
    expect(formatInterval({ kind: 'bound', value: 2, dir: 'ge', strict: false }, 'x')).toBe('x ≥ 2');
    expect(formatInterval({ kind: 'bound', value: 0, dir: 'ge', strict: true }, 'x')).toBe('x > 0');
    expect(formatInterval({ kind: 'bound', value: 3, dir: 'le', strict: false }, 'y')).toBe('y ≤ 3');
    expect(formatInterval({ kind: 'exclude', value: 3 }, 'x')).toBe('x ≠ 3');
    // ASCII hyphen throughout, matching how x-intercepts render ("x = -2").
    expect(formatInterval({ kind: 'between', lo: -1, hi: 1 }, 'y')).toBe('-1 ≤ y ≤ 1');
  });
});

describe('parentDetails', () => {
  it('describes 1/x untransformed', () => {
    const d = parentDetails(P('recip'));
    expect(d.domain).toBe('x ≠ 0');
    expect(d.range).toBe('y ≠ 0');
    expect(d.verticalAsymptote).toBe('x = 0');
    expect(d.horizontalAsymptote).toBe('y = 0');
    expect(d.xIntercepts).toBe('none');
    expect(d.yIntercept).toBe('none');
  });

  it('describes x² untransformed', () => {
    const d = parentDetails(P('square'));
    expect(d.domain).toBe('all real numbers');
    expect(d.range).toBe('y ≥ 0');
    expect(d.xIntercepts).toBe('x = 0');
    expect(d.yIntercept).toBe('y = 0');
    expect(d.verticalAsymptote).toBe('—');
  });

  it('describes ln untransformed', () => {
    const d = parentDetails(P('ln'));
    expect(d.domain).toBe('x > 0');
    expect(d.range).toBe('all real numbers');
    expect(d.verticalAsymptote).toBe('x = 0');
    expect(d.xIntercepts).toBe('x = 1');
    expect(d.yIntercept).toBe('none'); // ln(0) is undefined
  });
});

describe('transformedDetails', () => {
  // The worked example from the design doc.
  it('1/x with a=2, b=1, h=3, k=1', () => {
    const d = G('recip', C(2, 1, 3, 1));
    expect(d.domain).toBe('x ≠ 3');
    expect(d.range).toBe('y ≠ 1');
    expect(d.verticalAsymptote).toBe('x = 3');
    expect(d.horizontalAsymptote).toBe('y = 1');
    expect(d.xIntercepts).toBe('x = 1');
    expect(d.yIntercept).toBe('y = 0.333');
  });

  it('reflecting √x over the y-axis flips its domain', () => {
    expect(G('sqrt', ID).domain).toBe('x ≥ 0');
    expect(G('sqrt', C(1, -1, 0, 0)).domain).toBe('x ≤ 0');
  });

  it('reflecting eˣ over the x-axis flips its range', () => {
    expect(G('exp', ID).range).toBe('y > 0');
    expect(G('exp', C(-1, 1, 0, 0)).range).toBe('y < 0');
  });

  it('shifting ln right by 2 moves its asymptote and domain', () => {
    const d = G('ln', C(1, 1, 2, 0));
    expect(d.verticalAsymptote).toBe('x = 2');
    expect(d.domain).toBe('x > 2');
  });

  it('shifting eˣ up by 3 lifts its asymptote and kills its x-intercept', () => {
    const d = G('exp', C(1, 1, 0, 3));
    expect(d.horizontalAsymptote).toBe('y = 3');
    expect(d.range).toBe('y > 3');
    expect(d.xIntercepts).toBe('none'); // the curve never reaches y = 0
  });

  it('x² shifted down 4 has two x-intercepts; shifted up 4 has none', () => {
    expect(G('square', C(1, 1, 0, -4)).xIntercepts).toBe('x = -2, x = 2');
    expect(G('square', C(1, 1, 0, 4)).xIntercepts).toBe('none');
  });

  it('reports periodic parents as infinitely many', () => {
    expect(G('sin', ID).xIntercepts).toBe('infinitely many');
  });

  it('renders every row as — when the transform collapses (a = 0 or b = 0)', () => {
    for (const c of [C(0, 1, 0, 0), C(1, 0, 0, 0)]) {
      const d = G('square', c);
      expect(Object.values(d)).toEqual(['—', '—', '—', '—', '—', '—']);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/scripts/explorer/details.test.ts`
Expected: FAIL — cannot resolve `./details`.

- [ ] **Step 3: Implement `details.ts`**

Create `src/scripts/explorer/details.ts`:

```ts
/**
 * Read-only "function details" for the Transformation Explorer: domain, range,
 * intercepts and asymptotes of g(x) = a·f(b(x − h)) + k.
 *
 * The trick is that the transform is invertible by construction, so nothing here
 * needs numeric root-finding. Both the domain map (x = u/b + h) and the range map
 * (y = a·Y + k) are affine, and every parent declares its own inverse — so
 * "where is g zero?" unwinds to "where is f equal to −k/a?", which the parent
 * answers exactly. Numeric roots would flicker in and out as the window pans.
 */
import { evalAt } from '@/scripts/graphing/math';
import { formatNumber } from '@/scripts/graphing/hover';
import { EPS, type Coeffs } from './transform';
import type { Interval, Parent } from './parents';

/** Every field is display-ready text. '—' = not applicable; 'none' = genuinely absent. */
export interface FunctionDetails {
  domain: string;
  range: string;
  xIntercepts: string;
  yIntercept: string;
  verticalAsymptote: string;
  horizontalAsymptote: string;
}

const DASH = '—';
const NONE = 'none';
const fmt = (n: number): string => formatNumber(n);

/**
 * Push an interval through the affine map t ↦ m·t + c (m ≠ 0). A negative m
 * REVERSES an inequality — reflecting √x over the y-axis takes x ≥ 0 to x ≤ 0 —
 * so a `bound` flips its direction. `between` just re-sorts its endpoints.
 */
export function mapInterval(iv: Interval, m: number, c: number): Interval {
  switch (iv.kind) {
    case 'all':
      return iv;
    case 'bound':
      return {
        kind: 'bound',
        value: m * iv.value + c,
        dir: m < 0 ? (iv.dir === 'ge' ? 'le' : 'ge') : iv.dir,
        strict: iv.strict,
      };
    case 'exclude':
      return { kind: 'exclude', value: m * iv.value + c };
    case 'between': {
      const lo = m * iv.lo + c;
      const hi = m * iv.hi + c;
      return { kind: 'between', lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    }
  }
}

export function formatInterval(iv: Interval, v: 'x' | 'y'): string {
  switch (iv.kind) {
    case 'all':
      return 'all real numbers';
    case 'bound': {
      const op = iv.dir === 'ge' ? (iv.strict ? '>' : '≥') : iv.strict ? '<' : '≤';
      return `${v} ${op} ${fmt(iv.value)}`;
    }
    case 'exclude':
      return `${v} ≠ ${fmt(iv.value)}`;
    case 'between':
      return `${fmt(iv.lo)} ≤ ${v} ≤ ${fmt(iv.hi)}`;
  }
}

/** g(x) = 0  ⟺  a·f(u) + k = 0  ⟺  f(u) = −k/a, with u = b(x − h) ⟹ x = u/b + h. */
function xInterceptsOf(p: Parent, c: Coeffs): string {
  const solutions = p.props.solve(-c.k / c.a);
  if (solutions === 'infinite') return 'infinitely many';
  if (solutions.length === 0) return NONE;
  return solutions
    .map((u) => u / c.b + c.h)
    .sort((l, r) => l - r)
    .map((x) => `x = ${fmt(x)}`)
    .join(', ');
}

const DEGENERATE: FunctionDetails = {
  domain: DASH, range: DASH, xIntercepts: DASH,
  yIntercept: DASH, verticalAsymptote: DASH, horizontalAsymptote: DASH,
};

/**
 * Details of the transformed g(x). `composedExpr` must be the output of
 * `composeExpr(p.expr, c)` — passed in rather than recomputed because the island
 * already has it memoised, and evaluating it re-parses the expression.
 */
export function transformedDetails(p: Parent, c: Coeffs, composedExpr: string): FunctionDetails {
  // a = 0 flattens the curve to a line, b = 0 collapses it to a point. The transform
  // readout already explains both; every row here would be a degenerate special case.
  if (Math.abs(c.a) < EPS || Math.abs(c.b) < EPS) return DEGENERATE;

  const { domain, range, verticalAsymptote, horizontalAsymptote } = p.props;
  const y0 = evalAt(composedExpr, 0);

  return {
    domain: formatInterval(mapInterval(domain, 1 / c.b, c.h), 'x'),
    range: formatInterval(mapInterval(range, c.a, c.k), 'y'),
    xIntercepts: xInterceptsOf(p, c),
    yIntercept: y0 === null ? NONE : `y = ${fmt(y0)}`,
    verticalAsymptote:
      verticalAsymptote === undefined ? DASH : `x = ${fmt(verticalAsymptote / c.b + c.h)}`,
    horizontalAsymptote:
      horizontalAsymptote === undefined ? DASH : `y = ${fmt(c.a * horizontalAsymptote + c.k)}`,
  };
}

/** Details of the untransformed parent — the identity case of `transformedDetails`. */
export function parentDetails(p: Parent): FunctionDetails {
  return transformedDetails(p, { a: 1, b: 1, h: 0, k: 0 }, p.expr);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/scripts/explorer/details.test.ts`
Expected: PASS — all of them.

Note on signs: `formatNumber` emits an ASCII hyphen (`-2`), and this module keeps that
throughout, so ranges and intercepts agree with each other. The typographic `−` used by
`transform.ts`'s readout is a separate concern — do not "harmonise" them here.

- [ ] **Step 5: Update SUMMARY.md and commit**

```bash
git add src/scripts/explorer/details.ts src/scripts/explorer/details.test.ts SUMMARY.md
git commit -m "feat(explorer): derive domain, range, intercepts and asymptotes for g(x)"
```

---

### Task 4: Replace the parent button row with a dropdown

**Files:**
- Modify: `src/components/explorer/TransformationExplorer.tsx:220-247` (the "Parent function" Card)
- Modify: `src/components/explorer/TransformationExplorer.tsx:315-329` (the shape picker — add an accessible name)
- Modify: `tests/e2e/transformation.spec.ts`

**Interfaces:**
- Consumes: `PARENTS`, `parentById` from Task 1; the existing `selectParent(id)` handler (unchanged)

- [ ] **Step 1: Give BOTH comboboxes an accessible name**

This is load-bearing, not cosmetic. The existing e2e test calls `page.getByRole('combobox')` **unscoped**; a second combobox makes that match two elements and fail Playwright strict mode. Both need names so both can be addressed unambiguously.

In the shape picker (inside "Window & guides"), add an `aria-label` to its trigger:

```tsx
                <Select value={pointShape} onValueChange={(v) => setPointShape(v as PointShape)}>
                  <SelectTrigger size="sm" className="capitalize" aria-label="Point shape">
                    <SelectValue />
                  </SelectTrigger>
```

- [ ] **Step 2: Swap the button row for a Select**

Replace the `<div className="flex flex-wrap gap-2">…</div>` block (the `PARENTS.map` of `Button`s) in the "Parent function" Card with:

```tsx
          <Select value={parentId ?? ''} onValueChange={selectParent}>
            <SelectTrigger id="parent-select" aria-label="Parent function" className="w-full">
              {/* A custom f(x) clears parentId, so no item matches and the placeholder shows. */}
              <SelectValue placeholder="Custom function" />
            </SelectTrigger>
            <SelectContent>
              {PARENTS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-mono">{p.label}</span>
                  <span className="ml-2 text-muted-foreground">{p.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
```

`Button` may now be unused by this Card but is still used by "Plot", "Reset", and the reflect toggles — leave the import.

- [ ] **Step 3: Update the e2e tests**

In `tests/e2e/transformation.spec.ts`, rewrite the parent-picking test:

```ts
test('picking a different parent reframes and resets', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /sin x/i }).click();

  // Scoped to the readout <li> (see comment on the first test) — avoids a race with
  // the debounced sr-only live-region echoing the same text.
  await expect(page.locator('li').filter({ hasText: /This is the parent function f\(x\) = sin x/i })).toBeVisible();

  // sin x's default window (x∈[−2π,2π]≈[−6.28,6.28]) differs from the square
  // parent's default [−10,10] — confirm the picker actually reframed the view,
  // not just its own label and readout text.
  const xMinInput = page.getByLabel('xMin', { exact: true });
  await expect(xMinInput).not.toHaveValue('-10');
  expect(Number(await xMinInput.inputValue())).toBeCloseTo(-6.283185, 3);
});
```

And scope the shape-picker test's combobox (this is the strict-mode fix):

```ts
  await page.getByRole('combobox', { name: 'Point shape' }).click();
  await page.getByRole('option', { name: 'Triangle' }).click();
```

Add a test for one of the new parents:

```ts
test('the new parents are selectable and reframe the view', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /cube root/i }).click();
  await expect(page.locator('li').filter({ hasText: /This is the parent function f\(x\) = ∛x/i })).toBeVisible();
  await expect(page.locator(`${PLOT} g.graph`)).toHaveCount(2);
});
```

- [ ] **Step 4: Run the suites**

Run: `npm test` — Expected: PASS (unchanged).
Run: `npx playwright test tests/e2e/transformation.spec.ts` — Expected: PASS, all tests including the two rewritten ones.

- [ ] **Step 5: Update SUMMARY.md and commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx tests/e2e/transformation.spec.ts SUMMARY.md
git commit -m "feat(explorer): move the parent picker to a dropdown"
```

---

### Task 5: The read-only Function details panel

**Files:**
- Modify: `src/components/explorer/TransformationExplorer.tsx`
- Modify: `tests/e2e/transformation.spec.ts`

**Interfaces:**
- Consumes: `parentDetails`, `transformedDetails`, `FunctionDetails` from Task 3; the island's existing `composed` memo

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/transformation.spec.ts`:

```ts
test('function details describe the parent and the transformed curve', async ({ page }) => {
  await goto(page);
  const details = page.locator('[data-testid="function-details"]');

  // Parent x²: domain all reals, range y ≥ 0.
  await expect(details.locator('tr[data-row="domain"] td[data-col="fx"]')).toHaveText('all real numbers');
  await expect(details.locator('tr[data-row="range"] td[data-col="fx"]')).toHaveText('y ≥ 0');
  await expect(details.locator('tr[data-row="range"] td[data-col="gx"]')).toHaveText('y ≥ 0');

  // k = +2 lifts only g's range, leaving f's alone — the whole point of the panel.
  const k = page.getByRole('slider', { name: /k — vertical shift/i });
  await k.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(details.locator('tr[data-row="range"] td[data-col="gx"]')).toHaveText('y ≥ 2');
  await expect(details.locator('tr[data-row="range"] td[data-col="fx"]')).toHaveText('y ≥ 0');
});

test('ln shows its domain and its asymptote moves with h', async ({ page }) => {
  await goto(page);
  await page.getByRole('combobox', { name: 'Parent function' }).click();
  await page.getByRole('option', { name: /natural log/i }).click();

  const details = page.locator('[data-testid="function-details"]');
  await expect(details.locator('tr[data-row="domain"] td[data-col="fx"]')).toHaveText('x > 0');
  await expect(details.locator('tr[data-row="verticalAsymptote"] td[data-col="gx"]')).toHaveText('x = 0');

  // Shift right 2 → the vertical asymptote follows.
  const h = page.getByRole('slider', { name: /h — horizontal shift/i });
  await h.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // step 0.1 × 20
  await expect(details.locator('tr[data-row="verticalAsymptote"] td[data-col="gx"]')).toHaveText('x = 2');
  await expect(details.locator('tr[data-row="domain"] td[data-col="gx"]')).toHaveText('x > 2');
});

test('a custom function reports that details are unavailable', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('x^4');
  await page.getByRole('button', { name: 'Plot' }).click();
  await expect(page.getByText(/not available for a custom function/i)).toBeVisible();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test tests/e2e/transformation.spec.ts -g "details|ln shows|custom function reports"`
Expected: FAIL — `[data-testid="function-details"]` does not exist.

- [ ] **Step 3: Compute the details in the island**

In `src/components/explorer/TransformationExplorer.tsx`, add the import:

```ts
import { parentDetails, transformedDetails, type FunctionDetails } from '@/scripts/explorer/details';
```

Add the row definition beside the other module-level tunables:

```ts
const DETAIL_ROWS: Array<{ key: keyof FunctionDetails; label: string }> = [
  { key: 'domain', label: 'Domain' },
  { key: 'range', label: 'Range' },
  { key: 'xIntercepts', label: 'x-intercept' },
  { key: 'yIntercept', label: 'y-intercept' },
  { key: 'verticalAsymptote', label: 'Vertical asymptote' },
  { key: 'horizontalAsymptote', label: 'Horizontal asymptote' },
];
```

Add the memos after the existing `composed` memo (~line 70). A typed custom f(x) sets
`parentId` to null and has no declared properties, so both memos go null:

```ts
  const parent = useMemo(() => (parentId ? parentById(parentId) : undefined), [parentId]);
  const fDetails = useMemo(() => (parent ? parentDetails(parent) : null), [parent]);
  const gDetails = useMemo(
    () => (parent ? transformedDetails(parent, coeffs, composed) : null),
    [parent, coeffs, composed],
  );
```

- [ ] **Step 4: Render the read-only panel**

In the right-hand column, between the plot `Card` and `<ValueTable …/>`:

```tsx
        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Function details</h3>
          {fDetails && gDetails ? (
            <table data-testid="function-details" className="w-full text-xs">
              <caption className="sr-only">
                Domain, range, intercepts and asymptotes of the parent and the transformed function
              </caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="py-1 text-left font-normal text-muted-foreground">
                    Property
                  </th>
                  <th scope="col" className="py-1 text-left font-medium">
                    f(x) = {parentLabel}
                  </th>
                  <th scope="col" className="py-1 text-left font-medium">g(x)</th>
                </tr>
              </thead>
              <tbody>
                {DETAIL_ROWS.map(({ key, label }) => (
                  <tr key={key} data-row={key} className="border-b last:border-0">
                    <th scope="row" className="py-1 text-left font-normal text-muted-foreground">
                      {label}
                    </th>
                    <td data-col="fx" className="py-1 font-mono tabular-nums">{fDetails[key]}</td>
                    <td data-col="gx" className="py-1 font-mono tabular-nums">{gDetails[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not available for a custom function — pick a parent function to see its details.
            </p>
          )}
        </Card>
```

- [ ] **Step 5: Run everything**

Run: `npm test` — Expected: PASS.
Run: `npm run test:e2e` — Expected: PASS, including `graphing.spec.ts`, `explorer.spec.ts` and `navigation.spec.ts` (untouched).
Run: `npm run build` — Expected: clean TypeScript build.

- [ ] **Step 6: Update SUMMARY.md and commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx tests/e2e/transformation.spec.ts SUMMARY.md
git commit -m "feat(explorer): add read-only function details panel"
```

---

### Task 6: Verify and open the PR

- [ ] **Step 1: Full verification**

```bash
npm test && npm run build && npm run test:e2e
```
Expected: all green. Do not proceed on a red suite.

- [ ] **Step 2: Manual check in the browser**

`npm run dev`, open `/explorers/transformations`, and confirm by eye:
- The dropdown lists 11 parents; x² is selected on load.
- ∛x draws on **both** sides of the origin (the `cbrt` guard working).
- ln x draws only right of the y-axis, with a clean gap — not a dropped curve.
- Dragging `h` on ln visibly moves the vertical asymptote row in step with the curve.
- Both light and dark mode render the details panel legibly.

- [ ] **Step 3: Mark TODO.md done and open the PR**

Move the entry to the completed section per the file's convention, commit, push, and open a PR using `~/.claude/templates/PULL_REQUEST_TEMPLATE.md`. Do not self-approve or auto-merge.

```bash
git push -u origin feature/parent-catalog-and-details
```

---

## Notes for the implementer

**Why intercepts are exact, not root-found.** g(x) = a·f(b(x − h)) + k is a chain of four invertible steps. Asking "where is g zero?" therefore unwinds to "where is f equal to −k/a?", and each parent answers that from its own inverse. A numeric solver would have been the obvious move, but its intercepts would appear and disappear as the user pans the window — the opposite of the lesson.

**The one sign rule that matters.** Multiplying or dividing an inequality by a negative number reverses it. That is the whole reason `mapInterval` flips `dir`, and it is the single most likely thing to get wrong: reflect √x over the y-axis and its domain must go from x ≥ 0 to x ≤ 0, not stay x ≥ 0. It has its own test.

**Two evaluators, one guard.** mathjs powers `evalAt`/the value table; function-plot's `built-in-math-eval` powers the curve. They agree on `cbrt` and `log`, but disagree out of domain: `log(-1)` is a Complex in mathjs and `NaN` in function-plot. `evalAt`'s `typeof v === 'number' && isFinite(v)` check already collapses both to `null`. Do not "fix" it.
