# Angle Explorer Standard Angles & Circle Label Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **Circle labels** selector (Degrees | Radians, default Radians) and a **Show standard angles** checkbox (default off) to the Angle Explorer, so the diagram can display the sixteen 30°/45°-multiple reference chart in whichever unit the student picks.

**Architecture:** A new pure module, `src/scripts/explorer/angle-standard.ts`, supplies the sixteen standard-angle positions and their unit-aware labels — reusing `angle.ts`'s existing exact-π formatters, adding no new arithmetic. `angle-render.ts` gains `countingTicks`, a unit-aware replacement for the dynamic radian-counting logic (radians mode delegates to today's `tickAngles` unchanged; degrees mode counts quarter turns). `angle-diagram.ts` draws the static standard-angle ring alongside the existing dynamic counting ticks, and resolves the three-way label crowding with a total priority order — coordinate label > standard-angle label > counting-tick text — extending the two-way suppression rule already in that file. Only text is ever dropped; tick lines always survive. `AngleExplorer.tsx` wires both settings into component state, a new control panel matching the Wave group's markup, the live figure, and the PNG/PDF export.

**Tech Stack:** Astro 7 + React 19 (`client:only="react"`), TypeScript, `radix-ui` 1.6.0 umbrella primitives, Tailwind 4, KaTeX 0.17 for readouts, Vitest (node environment) for unit tests, Playwright for e2e.

## Global Constraints

Every task's requirements implicitly include this section.

- **Strict TDD.** Red → green → refactor. Write the failing test, run it and see it fail for the expected reason, then implement.
- **Unit tests run in the node environment only.** `vitest.config.ts` sets `environment: 'node'` and collects `.ts` only. Logic inside a `.tsx` component is unreachable by the test runner — `AngleExplorer.tsx` tasks are verified with `npx astro check` and Playwright, not Vitest.
- **Pure builders are DOM-free by construction.** String concatenation only. No `document`, no `createElementNS`.
- **No new dependencies.** Everything needed is already installed.
- **Naming collision to avoid.** `AngleDiagramOptions` already has a field called `unit` meaning "pixels per unit radius" (default `88`), used throughout `angle-diagram.ts` as a pixel scale (`r * unit`, `(r + 0.1) * unit`, …). The new circle-labels selector is a **different** unit (`'deg' | 'rad'`) and **must** be named `angleUnit`, never `unit`, or the two concepts collide on one field. `countingTicks` in `angle-render.ts` has no such collision (that module has no pixel-scale concept) and keeps the plain name `unit` for its own `AngleUnit` parameter.
- **Radix imports come from the umbrella:** `import { Checkbox as CheckboxPrimitive } from 'radix-ui'` — already how `src/components/ui/checkbox.tsx` and `radio-group.tsx` are built; no changes needed there, just reuse both components as-is.
- **Exact-π text uses an ASCII hyphen.** `formatPiText` emits `-7π/4`, never `−7π/4` (U+2212). This already holds; standard-angle radian labels inherit it for free by delegating to `formatPiText`.
- **No new colour, no new contrast test.** The standard-angle ring reuses `colors.axis` for its tick lines and the existing `tickText` prop for its labels — the same two colours the counting ticks already use, both already covered by `theme.test.ts`. Do not add a new `ExplorerColors` entry for this feature.
- **Playwright locator rules for this codebase.** Radix puts `role="slider"` on the thumb while the id and `aria-label` sit on the root, so target `#slider-<id> [role="slider"]`. Never use a bare descendant `svg` selector inside a container that renders KaTeX — radicals become nested `<svg>` elements; use the dedicated `data-testid`s instead. `getByLabel('Degrees')` is ambiguous on this page (it also matches the Convert panel's textbox) — scope by role: `getByRole('radio', { name })` for the new Circle-labels control, `getByRole('textbox', { name })` for the existing Convert fields.
- **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`. **No co-author or AI-generation trailers.**
- **Append a `SUMMARY.md` entry before every commit**, using the format already in that file (`## [YYYY-MM-DD HH:MM] Commit Summary` with Change Type / Scope / Summary / Rationale / References).
- **Branch:** `feature/angle-standard-angles`, already created. No direct commits to `main`.
- **Commands:** unit `npx vitest run <path>`; full unit suite `npm test`; e2e `npx playwright test <path>`; typecheck `npx astro check`.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/scripts/explorer/angle-standard.ts` **(new)** | `AngleUnit`, `STANDARD_ANGLES`, `standardAngleLabel` | 1 |
| `src/scripts/explorer/angle-standard.test.ts` **(new)** | Tests for the above | 1 |
| `src/scripts/explorer/angle-render.ts` | Gains `countingTicks` — unit-aware counting-tick positions | 2 |
| `src/scripts/explorer/angle-render.test.ts` | Tests for `countingTicks` | 2 |
| `src/scripts/explorer/angle-diagram.ts` | Gains `angleUnit` / `showStandardAngles` options, the standard-angle ring, and the three-way suppression order | 3, 4 |
| `src/scripts/explorer/angle-diagram.test.ts` | Tests for the above | 3, 4 |
| `src/components/explorer/AngleExplorer.tsx` | New state, control panel, live-figure wiring, export wiring | 5, 6 |
| `src/pages/explorers/angles.astro` | One paragraph of page copy | 7 |
| `tests/e2e/angle.spec.ts` | e2e coverage for both new controls | 8 |

---

### Task 1: The standard-angle label module

**Files:**
- Create: `src/scripts/explorer/angle-standard.ts`
- Create: `src/scripts/explorer/angle-standard.test.ts`

**Interfaces:**
- Consumes: `formatPiText`, `piMultiple` from `./angle`
- Produces:
  - `export type AngleUnit = 'deg' | 'rad'`
  - `export const STANDARD_ANGLES: readonly number[]` — sixteen degree values, ascending
  - `export function standardAngleLabel(deg: number, unit: AngleUnit): string`

- [ ] **Step 1: Write the failing tests**

Create `src/scripts/explorer/angle-standard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STANDARD_ANGLES, standardAngleLabel, type AngleUnit } from './angle-standard';

