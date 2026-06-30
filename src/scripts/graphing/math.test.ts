import { describe, it, expect } from 'vitest';
import { evalAt, integerXs, bisect, gridlineCrossings, type Window2D } from './math';

const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-4;
const WIN: Window2D = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };

describe('evalAt', () => {
  it('evaluates the expression at the given x', () => {
    expect(evalAt('2x^2', 3)).toBe(18);
  });

  it('returns null for non-finite results', () => {
    expect(evalAt('1/0', 0)).toBeNull();
  });

  it('returns null for invalid expressions', () => {
    expect(evalAt('@@@', 0)).toBeNull();
  });
});

describe('integerXs', () => {
  it('lists every integer in the window, inclusive', () => {
    expect(integerXs({ xMin: -2, xMax: 2, yMin: -5, yMax: 5 })).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe('bisect', () => {
  it('finds x where f(x) = k between two bracketing points', () => {
    // 2x^2 = 1  ->  x = sqrt(1/2) ≈ 0.7071 on [0, 1]
    const root = bisect('2x^2', 1, 0, 1);
    expect(root).not.toBeNull();
    expect(Math.abs((root as number) - Math.SQRT1_2)).toBeLessThan(1e-6);
  });
});

describe('gridlineCrossings', () => {
  it('marks only whole-number gridline crossings (integer x OR integer y)', () => {
    const pts = gridlineCrossings('2x^2', WIN);
    expect(pts.length).toBeGreaterThan(0);
    for (const { x, y } of pts) {
      expect(isInt(x) || isInt(y)).toBe(true);
    }
  });

  it('never marks a point with both coordinates fractional (the (-0.5, 0.5) exclusion)', () => {
    const pts = gridlineCrossings('2x^2', WIN);
    expect(pts.some((p) => !isInt(p.x) && !isInt(p.y))).toBe(false);
  });

  it('places every crossing exactly on the curve', () => {
    for (const { x, y } of gridlineCrossings('2x^2', WIN)) {
      expect(Math.abs((evalAt('2x^2', x) as number) - y)).toBeLessThan(1e-3);
    }
  });

  it('includes integer-y crossings the integer-x-only logic missed', () => {
    // 2x^2 = 1 at x = ±0.707: integer y, non-integer x
    const hit = gridlineCrossings('2x^2', WIN).find(
      (p) => Math.abs(p.y - 1) < 1e-6 && Math.abs(Math.abs(p.x) - Math.SQRT1_2) < 1e-3,
    );
    expect(hit).toBeDefined();
  });

  it('keeps every crossing inside the window', () => {
    for (const { x, y } of gridlineCrossings('2x^2', WIN)) {
      expect(x).toBeGreaterThanOrEqual(WIN.xMin - 1e-6);
      expect(x).toBeLessThanOrEqual(WIN.xMax + 1e-6);
      expect(y).toBeGreaterThanOrEqual(WIN.yMin - 1e-6);
      expect(y).toBeLessThanOrEqual(WIN.yMax + 1e-6);
    }
  });

  it('de-duplicates points found by both the integer-x and integer-y passes', () => {
    // (1, 2) is both integer-x (x=1) and an integer-y crossing (y=2); it must appear once.
    const pts = gridlineCrossings('2x^2', WIN);
    const at12 = pts.filter((p) => Math.abs(p.x - 1) < 1e-4 && Math.abs(p.y - 2) < 1e-4);
    expect(at12.length).toBe(1);
  });
});
