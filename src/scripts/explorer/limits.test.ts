import { describe, it, expect } from 'vitest';
import { findVerticalAsymptotes, classifyEndBehavior, classifyOneSided } from './limits';
import type { Window2D } from '@/scripts/graphing/math';

const WIN: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
const WIN_SYM: Window2D = { xMin: -4, xMax: 4, yMin: -8, yMax: 8 };

describe('findVerticalAsymptotes', () => {
  it('finds the even pole of 1/x² at x≈0 (both sides →+∞)', () => {
    const a = findVerticalAsymptotes('1/x^2', WIN);
    expect(a).toHaveLength(1);
    expect(a[0].x).toBeCloseTo(0, 2);
    expect(a[0].leftSign).toBe(1);
    expect(a[0].rightSign).toBe(1);
  });

  it('finds the odd pole of 1/x at x≈0 (left →−∞, right →+∞)', () => {
    const a = findVerticalAsymptotes('1/x', WIN_SYM);
    expect(a).toHaveLength(1);
    expect(a[0].x).toBeCloseTo(0, 2);
    expect(a[0].leftSign).toBe(-1);
    expect(a[0].rightSign).toBe(1);
  });

  it('finds both poles of tan(x) in the window with left→+∞, right→−∞', () => {
    const a = findVerticalAsymptotes('tan(x)', WIN_SYM).sort((p, q) => p.x - q.x);
    expect(a).toHaveLength(2);
    expect(a[0].x).toBeCloseTo(-Math.PI / 2, 1);
    expect(a[1].x).toBeCloseTo(Math.PI / 2, 1);
    for (const p of a) {
      expect(p.leftSign).toBe(1);
      expect(p.rightSign).toBe(-1);
    }
  });

  it('finds no asymptote for a polynomial (x²)', () => {
    expect(findVerticalAsymptotes('x^2', WIN)).toEqual([]);
  });

  it('rejects the removable discontinuity of sin(x)/x (not a real wall)', () => {
    expect(findVerticalAsymptotes('sin(x)/x', WIN_SYM)).toEqual([]);
  });
});

describe('classifyEndBehavior', () => {
  it('sees 1/x² decay to 0 from above at both ends', () => {
    expect(classifyEndBehavior('1/x^2', 'pos')).toEqual({ kind: 'finite', value: 0, approach: '+' });
    expect(classifyEndBehavior('1/x^2', 'neg')).toEqual({ kind: 'finite', value: 0, approach: '+' });
  });

  it('sees x³ diverge to +∞ on the right and −∞ on the left', () => {
    expect(classifyEndBehavior('x^3', 'pos').kind).toBe('posInf');
    expect(classifyEndBehavior('x^3', 'neg').kind).toBe('negInf');
  });

  it('sees x² diverge to +∞ on both ends', () => {
    expect(classifyEndBehavior('x^2', 'pos').kind).toBe('posInf');
    expect(classifyEndBehavior('x^2', 'neg').kind).toBe('posInf');
  });

  it('reports an oscillating tail (sin x) as unknown', () => {
    expect(classifyEndBehavior('sin(x)', 'pos').kind).toBe('unknown');
  });
});

describe('classifyOneSided', () => {
  it('labels 1/x at 0 as +∞ from the right and −∞ from the left', () => {
    expect(classifyOneSided('1/x', 0, '+').kind).toBe('posInf');
    expect(classifyOneSided('1/x', 0, '-').kind).toBe('negInf');
  });
});
