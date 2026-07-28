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
