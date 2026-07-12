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
import { formatNumber } from '@/scripts/graphing/hover';
import { EPS, innerArgument, type Coeffs } from './transform';
import type { Parent } from './parents';

const fmt = (n: number): string => formatNumber(n);

/**
 * g(x) = a·f(b(x − h)) + k, written out concretely.
 *
 * Returns null when it cannot be written: a = 0 or b = 0 collapses the graph, and
 * spelling that out would print nonsense like 'ln(0)'. The step list already explains
 * the collapse, and the details panel already shows "—" for the same reason.
 */
export function concreteEquation(p: Parent, c: Coeffs): string | null {
  if (Math.abs(c.a) < EPS || Math.abs(c.b) < EPS) return null;

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
