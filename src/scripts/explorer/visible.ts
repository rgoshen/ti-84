/**
 * Where the draggable point is ALLOWED to be: on the visible part of the curve.
 *
 * The point rides the curve but stops the instant the curve leaves the window —
 * at the top/bottom edge where |f| exits the y-range, or at a window x-edge. It
 * does NOT slide along an edge, and (because a vertical asymptote sends the curve
 * off-screen before the wall) it can never reach or cross a wall. This is the
 * f-dependent counterpart to branch.ts's pure geometry: it samples the function,
 * so it lives here rather than in the DOM-free branch module.
 */

import { evalAt, type Window2D } from '@/scripts/graphing/math';
import { branchOf } from './branch';

const onScreen = (expr: string, x: number, w: Window2D): boolean => {
  const v = evalAt(expr, x);
  return v !== null && v >= w.yMin && v <= w.yMax;
};

/** Bisect to the last on-screen x between an on-screen and an off-screen endpoint. */
function refineEdge(expr: string, on: number, off: number, w: Window2D): number {
  for (let k = 0; k < 40; k++) {
    const m = (on + off) / 2;
    if (onScreen(expr, m, w)) on = m;
    else off = m;
  }
  return on;
}

/** Walk from an on-screen `from` toward `toward`; return where the curve exits (or `toward`). */
function edgeToward(expr: string, from: number, toward: number, w: Window2D): number {
  const N = 256;
  let last = from;
  for (let i = 1; i <= N; i++) {
    const x = from + ((toward - from) * i) / N;
    if (onScreen(expr, x, w)) last = x;
    else return refineEdge(expr, last, x, w);
  }
  return toward;
}

export interface Range {
  lo: number;
  hi: number;
}

/** The connected on-screen interval of the curve within x0's branch. */
export function visibleRange(expr: string, x0: number, w: Window2D, poles: number[]): Range {
  const b = branchOf(x0, poles, w);
  if (!onScreen(expr, x0, w)) return { lo: x0, hi: x0 };
  return { lo: edgeToward(expr, x0, b.lo, w), hi: edgeToward(expr, x0, b.hi, w) };
}

/** Clamp a desired x to the visible curve segment containing the current x (the drag/slider rule). */
export function clampToVisible(
  desiredX: number,
  currentX: number,
  expr: string,
  w: Window2D,
  poles: number[],
): number {
  const { lo, hi } = visibleRange(expr, currentX, w, poles);
  return desiredX < lo ? lo : desiredX > hi ? hi : desiredX;
}

/** Any on-screen x strictly inside (lo, hi), or null if the curve is off-screen throughout. */
function anyOnScreen(expr: string, lo: number, hi: number, w: Window2D): number | null {
  const N = 64;
  for (let i = 1; i < N; i++) {
    const x = lo + ((hi - lo) * i) / N;
    if (onScreen(expr, x, w)) return x;
  }
  return null;
}

/** Re-seat the point on the visible curve after the function or window changes. */
export function resolveVisibleX(expr: string, x: number, w: Window2D, poles: number[]): number {
  const nx = Math.min(Math.max(x, w.xMin), w.xMax);
  if (onScreen(expr, nx, w)) return clampToVisible(nx, nx, expr, w, poles);
  const b = branchOf(nx, poles, w);
  return anyOnScreen(expr, b.lo, b.hi, w) ?? anyOnScreen(expr, w.xMin, w.xMax, w) ?? nx;
}

/** An animated limit walk: toward a wall from one side, or out to an x-edge. */
export type Sweep =
  | { kind: 'approach'; a: number; side: '-' | '+' }
  | { kind: 'end'; dir: 'neg' | 'pos' };

export interface SweepPath {
  from: number;
  to: number;
}

/**
 * The [from → to] x endpoints of an animated sweep. The point starts at the far
 * end of the target branch's visible segment and walks to the near end — the
 * edge where the curve exits toward the wall (approach) or the window x-edge
 * (end behaviour). It stops there; it never continues along the edge to the wall.
 * Returns null if nothing on that branch is on-screen.
 */
export function sweepEndpoints(
  sweep: Sweep,
  expr: string,
  w: Window2D,
  poles: number[],
): SweepPath | null {
  let branchProbe: number;
  let towardHi: boolean;
  if (sweep.kind === 'approach') {
    branchProbe = sweep.side === '-' ? sweep.a - 1e-9 : sweep.a + 1e-9;
    towardHi = sweep.side === '-'; // left branch → its right edge (near a) is the target
  } else {
    branchProbe = sweep.dir === 'pos' ? w.xMax - 1e-9 : w.xMin + 1e-9;
    towardHi = sweep.dir === 'pos';
  }
  const b = branchOf(branchProbe, poles, w);
  const probe = anyOnScreen(expr, b.lo, b.hi, w);
  if (probe === null) return null;
  const vr = visibleRange(expr, probe, w, poles);
  return towardHi ? { from: vr.lo, to: vr.hi } : { from: vr.hi, to: vr.lo };
}
