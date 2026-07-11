import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { composeExpr, describeTransform, type Coeffs, EPS } from './transform';

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

const IDENT = { a: 1, b: 1, h: 0, k: 0 };

describe('describeTransform — narration', () => {
  it('identity names the parent and lists no transformations', () => {
    const r = describeTransform(IDENT, 'x²');
    expect(r.equation).toBe('g(x) = f(x)');
    expect(r.steps).toEqual(['This is the parent function f(x) = x² — move a slider to transform it.']);
  });

  it('does not report a phantom stretch at a floating-point identity [G2]', () => {
    const r = describeTransform({ ...IDENT, a: 1 - EPS / 2 }, 'x²');
    expect(r.steps.some((s) => /stretch|compression/.test(s))).toBe(false);
  });

  it('vertical stretch and shift', () => {
    const r = describeTransform({ a: 3, b: 1, h: 0, k: 2 }, 'x²');
    expect(r.steps).toEqual(['Vertical stretch by factor 3', 'Shifted up 2']);
  });

  it('x-axis reflection (|a|=1, no stretch)', () => {
    expect(describeTransform({ a: -1, b: 1, h: 0, k: 0 }, 'x²').steps).toEqual(['Reflected over the x-axis']);
  });

  it('horizontal compression vs stretch use the |b| convention', () => {
    expect(describeTransform({ a: 1, b: 2, h: 0, k: 0 }, 'x²').steps).toEqual(['Horizontal compression by factor 2']);
    expect(describeTransform({ a: 1, b: 0.5, h: 0, k: 0 }, 'x²').steps).toEqual(['Horizontal stretch by factor 2']);
  });

  it('y-axis reflection and directional shifts', () => {
    expect(describeTransform({ a: 1, b: -1, h: 0, k: 0 }, 'x²').steps).toEqual(['Reflected over the y-axis']);
    expect(describeTransform({ a: 1, b: 1, h: 2, k: 0 }, 'x²').steps).toEqual(['Shifted right 2']);
    expect(describeTransform({ a: 1, b: 1, h: -2, k: 0 }, 'x²').steps).toEqual(['Shifted left 2']);
    expect(describeTransform({ a: 1, b: 1, h: 0, k: -3 }, 'x²').steps).toEqual(['Shifted down 3']);
  });

  it('orders horizontal (inside-out) before vertical for combined transforms', () => {
    const r = describeTransform({ a: 3, b: 2, h: 1, k: -4 }, 'x²');
    expect(r.steps).toEqual([
      'Horizontal compression by factor 2',
      'Shifted right 1',
      'Vertical stretch by factor 3',
      'Shifted down 4',
    ]);
    expect(r.equation).toBe('g(x) = 3·f(2(x − 1)) − 4');
  });

  it('degenerate b=0 and a=0 replace the step list with an explanation [G3]', () => {
    expect(describeTransform({ a: 1, b: 0, h: 0, k: 0 }, 'x²').steps).toEqual([
      'b = 0: the graph collapses to a horizontal line.',
    ]);
    expect(describeTransform({ a: 0, b: 1, h: 0, k: 0 }, 'x²').steps).toEqual([
      'a = 0: the graph flattens to the line y = k.',
    ]);
  });
});
