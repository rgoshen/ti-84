/**
 * Pure, DOM-free branch / pin geometry for the Function Explorer, expressed
 * entirely in DATA coordinates (the island maps results through function-plot's
 * D3 scales). Kept free of the plotting library so it can be unit-tested in node.
 *
 * A "pole" here is just the x-position of a vertical asymptote. The branch logic
 * only needs those positions — the ± blow-up signs matter to the readout
 * (notation.ts), not to where a branch begins and ends — so these functions take
 * `poles: number[]` and stay decoupled from the asymptote-detection module.
 */

import type { Window2D } from '@/scripts/graphing/math';

/** The open interval a point can move within without crossing a wall. */
export interface Branch {
  lo: number;
  hi: number;
}

/**
 * The branch (open interval between neighbouring walls / window x-edges) that
 * contains `x`. Poles outside the window fall away naturally because the window
 * edge wins via the max/min. `x` is assumed not to sit exactly on a pole
 * (resolveX guarantees that); strict comparisons make on-pole inputs degenerate.
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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function nearestPole(x: number, poles: number[]): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const p of poles) {
    const d = Math.abs(x - p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

/**
 * THE BUG FIX. Clamp a desired drag/slider x so the point stays inside the
 * branch it is CURRENTLY on — it can approach a wall but never step across it to
 * the other side (the original reciprocal-square explorer teleported across x=0).
 * `epsilon` is the wall standoff in data units (the island scales it to the
 * window). A branch narrower than the standoff can't seat the point at both
 * edges, so we drop it in the middle [G11].
 */
export function clampDragX(
  desiredX: number,
  currentX: number,
  poles: number[],
  w: Window2D,
  epsilon: number,
): number {
  const { lo, hi } = branchOf(currentX, poles, w);
  if (hi - lo < 2 * epsilon) return (lo + hi) / 2; // degenerate branch [G11]
  return clamp(desiredX, lo + epsilon, hi - epsilon);
}

/**
 * Re-seat the point after the function or window changes [G4]. If it now sits on
 * (or within `epsilon` of) a wall, nudge it off to the side it was on; if it
 * fell outside the window or its branch, pull it back in. Prevents a stale x
 * from landing on a brand-new pole (e.g. switching x^2 → 1/x at x=0).
 */
export function resolveX(x: number, poles: number[], w: Window2D, epsilon: number): number {
  let nx = clamp(x, w.xMin, w.xMax);
  const p = nearestPole(nx, poles);
  if (p !== null && Math.abs(nx - p) < epsilon) {
    // Move off the wall, preferring the side x was on but staying in-window.
    if (nx >= p) nx = p + epsilon <= w.xMax ? p + epsilon : p - epsilon;
    else nx = p - epsilon >= w.xMin ? p - epsilon : p + epsilon;
  }
  return clampDragX(nx, nx, poles, w, epsilon);
}

/** Where the plotted point lands vertically once clamped to the window. */
export type PinStatus = 'onscreen' | 'top' | 'bottom' | 'undefined';

export interface PinnedPoint {
  /** Clamped y in data coordinates. Only meaningful when status !== 'undefined'. */
  drawY: number;
  status: PinStatus;
}

/**
 * The off-page rule: clamp a function value to the window and report which edge
 * it pinned to. This is what stops the dragged point from clipping off the top
 * (or bottom) as the curve heads to ±∞ — instead of drawing off-canvas it sits
 * on the edge, and the caller shows "→ ∞" rather than a bogus number.
 */
export function pinToWindow(fx: number | null, w: Window2D): PinnedPoint {
  if (fx === null || Number.isNaN(fx)) return { drawY: NaN, status: 'undefined' };
  if (fx > w.yMax) return { drawY: w.yMax, status: 'top' }; // covers +Infinity
  if (fx < w.yMin) return { drawY: w.yMin, status: 'bottom' }; // covers -Infinity
  return { drawY: fx, status: 'onscreen' };
}
