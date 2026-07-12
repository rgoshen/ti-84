/**
 * The curated "parent function" catalog for the Transformation Explorer. Each
 * parent carries a default window that frames its shape well [G7] — sin/cos need
 * a small y-range, eˣ a small x-range, √x a shifted x-range, etc. Pure data.
 */
import type { Window2D } from '@/scripts/graphing/math';

/**
 * A set of real numbers, expressive enough for every toolkit parent's domain and
 * range. Deliberately not a general interval algebra — these four shapes are all
 * eleven parents need, and an affine map takes each one to another of the same kind.
 */
export type Interval =
  | { kind: 'all' }
  /** dir 'ge' → x ≥ v (or x > v when strict); 'le' → x ≤ v. A reflection flips dir. */
  | { kind: 'bound'; value: number; dir: 'ge' | 'le'; strict: boolean }
  | { kind: 'exclude'; value: number }
  | { kind: 'between'; lo: number; hi: number };

export interface ParentProps {
  domain: Interval;
  range: Interval;
  /** x = v, when the parent has one. */
  verticalAsymptote?: number;
  /** y = w, when the parent has one. */
  horizontalAsymptote?: number;
  /**
   * The parent's inverse: every u with f(u) = c. This is what makes x-intercepts
   * EXACT — g(x) = 0 unwinds to f(u) = −k/a — instead of numerically root-found,
   * which would make intercepts flicker as the window pans.
   * 'infinite' for the periodic parents.
   */
  solve: (c: number) => number[] | 'infinite';
}

export interface Parent {
  /** Stable id used by the picker + tests. */
  id: string;
  /** Math glyph, e.g. 'x²'. Used in the readout and the value-table header. */
  label: string;
  /** Spoken name for the dropdown, e.g. 'quadratic'. */
  name: string;
  /** mathjs / function-plot expression, e.g. 'x^2'. */
  expr: string;
  /** Default view that frames this parent well. */
  window: Window2D;
  /** Analytic domain, range, asymptotes and inverse. Pure data. */
  props: ParentProps;
  /**
   * The parent's own notation applied to `inner`, as display text — 'x²' for a bare
   * `x`, '(x − 3)²' for a shifted argument. MUST return an ATOMIC string: one that is
   * safe to prefix with a coefficient without further parentheses. `render('x')`
   * equals `label` — a parent's notation applied to a bare x IS the label it
   * advertises, and a test pins that across the whole catalog.
   */
  render: (inner: string) => string;
  /** Nicer form when |a| ≠ 1. Only the reciprocal needs it: 2/(x−3), not 2·1/(x−3). */
  renderScaled?: (a: string, inner: string) => string;
}

const TAU = 2 * Math.PI;

/**
 * A bare `x` needs no parentheses; a compound argument ('x − 3', '2x', '−x') does.
 * This is what keeps every template ATOMIC — without it, identity would render
 * 'x − 3' and a caller would build '2x − 3', which is a different function from
 * 2(x − 3). A plausible-but-wrong equation is worse than none in a teaching tool.
 */
const bare = (inner: string): boolean => inner === 'x';
const wrap = (inner: string): string => (bare(inner) ? inner : `(${inner})`);

/** The parent shown on first load. Identity is listed first, but x² is the classic
 *  teaching parent and is what the explorer has always opened with. */
export const DEFAULT_PARENT_ID = 'square';

// Shared interval shapes reused across the catalog's props below.
const ALL: Interval = { kind: 'all' };
const NON_NEG: Interval = { kind: 'bound', value: 0, dir: 'ge', strict: false }; // ≥ 0
const POSITIVE: Interval = { kind: 'bound', value: 0, dir: 'ge', strict: true }; // > 0
const NOT_ZERO: Interval = { kind: 'exclude', value: 0 };
const UNIT: Interval = { kind: 'between', lo: -1, hi: 1 };
const PERIODIC = (c: number): number[] | 'infinite' => (Math.abs(c) <= 1 ? 'infinite' : []);