describe('STANDARD_ANGLES', () => {
  it('is the sixteen multiples of 30 and 45, ascending', () => {
    expect(STANDARD_ANGLES).toEqual([
      0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(STANDARD_ANGLES).size).toBe(STANDARD_ANGLES.length);
  });
});

describe('standardAngleLabel', () => {
  it('formats degrees plainly, including zero', () => {
    expect(standardAngleLabel(0, 'deg')).toBe('0°');
    expect(standardAngleLabel(30, 'deg')).toBe('30°');
    expect(standardAngleLabel(330, 'deg')).toBe('330°');
  });

  it('formats radians as exact π fractions', () => {
    expect(standardAngleLabel(0, 'rad')).toBe('0');
    expect(standardAngleLabel(30, 'rad')).toBe('π/6');
    expect(standardAngleLabel(45, 'rad')).toBe('π/4');
    expect(standardAngleLabel(90, 'rad')).toBe('π/2');
    expect(standardAngleLabel(180, 'rad')).toBe('π');
    expect(standardAngleLabel(330, 'rad')).toBe('11π/6');
  });

  it('covers every standard angle in both units without throwing', () => {
    const units: AngleUnit[] = ['deg', 'rad'];
    for (const deg of STANDARD_ANGLES) {
      for (const unit of units) {
        expect(() => standardAngleLabel(deg, unit)).not.toThrow();
      }
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-standard.test.ts`
Expected: FAIL — `Cannot find module './angle-standard'` (the file doesn't exist yet).

- [ ] **Step 3: Write the module**

Create `src/scripts/explorer/angle-standard.ts`:

```ts
/**
 * The sixteen "chart" angles every trigonometry course asks a student to
 * memorise — multiples of 30° and 45° around the circle — plus their labels
 * in either unit.
 *
 * Radian text reuses `angle.ts`'s exact-fraction formatters rather than
 * re-deriving them: `piMultiple(330)` already reduces to `11/6`, and
 * `formatPiText` already renders `11π/6`. This module adds placement data and
 * a thin formatting wrapper, no new arithmetic.
 */
import { formatPiText, piMultiple } from './angle';

export type AngleUnit = 'deg' | 'rad';

/** The sixteen standard angles, in degrees, ascending. */
export const STANDARD_ANGLES: readonly number[] = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

/** A standard angle's label in the requested unit: `30°` or `π/6`. */
export function standardAngleLabel(deg: number, unit: AngleUnit): string {
  return unit === 'deg' ? `${deg}°` : formatPiText(piMultiple(deg));
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-standard.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 18:30] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — standard-angle labels

**Summary:**
Added `angle-standard.ts`: the sixteen 30°/45°-multiple standard angles and a
`standardAngleLabel` formatter that reads `30°` in degrees mode and reuses
`formatPiText(piMultiple(deg))` for the exact radian form (`π/6`, `11π/6`, …).

**Rationale:**
Pure, DOM-free, and node-testable, matching every other module in
`src/scripts/explorer/`. Delegating to the existing π-fraction formatters
means this feature introduces no new arithmetic.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/scripts/explorer/angle-standard.ts src/scripts/explorer/angle-standard.test.ts SUMMARY.md
git commit -m "feat(explorer): add standard-angle label module"
```

---

### Task 2: Unit-aware counting ticks

**Files:**
- Modify: `src/scripts/explorer/angle-render.ts`
- Modify: `src/scripts/explorer/angle-render.test.ts`

**Interfaces:**
- Consumes: `tickAngles` (existing, unchanged), `degreesToRadians` from `./angle`, `AngleUnit` from `./angle-standard`
- Produces:
  - `export interface CountingTick { radians: number; text: string }`
  - `export function countingTicks(thetaDeg: number, unit: AngleUnit): CountingTick[]`

- [ ] **Step 1: Write the failing tests**

Modify the import line at the top of `src/scripts/explorer/angle-render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  polarToCartesian,
  arcPath,
  tickAngles,
  arrowheadPoints,
  countingTicks,
} from './angle-render';
import { degreesToRadians } from './angle';
```

Append at the end of the file:

```ts
describe('countingTicks', () => {
  it('delegates to tickAngles in radians mode, unchanged', () => {
    expect(countingTicks(30, 'rad')).toEqual([{ radians: 1, text: '1 rad' }]);
    expect(countingTicks(0, 'rad')).toEqual([{ radians: 1, text: '1 rad' }]);
  });

  it('matches tickAngles exactly across a signed sweep, in radians mode', () => {
    const thetaDeg = -3.4 * (180 / Math.PI);
    const expected = tickAngles(-3.4).map((n) => ({ radians: n, text: `${n} rad` }));
    expect(countingTicks(thetaDeg, 'rad')).toEqual(expected);
  });

  it('counts quarter turns toward θ in degrees mode', () => {
    expect(countingTicks(260, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
      { radians: degreesToRadians(180), text: '180°' },
    ]);
  });

  it('always yields at least one degree tick, even below 90°', () => {
    expect(countingTicks(30, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
    ]);
    expect(countingTicks(0, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
    ]);
  });

  it('mirrors for a negative sweep in degrees mode', () => {
    expect(countingTicks(-260, 'deg')).toEqual([
      { radians: degreesToRadians(-90), text: '-90°' },
      { radians: degreesToRadians(-180), text: '-180°' },
    ]);
  });

  it('covers the full ±360° range in degrees mode (four quarter turns)', () => {
    expect(countingTicks(360, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
      { radians: degreesToRadians(180), text: '180°' },
      { radians: degreesToRadians(270), text: '270°' },
      { radians: degreesToRadians(360), text: '360°' },
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-render.test.ts`
Expected: FAIL — `countingTicks is not a function` (import resolves to `undefined`).

- [ ] **Step 3: Implement `countingTicks`**

At the top of `src/scripts/explorer/angle-render.ts`, before `export interface Point`, add:

```ts
import { degreesToRadians } from './angle';
import type { AngleUnit } from './angle-standard';
```

After the `tickAngles` function (directly before the `HEAD_SWEEP` constant), add:

```ts
/** One counting tick: its angular position (radians) and display text. */
export interface CountingTick {
  radians: number;
  text: string;
}

/**
 * Counting ticks toward θ, in the requested unit.
 *
 * Radians mode is `tickAngles` unchanged — whole radians, always at least
 * one. Degrees mode counts quarter turns instead (`90°`, `180°`, `270°`),
 * the round unit a student counts degrees in, with the same always-emit-one
 * floor: a scale that vanishes at small θ reads as a bug, in either unit.
 */
export function countingTicks(thetaDeg: number, unit: AngleUnit): CountingTick[] {
  if (unit === 'rad') {
    return tickAngles(degreesToRadians(thetaDeg)).map((n) => ({
      radians: n,
      text: `${n} rad`,
    }));
  }
  const dir = thetaDeg < 0 ? -1 : 1;
  const whole = Math.floor(Math.abs(thetaDeg) / 90);
  const count = Math.max(1, whole);
  return Array.from({ length: count }, (_, i) => {
    const deg = dir * (i + 1) * 90;
    return { radians: degreesToRadians(deg), text: `${deg}°` };
  });
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-render.test.ts`
Expected: PASS (existing tests plus the 6 new ones).

- [ ] **Step 5: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 18:45] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — unit-aware counting ticks

**Summary:**
Added `countingTicks(thetaDeg, unit)` to `angle-render.ts`. Radians mode
delegates to the existing `tickAngles` unchanged; degrees mode counts quarter
turns toward θ (`90°`, `180°`, `270°`), with the same always-at-least-one
floor that keeps the radian scale from vanishing at small θ.

**Rationale:**
`tickAngles` keeps its signature and its own tests untouched — `countingTicks`
wraps it rather than replacing it, so this is purely additive.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/scripts/explorer/angle-render.ts src/scripts/explorer/angle-render.test.ts SUMMARY.md
git commit -m "feat(explorer): add unit-aware counting ticks"
```

---

### Task 3: The standard-angle ring, drawn and unit-aware

This task wires `angleUnit` and `showStandardAngles` into `buildAngleDiagramSvg`, switches the counting ticks over to `countingTicks`, and draws the sixteen-mark ring. The ring's labels yield to the coordinate label (priority 1) — the counting-tick-vs-standard-label interaction (priority 3) is Task 4.

**Files:**
- Modify: `src/scripts/explorer/angle-diagram.ts`
- Modify: `src/scripts/explorer/angle-diagram.test.ts`

**Interfaces:**
- Consumes: `countingTicks` from `./angle-render`; `STANDARD_ANGLES`, `standardAngleLabel`, `AngleUnit` from `./angle-standard`
- Produces: `AngleDiagramOptions.angleUnit?: AngleUnit` (default `'rad'`), `AngleDiagramOptions.showStandardAngles?: boolean` (default `false`)

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-diagram.test.ts`:

```ts
describe('buildAngleDiagramSvg — angle units', () => {
  it('draws radian counting ticks by default, unchanged from before', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).toContain('1 rad');
  });

  it('draws quarter-turn counting ticks in degrees mode', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 260, angleUnit: 'deg' });
    expect(svg).toContain('90°');
    expect(svg).toContain('180°');
    expect(svg).not.toContain('1 rad');
  });
});

describe('buildAngleDiagramSvg — standard angles', () => {
  it("draws nothing when off, leaving today's markup untouched", () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="standard-angle"');
  });

  it('draws all sixteen marks when on', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30, showStandardAngles: true });
    expect((svg.match(/data-role="standard-angle"/g) ?? []).length).toBe(16);
  });

  it('labels in degrees when angleUnit is deg', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 0,
      showStandardAngles: true,
      angleUnit: 'deg',
    });
    expect(svg).toContain('30°');
    expect(svg).toContain('330°');
  });

  it('labels in radians when angleUnit is rad', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 0,
      showStandardAngles: true,
      angleUnit: 'rad',
    });
    expect(svg).toContain('π/6');
    expect(svg).toContain('11π/6');
  });

  it('rotates the ring with β', () => {
    const atZero = buildAngleDiagramSvg({ ...base, theta: 0, beta: 0, showStandardAngles: true });
    const rotated = buildAngleDiagramSvg({ ...base, theta: 0, beta: 45, showStandardAngles: true });
    expect(rotated).not.toBe(atZero);
  });

  it('is independent of θ — the ring itself never changes with the sweep', () => {
    const marksOnly = (svg: string) =>
      [...svg.matchAll(/<g data-role="standard-angle">.*?<\/g>/g)].join('');
    const at0 = buildAngleDiagramSvg({ ...base, theta: 0, showStandardAngles: true });
    const at200 = buildAngleDiagramSvg({ ...base, theta: 200, showStandardAngles: true });
    expect(marksOnly(at0)).toBe(marksOnly(at200));
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: FAIL — `svg.match(/data-role="standard-angle"/g)` never matches (feature doesn't exist yet); the degrees-tick test fails because `angleUnit` is silently ignored today.

- [ ] **Step 3: Implement**

Replace the import block at the top of `src/scripts/explorer/angle-diagram.ts` (currently):

```ts
import type { ExplorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians } from '@/scripts/explorer/angle';
import {
  arcPath,
  arrowheadPoints,
  polarToCartesian,
  tickAngles,
} from '@/scripts/explorer/angle-render';
import type { WaveFn } from './angle-wave';
```

with:

```ts
import type { ExplorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians } from '@/scripts/explorer/angle';
import {
  arcPath,
  arrowheadPoints,
  countingTicks,
  polarToCartesian,
} from '@/scripts/explorer/angle-render';
import {
  STANDARD_ANGLES,
  standardAngleLabel,
  type AngleUnit,
} from '@/scripts/explorer/angle-standard';
import type { WaveFn } from './angle-wave';
```

In the `AngleDiagramOptions` interface, immediately after the `projection?: WaveFn;` field (and its doc comment), add:

```ts
  /**
   * Unit for every ANGLE label on the figure — the counting ticks and the
   * standard-angle ring. Defaults to `'rad'`, today's only behaviour. Named
   * `angleUnit` rather than `unit` because `unit` already means "pixels per
   * unit radius" on this interface.
   */
  angleUnit?: AngleUnit;
  /** Draw the static sixteen-mark standard-angle ring. Defaults to `false`. */
  showStandardAngles?: boolean;
```

Inside `buildAngleDiagramSvg`, replace everything from `const c = view / 2;` through the end of the `ticks` construction (i.e. replace up to but not including the `const measureMarkup =` line) with:

```ts
  const c = view / 2;
  const angleUnit: AngleUnit = opts.angleUnit ?? 'rad';
  const showStandardAngles = opts.showStandardAngles ?? false;

  const thetaRad = degreesToRadians(theta);
  const betaRad = degreesToRadians(beta);
  const sign = theta < 0 ? -1 : 1;
  const endRad = betaRad + thetaRad;

  // Same non-empty-path gate the live component used [G4]: the measure arc and
  // its arrowhead must vanish together at θ = 0, never one without the other.
  const measureArc = arcPath(c, c, measureR * unit, betaRad, endRad);

  const hasCoordinateLabel =
    opts.coordinateLabel !== undefined && opts.coordinateLabel !== '';
  const coordinateLayout = hasCoordinateLabel
    ? coordinateLabelLayout(c, r * unit, endRad, view, opts.coordinateLabel!)
    : null;

  // The standard-angle ring: sixteen static marks, independent of θ, rotating
  // with β like everything else. Priority 2 in the suppression order — a
  // label yields only to the coordinate label (priority 1). The counting-tick
  // interaction (priority 3) is added in the next task.
  const standardItems = (showStandardAngles ? STANDARD_ANGLES : []).map((deg) => {
    const angle = betaRad + degreesToRadians(deg);
    const label = polarToCartesian(c, c, (r + 0.22) * unit, angle);
    const text = standardAngleLabel(deg, angleUnit);
    const box = centredBox(label.x, label.y, text, TICK_FONT_SIZE);
    const suppressed =
      coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box);
    return { angle, label, text, box, suppressed };
  });

  const standardMarkup = standardItems
    .map((item) => {
      const inner = polarToCartesian(c, c, r * unit, item.angle);
      const outer = polarToCartesian(c, c, (r + 0.08) * unit, item.angle);
      return (
        `<g data-role="standard-angle">` +
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${colors.axis}" stroke-width="1.5" />` +
        (item.suppressed
          ? ''
          : `<text x="${item.label.x}" y="${item.label.y}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${item.text}</text>`) +
        `</g>`
      );
    })
    .join('');

  const ticks = countingTicks(theta, angleUnit)
    .map((tick) => {
      const angle = betaRad + tick.radians;
      const inner = polarToCartesian(c, c, r * unit, angle);
      const outer = polarToCartesian(c, c, (r + 0.1) * unit, angle);
      const label = polarToCartesian(c, c, (r + 0.22) * unit, angle);

      // Near θ ≈ a rad the tick label and the coordinate readout are drawn a few
      // pixels apart on the same circle, and neither can move outward to escape:
      // at the maximum radius the tick label already sits within ~9px of the
      // viewBox edge. Drop the text for the duration of the overlap and keep the
      // tick line, so the radian position stays marked even while unnamed.
      const text = tick.text;
      const box = centredBox(label.x, label.y, text, TICK_FONT_SIZE);
      const hidden =
        coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box);

      return (
        `<g data-role="radian-tick">` +
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${colors.axis}" stroke-width="1.5" />` +
        (hidden
          ? ''
          : `<text x="${label.x}" y="${label.y}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" text-anchor="middle" dominant-baseline="middle">${text}</text>`) +
        `</g>`
      );
    })
    .join('');
