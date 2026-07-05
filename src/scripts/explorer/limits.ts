/**
 * Heuristic detection of a function's limit structure, from expression sampling
 * alone — pure and node-testable (reuses only `evalAt`). Two questions:
 *   - Where are the vertical asymptotes (walls), and which way does f blow up?
 *   - What happens at the far ends (x → ±∞)?
 *
 * `evalAt` returns null for BOTH undefined points and non-finite results, so a
 * pole and a domain edge look alike from a single sample. We separate them with
 * a divergence probe: a real wall makes |f| grow without bound as we close in,
 * a removable/jump discontinuity (sin(x)/x, floor) does not.
 */

import { evalAt, type Window2D } from '@/scripts/graphing/math';

const TINY = 1e-9;

export type Sign = 1 | -1;

/** A vertical asymptote at `x`, with the blow-up direction on each side. */
export interface Asymptote {
  x: number;
  leftSign: Sign; // sign of f just left of the wall (+1 = →+∞, -1 = →−∞)
  rightSign: Sign;
}

export interface AsymptoteScanOptions {
  samples?: number;
  blowupFactor?: number; // |f| > blowupFactor * windowHeight counts as "blowing up"
  mergeFrac?: number; // merge candidates within mergeFrac * windowWidth
  growthProbes?: number;
  maxPoints?: number;
}

export type LimitKind = 'finite' | 'posInf' | 'negInf' | 'unknown';

export interface EndBehavior {
  kind: LimitKind;
  value?: number; // horizontal-asymptote value when kind === 'finite'
  approach?: '+' | '-'; // from above / below (finite only)
}

export type OneSidedLimit = EndBehavior;

/** g(x) = 1/f(x); a pole shows up as g → 0. null (undefined/∞) is treated as the pole. */
function recip(v: number | null): number {
  if (v === null) return 0;
  if (v === 0) return Infinity;
  return 1 / v;
}

const sgn = (v: number): Sign => (v >= 0 ? 1 : -1);

/** Bisect to the zero of g = 1/f across an interval where f flips sign (odd pole). */
function refineSignChange(expr: string, lo: number, hi: number): number {
  let glo = recip(evalAt(expr, lo));
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    const gm = recip(evalAt(expr, m));
    if (gm === 0 || hi - lo < TINY) return m;
    if (glo < 0 === gm < 0) {
      lo = m;
      glo = gm;
    } else {
      hi = m;
    }
  }
  return (lo + hi) / 2;
}

/** Narrow to the boundary between a large-finite sample and an undefined (null) one. */
function refineNullBoundary(expr: string, finiteX: number, nullX: number): number {
  let big = finiteX;
  let gap = nullX;
  for (let i = 0; i < 60; i++) {
    const m = (big + gap) / 2;
    if (evalAt(expr, m) === null) gap = m;
    else big = m;
    if (Math.abs(big - gap) < TINY) break;
  }
  return (big + gap) / 2;
}

/** Ternary search for the x of maximum |f| (an even pole that missed every sample). */
function refineMax(expr: string, lo: number, hi: number): number {
  const mag = (x: number): number => {
    const v = evalAt(expr, x);
    return v === null ? Infinity : Math.abs(v);
  };
  for (let i = 0; i < 60 && hi - lo > TINY; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (mag(m1) < mag(m2)) lo = m1;
    else hi = m2;
  }
  return (lo + hi) / 2;
}

/** Reject removable/jump discontinuities: a real wall makes |f| grow past bigMag. */
function verifyDivergence(
  expr: string,
  x: number,
  bigMag: number,
  probes: number,
  h0: number,
): boolean {
  let prevMag = 0;
  let sawGrowth = false;
  let largeEnough = false;
  for (let k = 0; k < probes; k++) {
    const d = h0 / 4 ** k;
    const l = evalAt(expr, x - d);
    const r = evalAt(expr, x + d);
    const mag = Math.max(
      l === null ? Infinity : Math.abs(l),
      r === null ? Infinity : Math.abs(r),
    );
    if (mag > prevMag) sawGrowth = true;
    if (mag > bigMag) largeEnough = true;
    if (mag !== Infinity) prevMag = mag;
  }
  return sawGrowth && largeEnough;
}

/** Blow-up sign just off the wall: the nearest finite, non-zero evaluation on a side. */
function sideSign(expr: string, x: number, dir: -1 | 1, dx: number): Sign {
  for (let k = 1; k <= 40; k++) {
    const v = evalAt(expr, x + dir * dx * 0.5 * k);
    if (v !== null && Math.abs(v) > TINY) return sgn(v);
  }
  return 1;
}

