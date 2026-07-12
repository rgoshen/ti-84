import { describe, it, expect } from 'vitest';
import { PARENTS, parentById, defaultParent } from './parents';
import { evalAt } from '@/scripts/graphing/math';

describe('parent catalog', () => {
  it('exposes the eleven toolkit parents in teaching order with unique ids', () => {
    const ids = PARENTS.map((p) => p.id);
    expect(ids).toEqual([
      'identity', 'square', 'sqrt', 'cube', 'cbrt',
      'recip', 'abs', 'exp', 'ln', 'sin', 'cos',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every parent has a label and a name for the dropdown', () => {
    for (const p of PARENTS) {
      expect(p.label.length, p.id).toBeGreaterThan(0);
      expect(p.name.length, p.id).toBeGreaterThan(0);
    }
  });

  // Guards the x^(1/3) trap: it returns a COMPLEX number for negative x, which
  // would silently erase the left half of the cube-root curve.
  it('cube root uses cbrt and is real on the negative branch', () => {
    expect(parentById('cbrt')?.expr).toBe('cbrt(x)');
    expect(evalAt('cbrt(x)', -8)).toBe(-2);
  });

  // Guards the ln spelling: mathjs `log` is base-e, and `ln` does not exist.
  it('natural log uses log (base e)', () => {
    expect(parentById('ln')?.expr).toBe('log(x)');
    expect(evalAt('log(x)', Math.E)).toBeCloseTo(1, 10);
  });

  it('defaults to x², not the first entry', () => {
    expect(defaultParent().id).toBe('square');
    expect(PARENTS[0].id).toBe('identity');
  });

  it('every parent expression evaluates to a finite number at a sensible x', () => {
    for (const p of PARENTS) {
      const x = p.id === 'sqrt' ? 4 : p.id === 'recip' ? 2 : p.id === 'ln' ? Math.E : 1;
      const v = evalAt(p.expr, x);
      expect(Number.isFinite(v), `${p.id} @ x=${x}`).toBe(true);
    }
  });

  it('every parent has a valid default window (max > min on both axes)', () => {
    for (const p of PARENTS) {
      expect(p.window.xMax, p.id).toBeGreaterThan(p.window.xMin);
      expect(p.window.yMax, p.id).toBeGreaterThan(p.window.yMin);
    }
  });

  it('parentById returns the parent or undefined', () => {
    expect(parentById('square')?.expr).toBe('x^2');
    expect(parentById('nope')).toBeUndefined();
  });
});
