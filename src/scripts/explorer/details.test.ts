import { describe, it, expect } from 'vitest';
import { mapInterval, formatInterval, parentDetails, transformedDetails } from './details';
import { parentById, type Parent } from './parents';
import { composeExpr, type Coeffs } from './transform';

const P = (id: string): Parent => {
  const p = parentById(id);
  if (!p) throw new Error(`no parent ${id}`);
  return p;
};
const C = (a: number, b: number, h: number, k: number): Coeffs => ({ a, b, h, k });
const ID = C(1, 1, 0, 0);
/** Details of g for a parent + coeffs, composing the expression the same way the UI does. */
const G = (id: string, c: Coeffs) => transformedDetails(P(id), c, composeExpr(P(id).expr, c));

describe('mapInterval', () => {
  it('leaves "all" alone', () => {
    expect(mapInterval({ kind: 'all' }, -3, 7)).toEqual({ kind: 'all' });
  });

  it('translates and scales a bound', () => {
    expect(mapInterval({ kind: 'bound', value: 0, dir: 'ge', strict: false }, 2, 5))
      .toEqual({ kind: 'bound', value: 5, dir: 'ge', strict: false });
  });

  // The sign rule: dividing/multiplying an inequality by a negative REVERSES it.
  it('flips the direction of a bound under a negative multiplier', () => {
    expect(mapInterval({ kind: 'bound', value: 0, dir: 'ge', strict: true }, -1, 0))
      .toEqual({ kind: 'bound', value: 0, dir: 'le', strict: true });
  });

  it('keeps a "between" ordered under a negative multiplier', () => {
    expect(mapInterval({ kind: 'between', lo: -1, hi: 1 }, -2, 0))
      .toEqual({ kind: 'between', lo: -2, hi: 2 });
  });

  it('moves an excluded point', () => {
    expect(mapInterval({ kind: 'exclude', value: 0 }, 1, 3))
      .toEqual({ kind: 'exclude', value: 3 });
  });
});

describe('formatInterval', () => {
  it('renders each shape', () => {
    expect(formatInterval({ kind: 'all' }, 'x')).toBe('all real numbers');
    expect(formatInterval({ kind: 'bound', value: 2, dir: 'ge', strict: false }, 'x')).toBe('x ≥ 2');
    expect(formatInterval({ kind: 'bound', value: 0, dir: 'ge', strict: true }, 'x')).toBe('x > 0');
    expect(formatInterval({ kind: 'bound', value: 3, dir: 'le', strict: false }, 'y')).toBe('y ≤ 3');
    expect(formatInterval({ kind: 'exclude', value: 3 }, 'x')).toBe('x ≠ 3');
    // ASCII hyphen throughout, matching how x-intercepts render ("x = -2").
    expect(formatInterval({ kind: 'between', lo: -1, hi: 1 }, 'y')).toBe('-1 ≤ y ≤ 1');
  });
});

describe('parentDetails', () => {
  it('describes 1/x untransformed', () => {
    const d = parentDetails(P('recip'));
    expect(d.domain).toBe('x ≠ 0');
    expect(d.range).toBe('y ≠ 0');
    expect(d.verticalAsymptote).toBe('x = 0');
    expect(d.horizontalAsymptote).toBe('y = 0');
    expect(d.xIntercepts).toBe('none');
    expect(d.yIntercept).toBe('none');
  });

  it('describes x² untransformed', () => {
    const d = parentDetails(P('square'));
    expect(d.domain).toBe('all real numbers');
    expect(d.range).toBe('y ≥ 0');
    expect(d.xIntercepts).toBe('x = 0');
    expect(d.yIntercept).toBe('y = 0');
    expect(d.verticalAsymptote).toBe('—');
  });

  it('describes ln untransformed', () => {
    const d = parentDetails(P('ln'));
    expect(d.domain).toBe('x > 0');
    expect(d.range).toBe('all real numbers');
    expect(d.verticalAsymptote).toBe('x = 0');
    expect(d.xIntercepts).toBe('x = 1');
    expect(d.yIntercept).toBe('none'); // ln(0) is undefined
  });
});

