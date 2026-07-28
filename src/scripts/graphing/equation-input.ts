/**
 * Parses a typed equation into the `y = f(x)` expression the rest of the app plots.
 *
 * Accepts any equation LINEAR IN y — `3y + 2x = 6`, `x*y = 1`, `y = sin(x)` — and
 * rearranges it. Equations that are not linear in y (`x^2 + y^2 = 25`) are relations,
 * not functions: they have two y values at some x, which `evalAt`'s single-valued
 * contract cannot represent. They are rejected here rather than mis-plotted.
 */

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
