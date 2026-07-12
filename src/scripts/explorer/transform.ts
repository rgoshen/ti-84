/**
 * Pure logic for the Transformation Explorer: build the transformed expression
 * g(x) = a·f(b(x − h)) + k, and narrate what the coefficients did. All "is this
 * knob active?" tests use EPS — never float === — because slider steps land on
 * values like 0.9999999 [G2].
 */
import { parse, SymbolNode } from 'mathjs';
import { formatNumber } from '@/scripts/graphing/hover';

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

export interface TransformReadout {
  equation: string; // e.g. 'g(x) = 3·f(2(x − 1)) − 4'
  steps: string[]; // ordered plain-English transformations, or one explanatory line
}

const fmt = (n: number): string => formatNumber(n);

/**
 * The inner argument b(x − h) as display text: 'x', 'x − 3', '−x', '2(x − 3)'.
 * Shared by the abstract readout (`f(…)`) and the concrete equation in `equation.ts`,
 * so the two lines can never disagree about the same quantity.
 */
export function innerArgument(c: Coeffs): string {
  const hPart = Math.abs(c.h) < EPS ? 'x' : c.h > 0 ? `x − ${fmt(c.h)}` : `x + ${fmt(-c.h)}`;
  const compound = Math.abs(c.h) >= EPS; // hPart is 'x − 3', not a bare 'x'
  if (Math.abs(c.b - 1) < EPS) return hPart;
  if (Math.abs(c.b + 1) < EPS) return compound ? `−(${hPart})` : '−x';
  return compound ? `${fmt(c.b)}(${hPart})` : `${fmt(c.b)}x`;
}

/** Build the readable equation, simplifying identity terms. */
function formatEquation(c: Coeffs): string {
  const fPart = `f(${innerArgument(c)})`;
  const aPart =
    Math.abs(c.a - 1) < EPS ? fPart : Math.abs(c.a + 1) < EPS ? `−${fPart}` : `${fmt(c.a)}·${fPart}`;
  const kPart = Math.abs(c.k) < EPS ? '' : c.k > 0 ? ` + ${fmt(c.k)}` : ` − ${fmt(-c.k)}`;
  return `g(x) = ${aPart}${kPart}`;
}

/**
 * Narrate the transformation as an ordered step list. Order is horizontal
 * (inside-out: reflect → scale → shift) then vertical (reflect → scale → shift),
 * matching how "work inside the parentheses first" is taught [G5]. Degenerate
 * b=0 / a=0 replace the list with a single explanation [G3].
 */
export function describeTransform(c: Coeffs, parentLabel: string): TransformReadout {
  const equation = formatEquation(c);

  if (Math.abs(c.b) < EPS) return { equation, steps: ['b = 0: the graph collapses to a horizontal line.'] };
  if (Math.abs(c.a) < EPS) return { equation, steps: ['a = 0: the graph flattens to the line y = k.'] };

  const steps: string[] = [];

  // Horizontal (inside-out).
  if (c.b < -EPS) steps.push('Reflected over the y-axis');
  const B = Math.abs(c.b);
  if (B > 1 + EPS) steps.push(`Horizontal compression by factor ${fmt(B)}`);
  else if (B < 1 - EPS) steps.push(`Horizontal stretch by factor ${fmt(1 / B)}`);
  if (c.h > EPS) steps.push(`Shifted right ${fmt(c.h)}`);
  else if (c.h < -EPS) steps.push(`Shifted left ${fmt(-c.h)}`);

  // Vertical (outside).
  if (c.a < -EPS) steps.push('Reflected over the x-axis');
  const A = Math.abs(c.a);
  if (A > 1 + EPS) steps.push(`Vertical stretch by factor ${fmt(A)}`);
  else if (A < 1 - EPS) steps.push(`Vertical compression by factor ${fmt(A)}`);
  if (c.k > EPS) steps.push(`Shifted up ${fmt(c.k)}`);
  else if (c.k < -EPS) steps.push(`Shifted down ${fmt(-c.k)}`);

  if (steps.length === 0) {
    steps.push(`This is the parent function f(x) = ${parentLabel} — move a slider to transform it.`);
  }
  return { equation, steps };
}