```

In the final `return (...)` block, add `standardMarkup +` between the adjustable-circle line and the ticks, and refresh the two comments so they still describe what's actually drawn:

```ts
    // The adjustable circle.
    `<circle cx="${c}" cy="${c}" r="${r * unit}" fill="none" stroke="${colors.ghost}" stroke-width="1.5" />` +
    // Standard-angle reference ring — static, independent of θ.
    standardMarkup +
    // Counting ticks toward θ: whole radians, or quarter turns in degrees mode.
    ticks +
```

Leave everything else in `buildAngleDiagramSvg` (the measure markup, swept arc, rays, dots, projection, coordinate label) untouched.

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: PASS — every existing test (unchanged behaviour at the defaults) plus the new ones.

- [ ] **Step 5: Typecheck and commit**

Run: `npx astro check`
Expected: no errors.

Append to `SUMMARY.md`:

```md
## [2026-08-02 19:05] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer diagram — standard-angle ring

**Summary:**
`buildAngleDiagramSvg` gains `angleUnit` and `showStandardAngles`. Counting
ticks now route through `countingTicks`, so degrees mode marks quarter turns
instead of whole radians. When `showStandardAngles` is on, all sixteen
30°/45°-multiple marks draw as a static ring at the same label radius as the
counting ticks, rotating with β and yielding to the coordinate label on
overlap — the counting-tick-vs-standard collision is handled in the next
commit.

