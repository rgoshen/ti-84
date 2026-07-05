import { describe, it, expect } from 'vitest';
import {
  visibleRange,
  clampToVisible,
  resolveVisibleX,
  sweepEndpoints,
} from './visible';
import type { Window2D } from '@/scripts/graphing/math';

const WIN: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
// 1/x^2 exits the top (y = 7) at x = ±1/√7 ≈ ±0.37796.
const EDGE = 1 / Math.sqrt(7);

describe('visibleRange — the on-screen curve segment', () => {
  it('stops at the top-edge crossing toward the wall and at the x-edge away from it', () => {
    const r = visibleRange('1/x^2', 1, WIN, [0]);
    expect(r.lo).toBeCloseTo(EDGE, 2); // curve exits the top near the wall
    expect(r.hi).toBeCloseTo(4, 6); // stays on-screen out to the window edge
  });

  it('is symmetric on the left branch', () => {
    const r = visibleRange('1/x^2', -1, WIN, [0]);
    expect(r.hi).toBeCloseTo(-EDGE, 2);
    expect(r.lo).toBeCloseTo(-4, 6);
  });
});

describe('clampToVisible — drag/slider stop at the window edge (never slide, never cross)', () => {
  it('dragging past the wall stops at the edge crossing, staying on the same branch', () => {
    const x = clampToVisible(-5, 1, '1/x^2', WIN, [0]);
    expect(x).toBeCloseTo(EDGE, 2);
    expect(x).toBeGreaterThan(0); // never crossed to the left branch
  });

  it('dragging outward stops at the window x-edge', () => {
    expect(clampToVisible(10, 1, '1/x^2', WIN, [0])).toBeCloseTo(4, 6);
  });

  it('holds at the edge once there (does not slide toward the wall)', () => {
    const atEdge = clampToVisible(-5, 1, '1/x^2', WIN, [0]);
    const again = clampToVisible(-5, atEdge, '1/x^2', WIN, [0]);
    expect(again).toBeCloseTo(atEdge, 4);
  });
});

describe('sweepEndpoints — walk the visible curve to the edge, then stop', () => {
  it('approach from the right ends at the top-edge crossing, not the wall', () => {
    const p = sweepEndpoints({ kind: 'approach', a: 0, side: '+' }, '1/x^2', WIN, [0]);
    expect(p).not.toBeNull();
    expect(p!.to).toBeCloseTo(EDGE, 2);
    expect(p!.from).toBeCloseTo(4, 6);
  });

  it('approach from the left ends at the left top-edge crossing', () => {
    const p = sweepEndpoints({ kind: 'approach', a: 0, side: '-' }, '1/x^2', WIN, [0]);
    expect(p!.to).toBeCloseTo(-EDGE, 2);
    expect(p!.from).toBeCloseTo(-4, 6);
  });

  it('end-behaviour sweeps out to the window x-edge', () => {
    const p = sweepEndpoints({ kind: 'end', dir: 'pos' }, '1/x^2', WIN, [0]);
    expect(p!.to).toBeCloseTo(4, 6);
  });
});

describe('resolveVisibleX — re-seat onto the visible curve after a change', () => {
  it('moves a point off a new pole onto an on-screen part of the curve', () => {
    const x = resolveVisibleX('1/x', 0, WIN, [0]);
    const v = 1 / x;
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(WIN.yMin);
    expect(v).toBeLessThanOrEqual(WIN.yMax);
  });

  it('leaves an already-visible point in place', () => {
    expect(resolveVisibleX('1/x^2', 2, WIN, [0])).toBeCloseTo(2, 6);
  });
});