export function findVerticalAsymptotes(
  expr: string,
  w: Window2D,
  opts: AsymptoteScanOptions = {},
): Asymptote[] {
  const samples = opts.samples ?? 1000;
  // Low enough that a shallow (residue-1) pole like 1/x clears it — its
  // nearest-sample magnitude is ~1/dx, independent of window height. The
  // divergence probe, not this threshold, is what rejects non-poles, so a
  // permissive candidate gate is safe.
  const blowupFactor = opts.blowupFactor ?? 3;
  const mergeFrac = opts.mergeFrac ?? 1e-3;
  const growthProbes = opts.growthProbes ?? 6;
  const maxPoints = opts.maxPoints ?? 50;

  const width = w.xMax - w.xMin;
  const height = Math.max(w.yMax - w.yMin, 1);
  const bigMag = blowupFactor * height;
  const dx = width / samples;

  const xs: number[] = new Array(samples + 1);
  const fs: Array<number | null> = new Array(samples + 1);
  for (let i = 0; i <= samples; i++) {
    const x = w.xMin + i * dx;
    xs[i] = x;
    fs[i] = evalAt(expr, x);
  }

  const candidates: number[] = [];
  for (let i = 1; i <= samples; i++) {
    const a = fs[i - 1];
    const b = fs[i];
    if (a !== null && b !== null) {
      // Odd pole: f flips sign while blowing up.
      if (a > 0 !== b > 0 && Math.max(Math.abs(a), Math.abs(b)) > bigMag) {
        candidates.push(refineSignChange(expr, xs[i - 1], xs[i]));
      }
    } else if ((a === null) !== (b === null)) {
      // Undefined sample flanked by a large-magnitude one (even pole / gap).
      const finite = a === null ? b : a;
      if (finite !== null && Math.abs(finite) > bigMag) {
        const finiteX = a === null ? xs[i] : xs[i - 1];
        const nullX = a === null ? xs[i - 1] : xs[i];
        candidates.push(refineNullBoundary(expr, finiteX, nullX));
      }
    }
  }
  // Even pole that landed between samples (no sign flip, no null hit): a same-sign
  // local |f| peak above the blow-up threshold.
  for (let i = 1; i < samples; i++) {
    const p = fs[i - 1];
    const c = fs[i];
    const n = fs[i + 1];
    if (
      c !== null &&
      p !== null &&
      n !== null &&
      Math.abs(c) > bigMag &&
      Math.abs(c) >= Math.abs(p) &&
      Math.abs(c) >= Math.abs(n) &&
      p > 0 === c > 0 &&
      n > 0 === c > 0
    ) {
      candidates.push(refineMax(expr, xs[i - 1], xs[i + 1]));
    }
  }

  candidates.sort((a, b) => a - b);
  const mergeTol = Math.max(mergeFrac * width, dx * 1.5);
  const merged: number[] = [];
  for (const x of candidates) {
    if (merged.length && Math.abs(x - merged[merged.length - 1]) <= mergeTol) continue;
    merged.push(x);
  }

  const result: Asymptote[] = [];
  for (const x of merged) {
    if (!verifyDivergence(expr, x, bigMag, growthProbes, dx * 4)) continue;
    result.push({
      x,
      leftSign: sideSign(expr, x, -1, dx),
      rightSign: sideSign(expr, x, 1, dx),
    });
    if (result.length >= maxPoints) break;
  }
  return result;
}

export interface EndBehaviorOptions {
  start?: number;
  reach?: number;
}

/** End behaviour as x → −∞ ('neg') or x → +∞ ('pos'). */
export function classifyEndBehavior(
  expr: string,
  side: 'neg' | 'pos',
  opts: EndBehaviorOptions = {},
): EndBehavior {
  const start = opts.start ?? 16;
  const reach = opts.reach ?? 1e6;
  const dir = side === 'neg' ? -1 : 1;

  const vals: number[] = [];
  for (let x = start; x <= reach; x *= 4) {
    const v = evalAt(expr, dir * x);
    if (v !== null) vals.push(v);
  }
  return classifySequence(vals);
}

/** One-sided limit of f at a finite point a (used to label a detected wall). */
export function classifyOneSided(expr: string, a: number, side: '-' | '+'): OneSidedLimit {
  const dir = side === '-' ? -1 : 1;
  const vals: number[] = [];
  for (let k = 1; k <= 12; k++) {
    const v = evalAt(expr, a + dir * 0.25 ** k);
    if (v !== null) vals.push(v);
  }
  return classifySequence(vals);
}

/** Shared classifier for a sequence approaching a limit (end-behaviour / one-sided). */
function classifySequence(vals: number[]): EndBehavior {
  if (vals.length < 2) return { kind: 'unknown' };
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];

  let monotoneGrow = true;
  for (let i = 1; i < vals.length; i++) {
    if (Math.abs(vals[i]) < Math.abs(vals[i - 1])) {
      monotoneGrow = false;
      break;
    }
  }
  if (monotoneGrow && Math.abs(last) > 1e3) {
    return { kind: last > 0 ? 'posInf' : 'negInf' };
  }

  const dLast = Math.abs(last - prev);
  const prev2 = vals[vals.length - 3];
  const dPrev = prev2 === undefined ? Infinity : Math.abs(prev - prev2);
  if (dLast < 1e-3 && dLast <= dPrev) {
    const value = Math.abs(last) < 1e-6 ? 0 : last;
    const approach: '+' | '-' = last < prev ? '+' : '-';
    return { kind: 'finite', value, approach };
  }
  return { kind: 'unknown' };
}
