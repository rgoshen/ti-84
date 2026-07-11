/**
 * Pure, DOM-free branch geometry for the Function Explorer, in DATA coordinates.
 *
 * A "pole" is the x-position of a vertical asymptote. The branch logic needs only
 * those positions — not their blow-up signs — so it takes `poles: number[]` and
 * stays decoupled from asymptote detection. The f-dependent "where can the point
 * actually go" logic lives in visible.ts, which builds on `branchOf`.
 */

import type { Window2D } from '@/scripts/graphing/math';

/** The open interval between neighbouring walls / window x-edges. */
export interface Branch {
  lo: number;
  hi: number;
}

/**
 * The branch (open interval between neighbouring walls / window x-edges) that
 * contains `x`. Poles outside the window fall away because the window edge wins
 * via the running max/min.
 */
export function branchOf(x: number, poles: number[], w: Window2D): Branch {
  let lo = w.xMin;
  let hi = w.xMax;
  for (const p of poles) {
    if (p < x && p > lo) lo = p;
    if (p > x && p < hi) hi = p;
  }
  return { lo, hi };
}

/** Where the plotted point lands vertically once clamped to the window. */
export type PinStatus = 'onscreen' | 'top' | 'bottom' | 'undefined';

export interface PinnedPoint {
  /** Clamped y in data coordinates. Only meaningful when status !== 'undefined'. */
  drawY: number;
  status: PinStatus;
}

/**
 * Clamp a function value to the window so an on-curve mark is never drawn off the
 * SVG. With the visible-range interaction the point is normally on-screen; this
 * is the drawing-time safety net (and reports which edge, for the readout).
 */
export function pinToWindow(fx: number | null, w: Window2D): PinnedPoint {
  if (fx === null || Number.isNaN(fx)) return { drawY: NaN, status: 'undefined' };
  if (fx > w.yMax) return { drawY: w.yMax, status: 'top' }; // covers +Infinity
  if (fx < w.yMin) return { drawY: w.yMin, status: 'bottom' }; // covers -Infinity
  return { drawY: fx, status: 'onscreen' };
}