**Rationale:**
Defaults (`angleUnit: 'rad'`, `showStandardAngles: false`) reproduce today's
output exactly, verified by the unchanged existing test suite passing
unmodified — this keeps the Linux-only visual PNG baselines valid.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/scripts/explorer/angle-diagram.ts src/scripts/explorer/angle-diagram.test.ts SUMMARY.md
git commit -m "feat(explorer): draw the unit-aware standard-angle ring"
```

---

### Task 4: Three-way suppression + domain-sweep proof

Extends the counting tick's suppression to also yield to a standard-angle label — the exact-duplicate case in degrees mode (a counting tick and a standard mark both printing `"90°"` at the same spot) and the near-miss case in radians mode (`"1 rad"` vs `"π/3"`). Then proves no standard label ever leaves the viewBox.

**Files:**
- Modify: `src/scripts/explorer/angle-diagram.ts`
- Modify: `src/scripts/explorer/angle-diagram.test.ts`

**Interfaces:**
- Consumes: everything from Task 3
- Produces: no new exports — the priority order becomes total inside `buildAngleDiagramSvg`

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/explorer/angle-diagram.test.ts`:

```ts
describe('buildAngleDiagramSvg — three-way label priority', () => {
  it('drops the duplicate counting-tick text where it exactly matches a standard mark (degrees mode)', () => {
    // At θ = 260° the quarter-turn counting ticks land at 90° and 180° — two of
    // the sixteen standard angles. Both systems would print the identical text
    // "90°" / "180°" at the identical position; only the standard mark's copy
    // should survive.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 260,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect([...svg.matchAll(/>90°</g)]).toHaveLength(1);
    expect([...svg.matchAll(/>180°</g)]).toHaveLength(1);
  });

  it('keeps the counting-tick LINE even though its duplicate text is dropped', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 260,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect((svg.match(/data-role="radian-tick"/g) ?? []).length).toBe(2);
  });

  it('drops the counting-tick text on a near-miss too (radians mode: 1 rad vs π/3)', () => {
    // 1 rad = 57.3°, 2.7° from the 60° standard mark — the same near-miss band
    // the original coordinate-label suppression test already exercises.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 60,
      angleUnit: 'rad',
      showStandardAngles: true,
    });
    expect(svg).toContain('π/3'); // the standard label survives
    expect(svg).not.toContain('1 rad'); // the counting tick's text yields
  });

  it('a standard-angle label yields to the coordinate label (priority 1 beats priority 2)', () => {
    // At θ = 30° the terminal dot — and the coordinate label anchored to it —
    // sits at exactly the same angle as the 30° standard mark, only ~5px of
    // radius apart. The coordinate label always wins.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      angleUnit: 'deg',
      showStandardAngles: true,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect(svg).toContain('(√3/2, 1/2)');
    expect([...svg.matchAll(/>30°</g)]).toHaveLength(0);
  });

  it('keeps the standard-angle tick LINE even though its label yields to the coordinate label', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      angleUnit: 'deg',
      showStandardAngles: true,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect((svg.match(/data-role="standard-angle"/g) ?? []).length).toBe(16);
  });

  it('never suppresses a standard label with no real collision', () => {
    // Sanity check: with no coordinate label and no counting-tick overlap, all
    // sixteen standard labels render.
    const svg = buildAngleDiagramSvg({ ...base, theta: 0, showStandardAngles: true });
    const texts = [...svg.matchAll(/<g data-role="standard-angle">.*?<text[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    );
    expect(texts).toHaveLength(16);
  });
});

describe('buildAngleDiagramSvg — standard-angle labels stay inside the frame', () => {
  const view = 320;

  // Standard marks are independent of θ (see the previous describe block), so
  // the domain that matters is r × β, not r × θ — sweeping θ here would only
  // repeat the same sixteen positions. β rotates the whole ring, so sweeping it
  // is equivalent to checking every possible orientation of the ring.
  it('never leaves the viewBox across r ∈ [0.5, 1.5] × β ∈ [-360, 360], in either unit', () => {
    for (const angleUnit of ['deg', 'rad'] as const) {
      for (let r = 0.5; r <= 1.5001; r += 0.1) {
        for (let beta = -360; beta <= 360; beta += 30) {
          const roundedR = Number(r.toFixed(1));
          const svg = buildAngleDiagramSvg({
            ...base,
            r: roundedR,
            theta: 0,
            beta,
            angleUnit,
            showStandardAngles: true,
          });
          const texts = [
            ...svg.matchAll(
              /<g data-role="standard-angle">.*?<text[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*>([^<]*)</g,
            ),
          ];
          for (const [, xStr, yStr, label] of texts) {
            const x = Number(xStr);
            const y = Number(yStr);
            const halfWidth = labelWidth(label!, 9) / 2;
            expect(
              x - halfWidth,
              `left overflow "${label}" r=${roundedR} β=${beta} unit=${angleUnit}`,
            ).toBeGreaterThanOrEqual(0);
            expect(
              x + halfWidth,
              `right overflow "${label}" r=${roundedR} β=${beta} unit=${angleUnit}`,
            ).toBeLessThanOrEqual(view);
            expect(y, `top overflow "${label}"`).toBeGreaterThanOrEqual(0);
            expect(y, `bottom overflow "${label}"`).toBeLessThanOrEqual(view);
          }
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: FAIL on the first four tests in the priority describe block (the counting tick's duplicate/near-miss text is not yet suppressed by the standard ring). The domain-sweep test is expected to PASS already (positions are unaffected by this task), but run it now anyway so a later regression is caught at the right commit.

- [ ] **Step 3: Implement the third suppression tier**

In `src/scripts/explorer/angle-diagram.ts`, immediately after the `standardMarkup` block (and before the `const ticks = ...` line) that Task 3 added, insert:

```ts
  const activeStandardBoxes = standardItems
    .filter((item) => !item.suppressed)
    .map((item) => item.box);
