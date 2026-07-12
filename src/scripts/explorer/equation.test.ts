import { describe, it, expect } from 'vitest';
import { concreteEquation, customEquation } from './equation';
import { innerArgument, type Coeffs } from './transform';
import { PARENTS, parentById, type Parent } from './parents';

const P = (id: string): Parent => {
  const p = parentById(id);
  if (!p) throw new Error(`no parent ${id}`);
  return p;
};
const C = (a: number, b: number, h: number, k: number): Coeffs => ({ a, b, h, k });
const ID = C(1, 1, 0, 0);

describe('innerArgument', () => {
  it('renders b(x − h) as readable text', () => {
    expect(innerArgument(ID)).toBe('x');
    expect(innerArgument(C(1, 1, 3, 0))).toBe('x − 3');
    expect(innerArgument(C(1, 1, -3, 0))).toBe('x + 3');
    expect(innerArgument(C(1, -1, 0, 0))).toBe('−x');
    expect(innerArgument(C(1, 2, 0, 0))).toBe('2x');
    expect(innerArgument(C(1, 2, 1, 0))).toBe('2(x − 1)');
    expect(innerArgument(C(1, -1, 3, 0))).toBe('−(x − 3)');
  });
});

describe('concreteEquation', () => {
  // The case that prompted this feature: 'g(x) = 2.1·f(x)' tells a student nothing
  // unless they already know what f is.
  it('shows the real equation for a bare vertical stretch', () => {
    expect(concreteEquation(P('square'), C(2.1, 1, 0, 0))).toBe('g(x) = 2.1x²');
  });

  it('renders every parent at a = 2, b = 1, h = 3, k = 1', () => {
    const c = C(2, 1, 3, 1);
    const got = Object.fromEntries(PARENTS.map((p) => [p.id, concreteEquation(p, c)]));
    expect(got).toEqual({
      identity: 'g(x) = 2(x − 3) + 1',
      square: 'g(x) = 2(x − 3)² + 1',
      sqrt: 'g(x) = 2√(x − 3) + 1',
      cube: 'g(x) = 2(x − 3)³ + 1',
      cbrt: 'g(x) = 2∛(x − 3) + 1',
      recip: 'g(x) = 2/(x − 3) + 1', // renderScaled — NOT '2·1/(x − 3) + 1'
      abs: 'g(x) = 2|x − 3| + 1',
      exp: 'g(x) = 2e^(x − 3) + 1',
      ln: 'g(x) = 2ln(x − 3) + 1',
      sin: 'g(x) = 2sin(x − 3) + 1',
      cos: 'g(x) = 2cos(x − 3) + 1',
    });
  });

  // THE precedence guard. '2x − 3' is a DIFFERENT function from '2(x − 3)'.
  it('never lets a coefficient bind into a compound argument', () => {
    expect(concreteEquation(P('identity'), C(2, 1, 3, 0))).toBe('g(x) = 2(x − 3)');
    expect(concreteEquation(P('identity'), C(2, 1, 3, 0))).not.toContain('2x − 3');
  });

  it('at the identity, the equation is just the parent itself', () => {
    expect(concreteEquation(P('square'), ID)).toBe('g(x) = x²');
    expect(concreteEquation(P('ln'), ID)).toBe('g(x) = ln x');
  });

  it('a = −1 renders as a leading minus, not "−1·"', () => {
    expect(concreteEquation(P('square'), C(-1, 1, 3, 1))).toBe('g(x) = −(x − 3)² + 1');
  });

  it('a negative k subtracts', () => {
    expect(concreteEquation(P('square'), C(1, 1, 0, -4))).toBe('g(x) = x² − 4');
  });

  // A collapsed transform still HAS an equation — it is a constant. Say so, rather
  // than leaving the readout blank.
  it('a = 0 flattens onto the line y = k', () => {
    expect(concreteEquation(P('square'), C(0, 1, 0, 0))).toBe('g(x) = 0');
    expect(concreteEquation(P('ln'), C(0, 1, 0, 3))).toBe('g(x) = 3');
  });

  it('b = 0 collapses to the constant a·f(0) + k', () => {
    // f(0) = 0 for x², so g = 2·0 + 5 = 5.
    expect(concreteEquation(P('square'), C(2, 0, 0, 5))).toBe('g(x) = 5');
  });

  // ...but only where f(0) exists. ln(0) and 1/0 are undefined, so there is no
  // equation to write and the step list's "the graph collapses" is the honest answer.
  it('returns null when b = 0 and the parent is undefined at 0', () => {
    expect(concreteEquation(P('ln'), C(1, 0, 0, 0))).toBeNull();
    expect(concreteEquation(P('recip'), C(1, 0, 0, 0))).toBeNull();
  });
});

describe('customEquation', () => {
  // A typed f(x) has no notation template, so mathjs simplifies the composed machine
  // string into something readable. Still a real equation — never 'f(x)'.
  it('writes out a custom function instead of falling back to f(x)', () => {
    const eq = customEquation('(2) * (((1) * (x - (3)))^4) + (1)');
    expect(eq).toBe('g(x) = 2·(x − 3)^4 + 1');
    expect(eq).not.toContain('f(x)');
  });

  // Typing 'x^4 + 2x' gives mathjs an IMPLICIT product, which it prints spaced out as
  // '2 x'. Close it up. (An explicit '2*x' prints as '2 * x' and becomes '2·x', which
  // is already fine — this rule is only for the implicit form.)
  it('tightens mathjs spacing on implicit multiplication', () => {
    expect(customEquation('(1) * ((x^4 + 2x)) + (0)')).toBe('g(x) = x^4 + 2x');
    expect(customEquation('(1) * ((x^4 + 2*x)) + (0)')).toBe('g(x) = x^4 + 2·x');
  });

  it('returns null rather than showing a machine string it cannot simplify', () => {
    expect(customEquation('')).toBeNull();
  });
});
