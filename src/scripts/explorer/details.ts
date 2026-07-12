/**
 * Read-only "function details" for the Transformation Explorer: domain, range,
 * intercepts and asymptotes of g(x) = a·f(b(x − h)) + k.
 *
 * The trick is that the transform is invertible by construction, so nothing here
 * needs numeric root-finding. Both the domain map (x = u/b + h) and the range map
 * (y = a·Y + k) are affine, and every parent declares its own inverse — so
 * "where is g zero?" unwinds to "where is f equal to −k/a?", which the parent
 * answers exactly. Numeric roots would flicker in and out as the window pans.
 */
import { evalAt } from '@/scripts/graphing/math';
import { formatNumber } from '@/scripts/graphing/hover';
import { EPS, type Coeffs } from './transform';
import type { Interval, Parent } from './parents';

/** Every field is display-ready text. '—' = not applicable; 'none' = genuinely absent. */
export interface FunctionDetails {
  domain: string;
  range: string;
  xIntercepts: string;
  yIntercept: string;
  verticalAsymptote: string;
  horizontalAsymptote: string;
}

const DASH = '—';
const NONE = 'none';
const fmt = (n: number): string => formatNumber(n);

/**
 * Push an interval through the affine map t ↦ m·t + c (m ≠ 0). A negative m
 * REVERSES an inequality — reflecting √x over the y-axis takes x ≥ 0 to x ≤ 0 —
 * so a `bound` flips its direction. `between` just re-sorts its endpoints.
 */
export function mapInterval(iv: Interval, m: number, c: number): Interval {
  switch (iv.kind) {
    case 'all':
      return iv;
    case 'bound':
      return {
        kind: 'bound',
        value: m * iv.value + c,
        dir: m < 0 ? (iv.dir === 'ge' ? 'le' : 'ge') : iv.dir,
        strict: iv.strict,
      };
    case 'exclude':
      return { kind: 'exclude', value: m * iv.value + c };
    case 'between': {
      const lo = m * iv.lo + c;
      const hi = m * iv.hi + c;
      return { kind: 'between', lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    }
  }
}

export function formatInterval(iv: Interval, v: 'x' | 'y'): string {
  switch (iv.kind) {
    case 'all':
      return 'all real numbers';
    case 'bound': {
      const op = iv.dir === 'ge' ? (iv.strict ? '>' : '≥') : iv.strict ? '<' : '≤';
      return `${v} ${op} ${fmt(iv.value)}`;
    }
    case 'exclude':
      return `${v} ≠ ${fmt(iv.value)}`;
    case 'between':
      return `${fmt(iv.lo)} ≤ ${v} ≤ ${fmt(iv.hi)}`;
  }
}

/** g(x) = 0  ⟺  a·f(u) + k = 0  ⟺  f(u) = −k/a, with u = b(x − h) ⟹ x = u/b + h. */
function xInterceptsOf(p: Parent, c: Coeffs): string {
  const solutions = p.props.solve(-c.k / c.a);
  if (solutions === 'infinite') return 'infinitely many';
  if (solutions.length === 0) return NONE;
  return solutions
    .map((u) => u / c.b + c.h)
    .sort((l, r) => l - r)
    .map((x) => `x = ${fmt(x)}`)
    .join(', ');
}

const DEGENERATE: FunctionDetails = {
  domain: DASH, range: DASH, xIntercepts: DASH,
  yIntercept: DASH, verticalAsymptote: DASH, horizontalAsymptote: DASH,
};

/**
 * Details of the transformed g(x). `composedExpr` must be the output of
 * `composeExpr(p.expr, c)` — passed in rather than recomputed because the island
 * already has it memoised, and evaluating it re-parses the expression.
 */
export function transformedDetails(p: Parent, c: Coeffs, composedExpr: string): FunctionDetails {
  // a = 0 flattens the curve to a line, b = 0 collapses it to a point. The transform
  // readout already explains both; every row here would be a degenerate special case.
  if (Math.abs(c.a) < EPS || Math.abs(c.b) < EPS) return DEGENERATE;

  const { domain, range, verticalAsymptote, horizontalAsymptote } = p.props;
  const y0 = evalAt(composedExpr, 0);

  return {
    domain: formatInterval(mapInterval(domain, 1 / c.b, c.h), 'x'),
    range: formatInterval(mapInterval(range, c.a, c.k), 'y'),
    xIntercepts: xInterceptsOf(p, c),
    yIntercept: y0 === null ? NONE : `y = ${fmt(y0)}`,
    verticalAsymptote:
      verticalAsymptote === undefined ? DASH : `x = ${fmt(verticalAsymptote / c.b + c.h)}`,
    horizontalAsymptote:
      horizontalAsymptote === undefined ? DASH : `y = ${fmt(c.a * horizontalAsymptote + c.k)}`,
  };
}

/** Details of the untransformed parent — the identity case of `transformedDetails`. */
export function parentDetails(p: Parent): FunctionDetails {
  return transformedDetails(p, { a: 1, b: 1, h: 0, k: 0 }, p.expr);
}
