/**
 * The Angle Explorer's five-way identity chain and arc-length line, in all three
 * output alphabets.
 *
 * Extracted from `AngleExplorer.tsx` because vitest collects only `.ts` in the
 * node environment — the branching here (exact forms for whole degrees, decimals
 * otherwise, singular/plural agreement) is the part worth testing, and it was
 * unreachable while it lived inside the component.
 */
import {
  arcLength,
  degreesToRadians,
  formatFractionLatex,
  formatFractionSpoken,
  formatPiLatex,
  formatPiSpoken,
  isIntegerDegrees,
  piMultiple,
  turnFraction,
} from './angle';
import { round4 } from './format';

export interface AngleReadout {
  /** KaTeX source for the identity chain. */
  chain: string;
  /** KaTeX source for the arc-length line. */
  arc: string;
  /** Screen-reader prose. No LaTeX markup. */
  spoken: string;
}

/**
 * The five-way identity plus arc length, as KaTeX source.
 *
 * Exact π and turn forms are shown ONLY for whole degrees. `piMultiple` reduces
 * deg/180 with integer gcd, so a typed 1.047 rad (59.9885°) would otherwise render
 * as an absurd fraction. Non-integer angles fall back to decimals alone.
 */
export function buildReadout(theta: number, r: number): AngleReadout {
  const rad = degreesToRadians(theta);
  const decimal = round4(rad);
  const s = arcLength(r, rad);

  if (!isIntegerDegrees(theta)) {
    const absDecimal = round4(Math.abs(rad));
    // "1 radian(s)" must agree with English grammar for both the signed
    // conversion and the unsigned value the arc equation substitutes.
    const radianWord = (value: string): string => (Math.abs(Number(value)) === 1 ? 'radian' : 'radians');
    return {
      chain: `${round4(theta)}^\\circ = ${decimal}\\text{ rad}`,
      // s = r|θ|: the arc length is a magnitude, so the substituted angle
      // must be unsigned too, or the equation is untrue for negative sweeps.
      arc: `s = r|\\theta| = ${round4(r)} \\times ${absDecimal} \\approx ${round4(s)}`,
      spoken:
        `${round4(theta)} degrees is ${decimal} ${radianWord(decimal)}. ` +
        `Arc length uses the absolute angle, ${absDecimal} ${radianWord(absDecimal)}, giving ${round4(s)}.`,
    };
  }

  // isIntegerDegrees only confirms θ is WITHIN epsilon of an integer — it can still
  // be 59.99999999999999 (e.g. from typing pi/3 into Radians). Rounding to the
  // nearest whole degree before handing it to turnFraction/piMultiple is required:
  // those reduce n/d with an integer gcd, which is meaningless on a raw float and
  // renders as an astronomically large "reduced" fraction otherwise.
  const whole = Math.round(theta);
  const turn = formatFractionLatex(turnFraction(whole));
  const pi = formatPiLatex(piMultiple(whole));
  const turnSpoken = formatFractionSpoken(turnFraction(whole));
  const piSpoken = formatPiSpoken(piMultiple(whole));
  // The arc substitution uses the unsigned angle (see the non-integer branch above).
  const piAbsLatex = formatPiLatex(piMultiple(Math.abs(whole)));
  const piAbsSpoken = formatPiSpoken(piMultiple(Math.abs(whole)));
  return {
    chain:
      `${whole}^\\circ = ${turn}\\text{ of a full turn} = ${turn} \\times 2\\pi ` +
      `= ${pi} \\approx ${decimal}\\text{ rad}`,
    // Written out with real numbers, not a bare s = rθ. |θ| keeps the equation
    // true for negative sweeps: a length has no sign even when θ does.
    arc: `s = r|\\theta| = ${round4(r)} \\times ${piAbsLatex} \\approx ${round4(s)}`,
    spoken:
      `${whole} degrees is ${turnSpoken} of a full turn, ${piSpoken} radians, about ${decimal}. ` +
      `Arc length uses the absolute angle, ${piAbsSpoken} radians, giving ${round4(s)}.`,
  };
}
