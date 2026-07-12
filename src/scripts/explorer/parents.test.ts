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

describe('parent properties', () => {
  it('every parent declares props', () => {
    for (const p of PARENTS) {
      expect(p.props, p.id).toBeDefined();
      expect(p.props.domain.kind, p.id).toBeTruthy();
      expect(p.props.range.kind, p.id).toBeTruthy();
    }
  });

  // The strongest invariant we have: solve() must actually be f's inverse.
  // For every u it returns, f(u) must equal the c we asked about.
  it('solve() returns genuine solutions of f(u) = c', () => {
    const probes = [-2, -0.5, 0, 0.5, 1, 2];
    for (const p of PARENTS) {
      for (const c of probes) {
        const sol = p.props.solve(c);
        if (sol === 'infinite') continue;
        for (const u of sol) {
          const back = evalAt(p.expr, u);
          expect(back, `${p.id}: f(${u}) should be ${c}`).not.toBeNull();
          expect(back as number, `${p.id}: f(solve(${c})) round-trip`).toBeCloseTo(c, 6);
        }
      }
    }
  });

  // The round-trip test above only walks the solutions solve() DOES return —
  // if a solve() regressed to unconditionally return [], that loop would just
  // never execute and the round-trip test would still pass. This guards against
  // that: for a probe genuinely inside each parent's range, solve() must be
  // reachable — 'infinite', or a non-empty array.
  it("solve() is reachable: returns a non-empty result for a probe in the parent's range", () => {
    const reachable: { id: string; c: number }[] = [
      { id: 'identity', c: 1 }, // range all: any c
      { id: 'square', c: 4 }, // range y ≥ 0: u = ±2
      { id: 'sqrt', c: 2 }, // range y ≥ 0: u = 4
      { id: 'cube', c: 8 }, // range all: u = 2
      { id: 'cbrt', c: 2 }, // range all: u = 8
      { id: 'recip', c: 0.5 }, // range y ≠ 0: u = 2
      { id: 'abs', c: 3 }, // range y ≥ 0: u = ±3
      { id: 'exp', c: 1 }, // range y > 0: u = 0
      { id: 'ln', c: 0 }, // range all: u = 1
      { id: 'sin', c: 0 }, // range [-1, 1]: infinite
      { id: 'cos', c: 0 }, // range [-1, 1]: infinite
    ];
    expect(reachable.map((r) => r.id)).toEqual(PARENTS.map((p) => p.id));
    for (const { id, c } of reachable) {
      const p = parentById(id)!;
      const sol = p.props.solve(c);
      if (sol === 'infinite') {
        expect(sol, `${id}: solve(${c})`).toBe('infinite');
      } else {
        expect(sol.length, `${id}: solve(${c}) should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it('declares the asymptotes of the two parents that have them', () => {
    expect(parentById('recip')?.props.verticalAsymptote).toBe(0);
    expect(parentById('recip')?.props.horizontalAsymptote).toBe(0);
    expect(parentById('exp')?.props.horizontalAsymptote).toBe(0);
    expect(parentById('exp')?.props.verticalAsymptote).toBeUndefined();
    expect(parentById('ln')?.props.verticalAsymptote).toBe(0);
    expect(parentById('ln')?.props.horizontalAsymptote).toBeUndefined();
    expect(parentById('square')?.props.verticalAsymptote).toBeUndefined();
  });

  it('restricts the domains of sqrt, ln and 1/x only', () => {
    expect(parentById('sqrt')?.props.domain).toEqual({ kind: 'bound', value: 0, dir: 'ge', strict: false });
    expect(parentById('ln')?.props.domain).toEqual({ kind: 'bound', value: 0, dir: 'ge', strict: true });
    expect(parentById('recip')?.props.domain).toEqual({ kind: 'exclude', value: 0 });
    expect(parentById('square')?.props.domain).toEqual({ kind: 'all' });
  });

  it('sin and cos have no finite solution list', () => {
    expect(parentById('sin')?.props.solve(0)).toBe('infinite');
    expect(parentById('cos')?.props.solve(0.5)).toBe('infinite');
    expect(parentById('sin')?.props.solve(2)).toEqual([]); // |c| > 1: unreachable
  });
});

describe('parent display templates', () => {
  // The catalog-wide invariant: a parent's notation applied to a bare `x` IS the
  // label it already advertises in the dropdown. Catches any future parent whose
  // template disagrees with its own label.
  it('render("x") reproduces the label, for every parent', () => {
    for (const p of PARENTS) {
      expect(p.render('x'), p.id).toBe(p.label);
    }
  });

  it('renders each parent around a compound argument', () => {
    const got = Object.fromEntries(PARENTS.map((p) => [p.id, p.render('x − 3')]));
    expect(got).toEqual({
      identity: '(x − 3)',
      square: '(x − 3)²',
      sqrt: '√(x − 3)',
      cube: '(x − 3)³',
      cbrt: '∛(x − 3)',
      recip: '1/(x − 3)',
      abs: '|x − 3|',
      exp: 'e^(x − 3)',
      ln: 'ln(x − 3)',
      sin: 'sin(x − 3)',
      cos: 'cos(x − 3)',
    });
  });

  // ATOMICITY. Every template must return a string safe to prefix with a coefficient.
  // `identity` must parenthesise itself — returning 'x − 3' would let the caller build
  // '2x − 3', a DIFFERENT function from 2(x − 3). Plausible-but-wrong is worse than none.
  it('identity parenthesises a compound argument so a coefficient cannot bind wrongly', () => {
    expect(parentById('identity')?.render('x − 3')).toBe('(x − 3)');
    expect(parentById('identity')?.render('x')).toBe('x');
  });

  // Only the reciprocal overrides scaling: '2·1/(x − 3)' is not how anyone writes it.
  it('the reciprocal folds a coefficient into its numerator', () => {
    expect(parentById('recip')?.renderScaled?.('2', 'x − 3')).toBe('2/(x − 3)');
    expect(parentById('square')?.renderScaled).toBeUndefined();
  });
});
