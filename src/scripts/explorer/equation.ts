/**
 * The concrete transformed equation, e.g. 'g(x) = 2(x − 3)² + 1'.
 *
 * `composeExpr` already produces the correct transformed expression — but as a MACHINE
 * string for mathjs to evaluate: '(2) * ((x - (3))^2) + (1)'. Correct, and unreadable.
 * Rather than write an expression-tree pretty-printer that re-derives operator
 * precedence, we ask each parent to render ITSELF around an argument: the catalog
 * already knows its own notation, so we just apply it to something other than `x`.
 *
 * Presentation only. The curve is still drawn from composeExpr's machine string, so a
 * bug here can never move the graph — only mislabel it.
 */
import { simplify } from 'mathjs';
import { formatNumber } from '@/scripts/graphing/hover';
import { evalAt } from '@/scripts/graphing/math';
import { EPS, innerArgument, type Coeffs } from './transform';
import type { Parent } from './parents';

const fmt = (n: number): string => formatNumber(n);

/**
 * g(x) = a·f(b(x − h)) + k, written out concretely.
 *
 * Returns null only when the equation genuinely cannot be written — b = 0 on a parent
 * that is undefined at 0 (ln, 1/x), where the honest answer is nothing at all. Every
 * other case, including the degenerate collapses, produces a real equation.
 */
export function concreteEquation(p: Parent, c: Coeffs): string | null {
  // a = 0 flattens the curve onto the line y = k. That IS the equation.
  if (Math.abs(c.a) < EPS) return `g(x) = ${fmt(c.k)}`;
  // b = 0 collapses the argument to a point: g is the constant a·f(0) + k.
  if (Math.abs(c.b) < EPS) {
    const at0 = evalAt(p.expr, 0);
    return at0 === null ? null : `g(x) = ${fmt(c.a * at0 + c.k)}`;
  }

  const inner = innerArgument(c);
  const unit = Math.abs(c.a - 1) < EPS;
  const negUnit = Math.abs(c.a + 1) < EPS;

  // p.render returns an ATOMIC string, so juxtaposing the coefficient is safe:
  // '2' + '(x − 3)²' → '2(x − 3)²'. The reciprocal opts out via renderScaled, folding
  // the coefficient into its numerator instead — nobody writes '2·1/(x − 3)'.
  let body: string;
  if (!unit && !negUnit && p.renderScaled) {
    body = p.renderScaled(fmt(c.a), inner);
  } else {
    const base = p.render(inner);
    body = unit ? base : negUnit ? `−${base}` : `${fmt(c.a)}${base}`;
  }

  const kPart = Math.abs(c.k) < EPS ? '' : c.k > 0 ? ` + ${fmt(c.k)}` : ` − ${fmt(-c.k)}`;
  return `g(x) = ${body}${kPart}`;
}

/**
 * The equation for a CUSTOM typed f(x), which has no notation template of its own.
 *
 * Falls back on mathjs `simplify` to collapse composeExpr's machine string
 * ('(2) * (((1) * (x - (3)))^4) + (1)') into something a person can read
 * ('2·(x - 3)^4 + 1'). Less handsome than the curated templates, but it is the real
 * equation — and never `f(x)`, which means nothing to a student.
 *
 * Returns null if mathjs cannot simplify it; the caller then shows no equation rather
 * than a machine string.
 */
export function customEquation(composedExpr: string): string | null {
  if (!composedExpr) return null;
  try {
    const pretty = simplify(composedExpr)
      .toString()
      .replace(/\s\*\s/g, '·')
      .replace(/\s\^\s/g, '^')
      // mathjs prints implicit multiplication spaced out ('2 x'); close it up.
      .replace(/(\d) (?=[a-zA-Z(])/g, '$1')
      // A space-on-both-sides hyphen is always a BINARY minus; a unary one ('-sin(x)')
      // has no leading space, so it is left alone.
      .replace(/ - /g, ' − ');
    return `g(x) = ${pretty}`;
  } catch {
    return null;
  }
}
