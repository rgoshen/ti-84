/**
 * Exact terminal-point coordinates for the Angle Explorer — the `(√3/2, 1/2)`
 * half of the standard unit-circle reference chart.
 *
 * Every exact coordinate on that chart is one of five magnitudes: `0`, `1/2`,
 * `√2/2`, `√3/2`, `1`. So rather than store sixteen literal points, this module
 * keeps only the first quadrant and derives the other twelve angles by reference
 * angle plus quadrant sign — the same rule the chart teaches. The test suite
 * cross-checks every derived angle against `Math.cos`/`Math.sin`, which is what
 * makes that trade (five entries and a rule, instead of sixteen literals and no
 * reasoning) safe.
 *
 * Pure and DOM-free so it unit-tests in the node environment, like `angle.ts`.
 */
import { isCotangentUndefined, isIntegerDegrees, isTangentUndefined } from './angle';

/**
 * An exact unit-circle coordinate: `(sign · numerator · √radicand) / denominator`.
 *
 * A `radicand` of 1 means "no radical" — `{sign: 1, numerator: 1, radicand: 1,
 * denominator: 2}` is 1/2, not √1/2. `sign: 0` is the zero coordinate and is
 * immune to negation, so `-0` can never reach the screen. `numerator` is
 * required, not optional-with-a-default, so a new construction site cannot
 * silently omit it; 2 is the only coefficient the reference chart produces
 * (e.g. `sec 30° = 2√3/3`), so a 3 is a type error.
 */
export interface ExactValue {
  sign: -1 | 0 | 1;
  numerator: 1 | 2;
  radicand: 1 | 2 | 3;
  denominator: 1 | 2 | 3;
}

export interface ExactPoint {
  x: ExactValue;
  y: ExactValue;
}

const ZERO: ExactValue = { sign: 0, numerator: 1, radicand: 1, denominator: 1 };
const ONE: ExactValue = { sign: 1, numerator: 1, radicand: 1, denominator: 1 };
const HALF: ExactValue = { sign: 1, numerator: 1, radicand: 1, denominator: 2 };
const ROOT2_OVER_2: ExactValue = { sign: 1, numerator: 1, radicand: 2, denominator: 2 };
const ROOT3_OVER_2: ExactValue = { sign: 1, numerator: 1, radicand: 3, denominator: 2 };
const ROOT3: ExactValue = { sign: 1, numerator: 1, radicand: 3, denominator: 1 };
const ROOT3_OVER_3: ExactValue = { sign: 1, numerator: 1, radicand: 3, denominator: 3 };

/**
 * (cos, sin) at the first-quadrant reference angles. A Map rather than an object
 * so a miss is `undefined` by type, not by index-signature assumption — every
 * non-chart angle reduces to a reference that is simply absent here.
 */
const FIRST_QUADRANT = new Map<number, ExactPoint>([
  [0, { x: ONE, y: ZERO }],
  [30, { x: ROOT3_OVER_2, y: HALF }],
  [45, { x: ROOT2_OVER_2, y: ROOT2_OVER_2 }],
  [60, { x: HALF, y: ROOT3_OVER_2 }],
  [90, { x: ZERO, y: ONE }],
]);

/**
 * tan at the first-quadrant reference angles. Five entries, the same rule
 * `exactCoordinates` already teaches: everything else is a reference angle
 * plus a quadrant sign. `'undefined'` at 90° propagates through unchanged —
 * there is no sign to negate at an asymptote.
 */
const FIRST_QUADRANT_TAN = new Map<number, ExactValue | 'undefined'>([
  [0, ZERO],
  [30, ROOT3_OVER_3],
  [45, ONE],
  [60, ROOT3],
  [90, 'undefined'],
]);

/** Negate a magnitude. Zero is returned untouched so `-0` never renders. */
function negate(v: ExactValue): ExactValue {
  return v.sign === 0 ? v : { ...v, sign: (-v.sign) as -1 | 1 };
}

/** Fold any angle onto [0, 360). `-330` → `30`, `390` → `30`, `-360` → `0`. */
function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * The exact terminal point for θ, or `null` when no exact form exists.
 *
 * Null covers two distinct cases that both mean "show decimals instead": a
 * non-integer angle (57.2958°, from typing 1 into the Radians field), and an
 * integer that is not a multiple of 30° or 45° (37°).
 */
export function exactCoordinates(deg: number): ExactPoint | null {
  // Same gate as the π-multiple readout: exact treatment of a raw float is
  // meaningless, and a radian-typed pi/3 arrives as 59.99999999999999.
  if (!isIntegerDegrees(deg)) return null;
  const d = normalizeDegrees(Math.round(deg));

  // Reference angle and quadrant signs — the rule the chart teaches. Boundary
  // angles fall out of it rather than needing cases: 180° reduces to reference 0°
  // with quadrant II signs, giving (−1, 0).
  let reference: number;
  let negX: boolean;
  let negY: boolean;
  if (d <= 90) {
    reference = d;
    negX = false;
    negY = false;
  } else if (d <= 180) {
    reference = 180 - d;
    negX = true;
    negY = false;
  } else if (d <= 270) {
    reference = d - 180;
    negX = true;
    negY = true;
  } else {
    reference = 360 - d;
    negX = false;
    negY = true;
  }

  const base = FIRST_QUADRANT.get(reference);
  if (base === undefined) return null;
  return {
    x: negX ? negate(base.x) : base.x,
    y: negY ? negate(base.y) : base.y,
  };
}