```

Then, inside the `ticks` map callback, replace:

```ts
      const hidden =
        coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box);
```

with:

```ts
      const hidden =
        (coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box)) ||
        activeStandardBoxes.some((standardBox) => boxesOverlap(box, standardBox));
```

Nothing else in the file changes.

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/scripts/explorer/angle-diagram.test.ts`
Expected: PASS — full file, including every test from Tasks 3 and 4.

Then run the full unit suite to confirm nothing elsewhere regressed:

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx astro check`
Expected: no errors.

Append to `SUMMARY.md`:

```md
## [2026-08-02 19:25] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer diagram — three-way label priority

**Summary:**
Extended the counting-tick suppression rule to also yield to any
non-suppressed standard-angle label, completing the total priority order:
coordinate label > standard-angle label > counting-tick text. Covers both the
exact-duplicate case (degrees mode, where a quarter-turn tick and a standard
mark can literally print the same text at the same spot) and the near-miss
case (radians mode, `1 rad` vs `π/3`). Added a domain-sweep test proving no
standard label leaves the 320×320 viewBox across r ∈ [0.5, 1.5] and the full
β rotation, in either unit.

**Rationale:**
Only text is ever dropped — tick and standard-mark LINES always render, so a
position stays marked even while unnamed, the same bargain the original
coordinate-label suppression already struck. The domain sweep is over r × β,
not r × θ, because the standard ring is provably θ-invariant (proven in the
previous commit's tests) — sweeping θ here would only re-check the same
sixteen positions under a different label but wouldn't move them.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/scripts/explorer/angle-diagram.ts src/scripts/explorer/angle-diagram.test.ts SUMMARY.md
git commit -m "feat(explorer): resolve three-way standard-angle label priority"
```

---

### Task 5: Component state, control panel, and live-figure wiring

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `Checkbox` from `@/components/ui/checkbox`; `AngleUnit` from `@/scripts/explorer/angle-standard`; `buildAngleDiagramSvg`'s new `angleUnit` / `showStandardAngles` options from Task 3
- Produces: component state `angleUnit: AngleUnit` (default `'rad'`), `standardAngles: boolean` (default `false`), both reset by `Reset`

This task has no Vitest coverage (`.tsx` logic is outside the node-only test runner) — verify with `npx astro check` here, and with Playwright in Task 8.

- [ ] **Step 1: Add the new imports**

After the existing `import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';` line, add:

```ts
import { Checkbox } from '@/components/ui/checkbox';
```

After the existing `import { buildReadout } from '@/scripts/explorer/angle-readout';` line, add:

```ts
import type { AngleUnit } from '@/scripts/explorer/angle-standard';
```

- [ ] **Step 2: Extend `DEFAULTS`**

Replace:

```ts
const DEFAULTS = { theta: 0, r: 1, beta: 0, wave: 'none' as WaveMode };
```

with:

```ts
const DEFAULTS = {
  theta: 0,
  r: 1,
  beta: 0,
  wave: 'none' as WaveMode,
  angleUnit: 'rad' as AngleUnit,
  standardAngles: false,
};
```

- [ ] **Step 3: Add state and a group id**

Immediately after `const [wave, setWave] = useState<WaveMode>(DEFAULTS.wave);`, add:

```ts
  const [angleUnit, setAngleUnit] = useState<AngleUnit>(DEFAULTS.angleUnit);
  const [standardAngles, setStandardAngles] = useState(DEFAULTS.standardAngles);
```

Immediately after `const waveGroupId = useId();`, add:

```ts
  // Unique per mounted instance, matching the wave group's rationale above.
  const labelsGroupId = useId();
```

- [ ] **Step 4: Reset both controls**

Replace the `reset` function:

```ts
  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
    setWave(DEFAULTS.wave);
    setEditing(null);
    setInputError(null);
  };
```

with:

```ts
  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
    setWave(DEFAULTS.wave);
    setAngleUnit(DEFAULTS.angleUnit);
    setStandardAngles(DEFAULTS.standardAngles);
    setEditing(null);
    setInputError(null);
  };
```

- [ ] **Step 5: Add the control panel**

Immediately after the Wave panel's closing `</div>` (the bordered panel containing the `RadioGroup` for `wave`, right before the Convert panel's opening `<div className="space-y-3 rounded-lg border p-3">`), insert:

