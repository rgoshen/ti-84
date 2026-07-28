/**
 * Parses a typed equation into the `y = f(x)` expression the rest of the app plots.
 *
 * Accepts any equation LINEAR IN y — `3y + 2x = 6`, `x*y = 1`, `y = sin(x)` — and
 * rearranges it. Equations that are not linear in y (`x^2 + y^2 = 25`) are relations,
 * not functions: they have two y values at some x, which `evalAt`'s single-valued
 * contract cannot represent. They are rejected here rather than mis-plotted.
 */

import { simplify, evaluate } from 'mathjs';

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

export type SolveResult =
  | { ok: true; expr: string }
  | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'NO_Y_PRESENT' | 'INVALID' };

// Sample x values for the linearity probe. Spread across negative, fractional, and
// positive values so functions with restricted domains still get several usable
// samples (sqrt and log need x > 0; asin needs |x| <= 1).
const SAMPLE_XS = [-3.1, -0.7, -0.25, 0.25, 0.5, 1.7, 2.3, 4.1];
const LINEARITY_TOL = 1e-9;
const ZERO_TOL = 1e-12;

// Samples where the equation is undefined are skipped, so a probe must still land on
// at least this many usable points. One point cannot distinguish A*y + B from a curve
// that merely touches it there.
const MIN_USABLE_SAMPLES = 2;

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

    // F(y=2) must equal 2A + B everywhere if F really is linear in y. Samples where
    // the equation is undefined (e.g. sqrt(x) for x < 0) are skipped rather than
    // counted as failures.
    let usable = 0;
    let linear = true;
    for (const x of SAMPLE_XS) {
      const got = at(F2, x);
      const a = at(A, x);
      const b = at(B, x);
      if (got === null || a === null || b === null) continue; // undefined here — skip
      usable += 1;
      // Deliberately no `break` here: usable must count every defined sample across
      // the full sweep, not just the ones before the first mismatch. Breaking early
      // undercounts usable for equations that mismatch on the very first sample
      // (e.g. `y^2 = x`, defined everywhere), which would wrongly fall through to the
      // `usable < MIN_USABLE_SAMPLES` gate below and report INVALID instead of
      // NOT_LINEAR_IN_Y.
      if (Math.abs(got - (2 * a + b)) >= LINEARITY_TOL) {
        linear = false;
      }
    }
    // Undefined across the whole sample range: we cannot judge linearity at all, so
    // report it as invalid rather than mislabelling a domain problem as non-linearity.
    if (usable < MIN_USABLE_SAMPLES) return { ok: false, reason: 'INVALID' };
    if (!linear) return { ok: false, reason: 'NOT_LINEAR_IN_Y' };

    // A identically zero means y never appears: `2x + 3 = 7` is the vertical line
    // x = 2, which is not a function of x.
    let aSamples = 0;
    let aAllZero = true;
    for (const x of SAMPLE_XS) {
      const a = at(A, x);
      if (a === null) continue;
      aSamples += 1;
      if (Math.abs(a) >= ZERO_TOL) {
        aAllZero = false;
        break;
      }
    }
    if (aSamples > 0 && aAllZero) return { ok: false, reason: 'NO_Y_PRESENT' };

    return { ok: true, expr: simplify(`-(${B}) / (${A})`).toString() };
  } catch {
    return { ok: false, reason: 'INVALID' };
  }
}

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
