/**
 * Exact angle arithmetic for the Angle Explorer: degree ↔ radian conversion plus
 * the exact turn-fraction and π-multiple forms the readout is built from.
 *
 * Showing `π/6` is the point — `0.524` alone does not teach the relationship — so
 * these reductions are exact integer maths, not float formatting. Pure and
 * DOM-free so it unit-tests in the node environment, like `transform.ts`.
 */

/** Fraction in lowest terms; the sign always rides on the numerator. */
export interface Fraction {
  n: number;
  d: number;
}

/**
 * How close to a whole degree still counts as "exact". Typed radian input lands
 * on values like 59.9885°, which must NOT be rendered as an exact π-multiple.
 */
export const DEG_EPS = 1e-9;

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Greatest common divisor (Euclid) on magnitudes. */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Reduce n/d to lowest terms. Integer inputs only — callers must gate on
 * {@link isIntegerDegrees} first, because gcd on floats is meaningless.
 */
export function reduceFraction(n: number, d: number): Fraction {
  if (d === 0) throw new Error('reduceFraction: zero denominator');
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1; // gcd(0, d) === d, so this only guards gcd(0, 0)
  return { n: (sign * n) / g, d: (sign * d) / g };
}

/** θ as a share of one full turn: 30 → 1/12, 360 → 1/1. */
export function turnFraction(deg: number): Fraction {
  return reduceFraction(deg, 360);
}

/** θ as an exact multiple of π: 30 → 1/6 (π/6), 180 → 1/1 (π), 360 → 2/1 (2π). */
export function piMultiple(deg: number): Fraction {
  return reduceFraction(deg, 180);
}

/** True when an exact π / turn form is meaningful for this angle. */
export function isIntegerDegrees(deg: number): boolean {
  return Math.abs(deg - Math.round(deg)) < DEG_EPS;
}

/** How close to an odd multiple of 90° still counts as tan's asymptote —
 *  looser than DEG_EPS because a hand-typed decimal (e.g. 89.9999999°) is
 *  functionally undefined even though it is not exactly 90. */
export function isTangentUndefined(deg: number): boolean {
  return Math.abs((Math.abs(deg) % 180) - 90) < 1e-6;
}

/** KaTeX for an exact π-multiple: `0`, `\pi`, `2\pi`, `\frac{\pi}{6}`, `-\frac{2\pi}{3}`. */
export function formatPiLatex(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? '\\pi' : `${mag}\\pi`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}\\frac{${numerator}}{${f.d}}`;
}

/**
 * Spoken counterpart of {@link formatPiLatex}, for a screen-reader live
 * region: `0`, `pi`, `2 pi`, `pi over 6`, `negative 2 pi over 3`. A unit
 * numerator says "pi" rather than "1 pi"; a unit denominator omits the
 * "over" clause entirely; the sign becomes the word "negative".
 */
export function formatPiSpoken(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? 'negative ' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? 'pi' : `${mag} pi`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}${numerator} over ${f.d}`;
}

/** KaTeX for a plain fraction: `0`, `1`, `\frac{1}{12}`, `-\frac{1}{4}`. */
export function formatFractionLatex(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}\\frac{${mag}}{${f.d}}`;
}

/**
 * Spoken counterpart of {@link formatFractionLatex}, for a screen-reader live
 * region: `0`, `1`, `1 over 12`, `negative 1 over 4`. No backslashes or braces
 * for a screen reader to read aloud or mangle.
 */
export function formatFractionSpoken(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? 'negative ' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}${mag} over ${f.d}`;
}

/**
 * Plain-text (non-KaTeX) exact fraction: `0`, `1`, `1/12`, `-1/4`. Mirrors
 * {@link formatFractionLatex} without markup — the export artifact renders as
 * plain HTML text and SVG labels are plain text, never through KaTeX.
 */
export function formatFractionText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}${mag}/${f.d}`;
}

/**
 * Plain-text exact π-multiple: `0`, `π`, `2π`, `π/6`, `-2π/3`. Mirrors
 * {@link formatPiLatex} without markup, for the same reason.
 */
export function formatPiText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? 'π' : `${mag}π`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${f.d}`;
}

/**
 * Arc length s = r·θ (θ in radians), as a magnitude — a length has no sign even
 * when the sweep is clockwise. On the unit circle this equals the radian measure;
 * that coincidence breaking as r moves is what the radius slider exists to show.
 */
export function arcLength(r: number, radians: number): number {
  return Math.abs(r * radians);
}