```tsx
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium" id={`${labelsGroupId}-labels-group-label`}>
            Circle labels
          </p>
          <RadioGroup
            aria-labelledby={`${labelsGroupId}-labels-group-label`}
            value={angleUnit}
            onValueChange={(v) => setAngleUnit(v as AngleUnit)}
          >
            {(
              [
                { value: 'deg' as const, label: 'Degrees' },
                { value: 'rad' as const, label: 'Radians' },
              ]
            ).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`${labelsGroupId}-unit-${o.value}`} value={o.value} />
                <Label htmlFor={`${labelsGroupId}-unit-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${labelsGroupId}-standard-angles`}
              checked={standardAngles}
              onCheckedChange={(checked) => setStandardAngles(checked === true)}
            />
            <Label htmlFor={`${labelsGroupId}-standard-angles`}>Show standard angles</Label>
          </div>
        </div>
```

- [ ] **Step 6: Wire the live figure**

Replace the live `<svg data-testid="angle-figure" ...>` block:

```tsx
        <svg
          data-testid="angle-figure"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${round4(theta)} degrees swept on a circle of radius ${round4(r)}.`}
          dangerouslySetInnerHTML={{
            __html: buildAngleDiagramSvg({
              theta,
              r,
              beta,
              colors,
              tickText,
              coordinateLabel: coords.labelText,
              projection: waveFn,
            }),
          }}
        />
```

with:

```tsx
        <svg
          data-testid="angle-figure"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${round4(theta)} degrees swept on a circle of radius ${round4(r)}. Circle labels in ${
            angleUnit === 'deg' ? 'degrees' : 'radians'
          }${standardAngles ? ', showing standard angles' : ''}.`}
          dangerouslySetInnerHTML={{
            __html: buildAngleDiagramSvg({
              theta,
              r,
              beta,
              colors,
              tickText,
              coordinateLabel: coords.labelText,
              projection: waveFn,
              angleUnit,
              showStandardAngles: standardAngles,
            }),
          }}
        />
```

- [ ] **Step 7: Typecheck**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 8: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 19:45] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — Circle labels + standard-angles controls

**Summary:**
Added `angleUnit` and `standardAngles` state to `AngleExplorer.tsx`, a new
bordered control panel (a `RadioGroup` for Degrees/Radians, a `Checkbox` for
Show standard angles) matching the Wave group's existing markup, and wired
both into the live figure and `Reset`. The figure's `aria-label` now names the
active unit and whether the standard ring is shown.

**Rationale:**
Follows the Wave group's exact `useId()`-namespaced-ids pattern so two
mounted `AngleExplorer` instances can never collide. Export wiring (facts,
legend, snapshot) is deliberately a separate commit — this one is verified by
`npx astro check` only; Playwright coverage lands with Task 8.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/components/explorer/AngleExplorer.tsx SUMMARY.md
git commit -m "feat(explorer): add circle-labels and standard-angles controls"
```

---

### Task 6: Export wiring

**Files:**
- Modify: `src/components/explorer/AngleExplorer.tsx`

**Interfaces:**
- Consumes: `angleUnit`, `standardAngles` state from Task 5
- Produces: `Circle labels` fact in the export's `Circle` section; a conditional legend entry; both settings passed into the exported `buildAngleDiagramSvg` call

- [ ] **Step 1: Capture both settings as snapshot values**

Inside `createExportSnapshot`, immediately after `const snapshotWave = waveFn;`, add:

```ts
    const snapshotAngleUnit = angleUnit;
    const snapshotStandardAngles = standardAngles;
