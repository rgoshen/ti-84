# Transformation Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new "Transformation Explorer" at `/explorers/transformations` that makes g(x) = a·f(b(x − h)) + k tangible — pick a parent function, drag a/b/h/k, and watch the transformed curve reshape live against a dashed ghost of the parent, with a plain-English readout.

**Architecture:** A new React island (`TransformationExplorer.tsx`) renders two native `function-plot` series (dashed parent + solid transformed) via a new DOM module (`transform-render.ts`). All decisions come from two pure, Vitest-tested modules: `parents.ts` (catalog + per-parent windows) and `transform.ts` (`composeExpr` via mathjs node-substitution + `describeTransform` narration). Reuses the shipped graphing/theme/plot helpers and shadcn controls; nav is zero-touch because `Header.astro` already matches child routes.

**Tech Stack:** Astro 5, React 19 island (`client:only`), TypeScript, `function-plot` 1.25.4, `mathjs` 15.2.0, shadcn/radix UI, Vitest (node), Playwright.

## Global Constraints

- **No new runtime dependencies** — `mathjs`, `function-plot`, `radix-ui` slider all already present (verified in `package.json`).
- **Pure modules are DOM-free** and live in `src/scripts/explorer/`; the only DOM-bound module is `transform-render.ts`.
- **No float `===` for coefficient state** — use the single tolerance `EPS = 1e-6` for every "is this knob active?" test.
- **Accessibility WCAG 2.1 AA** — authoritative content is a `role="status" aria-live="polite"` text readout; the SVG plot is `role="img"` with a descriptive label; reflect controls are `aria-pressed` buttons; meaning never by colour alone (dashed vs solid + text).
- **Conventional Commits**, atomic, test-passing. **No co-author / AI-generation trailers** (per project CLAUDE.md).
- **Coverage ≥ 80% on changed code.**
- **Vitest run:** `npx vitest run <path>` for one file; `npm test` for all. **Type check:** `npm run astro -- check`. **Build:** `npm run build`. **E2E:** `npm run test:e2e`.
- Spec: `docs/superpowers/specs/2026-07-11-transformation-explorer-design.md`.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/scripts/explorer/parents.ts` | Parent-function catalog + per-parent default window + `parentById` | 1 |
| `src/scripts/explorer/parents.test.ts` | Every parent expr evaluates; every window valid | 1 |
| `src/scripts/graphing/theme.ts` (edit) | Add `ghost` to `ExplorerColors` + `explorerColors()` | 2 |
| `src/scripts/graphing/theme.test.ts` (edit) | `ghost` contrast ≥3:1 both themes | 2 |
| `src/scripts/explorer/transform.ts` | `EPS`, `Coeffs`, `composeExpr`, `describeTransform` | 3, 4 |
| `src/scripts/explorer/transform.test.ts` | compose numeric-equivalence; narration branches | 3, 4 |
| `src/scripts/explorer/transform-render.ts` | `renderTransform`: two native series, dash parent, zoom re-sync | 5 |
| `src/components/explorer/TransformationExplorer.tsx` | React island: controls, sliders, reflect toggles, readout, plot | 6 |
| `src/pages/explorers/transformations.astro` | Route | 7 |
| `src/pages/explorers/index.astro` (edit) | Second explorer card | 7 |
| `src/config.ts` (edit) | `SITE_TITLE_TRANSFORMATION_EXPLORER` | 7 |
| `tests/e2e/transformation.spec.ts` | End-to-end behavioural coverage | 8 |

---

## Task 1: Parent-function catalog (`parents.ts`)

**Files:**
- Create: `src/scripts/explorer/parents.ts`
- Test: `src/scripts/explorer/parents.test.ts`

**Interfaces:**
- Consumes: `Window2D`, `evalAt` from `@/scripts/graphing/math`.
- Produces: `interface Parent { id: string; label: string; expr: string; window: Window2D }`; `const PARENTS: Parent[]`; `function parentById(id: string): Parent | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/explorer/parents.test.ts
import { describe, it, expect } from 'vitest';
import { PARENTS, parentById } from './parents';
import { evalAt } from '@/scripts/graphing/math';

