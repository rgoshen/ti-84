import { describe, it, expect } from 'vitest';
import { branchOf, pinToWindow, clampDragX, resolveX } from './branch';
import type { Window2D } from '@/scripts/graphing/math';

const WIN: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
const EPS = 0.02;

describe('branchOf — the open interval between neighbouring walls / window edges', () => {
  it('bounds the right branch of a single pole by the pole and the x-edge', () => {
    expect(branchOf(1, [0], WIN)).toEqual({ lo: 0, hi: 4 });
  });

  it('bounds the left branch of a single pole by the x-edge and the pole', () => {
    expect(branchOf(-1, [0], WIN)).toEqual({ lo: -4, hi: 0 });
  });

  it('bounds a middle branch by both neighbouring poles', () => {
    expect(branchOf(0, [-2, 2], WIN)).toEqual({ lo: -2, hi: 2 });
  });

  it('spans the whole window when there are no poles', () => {
    expect(branchOf(1, [], WIN)).toEqual({ lo: -4, hi: 4 });
  });

  it('ignores poles outside the window (edge wins)', () => {
    expect(branchOf(1, [-10], WIN)).toEqual({ lo: -4, hi: 4 });
  });

  it('picks the nearest pole on each side when several exist', () => {
    expect(branchOf(1, [-3, 0, 3], WIN)).toEqual({ lo: 0, hi: 3 });
  });

  it('does not depend on the order poles are given in', () => {
    expect(branchOf(1, [3, -3, 0], WIN)).toEqual({ lo: 0, hi: 3 });
  });
});

describe('pinToWindow — the off-page clamp (the anti-clip rule)', () => {
  it('leaves an on-screen value untouched', () => {
    expect(pinToWindow(1, WIN)).toEqual({ drawY: 1, status: 'onscreen' });
  });

  it('pins a value above the window to the top edge', () => {
    expect(pinToWindow(100, WIN)).toEqual({ drawY: 7, status: 'top' });
  });

  it('pins a value below the window to the bottom edge', () => {
    expect(pinToWindow(-100, WIN)).toEqual({ drawY: -1, status: 'bottom' });
  });

  it('treats +Infinity as the top edge', () => {
    expect(pinToWindow(Infinity, WIN)).toEqual({ drawY: 7, status: 'top' });
  });

  it('treats -Infinity as the bottom edge', () => {
    expect(pinToWindow(-Infinity, WIN)).toEqual({ drawY: -1, status: 'bottom' });
  });

  it('reports an undefined value (null) as undefined', () => {
    expect(pinToWindow(null, WIN).status).toBe('undefined');
  });

  it('reports NaN as undefined', () => {
    expect(pinToWindow(NaN, WIN).status).toBe('undefined');
  });
});

describe('clampDragX — THE BUG FIX: a drag can never cross a wall', () => {
  it('dragging left from the right branch toward the wall stops at the wall, never crossing', () => {
    // point on the right branch of a pole at 0; user drags far left (past the wall)
    const x = clampDragX(-3, 1, [0], WIN, EPS);
    expect(x).toBeCloseTo(EPS); // stops just right of the wall
    expect(x).toBeGreaterThan(0); // NEVER teleports to the left branch
  });

  it('dragging right from the left branch stops just left of the wall', () => {
    const x = clampDragX(3, -1, [0], WIN, EPS);
    expect(x).toBeCloseTo(-EPS);
    expect(x).toBeLessThan(0);
  });

  it('confines a middle branch between both walls', () => {
    expect(clampDragX(5, 0, [-2, 2], WIN, EPS)).toBeCloseTo(2 - EPS);
    expect(clampDragX(-5, 0, [-2, 2], WIN, EPS)).toBeCloseTo(-2 + EPS);
  });

  it('with no poles, clamps only to the window edges', () => {
    expect(clampDragX(99, 0, [], WIN, EPS)).toBeCloseTo(WIN.xMax - EPS);
    expect(clampDragX(-99, 0, [], WIN, EPS)).toBeCloseTo(WIN.xMin + EPS);
  });

  it('passes an in-branch target through unchanged', () => {
    expect(clampDragX(2, 1, [0], WIN, EPS)).toBe(2);
  });

  it('[G11] returns the midpoint for a branch narrower than 2·epsilon', () => {
    // two poles closer together than the standoff (e.g. tan(x) zoomed out)
    expect(clampDragX(1.0, 1.0, [0.99, 1.01], WIN, EPS)).toBeCloseTo(1.0);
    expect(clampDragX(5, 1.0, [0.99, 1.01], WIN, EPS)).toBeCloseTo(1.0);
  });
});

describe('resolveX — re-clamp the point when the function/window changes [G4]', () => {
  it('nudges a point sitting exactly on a new pole off the wall', () => {
    // e.g. switching x^2 (point at x=0) -> 1/x (pole now at 0)
    const x = resolveX(0, [0], WIN, EPS);
    expect(x).not.toBe(0);
    expect(Math.abs(x)).toBeGreaterThanOrEqual(EPS - 1e-9);
  });

  it('nudges a point within epsilon of a wall to the same side it was on', () => {
    expect(resolveX(-0.01, [0], WIN, EPS)).toBeCloseTo(-EPS);
    expect(resolveX(0.01, [0], WIN, EPS)).toBeCloseTo(EPS);
  });

  it('leaves an already-valid point where it is', () => {
    expect(resolveX(3, [0], WIN, EPS)).toBe(3);
  });

  it('pulls an out-of-window point back inside', () => {
    expect(resolveX(99, [], WIN, EPS)).toBeCloseTo(WIN.xMax - EPS);
  });
});