export const PARENTS: Parent[] = [
  { id: 'identity', label: 'x', name: 'identity', expr: 'x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    props: { domain: ALL, range: ALL, solve: (c) => [c] },
    // wrap() is what stops a caller building '2x − 3' out of '2' and 'x − 3'.
    render: (i) => wrap(i) },
  { id: 'square', label: 'x²', name: 'quadratic', expr: 'x^2',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 },
    props: {
      domain: ALL, range: NON_NEG,
      solve: (c) => (c > 0 ? [-Math.sqrt(c), Math.sqrt(c)] : c === 0 ? [0] : []),
    },
    render: (i) => `${wrap(i)}²` },
  { id: 'sqrt', label: '√x', name: 'square root', expr: 'sqrt(x)',
    window: { xMin: -2, xMax: 10, yMin: -2, yMax: 8 },
    props: { domain: NON_NEG, range: NON_NEG, solve: (c) => (c >= 0 ? [c * c] : []) },
    render: (i) => `√${wrap(i)}` },
  { id: 'cube', label: 'x³', name: 'cubic', expr: 'x^3',
    window: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 },
    props: { domain: ALL, range: ALL, solve: (c) => [Math.cbrt(c)] },
    render: (i) => `${wrap(i)}³` },
  // cbrt, NOT x^(1/3): mathjs returns a complex number for negative x.
  { id: 'cbrt', label: '∛x', name: 'cube root', expr: 'cbrt(x)',
    window: { xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
    props: { domain: ALL, range: ALL, solve: (c) => [c ** 3] },
    render: (i) => `∛${wrap(i)}` },
  { id: 'recip', label: '1/x', name: 'reciprocal', expr: '1/x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    props: {
      domain: NOT_ZERO, range: NOT_ZERO,
      verticalAsymptote: 0, horizontalAsymptote: 0,
      solve: (c) => (c !== 0 ? [1 / c] : []), // 1/u is never 0
    },
    render: (i) => `1/${wrap(i)}`,
    // The only parent that folds a coefficient in: nobody writes '2·1/(x − 3)'.
    renderScaled: (a, i) => `${a}/${wrap(i)}` },
  { id: 'abs', label: '|x|', name: 'absolute value', expr: 'abs(x)',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 },
    props: {
      domain: ALL, range: NON_NEG,
      solve: (c) => (c > 0 ? [-c, c] : c === 0 ? [0] : []),
    },
    // The bars ARE the delimiters, so a compound argument needs no extra parens.
    render: (i) => `|${i}|` },
  { id: 'exp', label: 'eˣ', name: 'exponential', expr: 'exp(x)',
    window: { xMin: -3, xMax: 3, yMin: -1, yMax: 10 },
    props: {
      domain: ALL, range: POSITIVE, horizontalAsymptote: 0,
      solve: (c) => (c > 0 ? [Math.log(c)] : []),
    },
    render: (i) => (bare(i) ? 'eˣ' : `e^${wrap(i)}`) },
  // `log` is base-e in both mathjs and function-plot. `ln` does not exist.
  { id: 'ln', label: 'ln x', name: 'natural log', expr: 'log(x)',
    window: { xMin: -2, xMax: 10, yMin: -5, yMax: 5 },
    props: {
      domain: POSITIVE, range: ALL, verticalAsymptote: 0,
      solve: (c) => [Math.exp(c)],
    },
    render: (i) => (bare(i) ? 'ln x' : `ln${wrap(i)}`) },
  { id: 'sin', label: 'sin x', name: 'sine', expr: 'sin(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 },
    props: { domain: ALL, range: UNIT, solve: PERIODIC },
    render: (i) => (bare(i) ? 'sin x' : `sin${wrap(i)}`) },
  { id: 'cos', label: 'cos x', name: 'cosine', expr: 'cos(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 },
    props: { domain: ALL, range: UNIT, solve: PERIODIC },
    render: (i) => (bare(i) ? 'cos x' : `cos${wrap(i)}`) },
];

export function parentById(id: string): Parent | undefined {
  return PARENTS.find((p) => p.id === id);
}

/** The parent the explorer opens with. Throws if the catalog loses it. */
export function defaultParent(): Parent {
  const p = parentById(DEFAULT_PARENT_ID);
  if (!p) throw new Error(`Default parent "${DEFAULT_PARENT_ID}" is missing from PARENTS`);
  return p;
}