describe('parent catalog', () => {
  it('exposes the eight toolkit parents with unique ids', () => {
    const ids = PARENTS.map((p) => p.id);
    expect(ids).toEqual(['square', 'cube', 'abs', 'sqrt', 'recip', 'sin', 'cos', 'exp']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every parent expression evaluates to a finite number at a sensible x', () => {
    for (const p of PARENTS) {
      const x = p.id === 'sqrt' ? 4 : p.id === 'recip' ? 2 : 1;
      const v = evalAt(p.expr, x);
      expect(Number.isFinite(v), `${p.id} @ x=${x}`).toBe(true);
    }
  });

  it('every parent has a valid default window (max > min on both axes)', () => {
    for (const p of PARENTS) {
      expect(p.window.xMax, p.id).toBeGreaterThan(p.window.xMin);
      expect(p.window.yMax, p.id).toBeGreaterThan(p.window.yMin);
    }
  });

  it('parentById returns the parent or undefined', () => {
    expect(parentById('square')?.expr).toBe('x^2');
    expect(parentById('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: FAIL — "Failed to resolve import './parents'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/scripts/explorer/parents.ts
/**
 * The curated "parent function" catalog for the Transformation Explorer. Each
 * parent carries a default window that frames its shape well [G7] — sin/cos need
 * a small y-range, eˣ a small x-range, √x a shifted x-range, etc. Pure data.
 */
import type { Window2D } from '@/scripts/graphing/math';

export interface Parent {
  /** Stable id used by the picker + tests. */
  id: string;
  /** Human label, e.g. 'x²'. */
  label: string;
  /** mathjs / function-plot expression, e.g. 'x^2'. */
  expr: string;
  /** Default view that frames this parent well. */
  window: Window2D;
}

const TAU = 2 * Math.PI;

export const PARENTS: Parent[] = [
  { id: 'square', label: 'x²', expr: 'x^2', window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'cube', label: 'x³', expr: 'x^3', window: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 } },
  { id: 'abs', label: '|x|', expr: 'abs(x)', window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'sqrt', label: '√x', expr: 'sqrt(x)', window: { xMin: -2, xMax: 10, yMin: -2, yMax: 8 } },
  { id: 'recip', label: '1/x', expr: '1/x', window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'sin', label: 'sin x', expr: 'sin(x)', window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'cos', label: 'cos x', expr: 'cos(x)', window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'exp', label: 'eˣ', expr: 'exp(x)', window: { xMin: -3, xMax: 3, yMin: -1, yMax: 10 } },
];

export function parentById(id: string): Parent | undefined {
  return PARENTS.find((p) => p.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/parents.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/parents.ts src/scripts/explorer/parents.test.ts
git commit -m "feat(explorer): add parent-function catalog for transformations"
```

---

## Task 2: Ghost colour in the theme (`theme.ts`)

**Files:**
- Modify: `src/scripts/graphing/theme.ts:75-114` (`ExplorerColors` + `explorerColors`)
- Test: `src/scripts/graphing/theme.test.ts` (extend the existing explorer-palette block near line 75-100)

**Interfaces:**
- Produces: `ExplorerColors.ghost: string` — the de-emphasised parent hue for the dashed ghost curve.

- [ ] **Step 1: Write the failing test** (append inside `src/scripts/graphing/theme.test.ts`)

```ts
describe('transformation ghost colour', () => {
  const NON_TEXT_MIN_CONTRAST = 3.0;
  for (const [label, dark, bg] of [
    ['dark', true, '#0f172a'],
    ['light', false, '#ffffff'],
  ] as const) {
    it(`${label}: the ghost parent curve is visible against the background`, () => {
      const c = explorerColors(dark);
      expect(lineContrast(c.ghost, 1, bg)).toBeGreaterThanOrEqual(NON_TEXT_MIN_CONTRAST);
    });
  }
});
```

> Note: use the same `bg` literals the existing explorer-palette block uses; if that block defines `bg` differently, mirror its exact source rather than hard-coding.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/graphing/theme.test.ts`
Expected: FAIL — `c.ghost` is `undefined`, contrast throws / NaN.

- [ ] **Step 3: Add `ghost` to the interface and both palettes**

In `src/scripts/graphing/theme.ts`, add to `ExplorerColors` (after `pointStroke`):

```ts
  /** De-emphasised parent curve drawn dashed behind the transformed curve. */
  ghost: string;
```

In `explorerColors`, add to the **dark** object: `ghost: '#64748b',` and to the **light** object: `ghost: '#94a3b8',`. (Slate tones: clearly present but visually subordinate to the `curve` hue. Adjust only if the contrast test fails — both must be ≥3:1.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/graphing/theme.test.ts`
Expected: PASS. If either fails 3:1, darken the light ghost toward `#64748b` / lighten the dark ghost toward `#94a3b8` until both pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/graphing/theme.ts src/scripts/graphing/theme.test.ts
git commit -m "feat(explorer): add ghost parent colour to explorer palette"
```

---

## Task 3: `composeExpr` — build g(x) from f and coefficients

**Files:**
- Create: `src/scripts/explorer/transform.ts` (part 1)
- Test: `src/scripts/explorer/transform.test.ts` (part 1)

**Interfaces:**
- Consumes: `parse`, `evaluate` from `mathjs`.
- Produces: `const EPS = 1e-6`; `interface Coeffs { a: number; b: number; h: number; k: number }`; `function composeExpr(baseExpr: string, c: Coeffs): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/explorer/transform.test.ts
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { composeExpr, type Coeffs } from './transform';

/** Reference g(x) = a·f(b(x − h)) + k evaluated directly. */
const gRef = (base: string, c: Coeffs, x: number): number =>
  c.a * (evaluate(base, { x: c.b * (x - c.h) }) as number) + c.k;

const SAMPLES = [-3, -1.5, -0.4, 0.7, 2, 3.5];

describe('composeExpr — numeric equivalence to a·f(b(x−h))+k', () => {
  const cases: Array<[string, string, Coeffs]> = [
    ['vertical shift', 'x^2', { a: 1, b: 1, h: 0, k: 3 }],
    ['horizontal shift', 'x^2', { a: 1, b: 1, h: 2, k: 0 }],
    ['vertical stretch', 'x^2', { a: 3, b: 1, h: 0, k: 0 }],
    ['horizontal compression', 'x^2', { a: 1, b: 2, h: 0, k: 0 }],
    ['x-axis reflection', 'x^2', { a: -1, b: 1, h: 0, k: 0 }],
    ['y-axis reflection', 'sqrt(x)', { a: 1, b: -1, h: 0, k: 0 }],
    ['combined', 'sin(x)', { a: 2, b: 0.5, h: 1, k: -1 }],
  ];
  for (const [name, base, c] of cases) {
    it(name, () => {
      const expr = composeExpr(base, c);
      for (const x of SAMPLES) {
        const got = evaluate(expr, { x }) as number;
        const want = gRef(base, c, x);
        if (Number.isFinite(want)) expect(got).toBeCloseTo(want, 6);
      }
    });
  }

  it('substitutes safely for expressions whose function names contain no bare x', () => {
    const expr = composeExpr('exp(x)', { a: 1, b: 1, h: 1, k: 0 });
    expect(evaluate(expr, { x: 1 }) as number).toBeCloseTo(Math.exp(0), 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/transform.test.ts`
Expected: FAIL — "Failed to resolve import './transform'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/scripts/explorer/transform.ts
/**
 * Pure logic for the Transformation Explorer: build the transformed expression
 * g(x) = a·f(b(x − h)) + k, and narrate what the coefficients did. All "is this
 * knob active?" tests use EPS — never float === — because slider steps land on
 * values like 0.9999999 [G2].
 */
import { parse } from 'mathjs';

/** Tolerance for treating a coefficient as its identity value. */
export const EPS = 1e-6;

export interface Coeffs {
  a: number; // vertical stretch / x-axis reflection
  b: number; // horizontal stretch / y-axis reflection
  h: number; // horizontal shift
  k: number; // vertical shift
}

/**
 * Compose g(x) = a·f(b(x − h)) + k as a function-plot-ready expression string.
 * Substitutes every `x` symbol node in f with `(b·(x − h))` via mathjs node
 * transform (NOT text replacement — robust for exp(x), 1/x, etc.), then wraps
 * a·(…) + k. mathjs `transform` does not recurse into the replacement, so the
 * inner `x` is preserved.
 */
export function composeExpr(baseExpr: string, c: Coeffs): string {
  const inner = parse(`(${c.b}) * (x - (${c.h}))`);
  const substituted = parse(baseExpr).transform((node) =>
    node.isSymbolNode && node.name === 'x' ? inner : node,
  );
  return `(${c.a}) * (${substituted.toString()}) + (${c.k})`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/transform.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/transform.ts src/scripts/explorer/transform.test.ts
git commit -m "feat(explorer): compose transformed expression g(x)=a·f(b(x−h))+k"
```

---

## Task 4: `describeTransform` — the plain-English narration

**Files:**
- Modify: `src/scripts/explorer/transform.ts` (add narration)
- Test: `src/scripts/explorer/transform.test.ts` (add narration block)

**Interfaces:**
- Consumes: `formatNumber` from `@/scripts/graphing/hover`; `EPS`, `Coeffs` from this module.
- Produces: `interface TransformReadout { equation: string; steps: string[] }`; `function describeTransform(c: Coeffs, parentLabel: string): TransformReadout`.

> **Learning-mode note (execution time):** `describeTransform` is the pedagogical core — the exact wording and ordering are a genuine teaching decision. When executing this task, offer the user the chance to author/adjust the narration bodies before finalizing. The implementation below is complete and correct so the plan is executable as-is; treat it as the default the user may refine.

- [ ] **Step 1: Write the failing test** (append to `src/scripts/explorer/transform.test.ts`)

```ts
import { describeTransform, EPS } from './transform';

const IDENT = { a: 1, b: 1, h: 0, k: 0 };

describe('describeTransform — narration', () => {
  it('identity names the parent and lists no transformations', () => {
    const r = describeTransform(IDENT, 'x²');
    expect(r.equation).toBe('g(x) = f(x)');
    expect(r.steps).toEqual(['This is the parent function f(x) = x² — move a slider to transform it.']);
  });

  it('does not report a phantom stretch at a floating-point identity [G2]', () => {
    const r = describeTransform({ ...IDENT, a: 1 - EPS / 2 }, 'x²');
    expect(r.steps.some((s) => /stretch|compression/.test(s))).toBe(false);
  });

  it('vertical stretch and shift', () => {
    const r = describeTransform({ a: 3, b: 1, h: 0, k: 2 }, 'x²');
    expect(r.steps).toEqual(['Vertical stretch by factor 3', 'Shifted up 2']);
  });

  it('x-axis reflection (|a|=1, no stretch)', () => {
    expect(describeTransform({ a: -1, b: 1, h: 0, k: 0 }, 'x²').steps).toEqual(['Reflected over the x-axis']);
  });

  it('horizontal compression vs stretch use the |b| convention', () => {
    expect(describeTransform({ a: 1, b: 2, h: 0, k: 0 }, 'x²').steps).toEqual(['Horizontal compression by factor 2']);
    expect(describeTransform({ a: 1, b: 0.5, h: 0, k: 0 }, 'x²').steps).toEqual(['Horizontal stretch by factor 2']);
  });

  it('y-axis reflection and directional shifts', () => {
    expect(describeTransform({ a: 1, b: -1, h: 0, k: 0 }, 'x²').steps).toEqual(['Reflected over the y-axis']);
    expect(describeTransform({ a: 1, b: 1, h: 2, k: 0 }, 'x²').steps).toEqual(['Shifted right 2']);
    expect(describeTransform({ a: 1, b: 1, h: -2, k: 0 }, 'x²').steps).toEqual(['Shifted left 2']);
    expect(describeTransform({ a: 1, b: 1, h: 0, k: -3 }, 'x²').steps).toEqual(['Shifted down 3']);
  });

  it('orders horizontal (inside-out) before vertical for combined transforms', () => {
    const r = describeTransform({ a: 3, b: 2, h: 1, k: -4 }, 'x²');
    expect(r.steps).toEqual([
      'Horizontal compression by factor 2',
      'Shifted right 1',
      'Vertical stretch by factor 3',
      'Shifted down 4',
    ]);
    expect(r.equation).toBe('g(x) = 3·f(2(x − 1)) − 4');
  });

  it('degenerate b=0 and a=0 replace the step list with an explanation [G3]', () => {
    expect(describeTransform({ a: 1, b: 0, h: 0, k: 0 }, 'x²').steps).toEqual([
      'b = 0: the graph collapses to a horizontal line.',
    ]);
    expect(describeTransform({ a: 0, b: 1, h: 0, k: 0 }, 'x²').steps).toEqual([
      'a = 0: the graph flattens to the line y = k.',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scripts/explorer/transform.test.ts`
Expected: FAIL — "describeTransform is not a function".

- [ ] **Step 3: Write the implementation** (append to `src/scripts/explorer/transform.ts`)

```ts
import { formatNumber } from '@/scripts/graphing/hover';

export interface TransformReadout {
  equation: string; // e.g. 'g(x) = 3·f(2(x − 1)) − 4'
  steps: string[]; // ordered plain-English transformations, or one explanatory line
}

const fmt = (n: number): string => formatNumber(n);

/** Build the readable equation, simplifying identity terms. */
function formatEquation(c: Coeffs): string {
  const hPart = Math.abs(c.h) < EPS ? 'x' : c.h > 0 ? `x − ${fmt(c.h)}` : `x + ${fmt(-c.h)}`;
  const inner =
    Math.abs(c.b - 1) < EPS ? hPart : Math.abs(c.b + 1) < EPS ? `−(${hPart})` : `${fmt(c.b)}(${hPart})`;
  const fPart = `f(${inner})`;
  const aPart =
    Math.abs(c.a - 1) < EPS ? fPart : Math.abs(c.a + 1) < EPS ? `−${fPart}` : `${fmt(c.a)}·${fPart}`;
  const kPart = Math.abs(c.k) < EPS ? '' : c.k > 0 ? ` + ${fmt(c.k)}` : ` − ${fmt(-c.k)}`;
  return `g(x) = ${aPart}${kPart}`;
}

/**
 * Narrate the transformation as an ordered step list. Order is horizontal
 * (inside-out: reflect → scale → shift) then vertical (reflect → scale → shift),
 * matching how "work inside the parentheses first" is taught [G5]. Degenerate
 * b=0 / a=0 replace the list with a single explanation [G3].
 */
export function describeTransform(c: Coeffs, parentLabel: string): TransformReadout {
  const equation = formatEquation(c);

  if (Math.abs(c.b) < EPS) return { equation, steps: ['b = 0: the graph collapses to a horizontal line.'] };
  if (Math.abs(c.a) < EPS) return { equation, steps: ['a = 0: the graph flattens to the line y = k.'] };

  const steps: string[] = [];

  // Horizontal (inside-out).
  if (c.b < -EPS) steps.push('Reflected over the y-axis');
  const B = Math.abs(c.b);
  if (B > 1 + EPS) steps.push(`Horizontal compression by factor ${fmt(B)}`);
  else if (B < 1 - EPS) steps.push(`Horizontal stretch by factor ${fmt(1 / B)}`);
  if (c.h > EPS) steps.push(`Shifted right ${fmt(c.h)}`);
  else if (c.h < -EPS) steps.push(`Shifted left ${fmt(-c.h)}`);

  // Vertical (outside).
  if (c.a < -EPS) steps.push('Reflected over the x-axis');
  const A = Math.abs(c.a);
  if (A > 1 + EPS) steps.push(`Vertical stretch by factor ${fmt(A)}`);
  else if (A < 1 - EPS) steps.push(`Vertical compression by factor ${fmt(A)}`);
  if (c.k > EPS) steps.push(`Shifted up ${fmt(c.k)}`);
  else if (c.k < -EPS) steps.push(`Shifted down ${fmt(-c.k)}`);

  if (steps.length === 0) {
    steps.push(`This is the parent function f(x) = ${parentLabel} — move a slider to transform it.`);
  }
  return { equation, steps };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scripts/explorer/transform.test.ts`
Expected: PASS (all narration + compose tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/explorer/transform.ts src/scripts/explorer/transform.test.ts
git commit -m "feat(explorer): narrate transformations in plain English (describeTransform)"
```

---

## Task 5: The renderer (`transform-render.ts`)

**Files:**
- Create: `src/scripts/explorer/transform-render.ts`

**Interfaces:**
- Consumes: `composeExpr`, `Coeffs` (Task 3); `Parent` not needed; `Window2D` from `@/scripts/graphing/math`; `themeColors`, `explorerColors` from `@/scripts/graphing/theme`; `applyThemeToPlot`, `boldZeroAxes`, `asNumericScale`, `FunctionPlotInstance` from `@/scripts/graphing/plot`.
- Produces: `interface TransformRenderOptions { target; window: Window2D; baseExpr: string; coeffs: Coeffs; showParent: boolean; dark: boolean; grid: boolean; onViewChange: (w: Window2D) => void }`; `interface TransformHandle { instance: FunctionPlotInstance }`; `function renderTransform(opts: TransformRenderOptions): TransformHandle`.

> **Verification model:** like the shipped `render.ts`, this DOM module has no node unit test — it is verified by `npm run astro -- check`, the Task 8 e2e (which asserts a dashed parent path and a solid transformed path), and a live `npm run dev` check. Follow the concrete implementation below exactly.

- [ ] **Step 1: Write the renderer**

```ts
// src/scripts/explorer/transform-render.ts
/**
 * function-plot renderer for the Transformation Explorer. Draws TWO native
 * series — the parent f(x) as a dashed "ghost" and the transformed g(x) as the
 * solid curve — reusing the graphing calculator's plotting/theme helpers. Unlike
 * the limits explorer it needs no manual overlay: both marks are real functions,
 * so function-plot's interval-arithmetic discontinuity handling applies to both.
 * The only post-processing is dashing the parent's <g class="graph"> group [G4].
 */
import functionPlotDefault from 'function-plot';
import type { FunctionPlotDatum } from 'function-plot';
import type { Window2D } from '@/scripts/graphing/math';
import { themeColors, explorerColors } from '@/scripts/graphing/theme';
import {
  applyThemeToPlot,
  boldZeroAxes,
  asNumericScale,
  type FunctionPlotInstance,
} from '@/scripts/graphing/plot';
import { composeExpr, type Coeffs } from './transform';

type FunctionPlotFn = typeof functionPlotDefault;
const functionPlot: FunctionPlotFn =
  (functionPlotDefault as unknown as { default?: FunctionPlotFn }).default ?? functionPlotDefault;

const PLOT_HEIGHT = 480;

export interface TransformRenderOptions {
  target: HTMLElement;
  window: Window2D; // the domain to draw (pass the CURRENT view to preserve zoom)
  baseExpr: string;
  coeffs: Coeffs;
  showParent: boolean;
  dark: boolean;
  grid: boolean;
  onViewChange: (w: Window2D) => void;
}

export interface TransformHandle {
  instance: FunctionPlotInstance;
}

/** Targets that already have our zoom listener, so re-render doesn't stack it. */
const zoomBound = new WeakSet<HTMLElement>();

/** Dash the parent series (drawn first → the first <g class="graph">). */
function dashParent(target: HTMLElement, showParent: boolean): void {
  if (!showParent) return;
  const graphs = target.querySelectorAll<SVGGElement>('g.graph');
  graphs[0]?.querySelectorAll('path').forEach((p) => {
    p.setAttribute('stroke-dasharray', '6 6');
  });
}

export function renderTransform(opts: TransformRenderOptions): TransformHandle {
  const { target, window: win, baseExpr, coeffs, showParent, dark, grid, onViewChange } = opts;
  const colors = themeColors(dark);
  const e = explorerColors(dark);

  // Parent FIRST so it draws underneath and is the first g.graph (dashed); the
  // transformed curve draws on top, solid.
  const data: FunctionPlotDatum[] = [];
  if (showParent && baseExpr) data.push({ fn: baseExpr, color: e.ghost, graphType: 'polyline' });
  if (baseExpr) data.push({ fn: composeExpr(baseExpr, coeffs), color: e.curve, graphType: 'polyline' });

  const instance = functionPlot({
    target,
    width: target.clientWidth,
    height: PLOT_HEIGHT,
    grid,
    disableZoom: false,
    xAxis: { domain: [win.xMin, win.xMax], label: 'x' },
    yAxis: { domain: [win.yMin, win.yMax], label: 'y' },
    data,
  });

  applyThemeToPlot(target, colors);
  boldZeroAxes(target);
  dashParent(target, showParent);

  if (!zoomBound.has(target)) {
    zoomBound.add(target);
    let queued = false;
    instance.on('all:zoom', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const xScale = asNumericScale(instance.meta.xScale);
        const yScale = asNumericScale(instance.meta.yScale);
        if (!xScale || !yScale) return;
        const xd = xScale.domain();
        const yd = yScale.domain();
        applyThemeToPlot(target, colors);
        boldZeroAxes(target);
        dashParent(target, showParent);
        onViewChange({ xMin: xd[0], xMax: xd[1], yMin: yd[0], yMax: yd[1] });
      });
    });
  }

  return { instance };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run astro -- check`
Expected: 0 errors (warnings unrelated to these files are fine).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/explorer/transform-render.ts
git commit -m "feat(explorer): render dashed parent + solid transformed curve"
```

---

## Task 6: The React island (`TransformationExplorer.tsx`)

**Files:**
- Create: `src/components/explorer/TransformationExplorer.tsx`

**Interfaces:**
- Consumes: `PARENTS`, `parentById`, `Parent` (Task 1); `Coeffs`, `describeTransform` (Tasks 3–4); `renderTransform`, `TransformHandle` (Task 5); `Window2D` from `@/scripts/graphing/math`; `evaluate` from `mathjs`; shadcn `Button`, `Input`, `Label`, `Checkbox`, `Slider`, `Card`.
- Produces: default-exported `TransformationExplorer` React component.

> **Verification model:** verified by `npm run astro -- check`, Task 8 e2e, and a live `npm run dev` check. Mirrors the theme-observer + appliedWindow/displayWindow patterns from `FunctionExplorer.tsx:163-172`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/explorer/TransformationExplorer.tsx
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluate } from 'mathjs';

import type { Window2D } from '@/scripts/graphing/math';
import { renderTransform, type TransformHandle } from '@/scripts/explorer/transform-render';
import { describeTransform, EPS, type Coeffs } from '@/scripts/explorer/transform';
import { PARENTS, parentById } from '@/scripts/explorer/parents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

// Tunables, in one place.
const IDENTITY: Coeffs = { a: 1, b: 1, h: 0, k: 0 };
const A_RANGE = { min: -5, max: 5, step: 0.1 };
const H_RANGE = { min: -10, max: 10, step: 0.1 };
const round2 = (n: number): number => Math.round(n * 100) / 100;

const normalizeExpr = (raw: string): string => raw.trim().replace(/^y\s*=\s*/i, '');

type WindowFields = Record<keyof Window2D, string>;
const windowToFields = (w: Window2D): WindowFields => ({
  xMin: String(w.xMin), xMax: String(w.xMax), yMin: String(w.yMin), yMax: String(w.yMax),
});

export default function TransformationExplorer(): React.JSX.Element {
  const [baseExpr, setBaseExpr] = useState(PARENTS[0].expr);
  const [exprInput, setExprInput] = useState(PARENTS[0].expr);
  const [parentId, setParentId] = useState<string | null>(PARENTS[0].id);
  const [parentLabel, setParentLabel] = useState(PARENTS[0].label);
  const [coeffs, setCoeffs] = useState<Coeffs>(IDENTITY);
  const [error, setError] = useState<string | null>(null);
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(PARENTS[0].window);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(PARENTS[0].window);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(PARENTS[0].window));
  const [showParent, setShowParent] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );

  const plotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<TransformHandle | null>(null);
  const viewRef = useRef<Window2D>(appliedWindow); // latest view (preserves zoom on coeff change)

  const readout = useMemo(() => describeTransform(coeffs, parentLabel), [coeffs, parentLabel]);

  const setCoeff = (key: keyof Coeffs, value: number): void =>
    setCoeffs((prev) => ({ ...prev, [key]: value }));

  const selectParent = (id: string): void => {
    const p = parentById(id);
    if (!p) return;
    setBaseExpr(p.expr);
    setExprInput(p.expr);
    setParentId(p.id);
    setParentLabel(p.label);
    setCoeffs(IDENTITY);
    setError(null);
    setAppliedWindow(p.window);
    setDisplayWindow(p.window);
    viewRef.current = p.window;
    setFields(windowToFields(p.window));
  };

  const plotCustom = (): void => {
    const e = normalizeExpr(exprInput);
    if (!e) { setError('Enter a function first.'); return; }
    try { evaluate(e, { x: 1 }); } catch (err) {
      setError(`Invalid function: ${(err as Error).message}`); return;
    }
    setBaseExpr(e);
    setParentId(null);
    setParentLabel('your function');
    setCoeffs(IDENTITY);
    setError(null);
  };

  const applyWindow = (): void => {
    const next: Window2D = {
      xMin: parseFloat(fields.xMin), xMax: parseFloat(fields.xMax),
      yMin: parseFloat(fields.yMin), yMax: parseFloat(fields.yMax),
    };
    if (Object.values(next).some((n) => !Number.isFinite(n))) { setError('Enter valid numbers for the window.'); return; }
    if (next.xMax <= next.xMin || next.yMax <= next.yMin) { setError('Window max must be greater than min.'); return; }
    setError(null);
    setAppliedWindow(next);
    setDisplayWindow(next);
    viewRef.current = next;
  };

  // Track site theme so the plot re-themes with the header toggle.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setFields(windowToFields(displayWindow)); }, [displayWindow]);

  // Single draw path, shared by the change-driven effect and the resize handler
  // (DRY — the shipped FunctionExplorer uses the same closure pattern). Draws at
  // the CURRENT view (viewRef) so a slider drag never snaps the zoom back.
  const drawPlot = useCallback((): void => {
    const target = plotRef.current;
    if (!target) return;
    try {
      handleRef.current = renderTransform({
        target,
        window: viewRef.current,
        baseExpr,
        coeffs,
        showParent,
        dark,
        grid: showGrid,
        onViewChange: (w) => { viewRef.current = w; setDisplayWindow(w); },
      });
      setError((e) => (e && e.startsWith('Could not plot') ? null : e));
    } catch {
      setError('Could not plot that function. Check the syntax and try again.');
    }
  }, [baseExpr, coeffs, showParent, dark, showGrid]);

  // Redraw on any change. appliedWindow is a dep (a fresh window resets the view)
  // but displayWindow is NOT, so interactive zoom doesn't retrigger a rebuild.
  useEffect(() => {
    drawPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPlot, appliedWindow]);

  // Redraw on resize, rAF-throttled.
  useEffect(() => {
    let queued = false;
    const onResize = (): void => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; drawPlot(); });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawPlot]);

  // Coalesced screen-reader announcement.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${readout.equation}. ${readout.steps.join('. ')}`), 250);
    return () => clearTimeout(id);
  }, [readout]);

  const setField = (key: keyof Window2D, value: string): void =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const sliders: Array<{ key: keyof Coeffs; label: string; range: typeof A_RANGE }> = [
    { key: 'a', label: 'a — vertical stretch / reflect', range: A_RANGE },
    { key: 'b', label: 'b — horizontal stretch / reflect', range: A_RANGE },
    { key: 'h', label: 'h — horizontal shift', range: H_RANGE },
    { key: 'k', label: 'k — vertical shift', range: H_RANGE },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card className="gap-3 p-4">
          <Label>Parent function</Label>
          <div className="flex flex-wrap gap-2">
            {PARENTS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={parentId === p.id ? 'default' : 'outline'}
                aria-pressed={parentId === p.id}
                onClick={() => selectParent(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Label htmlFor="fx-input" className="mt-2">Or a custom f(x)</Label>
          <div className="flex gap-2">
            <Input
              id="fx-input" type="text" autoComplete="off" placeholder="e.g. x^2"
              value={exprInput}
              onChange={(e) => setExprInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') plotCustom(); }}
            />
            <Button type="button" onClick={plotCustom}>Plot</Button>
          </div>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        </Card>

        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Transform</h3>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCoeffs(IDENTITY)}>Reset</Button>
          </div>
          {sliders.map((s) => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={`slider-${s.key}`} className="text-xs text-muted-foreground">{s.label}</Label>
                <span className="font-mono text-sm tabular-nums">{round2(coeffs[s.key])}</span>
              </div>
              <Slider
                id={`slider-${s.key}`}
                aria-label={s.label}
                min={s.range.min} max={s.range.max} step={s.range.step}
                value={[coeffs[s.key]]}
                onValueChange={([v]) => setCoeff(s.key, v)}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button" size="sm" variant={coeffs.a < -EPS ? 'default' : 'outline'}
              aria-pressed={coeffs.a < -EPS}
              onClick={() => setCoeff('a', -coeffs.a)}
            >⇅ Reflect x-axis</Button>
            <Button
              type="button" size="sm" variant={coeffs.b < -EPS ? 'default' : 'outline'}
              aria-pressed={coeffs.b < -EPS}
              onClick={() => setCoeff('b', -coeffs.b)}
            >⇄ Reflect y-axis</Button>
          </div>
          <div className="rounded-md bg-accent/60 p-3" aria-hidden="true">
            <p className="font-mono text-sm font-medium text-accent-foreground">{readout.equation}</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
              {readout.steps.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Window &amp; guides</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => (
              <label key={key} className="block">
                <span className="text-muted-foreground">{key}</span>
                <Input type="number" step="any" value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)} className="mt-1 h-8" />
              </label>
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={applyWindow}>Apply window</Button>
          <div className="flex flex-col gap-2 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showParent} onCheckedChange={(v) => setShowParent(v === true)} />
              <span className="text-muted-foreground">Show parent (dashed)</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showGrid} onCheckedChange={(v) => setShowGrid(v === true)} />
              <span className="text-muted-foreground">Show grid</span>
            </label>
          </div>
        </Card>
      </div>

      <div>
        <Card className="overflow-hidden p-2">
          <div
            ref={plotRef}
            data-testid="transform-plot"
            role="img"
            aria-label={`Graph of parent f(x) = ${parentLabel} (dashed) and transformed ${readout.equation}`}
            className="w-full"
            style={{ minHeight: 480 }}
          />
        </Card>
        <div className="sr-only" role="status" aria-live="polite">{announced}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run astro -- check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx
git commit -m "feat(explorer): add Transformation Explorer island (sliders, reflects, readout)"
```

---

## Task 7: Route, hub card, and config

**Files:**
- Create: `src/pages/explorers/transformations.astro`
- Modify: `src/pages/explorers/index.astro` (add a second card)
- Modify: `src/config.ts` (add title constant)

**Interfaces:**
- Consumes: `TransformationExplorer` (Task 6); `SITE_TITLE_TRANSFORMATION_EXPLORER` from `@/config`.

- [ ] **Step 1: Add the config constant** — in `src/config.ts`, after `SITE_TITLE_FUNCTION_EXPLORER`:

```ts
export const SITE_TITLE_TRANSFORMATION_EXPLORER =
  import.meta.env.PUBLIC_SITE_TITLE_TRANSFORMATION_EXPLORER ?? 'Transformation Explorer';
```

- [ ] **Step 2: Create the route** — `src/pages/explorers/transformations.astro`:

```astro
---
import Base from '@/layouts/Base.astro';
import { SITE_TITLE_TRANSFORMATION_EXPLORER } from '@/config';
import TransformationExplorer from '@/components/explorer/TransformationExplorer.tsx';
---

<Base
  title={SITE_TITLE_TRANSFORMATION_EXPLORER}
  description="Explore function transformations: pick a parent function, then shift, stretch, compress, and reflect it with a, b, h, k and watch g(x) = a·f(b(x − h)) + k reshape against a dashed ghost of the parent."
>
  <section class="py-6">
    <h1 class="text-2xl font-semibold tracking-tight">{SITE_TITLE_TRANSFORMATION_EXPLORER}</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
      Pick a parent function, then drag <strong>a</strong>, <strong>b</strong>, <strong>h</strong>, and
      <strong>k</strong> to shift, stretch, compress, and reflect it. The dashed curve is the original
      parent; the solid curve is the transformed g(x) = a&middot;f(b(x &minus; h)) + k. Read what each
      change did below the sliders.
    </p>
  </section>
  <TransformationExplorer client:only="react" />
</Base>
```

- [ ] **Step 3: Add the hub card** — in `src/pages/explorers/index.astro`, import the new title and add a second `<a>` card inside the grid (mirror the existing Function Explorer card):

```astro
// add to the frontmatter import:
import { SITE_TITLE_EXPLORERS, SITE_TITLE_FUNCTION_EXPLORER, SITE_TITLE_TRANSFORMATION_EXPLORER } from '@/config';
```

```astro
<a
  href="/explorers/transformations"
  class="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
>
  <h2 class="text-lg font-medium">{SITE_TITLE_TRANSFORMATION_EXPLORER}</h2>
  <p class="mt-2 text-sm text-muted-foreground">
    Pick a parent function and shift, stretch, compress, and reflect it with a, b, h, k — watch
    g(x) = a&middot;f(b(x &minus; h)) + k reshape live against a dashed ghost of the parent.
  </p>
  <span class="mt-4 inline-block text-sm font-medium group-hover:underline">
    Open the Transformation Explorer &rarr;
  </span>
</a>
```

- [ ] **Step 4: Type-check and build**

Run: `npm run astro -- check && npm run build`
Expected: 0 type errors; build emits **6** pages (was 5), including `/explorers/transformations`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/explorers/transformations.astro src/pages/explorers/index.astro src/config.ts
git commit -m "feat(explorer): add Transformation Explorer route, hub card, and title"
```

---

## Task 8: End-to-end tests (`transformation.spec.ts`)

**Files:**
- Create: `tests/e2e/transformation.spec.ts`

**Interfaces:**
- Consumes: the running app at `/explorers/transformations`; DOM hooks `[data-testid="transform-plot"]`, `g.graph` series, `role="status"`, `aria-pressed` buttons.

- [ ] **Step 1: Write the e2e spec**

```ts
// tests/e2e/transformation.spec.ts
import { test, expect, type Page } from '@playwright/test';

const PLOT = '[data-testid="transform-plot"]';

async function goto(page: Page): Promise<void> {
  await page.goto('/explorers/transformations');
  await expect(page.locator(`${PLOT} svg`)).toBeVisible();
}

/** Count the rendered function-plot series (each is a <g class="graph">). */
const seriesCount = (page: Page): Promise<number> =>
  page.locator(`${PLOT} g.graph`).count();

test('renders a dashed parent and a solid transformed curve by default', async ({ page }) => {
  await goto(page);
  expect(await seriesCount(page)).toBe(2);
  // The first series (parent) is dashed.
  const dashed = await page.locator(`${PLOT} g.graph`).first().locator('path').first().getAttribute('stroke-dasharray');
  expect(dashed).toBeTruthy();
  await expect(page.getByText(/parent function/i)).toBeVisible();
});

test('moving a slider updates the readout and keeps both curves', async ({ page }) => {
  await goto(page);
  const kSlider = page.getByRole('slider', { name: /k — vertical shift/i });
  await kSlider.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); // +2.0 at step 0.1
  await expect(page.getByText(/Shifted up/i)).toBeVisible();
  expect(await seriesCount(page)).toBe(2);
});

test('reflect toggle flips the sign and its pressed state', async ({ page }) => {
  await goto(page);
  const reflectX = page.getByRole('button', { name: /Reflect x-axis/i });
  await expect(reflectX).toHaveAttribute('aria-pressed', 'false');
  await reflectX.click();
  await expect(reflectX).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Reflected over the x-axis/i)).toBeVisible();
});

test('reset returns to the parent identity message', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: /Reflect y-axis/i }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText(/This is the parent function/i)).toBeVisible();
});

test('picking a different parent reframes and resets', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: 'sin x', exact: true }).click();
  await expect(page.getByRole('button', { name: 'sin x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/This is the parent function f\(x\) = sin x/i)).toBeVisible();
});

test('a custom function plots and transforms', async ({ page }) => {
  await goto(page);
  await page.locator('#fx-input').fill('1/x');
  await page.getByRole('button', { name: 'Plot' }).click();
  expect(await seriesCount(page)).toBe(2);
});

test('b = 0 explains the collapse instead of blanking silently', async ({ page }) => {
  await goto(page);
  const bSlider = page.getByRole('slider', { name: /b — horizontal stretch/i });
  await bSlider.focus();
  // Default b = 1 at step 0.1 → 10 ArrowLeft reaches 0.
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(/b = 0: the graph collapses/i)).toBeVisible();
});

test('Explorers nav is marked current on this page', async ({ page }) => {
  await goto(page);
  await expect(page.getByRole('link', { name: 'Explorers' })).toHaveAttribute('aria-current', 'page');
});

test('dark mode still renders both curves', async ({ page }) => {
  await goto(page);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  expect(await seriesCount(page)).toBe(2);
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e -- transformation`
Expected: all tests PASS. If the dashed-parent assertion fails (function-plot marks the path differently than expected), switch `dashParent` to the documented fallback — draw the parent as a manual dashed overlay polyline (reuse the sweep-trail sampling in `src/scripts/explorer/render.ts:177-197`) — and re-run.

- [ ] **Step 3: Full regression + build**

Run: `npm test && npm run astro -- check && npm run build`
Expected: all Vitest pass (existing + new), 0 type errors, build emits 6 pages.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/transformation.spec.ts
git commit -m "test(explorer): end-to-end coverage for the Transformation Explorer"
```

---

## Task 9: Docs — SUMMARY.md and TODO.md

**Files:**
- Modify: `SUMMARY.md` (append a commit-summary entry)
- Modify: `TODO.md` (mark the feature complete / add the entry)

- [ ] **Step 1: Append a `SUMMARY.md` entry** in the project's established format (Change Type: Feature; Scope: Explorers — Transformation Explorer; summary of the two pure modules + renderer + island + route; reference the spec and this plan).

- [ ] **Step 2: Add/close the `TODO.md` feature entry** using the project's `## [YYYY-MM-DD] Feature:` template (Objective, Approach, Tests, Risks & Tradeoffs), referencing this plan.

- [ ] **Step 3: Commit**

```bash
git add SUMMARY.md TODO.md
git commit -m "docs(explorer): record Transformation Explorer in SUMMARY and TODO"
```

---

## Self-Review

**Spec coverage** — every spec section maps to a task:
- Placement / route / hub / config / zero-touch nav → Task 7 (nav verified unchanged, `Header.astro:20-24`).
- Base-function single-source model [G1] → Task 6 (`selectParent` fills+overrides & resets; `plotCustom` deselects the chip).
- Four knobs + signed sliders + reflect toggles + reset [G8] → Task 6 (`a`/`b` sole state; toggles negate; `aria-pressed = coef < -EPS`).
- Ghost parent + live transformed comparison → Tasks 2 (colour), 5 (two series + dash).
- `composeExpr` (node-substitution) [verified] → Task 3.
- `describeTransform` narration + horizontal-then-vertical order [G5] + tolerance [G2] + degenerate messages [G3] → Task 4.
- Per-parent default windows [G7] → Task 1 + `selectParent`.
- Custom-input validation reuse [G6] → Task 6 (`normalizeExpr` + `evaluate` try/catch + `role="alert"`; render try/catch fallback).
- Accessibility (status text, role=img, aria-pressed, colour-not-alone) → Tasks 6, 8; reduced-motion N/A (no animation) [G9].
- Testing (Vitest per module + Playwright) + ≥80% changed-code coverage [G9] → Tasks 1–4 (unit), 8 (e2e).

**Placeholder scan** — no TBD/TODO/"handle edge cases"; every code step shows complete code. The only deliberately-flexible content is the `describeTransform` wording, which is fully implemented and flagged as a learning-mode contribution point, not a placeholder.

**Type consistency** — `Coeffs`, `TransformReadout`, `Parent`, `TransformRenderOptions`/`TransformHandle`, and `EPS` names are used identically across Tasks 1–8. `renderTransform` is called with the same option shape in both the build effect and the resize effect in Task 6. The e2e uses `g.graph` (function-plot's confirmed series class) and `data-testid="transform-plot"` (defined in Task 6).

## Execution Handoff

Ready. Two execution options — described after this plan is saved.
