import { describe, it, expect } from 'vitest';
import { PARENTS, parentById } from './parents';
import { evalAt } from '@/scripts/graphing/math';

describe('parent catalog', () => {
  it('exposes the eight toolkit parents with unique ids', () => {
    const ids = PARENTS.map((p) => p.id);
    expect(ids).toEqual(['square', 'cube', 'abs', 'sqrt', 'recip', 'sin', 'cos', 'exp']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every parent expression evaluates to a finite number at a sensible x', () => {
    for (const p of PARENTS) {
      const x = p.id === 'sqrt' ? 4 : p.id === 'recip' ? 2 : 1;
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