```

- [ ] **Step 2: Add the `Circle labels` fact**

Replace the `Circle` section's `facts` array:

```tsx
          {
            title: 'Circle',
            facts: [
              { label: 'Radius', value: String(snapshotR) },
              { label: 'Position β', value: `${snapshotBeta}°` },
              { label: 'Arc length s = r|θ|', value: arcValue },
              { label: 'Point (x, y)', value: snapshotCoords.pairText },
            ],
          },
```

with:

```tsx
          {
            title: 'Circle',
            facts: [
              { label: 'Radius', value: String(snapshotR) },
              { label: 'Position β', value: `${snapshotBeta}°` },
              {
                label: 'Circle labels',
                value: snapshotAngleUnit === 'deg' ? 'Degrees' : 'Radians',
              },
              { label: 'Arc length s = r|θ|', value: arcValue },
              { label: 'Point (x, y)', value: snapshotCoords.pairText },
            ],
          },
```

- [ ] **Step 3: Add the conditional legend entry**

In the `legend` array, insert a standard-angles entry before the existing wave entry:

```tsx
        legend: [
          { label: 'Initial side', color: lightColors.floor },
          { label: 'Terminal side', color: lightColors.wall },
          {
            label: 'Arc — length is the radian measure when r = 1',
            color: lightColors.curve,
          },
          { label: 'Angle measure', color: lightColors.arrow },
          ...(snapshotStandardAngles
            ? [
                {
                  label: 'Standard angles — multiples of 30° and 45°',
                  color: lightColors.axis,
                },
              ]
            : []),
          ...(snapshotWave
            ? [
                {
                  label:
                    snapshotWave === 'sin'
                      ? 'sin θ — height is the y-coordinate'
                      : 'cos θ — height is the x-coordinate',
                  color: lightColors.wave,
                },
              ]
            : []),
        ],
```

- [ ] **Step 4: Pass both settings into the exported diagram**

In `renderGraph`, the `circle` template literal calls `buildAngleDiagramSvg` with an options object. Add the two new fields:

```tsx
        const circle =
          `<svg viewBox="0 0 320 320" width="${EXPORT_GRAPH_WIDTH}" height="${circleHeight}" ` +
          `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" ` +
          `style="display:block">${buildAngleDiagramSvg(
            {
              theta: snapshotTheta,
              r: snapshotR,
              beta: snapshotBeta,
              colors: lightColors,
              tickText: '#334155',
              coordinateLabel: snapshotCoords.labelText,
              projection: snapshotWave,
              angleUnit: snapshotAngleUnit,
              showStandardAngles: snapshotStandardAngles,
            },
          )}</svg>`;
```

- [ ] **Step 5: Typecheck**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 6: Verify the existing export e2e suite still passes**

Run: `npx playwright test tests/e2e/angle-export.spec.ts`
Expected: PASS — the defaults (`angleUnit: 'rad'`, `standardAngles: false`) mean the exported artifact's markup is byte-identical to before this feature for every existing assertion.

- [ ] **Step 7: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 20:00] Commit Summary

**Change Type:** Feature
**Scope:** Angle Explorer — export wiring

**Summary:**
Both new settings now flow into the PNG/PDF export: a `Circle labels` fact in
the `Circle` section, a conditional legend entry while standard angles are
shown, and both values passed into the exported diagram's `buildAngleDiagramSvg`
call so the artifact matches the screen.

**Rationale:**
Follows the same snapshot-capture pattern `snapshotWave` already established,
so the export can never observe a value that changed mid-render. Verified the
existing `angle-export.spec.ts` suite is unaffected at the defaults.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add src/components/explorer/AngleExplorer.tsx SUMMARY.md
git commit -m "feat(explorer): carry circle labels and standard angles into export"
```

---

### Task 7: Page copy

**Files:**
- Modify: `src/pages/explorers/angles.astro`

- [ ] **Step 1: Update the description paragraph**

Replace:

```astro
    <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
      Drag <strong>angle</strong> to sweep the arc, and <strong>radius</strong> to grow the
      circle. On the unit circle the radian measure and the arc length are the same number
      &mdash; change the radius and watch them come apart. Type into either field to convert
      between degrees and radians.
      Pick <strong>sin θ</strong> or <strong>cos θ</strong> to trace that wave as you
      sweep &mdash; the highlighted leg inside the circle is the wave's height.
    </p>
```

with:

```astro
    <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
      Drag <strong>angle</strong> to sweep the arc, and <strong>radius</strong> to grow the
      circle. On the unit circle the radian measure and the arc length are the same number
      &mdash; change the radius and watch them come apart. Type into either field to convert
      between degrees and radians.
      Pick <strong>sin θ</strong> or <strong>cos θ</strong> to trace that wave as you
      sweep &mdash; the highlighted leg inside the circle is the wave's height.
      Switch <strong>Circle labels</strong> between degrees and radians &mdash; in degrees
      mode the counting ticks mark quarter turns (90&deg;, 180&deg;, 270&deg;) the way
      radians mode marks whole radians. Turn on <strong>Show standard angles</strong> to
      overlay the reference chart of 30&deg; and 45&deg; multiples in whichever unit
      you've picked.
    </p>
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 3: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 20:10] Commit Summary

**Change Type:** Docs
**Scope:** Angle Explorer page copy

**Summary:**
Added a sentence to `angles.astro` explaining the new Circle labels selector
and Show standard angles toggle, including the degrees-mode quarter-turn
counting ticks — a new idea with no precedent elsewhere in the explorer.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
```

```bash
git add src/pages/explorers/angles.astro SUMMARY.md
git commit -m "docs(explorer): explain circle labels and standard angles"
```

---

### Task 8: e2e coverage

**Files:**
- Modify: `tests/e2e/angle.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to the end of `tests/e2e/angle.spec.ts`:

```ts
const standardAngleMarks = (page: Page) =>
  page.locator(`${FIGURE} g[data-role="standard-angle"]`);
// Scoped by role, not getByLabel — 'Degrees'/'Radians' also label the Convert
// panel's TEXTBOX inputs (see the `deg`/`rad` consts above), and getByLabel
// would be ambiguous across both roles [G13].
const labelsOption = (page: Page, name: string) => page.getByRole('radio', { name });
const standardAnglesToggle = (page: Page) =>
  page.getByRole('checkbox', { name: 'Show standard angles' });

