import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { composeExpr, type Coeffs } from './transform';

/** Reference g(x) = a·f(b(x − h)) + k evaluated directly. */
const gRef = (base: string, c: Coeffs, x: number): number =>
  c.a * (evaluate(base, { x: c.b * (x - c.h) }) as number) + c.k;

const SAMPLES = [-3, -1.5, -0.4, 0.7, 2, 3.5];

describe('composeExpr — numeric equivalence to a·f(b(x−h))+k', () => {
  const cases: Array<[string, string, Coeffs]> = [
    ['vertical shift', 'x^2', { a: 1, b: 1, h: 0, k: 3 }],
    ['horizontal shift', 'x^2', { a: 1, b: 1, h: 2, k: 0 }],
    ['vertical stretch', 'x^2', { a: 3, b: 1, h: 0, k: 0 }],
    ['horizontal compression', 'x^2', { a: 1, b: 2, h: 0, k: 0 }],
    ['x-axis reflection', 'x^2', { a: -1, b: 1, h: 0, k: 0 }],
    ['y-axis reflection', 'sqrt(x)', { a: 1, b: -1, h: 0, k: 0 }],
    ['combined', 'sin(x)', { a: 2, b: 0.5, h: 1, k: -1 }],
  ];
  for (const [name, base, c] of cases) {
    it(name, () => {
      const expr = composeExpr(base, c);
      for (const x of SAMPLES) {
        const got = evaluate(expr, { x }) as number;
        const want = gRef(base, c, x);
        if (Number.isFinite(want)) expect(got).toBeCloseTo(want, 6);
      }
    });
  }

  it('substitutes safely for expressions whose function names contain no bare x', () => {
    const expr = composeExpr('exp(x)', { a: 1, b: 1, h: 1, k: 0 });
    expect(evaluate(expr, { x: 1 }) as number).toBeCloseTo(Math.exp(0), 6);
  });
});
