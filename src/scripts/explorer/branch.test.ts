import { describe, it, expect } from 'vitest';
import { branchOf, pinToWindow } from './branch';
import type { Window2D } from '@/scripts/graphing/math';

const WIN: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };

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

describe('pinToWindow — the drawing-time window clamp', () => {
  it('leaves an on-screen value untouched', () => {
    expect(pinToWindow(1, WIN)).toEqual({ drawY: 1, status: 'onscreen' });
  });

  it('pins a value above the window to the top edge', () => {
    expect(pinToWindow(100, WIN)).toEqual({ drawY: 7, status: 'top' });
  });

  it('pins a value below the window to the bottom edge', () => {
    expect(pinToWindow(-100, WIN)).toEqual({ drawY: -1, status: 'bottom' });
  });

  it('treats +Infinity as the top edge and -Infinity as the bottom', () => {
    expect(pinToWindow(Infinity, WIN).status).toBe('top');
    expect(pinToWindow(-Infinity, WIN).status).toBe('bottom');
  });

  it('reports null / NaN as undefined', () => {
    expect(pinToWindow(null, WIN).status).toBe('undefined');
    expect(pinToWindow(NaN, WIN).status).toBe('undefined');
  });
});