test('circle labels default to radians, standard angles off', async ({ page }) => {
  await goto(page);
  await expect(labelsOption(page, 'Radians')).toBeChecked();
  await expect(standardAnglesToggle(page)).not.toBeChecked();
  await expect(standardAngleMarks(page)).toHaveCount(0);
});

test('turning on standard angles draws all sixteen marks', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  await expect(standardAngleMarks(page)).toHaveCount(16);
});

test('standard-angle labels read degrees text when Degrees is selected', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  await labelsOption(page, 'Degrees').check();
  const texts = await standardAngleMarks(page).locator('text').allTextContents();
  expect(texts).toContain('30°');
  expect(texts).toContain('90°');
});

test('standard-angle labels read exact pi fractions in radians mode', async ({ page }) => {
  await goto(page);
  await standardAnglesToggle(page).check();
  const texts = await standardAngleMarks(page).locator('text').allTextContents();
  expect(texts).toContain('π/6');
  expect(texts).toContain('π/2');
});

test('degrees mode counts quarter turns instead of whole radians', async ({ page }) => {
  await goto(page);
  await labelsOption(page, 'Degrees').check();
  // 260°, not the coordinate-label-sensitive 200° — clear of the terminal
  // point's always-present coordinate label, matching the unit test in Task 4.
  await deg(page).fill('260');
  await expect(tickText(page)).toHaveText(['90°', '180°']);
});

test('reset restores circle labels and standard angles to their defaults', async ({ page }) => {
  await goto(page);
  await labelsOption(page, 'Degrees').check();
  await standardAnglesToggle(page).check();
  await expect(labelsOption(page, 'Degrees')).toBeChecked();
  await expect(standardAnglesToggle(page)).toBeChecked();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(labelsOption(page, 'Radians')).toBeChecked();
  await expect(standardAnglesToggle(page)).not.toBeChecked();
  await expect(standardAngleMarks(page)).toHaveCount(0);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test tests/e2e/angle.spec.ts`
Expected: FAIL — the new locators find nothing (`labelsOption`, `standardAnglesToggle`, `standardAngleMarks` all resolve to zero elements) because the controls don't exist in the DOM yet.

Note: if this fails instead because Tasks 5–7 haven't landed yet, that's expected — this task assumes Tasks 1–7 are already committed. If running Task 8 standalone against `main`, skip Step 2 and go straight to confirming green after Tasks 1–7 are in place.

- [ ] **Step 3: Confirm the implementation (already done in Tasks 5–7) makes this pass**

No new production code — Tasks 5–7 already added the controls and markup this step needs. Re-run:

Run: `npx playwright test tests/e2e/angle.spec.ts`
Expected: PASS — full file, existing tests plus the 6 new ones.

- [ ] **Step 4: Run the full e2e suite for the explorer**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Append to `SUMMARY.md`:

```md
## [2026-08-02 20:25] Commit Summary

**Change Type:** Test
**Scope:** Angle Explorer e2e

**Summary:**
Added Playwright coverage for the Circle labels selector and Show standard
angles toggle: defaults, mark count, unit-correct label text in both units,
degrees-mode quarter-turn counting ticks, and Reset restoring both controls.

**Rationale:**
`260°` was chosen for the quarter-turn-ticks test (over the more obvious
`200°`) specifically to stay clear of the terminal point's always-present
coordinate label, mirroring the same reasoning already used in Task 4's unit
test.

**References:**
- TODO.md: [2026-08-02] Feature: Angle Explorer Standard Angles & Circle Label Units
- Spec: docs/superpowers/specs/2026-08-02-angle-standard-angles-design.md
```

```bash
git add tests/e2e/angle.spec.ts SUMMARY.md
git commit -m "test(explorer): cover circle labels and standard angles"
```

---

### Task 9: Full verification and manual browser check

**Files:** none (verification only)

- [ ] **Step 1: Full automated suite**

Run, in order:

```bash
npm test
npx astro check
npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts
npm run build
```

Expected: all green. The production build proves nothing in this feature broke the static output.

- [ ] **Step 2: Manual browser verification**

Start the dev server, then stop it the moment this step is done — do not leave it running.

```bash
npm run dev
```

Navigate to `/explorers/angles` and check:

- Default load: `Radians` selected, `Show standard angles` unchecked, figure matches today's appearance exactly.
- Check `Show standard angles`: sixteen marks appear around both the dashed unit circle and the adjustable circle; none crowd or clip at the default radius.
- Drag `radius` to its minimum (0.5) and maximum (1.5): the ring shrinks and grows with it; no label leaves the figure at either extreme.
- Drag `angle` through 90°/180°/270° while in Radians mode: the `1 rad`/`2 rad`/… ticks appear and disappear normally; near a standard mark (e.g. θ ≈ 60°) the counting-tick text vanishes while the standard label and the counting tick's own line both remain.
- Switch to `Degrees`: all sixteen labels switch to `30°`-style text; drag `angle` past 90°, 180°, 270° and confirm the counting ticks read `90°`, `180°`, `270°` and the duplicate text does not double up with the standard ring.
- Drag `position` (β) through a full rotation with standard angles on: the whole ring visibly rotates as a rigid body along with the rest of the figure.
- Toggle dark mode: ring lines and labels stay legible: `colors.axis` and `tickText` are unchanged from the existing counting-tick palette, so contrast should already hold, but confirm visually.
- Click `Reset`: both new controls return to Radians / unchecked, and the ring disappears.
- Export to PNG with standard angles on and Degrees selected: the artifact shows the same ring, a `Circle labels: Degrees` fact, and a `Standard angles` legend entry.
- Resize the viewport to ~375px width: labels remain legible and none overlap unreadably at the smaller rendered size.

- [ ] **Step 3: Shut down the dev server**

Stop the `npm run dev` process started in Step 2. Confirm no stray process remains listening on its port before moving on.

- [ ] **Step 4: Final commit if Step 2 surfaced any fixes**

If manual verification found nothing to fix, this task needs no commit — Task 8's commit is the last one for this feature. If it did surface a fix, apply it, re-run the affected automated checks, append a `SUMMARY.md` entry, and commit before considering the feature complete.

---
