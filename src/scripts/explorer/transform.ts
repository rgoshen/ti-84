/**
 * Pure logic for the Transformation Explorer: build the transformed expression
 * g(x) = a·f(b(x − h)) + k, and narrate what the coefficients did. All "is this
 * knob active?" tests use EPS — never float === — because slider steps land on
 * values like 0.9999999 [G2].
 */
import { parse, SymbolNode } from 'mathjs';

/** Tolerance for treating a coefficient as its identity value. */
export const EPS = 1e-6;

export interface Coeffs {
  a: number; // vertical stretch / x-axis reflection
  b: number; // horizontal stretch / y-axis reflection
  h: number; // horizontal shift
  k: number; // vertical shift
}

/**
 * Compose g(x) = a·f(b(x − h)) + k as a function-plot-ready expression string.
 * Substitutes every `x` symbol node in f with `(b·(x − h))` via mathjs node
 * transform (NOT text replacement — robust for exp(x), 1/x, etc.), then wraps
 * a·(…) + k. mathjs `transform` does not recurse into the replacement, so the
 * inner `x` is preserved.
 */
export function composeExpr(baseExpr: string, c: Coeffs): string {
  const inner = parse(`(${c.b}) * (x - (${c.h}))`);
  const substituted = parse(baseExpr).transform((node) =>
    node instanceof SymbolNode && node.name === 'x' ? inner : node,
  );
  return `(${c.a}) * (${substituted.toString()}) + (${c.k})`;
}
