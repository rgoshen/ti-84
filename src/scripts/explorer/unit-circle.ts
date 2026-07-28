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
import { isIntegerDegrees } from './angle';

/**
 * An exact unit-circle coordinate: `(sign · √radicand) / denominator`.
 *
 * A `radicand` of 1 means "no radical" — `{sign: 1, radicand: 1, denominator: 2}`
 * is 1/2, not √1/2. `sign: 0` is the zero coordinate and is immune to negation,
 * so `-0` can never reach the screen.
 */
export interface ExactValue {
  sign: -1 | 0 | 1;
  radicand: 1 | 2 | 3;
  denominator: 1 | 2;
}

export interface ExactPoint {
  x: ExactValue;
  y: ExactValue;
}

const ZERO: ExactValue = { sign: 0, radicand: 1, denominator: 1 };
const ONE: ExactValue = { sign: 1, radicand: 1, denominator: 1 };
const HALF: ExactValue = { sign: 1, radicand: 1, denominator: 2 };
const ROOT2_OVER_2: ExactValue = { sign: 1, radicand: 2, denominator: 2 };
const ROOT3_OVER_2: ExactValue = { sign: 1, radicand: 3, denominator: 2 };

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

/** KaTeX source: `0`, `1`, `-1`, `\frac{1}{2}`, `-\frac{\sqrt{3}}{2}`. */
export function formatExactLatex(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  const numerator = v.radicand === 1 ? '1' : `\\sqrt{${v.radicand}}`;
  return v.denominator === 1
    ? `${sign}${numerator}`
    : `${sign}\\frac{${numerator}}{${v.denominator}}`;
}

/** Plain text for SVG labels and the export artifact: `0`, `1/2`, `√3/2`, `-1`. */
export function formatExactText(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? '-' : '';
  const numerator = v.radicand === 1 ? '1' : `√${v.radicand}`;
  return v.denominator === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${v.denominator}`;
}

/**
 * Spoken counterpart for the screen-reader live region: `0`, `1 over 2`,
 * `square root of 3 over 2`, `negative 1`. No backslashes or braces for a
 * screen reader to read aloud.
 */
export function formatExactSpoken(v: ExactValue): string {
  if (v.sign === 0) return '0';
  const sign = v.sign < 0 ? 'negative ' : '';
  const numerator = v.radicand === 1 ? '1' : `square root of ${v.radicand}`;
  return v.denominator === 1
    ? `${sign}${numerator}`
    : `${sign}${numerator} over ${v.denominator}`;
}

/** Numeric value, for tests to cross-check the derivation against Math.cos/sin. */
export function exactToNumber(v: ExactValue): number {
  return (v.sign * Math.sqrt(v.radicand)) / v.denominator;
}
