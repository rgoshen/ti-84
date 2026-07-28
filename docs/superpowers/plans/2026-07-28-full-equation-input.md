# Full Equation Input (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept any equation linear in `y` (e.g. `3y + 2x = 6`) on all three equation inputs, rearrange it to `y = f(x)`, and show the entered form alongside the solved form.

**Architecture:** Two new pure modules under `src/scripts/graphing/` do all the work — `equation-input.ts` splits and solves, `equation-tex.ts` renders the entered form to LaTeX. Three components then swap their duplicated `normalizeExpr` regex for a single `parseEquationInput()` call. The plotted expression string keeps its exact current shape, so `evalAt`, `analyzeFunction`, the value table, and export are untouched.

**Tech Stack:** TypeScript, mathjs 15.2.0 (`simplify`, `evaluate`, `parse`), KaTeX 0.17.0, React 19, Astro 7, Vitest 4 (node env), Playwright 1.61.

## Global Constraints

- **Vitest runs in the `node` environment with no jsdom**, and `include` is `src/**/*.{test,spec}.ts` — only `.ts`. All branching logic must live in pure `src/scripts/**` modules or it cannot be unit-tested at all.
- **Strict TDD.** Red → Green → Refactor. Write the failing test, run it, watch it fail, then implement.
- **≥80% coverage on changed code.**
- **Commits:** Conventional Commits. **No `Co-authored-by` and no AI-generation tags** — this is a hard project rule.
- **GitFlow:** all work stays on `feature/full-equation-input`. Never commit to `main`.
- **Before every commit:** append an entry to `SUMMARY.md` per the template in `~/.claude/CLAUDE.md` §11.5.
- **Do not regenerate visual snapshot baselines.** `tests/e2e/export-visual.spec.ts` PNG baselines are Linux/Docker-only; regenerating them natively on macOS breaks CI deterministically.
- `expr` must keep its current shape (a plain `y = f(x)` expression string). Any existing test failure means this guarantee was broken.

---

### Task 1: Equation splitter

Splits raw input into sides on a **bare** `=`. This is separate from solving because `>=`/`<=`/`==`/`!=` all contain `=`, and `'y >= x'.split('=')` has length 2 — a naive split silently mis-parses comparisons.

**Files:**
- Create: `src/scripts/graphing/equation-input.ts`
- Test: `src/scripts/graphing/equation-input.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `splitEquation(raw: string): SplitResult` where
  `SplitResult = { kind: 'empty' } | { kind: 'expression'; expr: string } | { kind: 'equation'; lhs: string; rhs: string } | { kind: 'multiple' }`

- [ ] **Step 1: Write the failing test**

Create `src/scripts/graphing/equation-input.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitEquation } from './equation-input';