describe('transformedDetails', () => {
  // The worked example from the design doc.
  it('1/x with a=2, b=1, h=3, k=1', () => {
    const d = G('recip', C(2, 1, 3, 1));
    expect(d.domain).toBe('x ≠ 3');
    expect(d.range).toBe('y ≠ 1');
    expect(d.verticalAsymptote).toBe('x = 3');
    expect(d.horizontalAsymptote).toBe('y = 1');
    expect(d.xIntercepts).toBe('x = 1');
    expect(d.yIntercept).toBe('y = 0.333');
  });

  it('reflecting √x over the y-axis flips its domain', () => {
    expect(G('sqrt', ID).domain).toBe('x ≥ 0');
    expect(G('sqrt', C(1, -1, 0, 0)).domain).toBe('x ≤ 0');
  });

  it('reflecting eˣ over the x-axis flips its range', () => {
    expect(G('exp', ID).range).toBe('y > 0');
    expect(G('exp', C(-1, 1, 0, 0)).range).toBe('y < 0');
  });

  it('shifting ln right by 2 moves its asymptote and domain', () => {
    const d = G('ln', C(1, 1, 2, 0));
    expect(d.verticalAsymptote).toBe('x = 2');
    expect(d.domain).toBe('x > 2');
  });

  it('shifting eˣ up by 3 lifts its asymptote and kills its x-intercept', () => {
    const d = G('exp', C(1, 1, 0, 3));
    expect(d.horizontalAsymptote).toBe('y = 3');
    expect(d.range).toBe('y > 3');
    expect(d.xIntercepts).toBe('none'); // the curve never reaches y = 0
  });

  it('x² shifted down 4 has two x-intercepts; shifted up 4 has none', () => {
    expect(G('square', C(1, 1, 0, -4)).xIntercepts).toBe('x = -2, x = 2');
    expect(G('square', C(1, 1, 0, 4)).xIntercepts).toBe('none');
  });

  it('reports periodic parents as infinitely many', () => {
    expect(G('sin', ID).xIntercepts).toBe('infinitely many');
  });

  it('renders every row as — when the transform collapses (a = 0 or b = 0)', () => {
    for (const c of [C(0, 1, 0, 0), C(1, 0, 0, 0)]) {
      const d = G('square', c);
      expect(d).toEqual({
        domain: '—',
        range: '—',
        xIntercepts: '—',
        yIntercept: '—',
        verticalAsymptote: '—',
        horizontalAsymptote: '—',
      });
    }
  });

  // sin's range (−1 ≤ y ≤ 1) is the only catalog interval anchored away from 0,
  // so it's the only existing case that can observe the range multiplier `c.a`.
  // Every other domain/range/asymptote in the catalog is anchored at 0, where
  // m·0 + c === c for ANY m — making the multiplier unobservable there.
  it('scales the range by a with a non-zero-anchored interval (sin)', () => {
    // g(x) = 3·sin(x) + 1 ⟹ range [3·(−1)+1, 3·1+1] = [−2, 4]
    expect(G('sin', C(3, 1, 0, 1)).range).toBe('-2 ≤ y ≤ 4');
  });

  // Pins the x-intercept back-map's `u / c.b`, distinguishing it from `u * c.b`
  // (indistinguishable when |b| = 1, which every prior test used).
  it('back-maps x-intercepts through division by b when |b| ≠ 1', () => {
    // g(x) = (2x)² − 4 = 4x² − 4 ⟹ x = ±1
    expect(G('square', C(1, 2, 0, -4)).xIntercepts).toBe('x = -1, x = 1');
  });

  // Pins the domain map's `1 / c.b` using a synthetic parent whose domain/VA are
  // anchored away from 0 — the real catalog has no such parent with |b| ≠ 1 in
  // its existing tests, so a `b` vs `1/b` bug would go undetected otherwise.
  it('maps a non-zero-anchored domain and vertical asymptote through 1/b, not b', () => {
    const synthetic: Parent = {
      ...P('ln'),
      props: {
        ...P('ln').props,
        domain: { kind: 'bound', value: 2, dir: 'ge', strict: false },
        verticalAsymptote: 2,
      },
    };
    const c = C(1, 2, 1, 0);
    // domain u ≥ 2 and VA at u = 2, under b = 2, h = 1 ⟹ x = u/2 + 1 ⟹ x ≥ 2
    const d = transformedDetails(synthetic, c, composeExpr(synthetic.expr, c));
    expect(d.domain).toBe('x ≥ 2');
    expect(d.verticalAsymptote).toBe('x = 2');
  });
});
