import { describe, expect, it } from 'vitest';

import { analyzeFunction, functionAnalysisFacts } from './analysis';

const WINDOW = { xMin: -4, xMax: 4, yMin: -5, yMax: 8 };

describe('graphing function analysis', () => {
  it('uses exact curated-parent details for a quadratic', () => {
    const analysis = analyzeFunction('x^2', WINDOW);

    expect(analysis).toEqual({
      domain: { kind: 'exact', value: 'all real numbers' },
      range: { kind: 'exact', value: 'y ≥ 0' },
      xIntercepts: { kind: 'exact', value: 'x = 0' },
      yIntercept: { kind: 'exact', value: 'y = 0' },
      verticalAsymptotes: { kind: 'not-applicable' },
      horizontalAsymptotes: { kind: 'not-applicable' },
    });

    expect(functionAnalysisFacts(analysis)).toEqual([
      { label: 'Domain', value: 'all real numbers' },
      { label: 'Range', value: 'y ≥ 0' },
      { label: 'x-intercepts', value: 'x = 0' },
      { label: 'y-intercept', value: 'y = 0' },
    ]);
  });

  it('omits proven-missing intercepts while retaining reciprocal asymptotes', () => {
    const analysis = analyzeFunction('1/x', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'exact', value: 'x ≠ 0' });
    expect(analysis.range).toEqual({ kind: 'exact', value: 'y ≠ 0' });
    expect(analysis.xIntercepts).toEqual({ kind: 'not-applicable' });
    expect(analysis.yIntercept).toEqual({ kind: 'not-applicable' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'exact', value: 'x = 0' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'exact', value: 'y = 0' });
  });

  it('analyzes an expanded or factored quadratic exactly', () => {
    const analysis = analyzeFunction('(x - 2)^2 - 4', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'exact', value: 'all real numbers' });
    expect(analysis.range).toEqual({ kind: 'exact', value: 'y ≥ -4' });
    expect(analysis.xIntercepts).toEqual({ kind: 'exact', value: 'x = 0, x = 4' });
    expect(analysis.yIntercept).toEqual({ kind: 'exact', value: 'y = 0' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'not-applicable' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'not-applicable' });
  });

  it('clearly labels visible-window approximations for an unsupported rational form', () => {
    const analysis = analyzeFunction('1/(x - 2)', WINDOW);
    const facts = functionAnalysisFacts(analysis);

    expect(analysis.domain.kind).toBe('approximate');
    expect(analysis.range.kind).toBe('approximate');
    expect(analysis.xIntercepts).toEqual({ kind: 'not-determined' });
    expect(analysis.yIntercept).toEqual({ kind: 'approximate', value: 'y = -0.5' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'approximate', value: 'x = 2' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'approximate', value: 'y = 0' });
    expect(facts.find((fact) => fact.label === 'Domain')?.value).toMatch(
      /^Approx\..*visible window$/,
    );
    expect(facts).toContainEqual({ label: 'x-intercepts', value: 'Not determined' });
  });

  it('uses deterministic sampling for a valid expression outside exact support', () => {
    const analysis = analyzeFunction('sin(x^2)', WINDOW);

    expect(analysis.domain).toEqual({
      kind: 'approximate',
      value: 'defined across visible window',
    });
    expect(analysis.range.kind).toBe('approximate');
    expect(analysis.xIntercepts.kind).toBe('approximate');
    if (analysis.xIntercepts.kind !== 'approximate') {
      throw new Error('Expected approximate x-intercepts');
    }
    expect(analysis.xIntercepts.value).toContain('x = 0');
    expect(analysis.yIntercept).toEqual({ kind: 'approximate', value: 'y = 0' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'not-determined' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'not-determined' });
  });
});
