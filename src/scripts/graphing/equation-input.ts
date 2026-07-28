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
  | { ok: false; reason: 'NOT_LINEAR_IN_Y' | 'INVALID' }
  | { ok: false; reason: 'NO_Y_PRESENT'; degenerate: boolean };

// Sample x values for the linearity probe. Spread across negative, fractional, and
// positive values so functions with restricted domains still get several usable
// samples (sqrt and log need x > 0; asin needs |x| <= 1).
const SAMPLE_XS = [-3.1, -0.7, -0.25, 0.25, 0.5, 1.7, 2.3, 4.1];

// Absolute, deliberately. A relative tolerance would NOT help: the case it would need
// to catch — a vanishing higher-order term such as `1e-10*y^2 + y = x` — differs from
// linear by ~2e-10 against values of order 1, i.e. a relative error near 1e-10, which
// is below any epsilon that still tolerates ordinary float noise. Catching it would
// mean tightening to ~1e-12 and inviting false rejections instead. Such coefficients do
// not occur in the algebra this tool teaches, and the curve is indistinguishable from
// the linear one at any zoom level, so the limit is accepted rather than papered over.
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
    // A(x) per sample, cached so the "is y present at all" pass below can reuse it
    // instead of evaluating the same expression at the same points a second time.
    // Recorded for every sample, including ones this loop skips.
    const aAt: Array<number | null> = [];
    for (const x of SAMPLE_XS) {
      const got = at(F2, x);
      const a = at(A, x);
      const b = at(B, x);
      aAt.push(a);
      if (got === null || a === null || b === null) continue; // undefined here — skip
      usable += 1;
      // Deliberately no `break` here: usable must count every defined sample across
      // the full sweep, not just the ones before the first mismatch.
      if (Math.abs(got - (2 * a + b)) >= LINEARITY_TOL) {
        linear = false;
      }
    }
    // A mismatch at any defined sample is positive proof of non-linearity, so it is
    // reported first — even when too few samples were usable to have *confirmed*
    // linearity. Checking `usable` first would mislabel `sqrt(x-4.05)*y^2 = x`, which
    // is defined at only one sample and is squared in y there, as merely INVALID.
    if (!linear) return { ok: false, reason: 'NOT_LINEAR_IN_Y' };
    // Nothing contradicted linearity, but too little was defined to confirm it either:
    // absence of evidence, so report invalid rather than inventing a verdict.
    if (usable < MIN_USABLE_SAMPLES) return { ok: false, reason: 'INVALID' };

    // A identically zero means y never appears: `2x + 3 = 7` is the vertical line
    // x = 2, which is not a function of x.
    //
    // ORDERING INVARIANT: this pass has no MIN_USABLE_SAMPLES guard of its own. It is
    // protected transitively by the `usable < MIN_USABLE_SAMPLES` early return above,
    // which has already proved that at least two samples are defined. Do not move this
    // pass ahead of that return, or a single lucky sample could declare "no y present".
    let aSamples = 0;
    let aAllZero = true;
    for (const a of aAt) {
      if (a === null) continue;
      aSamples += 1;
      if (Math.abs(a) >= ZERO_TOL) {
        aAllZero = false;
        break;
      }
    }
    if (aSamples > 0 && aAllZero) {
      // A is identically zero, so there is no y. If B is identically zero too the whole
      // equation reduces to `0 = 0` — true at every point, so there is no curve at all.
      // Otherwise B(x) = 0 describes a vertical line, which Phase 2 renders implicitly.
      // Sampled, like the A guard above: a contrived B vanishing at all eight samples
      // would be misread, which is accepted on the same grounds.
      let bSamples = 0;
      let bAllZero = true;
      for (const x of SAMPLE_XS) {
        const b = at(B, x);
        if (b === null) continue;
        bSamples += 1;
        if (Math.abs(b) >= ZERO_TOL) {
          bAllZero = false;
          break;
        }
      }
      return { ok: false, reason: 'NO_Y_PRESENT', degenerate: bSamples > 0 && bAllZero };
    }

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

  // A bare `y` on the left means there is nothing to solve: the right side already IS
  // the expression. Short-circuiting here restores exactly what the `^y\s*=\s*` regex
  // this module replaced used to do — no sampling, so a restricted domain (y = sqrt(x-5))
  // can never be mistaken for a failure, and no simplify(), so the student's own
  // arrangement of terms survives.
  if (split.lhs === 'y') {
    // `evaluate('')` returns undefined instead of throwing, so an empty right side would
    // slip past validate() as a plottable expression. The regex path reported it as
    // empty input; keep doing that.
    if (!split.rhs) return fail('EMPTY');
    return validate(split.rhs) ?? { ok: true, expr: split.rhs };
  }

  const solved = solveLinearY(split.lhs, split.rhs);
  if (!solved.ok) return fail(solved.reason);

  const invalid = validate(solved.expr);
  if (invalid) return invalid;

  // The bare-`y` case returned above, so anything reaching here genuinely was rearranged.
  return { ok: true, expr: solved.expr, input: `${split.lhs} = ${split.rhs}` };
}
