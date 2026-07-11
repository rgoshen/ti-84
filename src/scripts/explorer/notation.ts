/**
 * Turns the point's current position into the arrow-notation readout — the
 * teaching payload and the accessible text (rendered into an aria-live region).
 * Pure: it takes the already-computed asymptotes / end-behaviour and the pin
 * status, and decides which limit statement to show.
 */

import type { Window2D } from '@/scripts/graphing/math';
import { formatNumber } from '@/scripts/graphing/hover';
import type { Asymptote, EndBehavior, Sign } from './limits';
import type { PinStatus } from './branch';

export interface Readout {
  headline: string;
  note: string;
}

export interface ReadoutInput {
  x: number;
  fx: number | null;
  pin: PinStatus;
  win: Window2D;
  asymptotes: Asymptote[];
  endNeg: EndBehavior;
  endPos: EndBehavior;
  /** "Near a wall" band, as a fraction of window width. */
  wallFrac?: number;
  /** "Heading to ±∞" band near an x-edge, as a fraction of window width. */
  edgeFrac?: number;
}

export function toSuperscript(side: '-' | '+'): string {
  return side === '-' ? '⁻' : '⁺';
}

export function formatInfinity(sign: Sign): string {
  return sign === 1 ? '∞' : '−∞';
}

export function formatApproach(a: number, side: '-' | '+'): string {
  return `x → ${formatNumber(a)}${toSuperscript(side)}`;
}

export function formatLimitValue(v: number, approach?: '+' | '-'): string {
  return `${formatNumber(v)}${approach ? toSuperscript(approach) : ''}`;
}

/**
 * Precedence: (1) the nearest wall within the wall band → a one-sided arrow
 * statement; (2) else near an x-edge → an end-behaviour statement; (3) else the
 * plain value. A pinned-off-screen point shows "→ ±∞" instead of a clipped
 * number, and an oscillating tail gets a neutral note rather than a false arrow.
 */
export function describeReadout(input: ReadoutInput): Readout {
  const { x, fx, pin, win, asymptotes, endNeg, endPos } = input;
  const wallFrac = input.wallFrac ?? 0.06;
  const edgeFrac = input.edgeFrac ?? 0.15;
  const width = win.xMax - win.xMin;

  // (1) Nearest wall (tie-break: smaller x).
  let nearest: Asymptote | null = null;
  let bestDist = Infinity;
  for (const a of asymptotes) {
    const d = Math.abs(x - a.x);
    if (d < bestDist || (d === bestDist && nearest !== null && a.x < nearest.x)) {
      bestDist = d;
      nearest = a;
    }
  }
  if (nearest !== null && bestDist <= wallFrac * width) {
    const side: '-' | '+' = x < nearest.x ? '-' : '+';
    const sign = side === '-' ? nearest.leftSign : nearest.rightSign;
    return {
      headline: `${formatApproach(nearest.x, side)},  f(x) → ${formatInfinity(sign)}`,
      note: `Near the wall at x = ${formatNumber(nearest.x)} from the ${
        side === '-' ? 'left' : 'right'
      } — the curve is shooting ${sign === 1 ? 'up' : 'down'}.`,
    };
  }

  // (2) Near an x-edge → end behaviour on that side.
  const nearMax = win.xMax - x <= edgeFrac * width;
  const nearMin = x - win.xMin <= edgeFrac * width;
  if (nearMax || nearMin) {
    return endMessage(nearMax ? 'x → ∞' : 'x → −∞', nearMax ? endPos : endNeg);
  }

  // (3) Fallback — a plain value, or the off-screen / undefined state.
  if (pin === 'top') {
    return { headline: `f(${formatNumber(x)}) → ∞`, note: 'The curve runs off the top of the window here.' };
  }
  if (pin === 'bottom') {
    return { headline: `f(${formatNumber(x)}) → −∞`, note: 'The curve runs off the bottom of the window here.' };
  }
  if (pin === 'undefined' || fx === null) {
    return { headline: `f(${formatNumber(x)}) is undefined here`, note: 'The function has no value at this x.' };
  }
  return {
    headline: `f(${formatNumber(x)}) = ${formatNumber(fx)}`,
    note: 'Drag toward a wall (vertical asymptote) or far out to an edge to see a limit.',
  };
}

function endMessage(xArrow: string, end: EndBehavior): Readout {
  switch (end.kind) {
    case 'finite':
      return {
        headline: `${xArrow},  f(x) → ${formatLimitValue(end.value ?? 0, end.approach)}`,
        note: 'The curve levels off toward a horizontal asymptote.',
      };
    case 'posInf':
      return { headline: `${xArrow},  f(x) → ∞`, note: 'The curve climbs without bound.' };
    case 'negInf':
      return { headline: `${xArrow},  f(x) → −∞`, note: 'The curve falls without bound.' };
    default:
      return { headline: xArrow, note: 'No single limit — the function keeps oscillating.' };
  }
}
