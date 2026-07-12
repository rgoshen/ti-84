/**
 * The curated "parent function" catalog for the Transformation Explorer. Each
 * parent carries a default window that frames its shape well [G7] — sin/cos need
 * a small y-range, eˣ a small x-range, √x a shifted x-range, etc. Pure data.
 */
import type { Window2D } from '@/scripts/graphing/math';

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
}

const TAU = 2 * Math.PI;

/** The parent shown on first load. Identity is listed first, but x² is the classic
 *  teaching parent and is what the explorer has always opened with. */
export const DEFAULT_PARENT_ID = 'square';

export const PARENTS: Parent[] = [
  { id: 'identity', label: 'x', name: 'identity', expr: 'x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'square', label: 'x²', name: 'quadratic', expr: 'x^2',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'sqrt', label: '√x', name: 'square root', expr: 'sqrt(x)',
    window: { xMin: -2, xMax: 10, yMin: -2, yMax: 8 } },
  { id: 'cube', label: 'x³', name: 'cubic', expr: 'x^3',
    window: { xMin: -5, xMax: 5, yMin: -10, yMax: 10 } },
  // cbrt, NOT x^(1/3): mathjs returns a complex number for negative x.
  { id: 'cbrt', label: '∛x', name: 'cube root', expr: 'cbrt(x)',
    window: { xMin: -10, xMax: 10, yMin: -5, yMax: 5 } },
  { id: 'recip', label: '1/x', name: 'reciprocal', expr: '1/x',
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } },
  { id: 'abs', label: '|x|', name: 'absolute value', expr: 'abs(x)',
    window: { xMin: -10, xMax: 10, yMin: -2, yMax: 10 } },
  { id: 'exp', label: 'eˣ', name: 'exponential', expr: 'exp(x)',
    window: { xMin: -3, xMax: 3, yMin: -1, yMax: 10 } },
  // `log` is base-e in both mathjs and function-plot. `ln` does not exist.
  { id: 'ln', label: 'ln x', name: 'natural log', expr: 'log(x)',
    window: { xMin: -2, xMax: 10, yMin: -5, yMax: 5 } },
  { id: 'sin', label: 'sin x', name: 'sine', expr: 'sin(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
  { id: 'cos', label: 'cos x', name: 'cosine', expr: 'cos(x)',
    window: { xMin: -TAU, xMax: TAU, yMin: -3, yMax: 3 } },
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