describe('splitEquation', () => {
  it('reports empty input', () => {
    expect(splitEquation('')).toEqual({ kind: 'empty' });
    expect(splitEquation('   ')).toEqual({ kind: 'empty' });
  });

  it('treats input with no equals sign as a bare expression', () => {
    expect(splitEquation('sin(x)')).toEqual({ kind: 'expression', expr: 'sin(x)' });
  });

  it('splits a single equation into sides', () => {
    expect(splitEquation('3y + 2x = 6')).toEqual({ kind: 'equation', lhs: '3y + 2x', rhs: '6' });
  });

  it('trims surrounding whitespace', () => {
    expect(splitEquation('  y=x^2  ')).toEqual({ kind: 'equation', lhs: 'y', rhs: 'x^2' });
  });

  // Today's regex is case-insensitive; mathjs treats Y and y as distinct symbols,
  // so without this normalization `Y = sin(x)` would silently stop working.
  it('normalizes a leading uppercase Y that is followed by =', () => {
    expect(splitEquation('Y = sin(x)')).toEqual({ kind: 'equation', lhs: 'y', rhs: 'sin(x)' });
  });

  it('leaves an uppercase Y alone when it is not the leading y=', () => {
    expect(splitEquation('2Y = x')).toEqual({ kind: 'equation', lhs: '2Y', rhs: 'x' });
  });

  // '>=' contains '='. A naive split('=') would produce two sides here.
  it('does not split on comparison operators', () => {
    expect(splitEquation('y >= x')).toEqual({ kind: 'expression', expr: 'y >= x' });
    expect(splitEquation('y == x')).toEqual({ kind: 'expression', expr: 'y == x' });
    expect(splitEquation('y != x')).toEqual({ kind: 'expression', expr: 'y != x' });
    expect(splitEquation('y <= x')).toEqual({ kind: 'expression', expr: 'y <= x' });
  });

  it('rejects more than one equals sign', () => {
    expect(splitEquation('y = x = 3')).toEqual({ kind: 'multiple' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: FAIL — cannot resolve `./equation-input`.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/graphing/equation-input.ts`:

```ts
/**
 * Parses a typed equation into the `y = f(x)` expression the rest of the app plots.
 *
 * Accepts any equation LINEAR IN y — `3y + 2x = 6`, `x*y = 1`, `y = sin(x)` — and
 * rearranges it. Equations that are not linear in y (`x^2 + y^2 = 25`) are relations,
 * not functions: they have two y values at some x, which `evalAt`'s single-valued
 * contract cannot represent. They are rejected here rather than mis-plotted.
 */

/** The shape of a raw input after splitting on a bare `=`. */
export type SplitResult =
  | { kind: 'empty' }
  | { kind: 'expression'; expr: string }
  | { kind: 'equation'; lhs: string; rhs: string }
  | { kind: 'multiple' };

// A bare `=` — one that is NOT part of >=, <=, ==, or !=. The lookbehind rejects an
// operator character before it; the lookahead rejects a second `=` after it.
const BARE_EQUALS = /(?<![<>=!])=(?!=)/;

// Mirrors the case-insensitivity of the `^y\s*=\s*` regex this module replaces, so
// `Y = sin(x)` keeps working. Deliberately anchored and `=`-gated: `2Y = x` is left
// alone, exactly as it was unsupported before.
const LEADING_UPPERCASE_Y = /^Y(?=\s*=)/;

export function splitEquation(raw: string): SplitResult {
  const trimmed = raw.trim().replace(LEADING_UPPERCASE_Y, 'y');
  if (!trimmed) return { kind: 'empty' };

  const parts = trimmed.split(BARE_EQUALS);
  if (parts.length === 1) return { kind: 'expression', expr: trimmed };
  if (parts.length > 2) return { kind: 'multiple' };
  return { kind: 'equation', lhs: parts[0].trim(), rhs: parts[1].trim() };
}
```

Note: `String.prototype.split` with a non-global regex still splits on every match, so `BARE_EQUALS` correctly yields 3 parts for `y = x = 3`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/equation-input.ts src/scripts/graphing/equation-input.test.ts
git commit -m "feat(graphing): split equation input on a bare equals sign"
```

---

### Task 2: Linear-in-y solver

**Files:**
- Modify: `src/scripts/graphing/equation-input.ts`
- Test: `src/scripts/graphing/equation-input.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent function in the same file)
- Produces: `solveLinearY(lhs: string, rhs: string): SolveResult` where
  `SolveResult = { ok: true; expr: string } | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'NO_Y_PRESENT' | 'INVALID' }`

**Background — the algorithm.** Any equation linear in `y` can be written
`F(x, y) = lhs − rhs = A(x)·y + B(x)`. So `B(x) = F(x, 0)` and `A(x) = F(x, 1) − F(x, 0)`.
mathjs's `simplify(F, { y: 0 })` substitutes `y` **symbolically** while leaving `x` free,
so both come back as expression strings. The solved form is `-(B) / (A)`.

Linearity is then verified by checking `F(x, 2) ≡ 2A(x) + B(x)` at sample x values —
without this check, `x^2 + y^2 = 25` silently produces a wrong curve instead of an error.

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/graphing/equation-input.test.ts`:

```ts
import { solveLinearY } from './equation-input';

describe('solveLinearY', () => {
  it.each([
    ['2y', 'x + 4', '(x + 4) / 2'],
    ['y - x^2', '0', 'x ^ 2'],
    ['3y + 2x', '6', '(6 - 2 * x) / 3'],
    ['x + y', '5', '5 - x'],
    ['y', 'sin(x)', 'sin(x)'],
    ['y + y', 'x', 'x / 2'],
    ['2', 'y', '2'],
    ['y', '5', '5'],
  ])('solves %s = %s', (lhs, rhs, expected) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: true, expr: expected });
  });

  // A(x) = x here, which is zero AT x=0 but not identically zero. The NO_Y_PRESENT
  // guard must not fire; the resulting 1/x handles its own asymptote via evalAt.
  it('solves an equation whose y coefficient depends on x', () => {
    expect(solveLinearY('x*y', '1')).toEqual({ ok: true, expr: '1 / x' });
  });

  it.each([
    ['y^2', 'x'],
    ['x^2 + y^2', '25'],
    ['e^y', 'x'],
    ['sin(y)', 'x'],
  ])('rejects %s = %s as not linear in y', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: false, reason: 'NOT_LINEAR_IN_Y' });
  });

  // Without the A === 0 guard this divides by zero and emits the literal string
  // "Infinity * (4 - 2*x)".
  it.each([
    ['2*x + 3', '7'],
    ['x', '3'],
    ['0', '0'],
  ])('rejects %s = %s because no y is present', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: false, reason: 'NO_Y_PRESENT' });
  });

  it('reports invalid input rather than throwing', () => {
    expect(solveLinearY('@@@', 'x')).toEqual({ ok: false, reason: 'INVALID' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: FAIL — `solveLinearY is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/scripts/graphing/equation-input.ts`:

```ts
import { simplify, evaluate } from 'mathjs';

export type SolveResult =
  | { ok: true; expr: string }
  | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'NO_Y_PRESENT' | 'INVALID' };

// Spread across negative, positive, and fractional values so a curve that happens to
// be linear-looking near one point cannot pass by coincidence.
const SAMPLE_XS = [-3.1, -0.7, 0.5, 2.3];
const LINEARITY_TOL = 1e-9;
const ZERO_TOL = 1e-12;

/** Evaluate `expr` at x, or null if it is undefined/non-finite there. */
function at(expr: string, x: number): number | null {
  try {
    const v = evaluate(expr, { x });
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Solve `lhs = rhs` for y, assuming it is linear in y.
 *
 * Writes F = lhs − rhs as A(x)·y + B(x) by substituting y = 0 and y = 1, then confirms
 * linearity at y = 2 before trusting the result.
 */
export function solveLinearY(lhs: string, rhs: string): SolveResult {
  try {
    const F = `(${lhs}) - (${rhs})`;
    const B = simplify(F, { y: 0 }).toString();
    const F1 = simplify(F, { y: 1 }).toString();
    const A = simplify(`(${F1}) - (${B})`).toString();
    const F2 = simplify(F, { y: 2 }).toString();

    // F(y=2) must equal 2A + B everywhere if F really is linear in y.
    const linear = SAMPLE_XS.every((x) => {
      const got = at(F2, x);
      const a = at(A, x);
      const b = at(B, x);
      if (got === null || a === null || b === null) return false;
      return Math.abs(got - (2 * a + b)) < LINEARITY_TOL;
    });
    if (!linear) return { ok: false, reason: 'NOT_LINEAR_IN_Y' };

    // A identically zero means y never appears: `2x + 3 = 7` is the vertical line
    // x = 2, which is not a function of x.
    const noY = SAMPLE_XS.every((x) => {
      const a = at(A, x);
      return a !== null && Math.abs(a) < ZERO_TOL;
    });
    if (noY) return { ok: false, reason: 'NO_Y_PRESENT' };

    return { ok: true, expr: simplify(`-(${B}) / (${A})`).toString() };
  } catch {
    return { ok: false, reason: 'INVALID' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: PASS. If a solved string differs cosmetically from the expected literal (e.g. `2 * (x + 1 / 2)`), update the expected value in the test to mathjs's actual output — the assertion pins the *string*, and mathjs's `simplify` formatting is the source of truth.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/equation-input.ts src/scripts/graphing/equation-input.test.ts
git commit -m "feat(graphing): solve equations linear in y via symbolic probe"
```

---

### Task 3: Public `parseEquationInput` API

**Files:**
- Modify: `src/scripts/graphing/equation-input.ts`
- Test: `src/scripts/graphing/equation-input.test.ts`

**Interfaces:**
- Consumes: `splitEquation` (Task 1), `solveLinearY` (Task 2)
- Produces:
  - `ParseFailure = 'EMPTY' | 'MULTIPLE_EQUALS' | 'NO_Y_PRESENT' | 'NOT_LINEAR_IN_Y' | 'INVALID'`
  - `EquationParse = { ok: true; expr: string; input?: string } | { ok: false; reason: ParseFailure; message: string }`
  - `parseEquationInput(raw: string): EquationParse`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/graphing/equation-input.test.ts`:

```ts
import { parseEquationInput } from './equation-input';

describe('parseEquationInput', () => {
  it('passes a bare expression through unchanged', () => {
    expect(parseEquationInput('sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  // The `y =` prefix case is subsumed by the general solver, which is what lets the
  // three duplicated normalizeExpr regexes be deleted.
  it('accepts a y-prefixed equation without marking it as rearranged', () => {
    expect(parseEquationInput('y = sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  it('accepts an uppercase Y prefix', () => {
    expect(parseEquationInput('Y = sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  it('records the entered form when a real rearrangement happened', () => {
    expect(parseEquationInput('3y + 2x = 6')).toEqual({
      ok: true,
      expr: '(6 - 2 * x) / 3',
      input: '3y + 2x = 6',
    });
  });

  it('reports empty input', () => {
    const r = parseEquationInput('  ');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'EMPTY' });
  });

  it('explains that a relation is not a function', () => {
    const r = parseEquationInput('x^2 + y^2 = 25');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'NOT_LINEAR_IN_Y' });
    if (!r.ok) expect(r.message).toContain('two y values');
  });

  it('explains that an equation without y cannot be plotted', () => {
    const r = parseEquationInput('2x + 3 = 7');
    expect(r).toMatchObject({ ok: false, reason: 'NO_Y_PRESENT' });
  });

  it('rejects more than one equals sign', () => {
    expect(parseEquationInput('y = x = 3')).toMatchObject({
      ok: false,
      reason: 'MULTIPLE_EQUALS',
    });
  });

  // '>=' is not split, so this reaches the expression path and fails validation on
  // the undefined symbol y.
  it('rejects an inequality', () => {
    expect(parseEquationInput('y >= x')).toMatchObject({ ok: false, reason: 'INVALID' });
  });

  it('rejects an unparseable expression', () => {
    expect(parseEquationInput('@@@')).toMatchObject({ ok: false, reason: 'INVALID' });
  });

  it('every failure carries a non-empty message', () => {
    for (const raw of ['', 'y = x = 3', '2x + 3 = 7', 'x^2 + y^2 = 25', '@@@']) {
      const r = parseEquationInput(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: FAIL — `parseEquationInput is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/scripts/graphing/equation-input.ts`:

```ts
export type ParseFailure =
  | 'EMPTY'
  | 'MULTIPLE_EQUALS'
  | 'NO_Y_PRESENT'
  | 'NOT_LINEAR_IN_Y'
  | 'INVALID';

export type EquationParse =
  | { ok: true; expr: string; input?: string }
  | { ok: false; reason: ParseFailure; message: string };

// Static strings. The circle below is a fixed illustration, NOT derived from the
// user's input — deriving the two halves would need the general solve this phase
// deliberately does not do. Entering a circle as two functions is also exactly what
// a physical TI-84 requires in Func mode, so this teaches the real workflow.
const MESSAGES: Record<ParseFailure, string> = {
  EMPTY: 'Enter an equation first.',
  MULTIPLE_EQUALS: 'Enter a single equation with one = sign.',
  NO_Y_PRESENT: 'This equation has no y, so there’s nothing to plot as y = f(x).',
  NOT_LINEAR_IN_Y:
    'That’s a relation, not a function — some x values have two y values. ' +
    'Graph it as two equations, e.g. y = sqrt(25-x^2) and y = -sqrt(25-x^2).',
  INVALID: 'Invalid expression.',
};

const fail = (reason: ParseFailure, message?: string): EquationParse => ({
  ok: false,
  reason,
  message: message ?? MESSAGES[reason],
});

/** Confirm the expression parses and evaluates, mirroring the pre-existing check. */
function validate(expr: string): EquationParse | null {
  try {
    evaluate(expr, { x: 1 });
    return null;
  } catch (e) {
    return fail('INVALID', `Invalid expression: ${(e as Error).message}`);
  }
}

/**
 * Parse a typed equation into the expression to plot.
 *
 * `expr` is always a plain `y = f(x)` expression, identical in shape to what the
 * components stored before this module existed. `input` is set ONLY when a genuine
 * rearrangement happened, and drives labels alone — never evaluation.
 */
export function parseEquationInput(raw: string): EquationParse {
  const split = splitEquation(raw);

  if (split.kind === 'empty') return fail('EMPTY');
  if (split.kind === 'multiple') return fail('MULTIPLE_EQUALS');

  if (split.kind === 'expression') {
    return validate(split.expr) ?? { ok: true, expr: split.expr };
  }

  const solved = solveLinearY(split.lhs, split.rhs);
  if (!solved.ok) return fail(solved.reason);

  const invalid = validate(solved.expr);
  if (invalid) return invalid;

  // A bare `y` on the left is not a rearrangement — it is the form we already show.
  const rearranged = split.lhs !== 'y';
  return rearranged
    ? { ok: true, expr: solved.expr, input: `${split.lhs} = ${split.rhs}` }
    : { ok: true, expr: solved.expr };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-input.test.ts`
Expected: PASS — all three describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/equation-input.ts src/scripts/graphing/equation-input.test.ts
git commit -m "feat(graphing): add parseEquationInput with per-reason messages"
```

---

### Task 4: LaTeX for the entered equation

`mathjs.parse()` **throws** on `=` (`Invalid left hand side of assignment operator`), so
the existing `exprToKatex` cannot render `3y + 2x = 6`. This renders each side separately
and rejoins.

**Files:**
- Create: `src/scripts/graphing/equation-tex.ts`
- Test: `src/scripts/graphing/equation-tex.test.ts`

**Interfaces:**
- Consumes: `splitEquation` from `./equation-input` (Task 1)
- Produces: `equationToTex(raw: string): string | null` — LaTeX **without** any `y =` prefix, or `null` when any side fails to parse

- [ ] **Step 1: Write the failing test**

Create `src/scripts/graphing/equation-tex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { equationToTex } from './equation-tex';

describe('equationToTex', () => {
  it('renders both sides of an equation joined by =', () => {
    const tex = equationToTex('3y + 2x = 6');
    expect(tex).toContain('=');
    expect(tex).toContain('y');
    expect(tex).toContain('6');
  });

  it('renders a relation that mathjs.parse would reject as a whole', () => {
    const tex = equationToTex('x^2 + y^2 = 25');
    expect(tex).not.toBeNull();
    expect(tex).toContain('25');
  });

  it('renders a bare expression', () => {
    expect(equationToTex('sin(x)')).toBe('\\sin\\left( x\\right)');
  });

  it('returns null when a side cannot be parsed', () => {
    expect(equationToTex('@@@ = 6')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(equationToTex('   ')).toBeNull();
  });

  it('returns null when there is more than one equals sign', () => {
    expect(equationToTex('y = x = 3')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/equation-tex.test.ts`
Expected: FAIL — cannot resolve `./equation-tex`.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/graphing/equation-tex.ts`:

```ts
/**
 * LaTeX for a raw equation input, for labelling the form the student actually typed.
 *
 * mathjs `parse()` treats `=` as assignment and throws on `3y + 2x = 6`, so an
 * equation cannot be rendered in one call. Each side is parsed independently and
 * rejoined with `=`.
 *
 * Returns TeX only — no `y =` prefix and no KaTeX rendering, so this stays pure and
 * unit-testable in the node environment.
 */
import { parse } from 'mathjs';
import { splitEquation } from './equation-input';

const TEX_OPTS = { implicit: 'hide' } as const;

export function equationToTex(raw: string): string | null {
  const split = splitEquation(raw);
  try {
    if (split.kind === 'expression') return parse(split.expr).toTex(TEX_OPTS);
    if (split.kind === 'equation') {
      const lhs = parse(split.lhs).toTex(TEX_OPTS);
      const rhs = parse(split.rhs).toTex(TEX_OPTS);
      return `${lhs} = ${rhs}`;
    }
    return null; // empty or multiple
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/equation-tex.test.ts`
Expected: PASS — 6 tests. If the `sin(x)` TeX literal differs, copy mathjs's actual output into the expectation.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/equation-tex.ts src/scripts/graphing/equation-tex.test.ts
git commit -m "feat(graphing): render entered equations to LaTeX side by side"
```

---

### Task 5: Wire the Graphing Calculator

**Files:**
- Modify: `src/components/graphing/GraphingCalculator.tsx` (delete `normalizeExpr` at `:71-74`; rewrite `addEquation` at `:245-269`; extend `EquationItem` at `:52-55`)

**Interfaces:**
- Consumes: `parseEquationInput` (Task 3)
- Produces: `EquationItem` now carries `input?: string`, read by Task 6

- [ ] **Step 1: Extend the item type and delete the regex**

In `src/components/graphing/GraphingCalculator.tsx`, replace the `EquationItem` interface (`:52-55`) with:

```ts
/** A plotted equation plus a stable id for React keys and list mutations. */
interface EquationItem extends PlotEquation {
  id: string;
  /** The equation as entered, present only when it was rearranged into `expr`. */
  input?: string;
}
```

Delete the whole `normalizeExpr` function at `:71-74`:

```ts
/** Strip a leading "y =" so "y = sin(x)" and "sin(x)" both plot. */
function normalizeExpr(raw: string): string {
  return raw.trim().replace(/^y\s*=\s*/i, '');
}
```

- [ ] **Step 2: Add the import**

Add to the import block near the other `@/scripts/graphing` imports:

```ts
import { parseEquationInput } from '@/scripts/graphing/equation-input';
```

- [ ] **Step 3: Rewrite `addEquation`**

Replace `addEquation` (`:245-269`) with:

```ts
  const addEquation = (): void => {
    const parsed = parseEquationInput(exprInput);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    const color = PALETTE[equations.length % PALETTE.length];
    const item: EquationItem = {
      id: `eq-${nextId.current++}`,
      expr: parsed.expr,
      input: parsed.input,
      color,
      showPoints: false,
      pointShape: 'circle',
    };
    setEquations((prev) => [...prev, item]);
    setExprInput('');
    setError(null);
  };
```

The old inline `evaluate(expr, { x: 1 })` validation moves inside `parseEquationInput`, and the `EMPTY` message already reads "Enter an equation first." — identical to the previous wording, so no per-surface override is needed here.

- [ ] **Step 4: Drop the now-unused `evaluate` import**

`:253` was the only call to `evaluate` in this file (`:532` is prose in the UI copy, not
code). `parse` is still used by `exprToKatex` at `:95`, so narrow the import rather than
deleting it. Change `:3` from:

```ts
import { evaluate, parse } from 'mathjs';
```

to:

```ts
import { parse } from 'mathjs';
```

Confirm: `grep -n "evaluate(" src/components/graphing/GraphingCalculator.tsx` returns nothing.

- [ ] **Step 5: Verify types and the existing suite**

Run: `npx astro check && npx vitest run`
Expected: 0 errors; every pre-existing test still passes. A failure here means `expr`'s shape changed — that is the guarantee this task must not break.

- [ ] **Step 6: Commit**

```bash
git add src/components/graphing/GraphingCalculator.tsx
git commit -m "feat(graphing): accept full equations in the graphing calculator"
```

---

### Task 6: Two-line equation label

**Files:**
- Modify: `src/components/graphing/GraphingCalculator.tsx` (`EquationLabel` at `:106-113`; list item at `:428`; `buildEquationDetails` at `:57-67`; export legend at `:320-326`)

**Interfaces:**
- Consumes: `EquationItem.input` (Task 5), `equationToTex` (Task 4)
- Produces: nothing consumed later

- [ ] **Step 1: Import the TeX helper**

```ts
import { equationToTex } from '@/scripts/graphing/equation-tex';
```

- [ ] **Step 2: Replace `EquationLabel`**

Replace `EquationLabel` (`:106-113`) with:

```ts
/** KaTeX HTML for already-TeX input, or null if KaTeX refuses it. */
function texToHtml(tex: string | null): string | null {
  if (tex === null) return null;
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
    });
  } catch {
    return null;
  }
}

/**
 * Pretty equation label.
 *
 * When `input` is present the equation was rearranged, so both forms are shown: the
 * equation as entered, then the solved `y = f(x)` beneath it. Seeing the rearrangement
 * is the point — for `3y + 2x = 6` it is the lesson itself.
 */
function EquationLabel({
  expr,
  input,
  className,
}: {
  expr: string;
  input?: string;
  className?: string;
}): React.JSX.Element {
  const solvedHtml = exprToKatex(expr);
  const solved = solvedHtml ? (
    <span dangerouslySetInnerHTML={{ __html: solvedHtml }} />
  ) : (
    <span>{`y = ${expr}`}</span>
  );

  if (!input) {
    return <span className={className}>{solved}</span>;
  }

  const enteredHtml = texToHtml(equationToTex(input));
  return (
    <span className={className}>
      <span className="block" data-testid="eq-entered-form" title={input}>
        {enteredHtml ? <span dangerouslySetInnerHTML={{ __html: enteredHtml }} /> : input}
      </span>
      <span
        className="block text-muted-foreground"
        data-testid="eq-solved-form"
        title={`y = ${expr}`}
      >
        {solved}
      </span>
    </span>
  );
}
```

The `title` attributes carry plain text so the e2e test in Task 9 can assert deterministically without depending on KaTeX's internal markup.

- [ ] **Step 3: Pass `input` at the call site**

At `:428`, change:

```tsx
<EquationLabel expr={eq.expr} className="truncate text-xs" />
```

to:

```tsx
<EquationLabel expr={eq.expr} input={eq.input} className="text-xs" />
```

`truncate` is dropped because it clips a two-line label to one line.

- [ ] **Step 4: Use the entered form in the details title and export legend**

In `buildEquationDetails` (`:57-67`), change the `title` line to:

```ts
    title: `Function details · ${equation.input ?? `y = ${formatExportEquation(equation.expr)}`}`,
```

In the export legend (`:320-326`), change the `label` line to:

```ts
          label: equation.input ?? `y = ${formatExportEquation(equation.expr)}`,
```

Leave the export **table header** (`:330`) as `y = ${formatExportEquation(equation.expr)}` — that column holds y values, so the solved form is the honest header.

- [ ] **Step 5: Verify**

Run: `npx astro check && npx vitest run`
Expected: 0 errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/graphing/GraphingCalculator.tsx
git commit -m "feat(graphing): show entered and solved forms for rearranged equations"
```

---

### Task 7: Wire the Function Explorer

Per the design, this surface accepts rearrangeable equations but **rejects relations** —
its slider-drag, asymptote, and end-behavior panels are all defined by one-x-one-y.
The rejection is automatic: `parseEquationInput` returns `NOT_LINEAR_IN_Y` for them.

**Files:**
- Modify: `src/components/explorer/FunctionExplorer.tsx` (delete `normalizeExpr` at `:77`; rewrite `plot()` at `:404-418`)

**Interfaces:**
- Consumes: `parseEquationInput` (Task 3)
- Produces: nothing consumed later

- [ ] **Step 1: Swap the import**

Add:

```ts
import { parseEquationInput } from '@/scripts/graphing/equation-input';
```

Delete the `normalizeExpr` line at `:77`:

```ts
const normalizeExpr = (raw: string): string => raw.trim().replace(/^y\s*=\s*/i, '');
```

- [ ] **Step 2: Rewrite `plot()`**

Replace `plot()` (`:404-418`) with:

```ts
  const plot = (): void => {
    const parsed = parseEquationInput(exprInput);
    if (!parsed.ok) {
      // Keep this surface's existing wording for the empty case.
      setError(parsed.reason === 'EMPTY' ? 'Enter a function first.' : parsed.message);
      return;
    }
    stopSweep();
    setError(null);
    setExpr(parsed.expr);
  };
```

- [ ] **Step 3: Delete the now-unused `evaluate` import**

`:411` was the only call to `evaluate` in this file, so the whole import is now dead.
Delete line `:3`:

```ts
import { evaluate } from 'mathjs';
```

Confirm: `grep -n "evaluate" src/components/explorer/FunctionExplorer.tsx` returns nothing.

- [ ] **Step 4: Verify**

Run: `npx astro check && npx vitest run`
Expected: 0 errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/FunctionExplorer.tsx
git commit -m "feat(explorer): accept full equations in the function explorer"
```

---

### Task 8: Wire the Transformation Explorer

**Files:**
- Modify: `src/components/explorer/TransformationExplorer.tsx` (delete `normalizeExpr` at `:53`; rewrite `plotCustom()` at `:155-166`)

**Interfaces:**
- Consumes: `parseEquationInput` (Task 3)
- Produces: nothing consumed later

- [ ] **Step 1: Swap the import**

Add:

```ts
import { parseEquationInput } from '@/scripts/graphing/equation-input';
```

Delete the `normalizeExpr` line at `:53`:

```ts
const normalizeExpr = (raw: string): string => raw.trim().replace(/^y\s*=\s*/i, '');
```

- [ ] **Step 2: Rewrite `plotCustom()`**

Replace `plotCustom()` (`:155-166`) with:

```ts
  const plotCustom = (): void => {
    const parsed = parseEquationInput(exprInput);
    if (!parsed.ok) {
      setError(parsed.reason === 'EMPTY' ? 'Enter a function first.' : parsed.message);
      return;
    }
    setBaseExpr(parsed.expr);
    setParentId(null);
    setParentLabel('your function');
    setCoeffs(IDENTITY);
    setError(null);
  };
```

- [ ] **Step 3: Delete the now-unused `evaluate` import**

`:157` was the only call to `evaluate` in this file, so the whole import is now dead.
Delete line `:3`:

```ts
import { evaluate } from 'mathjs';
```

Confirm: `grep -n "evaluate" src/components/explorer/TransformationExplorer.tsx` returns nothing.

- [ ] **Step 4: Confirm the regex is gone everywhere**

Run: `grep -rn "normalizeExpr" src/`
Expected: **no output.** All three copies are now deleted.

- [ ] **Step 5: Verify**

Run: `npx astro check && npx vitest run`
Expected: 0 errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx
git commit -m "refactor(explorer): use shared equation parser in transformation explorer"
```

---

### Task 9: End-to-end coverage and full verification

**Files:**
- Modify: `tests/e2e/graphing.spec.ts` (append tests)

**Interfaces:**
- Consumes: `data-testid="eq-entered-form"` and `data-testid="eq-solved-form"` with plain-text `title` attributes (Task 6)
- Produces: nothing

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/graphing.spec.ts`:

```ts
test('rearranges an equation and shows both the entered and solved forms', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('3y + 2x = 6');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  // Assert on the plain-text title attributes, not KaTeX's internal markup.
  await expect(page.getByTestId('eq-entered-form')).toHaveAttribute('title', '3y + 2x = 6');
  await expect(page.getByTestId('eq-solved-form')).toHaveAttribute(
    'title',
    'y = (6 - 2 * x) / 3',
  );
});

test('shows only one form when no rearranging was needed', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('y = sin(x)');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.locator('[data-testid="plot"] svg')).toBeVisible();
  await expect(page.getByTestId('eq-entered-form')).toHaveCount(0);
});

test('rejects a relation with guidance to enter it as two functions', async ({ page }) => {
  await page.goto('/graphing');
  await page.locator('#eq-input').fill('x^2 + y^2 = 25');
  await page.getByRole('button', { name: 'Plot' }).click();

  await expect(page.getByText(/two y values/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e tests to verify they fail if the wiring is wrong**

Run: `npx playwright test tests/e2e/graphing.spec.ts`
Expected: the three new tests PASS (Tasks 5–6 already implemented the behavior). If any fail, fix the component — do not weaken the assertion. If the solved-form title differs, run `parseEquationInput('3y + 2x = 6')` in a scratch script and use its actual `expr` output.

- [ ] **Step 3: Run the complete verification suite**

Run each and confirm:

```bash
npx astro check          # expect 0 errors, 0 warnings
npx vitest run           # expect all unit tests pass
npm run test:integration # expect all integration tests pass
npx playwright test      # expect all e2e pass
```

**Do not run `test:e2e:update-snapshots`.** Visual baselines are Linux/Docker-only; regenerating them on macOS breaks CI deterministically. If `export-visual.spec.ts` fails because the two-line label shifted export layout, stop and report it — baseline refresh is a separate Docker step.

- [ ] **Step 4: Check coverage on the new modules**

Run: `npx vitest run --coverage`
Expected: `equation-input.ts` and `equation-tex.ts` both ≥80% on statements and branches. If below, add cases to the existing describe blocks for whichever branch is uncovered.

- [ ] **Step 5: Update SUMMARY.md**

Append an entry per the `~/.claude/CLAUDE.md` §11.5 template — `**Change Type:** Feature`, `**Scope:** src/scripts/graphing, src/components`, a summary of what shipped, the rationale (why linear-in-y is the cut, why the additive `input` field over a richer type), and references to GH-26, the TODO entry, and the spec.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/graphing.spec.ts SUMMARY.md
git commit -m "test(graphing): cover full equation input end to end"
```

- [ ] **Step 7: Open the PR**

```bash
git push -u origin feature/full-equation-input
gh pr create --base main \
  --title "feat(graphing): accept full equations linear in y (GH-26 phase 1)" \
  --body "$(cat <<'BODY'
## Summary
Accepts any equation linear in `y` on all three equation inputs, rearranges it to
`y = f(x)`, and shows the entered form alongside the solved form.

Closes the Phase 1 half of #26. `x^2 + y^2 = 25` is a relation rather than a function
and is rejected here with guidance to enter it as two equations — the same thing a
physical TI-84 requires in Func mode. Implicit rendering is Phase 2.

## Changes
- New pure `src/scripts/graphing/equation-input.ts` — splits on a bare `=`, solves for
  `y` via a symbolic probe at y=0/1/2, returns a discriminated union
- New pure `src/scripts/graphing/equation-tex.ts` — renders the entered equation to
  LaTeX side-by-side, because `mathjs.parse()` throws on `=`
- All three components now share the parser; the duplicated `normalizeExpr` regex is
  deleted from `GraphingCalculator.tsx`, `FunctionExplorer.tsx`, and
  `TransformationExplorer.tsx`

## Risks
- Uppercase `Y` was the most likely silent regression (mathjs treats `Y` and `y` as
  distinct symbols); explicitly normalized and pinned by a test
- Linearity is sampled at four x values, not proven symbolically — a false negative
  rejects valid input rather than plotting something wrong, which is the safe direction

## Verification
`astro check`, unit, integration, and e2e suites all pass. Visual snapshot baselines
untouched.

## References
- Spec: `docs/superpowers/specs/2026-07-28-full-equation-input-design.md`
- Plan: `docs/superpowers/plans/2026-07-28-full-equation-input.md`
BODY
)"
```

---

## Deferred to Phase 2

Not in this plan — they need their own spec:

- Implicit relations via function-plot's `fnType: 'implicit'` + `graphType: 'interval'`
  (available in function-plot 1.25.4, `dist/types.d.ts:142`), on the Graphing Calculator only
- What the value table, hover readout, point overlay, and function-details panel do when
  a relation is active
- Revisiting the `NOT_LINEAR_IN_Y` message once relations render on the Graphing page