/**
 * The exact tan θ for θ, `'undefined'` at the asymptotes, or `null` when no
 * exact form exists — the same three-state split `exactCoordinates` uses for
 * its two states, with `'undefined'` added because tan (unlike a coordinate)
 * genuinely has no value at some chart angles.
 *
 * Positive in Q1/Q3 (where sin and cos share a sign), negative in Q2/Q4
 * (where they differ) — tan's own quadrant rule, distinct from x/y's.
 */
export function exactTangent(deg: number): ExactValue | 'undefined' | null {
  if (isTangentUndefined(deg)) return 'undefined';
  if (!isIntegerDegrees(deg)) return null;
  const d = normalizeDegrees(Math.round(deg));

  let reference: number;
  let flip: boolean;
  if (d <= 90) {
    reference = d;
    flip = false;
  } else if (d <= 180) {
    reference = 180 - d;
    flip = true;
  } else if (d <= 270) {
    reference = d - 180;
    flip = false;
  } else {
    reference = 360 - d;
    flip = true;
  }

  const base = FIRST_QUADRANT_TAN.get(reference);
  if (base === undefined) return null;
  if (base === 'undefined') return base;
  return flip ? negate(base) : base;
}

/** Greatest common divisor (Euclid), for reducing {@link reciprocal}'s result. */
function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * `1/v`, reduced: `1/(sign·numerator·√radicand/denominator) =
 * sign·denominator·√radicand/(numerator·radicand)`. The radicand itself never
 * moves — only the coefficient and denominator are reduced against each other.
 *
 * Callers must exclude `v.sign === 0` — zero has no reciprocal. Each of
 * `exactSecant`/`exactCosecant`/`exactCotangent` names its own pole before
 * calling this, so a zero sign never actually reaches here.
 */
function reciprocal(v: ExactValue): ExactValue {
  const numerator = v.denominator;
  const denominator = v.numerator * v.radicand;
  const g = gcd(numerator, denominator);
  return {
    sign: v.sign,
    numerator: (numerator / g) as 1 | 2,
    radicand: v.radicand,
    denominator: (denominator / g) as 1 | 2 | 3,
  };
}

/**
 * The exact sec θ, `'undefined'` at cos's zeros (tan's own asymptotes), or
 * `null` when no exact form exists. Derived from {@link exactCoordinates}
 * rather than a hand-written table, so it inherits x's quadrant sign for free.
 */
export function exactSecant(deg: number): ExactValue | 'undefined' | null {
  if (isTangentUndefined(deg)) return 'undefined';
  const p = exactCoordinates(deg);
  return p === null ? null : reciprocal(p.x);
}

/**
 * The exact csc θ, `'undefined'` at sin's zeros, or `null` when no exact form
 * exists. Derived from {@link exactCoordinates} so it inherits y's quadrant
 * sign for free.
 */
export function exactCosecant(deg: number): ExactValue | 'undefined' | null {
  if (isCotangentUndefined(deg)) return 'undefined';
  const p = exactCoordinates(deg);
  return p === null ? null : reciprocal(p.y);
}

/**
 * The exact cot θ, `'undefined'` at sin's zeros, `ZERO` at tan's own
 * asymptotes (tan's pole is cot's zero), or `null` when no exact form exists.
 * Derived from {@link exactTangent} so it inherits tan's quadrant sign for
 * free — the one case a hand-written table is likely to get wrong, since Q3
 * has cos and sin both negative (sec, csc negative) while cot stays positive.
 */
export function exactCotangent(deg: number): ExactValue | 'undefined' | null {
  if (isCotangentUndefined(deg)) return 'undefined';
  if (isTangentUndefined(deg)) return ZERO;
  const t = exactTangent(deg);
  return t === null || t === 'undefined' ? t : reciprocal(t);
}

/** KaTeX source: `0`, `1`, `-1`, `2`, `\frac{1}{2}`, `-\frac{\sqrt{3}}{2}`, `\frac{2\sqrt{3}}{3}`. */
export function formatExactLatex(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  // numerator === 2 prefixes the radical (or stands alone, when radicand is 1)
  // rather than multiplying it out — `2\sqrt{3}`, never `\sqrt{12}`.
  const coefficient = v.numerator === 2 ? '2' : '';
  const magnitude = v.radicand === 1 ? coefficient || '1' : `${coefficient}\\sqrt{${v.radicand}}`;
  return v.denominator === 1
    ? `${sign}${magnitude}`
    : `${sign}\\frac{${magnitude}}{${v.denominator}}`;
}

/** Plain text for SVG labels and the export artifact: `0`, `1/2`, `√3/2`, `-1`, `2√3/3`. */
export function formatExactText(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  const coefficient = v.numerator === 2 ? '2' : '';
  const magnitude = v.radicand === 1 ? coefficient || '1' : `${coefficient}√${v.radicand}`;
  return v.denominator === 1 ? `${sign}${magnitude}` : `${sign}${magnitude}/${v.denominator}`;
}

/**
 * Spoken counterpart for the screen-reader live region: `0`, `1 over 2`,
 * `square root of 3 over 2`, `negative 1`, `2 times square root of 3 over 3`.
 * No backslashes or braces for a screen reader to read aloud.
 */
export function formatExactSpoken(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? 'negative ' : '';
  const magnitude =
    v.radicand === 1
      ? v.numerator === 2
        ? '2'
        : '1'
      : `${v.numerator === 2 ? '2 times ' : ''}square root of ${v.radicand}`;
  return v.denominator === 1
    ? `${sign}${magnitude}`
    : `${sign}${magnitude} over ${v.denominator}`;
}

/** Numeric value, for tests to cross-check the derivation against Math.cos/sin. */
export function exactToNumber(v: ExactValue): number {
  return (v.sign * v.numerator * Math.sqrt(v.radicand)) / v.denominator;
}
