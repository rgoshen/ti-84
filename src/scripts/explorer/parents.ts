/**
 * The curated "parent function" catalog for the Transformation Explorer. Each
 * parent carries a default window that frames its shape well [G7] — sin/cos need
 * a small y-range, eˣ a small x-range, √x a shifted x-range, etc. Pure data.
 */
import type { Window2D } from '@/scripts/graphing/math';

export interface Parent {
  /** Stable id used by the picker + tests. */
  id: string;
  /** Human label, e.g. 'x²'. */
  label: string;
  /** mathjs / function-plot expression, e.g. 'x^2'. */
  expr: string;
  /** Default view that frames this parent well. */
  window: Window2D;
}

const TAU = 2 * Math.PI;

export const PARENTS: Parent[] = [
  { id: 'square', label: 'x²', expr: 'x^2', window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'cube', label: 'x³', expr: 'x^3', window: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 } },
  { id: 'abs', label: '|x|', expr: 'abs(x)', window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'sqrt', label: '√x', expr: 'sqrt(x)', window: { xMin: -2, xMax: 10, yMin: -2, yMax: 8 } },
  { id: 'recip', label: '1/x', expr: '1/x', window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'sin', label: 'sin x', expr: 'sin(x)', window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'cos', label: 'cos x', expr: 'cos(x)', window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'exp', label: 'eˣ', expr: 'exp(x)', window: { xMin: -3, xMax: 3, yMin: -1, yMax: 10 } },
];

export function parentById(id: string): Parent | undefined {
  return PARENTS.find((p) => p.id === id);
}
