import { evaluate } from 'mathjs';

export interface Window2D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Evaluate `expr` at x. Returns null for non-finite results or parse/eval errors. */
export function evalAt(expr: string, x: number): number | null {
  try {
    const v = evaluate(expr, { x });
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Every integer x within the window, inclusive. */
export function integerXs(w: Window2D): number[] {
  const lo = Math.ceil(Math.min(w.xMin, w.xMax));
  const hi = Math.floor(Math.max(w.xMin, w.xMax));
  const xs: number[] = [];
  for (let x = lo; x <= hi; x++) xs.push(x);
  return xs;
}

/**
 * Bisection root-finder: returns x in [a, b] where f(x) = k, assuming f(a)-k and
 * f(b)-k straddle zero. Returns null if f is undefined mid-search.
 */
export function bisect(expr: string, k: number, a: number, b: number): number | null {
  const fa = evalAt(expr, a);
  if (fa === null) return null;
  let ga = fa - k;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    const fm = evalAt(expr, m);
    if (fm === null) return null;
    const gm = fm - k;
    if (gm === 0 || b - a < 1e-9) return m;
    // Keep the half whose endpoints still straddle the root.
    if ((ga < 0 && gm < 0) || (ga > 0 && gm > 0)) {
      a = m;
      ga = gm;
    } else {
      b = m;
    }
  }
  return (a + b) / 2;
}

/**
 * Every point where the curve y = f(x) crosses a whole-number gridline inside the
 * window — integer x OR integer y. Returns points in data coordinates, de-duplicated
 * and capped to keep oscillating curves readable.
 */
export function gridlineCrossings(expr: string, w: Window2D): Point[] {
  const xMin = Math.min(w.xMin, w.xMax);
  const xMax = Math.max(w.xMin, w.xMax);
  const yMin = Math.min(w.yMin, w.yMax);
  const yMax = Math.max(w.yMin, w.yMax);
  const EPS = 1e-9;
  const MAX_POINTS = 200; // hard cap per equation to prevent clutter

  const points: Point[] = [];
  const seen = new Set<string>();
  const key = (x: number, y: number) =>
    `${Math.round(x * 1e4) / 1e4},${Math.round(y * 1e4) / 1e4}`;
  const push = (x: number, y: number) => {
    if (!isFinite(x) || !isFinite(y)) return;
    if (x < xMin - EPS || x > xMax + EPS || y < yMin - EPS || y > yMax + EPS) return;
    const k = key(x, y);
    if (seen.has(k)) return;
    seen.add(k);
    points.push({ x, y });
  };

  // 1) Integer-x crossings: the curve meets each vertical whole-number line once.
  for (let x = Math.ceil(xMin - EPS); x <= Math.floor(xMax + EPS); x++) {
    const y = evalAt(expr, x);
    if (y !== null) push(x, y);
  }

  // 2) Integer-y crossings: solve f(x) = k for each horizontal whole-number line.
  //    Sample f once across the window, then for every integer k look for sign
  //    changes of f(x) - k and bisect to locate the crossing x.
  const yLo = Math.ceil(yMin - EPS);
  const yHi = Math.floor(yMax + EPS);
  // Skip the scan when absurdly zoomed out (lines too dense to be useful).
  if (yHi - yLo <= 400) {
    const SAMPLES = 1000;
    const dx = (xMax - xMin) / SAMPLES;
    const xs: number[] = new Array(SAMPLES + 1);
    const fs: Array<number | null> = new Array(SAMPLES + 1);
    for (let i = 0; i <= SAMPLES; i++) {
      const x = xMin + i * dx;
      xs[i] = x;
      fs[i] = evalAt(expr, x); // may be null where f is undefined
    }
    for (let k = yLo; k <= yHi && points.length < MAX_POINTS; k++) {
      for (let i = 1; i <= SAMPLES; i++) {
        const a = fs[i - 1];
        const b = fs[i];
        if (a === null || b === null) continue;
        const ga = a - k;
        const gb = b - k;
        if (ga === 0) {
          push(xs[i - 1], k);
          continue;
        }
        if ((ga < 0 && gb > 0) || (ga > 0 && gb < 0)) {
          const root = bisect(expr, k, xs[i - 1], xs[i]);
          if (root !== null) push(root, k);
        }
        if (points.length >= MAX_POINTS) break;
      }
    }
  }

  return points;
}
