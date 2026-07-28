/**
 * Display strings for the Angle Explorer's terminal-point readout.
 *
 * `unit-circle.ts` answers "what is the exact point"; this module answers "how
 * should it read". It is a separate module because the branching here — dropping
 * a `1 ×` prefix on the unit circle, falling back from radicals to a named
 * cosine, choosing `=` over `≈` — is the part worth testing, and the node test
 * runner cannot reach logic that lives inside a React component.
 *
 * Three output channels, three formatters, mirroring the trio `angle.ts`
 * establishes: KaTeX for the readout, plain text for the SVG label and export
 * artifact, and prose for the screen-reader live region.
 */
import { degreesToRadians, formatPiLatex, piMultiple } from './angle';
import { formatDegrees } from './angle-parse';
import { formatFourDecimals as round4 } from './format';
import {
  exactCoordinates,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
  type ExactValue,
} from './unit-circle';

export interface CoordinateReadout {
  /** Chart-style spoke: degrees, radian measure, and the point. KaTeX source. */
  tripleLatex: string;
  /** `x = r\cos\theta = 1.2 \times \frac{\sqrt{3}}{2} \approx 1.0392`. KaTeX source. */
  xLatex: string;
  yLatex: string;
  /** Screen-reader prose. No latex markup. */
  spoken: string;
  /** Narrow pair for the SVG label: `(√3/2, 1/2)` or `(1.04, 0.60)`. */
  labelText: string;
  /** Four-decimal pair for the export facts block: `(1.0392, 0.6)`. */
  pairText: string;
  /** Export table cells: `1.2 × √3/2 ≈ 1.0392`. */
  xText: string;
  yText: string;
}

/**
 * Two fixed decimals for the diagram label, where width is the constraint —
 * `(1.04, 0.60)` fits beside the dot where `(1.0392, 0.6018)` does not. Trailing
 * zeros are kept so the pair reads as a pair. `-0.00` is folded to `0.00`,
 * because cos(270°) is -1.8e-16 in floating point, not 0.
 */
const fixed2 = (n: number): string => {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
};

/** True when the value is rational, so its decimal form is exact and takes `=`. */
const isRational = (v: ExactValue): boolean => v.radicand === 1;

interface EquationParts {
  /** The exact coordinate, or null for a non-chart angle. */
  exact: ExactValue | null;
  /** The numeric coordinate, already scaled by r. */
  value: number;
  r: number;
  /** Trig function name, in both alphabets: `\cos` / `cos`. */
  fnLatex: string;
  fnText: string;
  /** θ as it is written elsewhere on screen, e.g. `37`. */
  degreeLabel: string;
  alphabet: 'latex' | 'text';
}

/**
 * One coordinate's worked equation, in whichever output alphabet the caller
 * needs. When `exact` is null the equation names the trig function instead of a
 * radical, because no exact form exists for that angle.
 *
 * The `r ×` prefix is dropped entirely at r = 1, where a literal `1 ×` is noise.
 * The relation is `=` only when the decimal is exact.
 */
function equation(parts: EquationParts): string {
  const { exact, value, r, fnLatex, fnText, degreeLabel, alphabet } = parts;
  const latex = alphabet === 'latex';
  const times = latex ? ' \\times ' : ' × ';
  const approx = latex ? ' \\approx ' : ' ≈ ';
  const exactPart =
    exact === null
      ? latex
        ? `${fnLatex} ${degreeLabel}^\\circ`
        : `${fnText} ${degreeLabel}°`
      : latex
        ? formatExactLatex(exact)
        : formatExactText(exact);
  const prefix = r === 1 ? '' : `${round4(r)}${times}`;
  const decimal = round4(value);
  // "0 = 0" and "1 = 1" are noise. With no r prefix, a whole coordinate whose
  // exact and decimal forms are the same string is stated once.
  if (prefix === '' && exactPart === decimal) return decimal;
  const relation = exact !== null && isRational(exact) ? ' = ' : approx;
  return `${prefix}${exactPart}${relation}${decimal}`;
}

/** The same equation as prose, for the live region. */
function spokenEquation(exact: ExactValue | null, value: number, r: number): string {
  const decimal = round4(value);
  if (exact === null) return `about ${decimal}`;
  const prefix = r === 1 ? '' : `${round4(r)} times `;
  // "0, 0" and "1, 1" are noise here just as "0 = 0" and "1 = 1" are in
  // equation() — the live region is the only channel a screen-reader user has,
  // since both KaTeX boxes are aria-hidden, so the whole-coordinate stutter
  // isn't compensated by the visual form the way it is for a sighted reader.
  // With no r prefix, a whole coordinate whose exact and decimal text match is
  // spoken once.
  if (prefix === '' && formatExactText(exact) === decimal) return decimal;
  const relation = isRational(exact) ? '' : 'about ';
  return `${prefix}${formatExactSpoken(exact)}, ${relation}${decimal}`;
}

/**
 * Every string the coordinate readout needs, for angle θ (degrees) and radius r.
 *
 * β is deliberately absent: it rotates the view, so the point it moves is still
 * the point θ describes. Arc length already treats β the same way.
 */
export function buildCoordinateReadout(theta: number, r: number): CoordinateReadout {
  const rad = degreesToRadians(theta);
  const x = r * Math.cos(rad);
  const y = r * Math.sin(rad);
  const exact = exactCoordinates(theta);
  const degreeLabel = formatDegrees(theta);

  const cos = { exact: exact?.x ?? null, value: x, r, fnLatex: '\\cos', fnText: 'cos', degreeLabel };
  const sin = { exact: exact?.y ?? null, value: y, r, fnLatex: '\\sin', fnText: 'sin', degreeLabel };

  const xLatex = `x = r\\cos\\theta = ${equation({ ...cos, alphabet: 'latex' })}`;
  const yLatex = `y = r\\sin\\theta = ${equation({ ...sin, alphabet: 'latex' })}`;
  const xText = equation({ ...cos, alphabet: 'text' });
  const yText = equation({ ...sin, alphabet: 'text' });

  // The label and the triple line share one rule: the exact pair appears only on
  // the unit circle, where it IS the chart's fact. Off it, the scaled radical is
  // too wide for a point label and lives in the equations instead.
  const showExactPair = exact !== null && r === 1;

  const labelText = showExactPair
    ? `(${formatExactText(exact.x)}, ${formatExactText(exact.y)})`
    : `(${fixed2(x)}, ${fixed2(y)})`;

  const pairLatex = showExactPair
    ? `\\left(${formatExactLatex(exact.x)},\\ ${formatExactLatex(exact.y)}\\right)`
    : `\\left(${round4(x)},\\ ${round4(y)}\\right)`;

  // The radian measure, exact where one exists — the chart's middle column.
  // `exact` is null both for non-integer angles and for integers off the
  // chart's 16, so it is the same gate the pair and label already use.
  const radianLatex =
    exact !== null
      ? formatPiLatex(piMultiple(Math.round(theta)))
      : `${round4(rad)}\\text{ rad}`;

  return {
    tripleLatex: `${degreeLabel}^\\circ \\quad ${radianLatex} \\quad ${pairLatex}`,
    xLatex,
    yLatex,
    xText,
    yText,
    labelText,
    pairText: `(${round4(x)}, ${round4(y)})`,
    spoken:
      `The point is x equals ${spokenEquation(exact?.x ?? null, x, r)}, ` +
      `and y equals ${spokenEquation(exact?.y ?? null, y, r)}.`,
  };
}
