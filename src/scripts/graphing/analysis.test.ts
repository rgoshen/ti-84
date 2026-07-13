import { describe, expect, it } from 'vitest';

import { analyzeFunction, functionAnalysisFacts } from './analysis';

const WINDOW = { xMin: -4, xMax: 4, yMin: -5, yMax: 8 };

describe('graphing function analysis', () => {
  it('uses exact curated-parent details for a quadratic', () => {
    const analysis = analyzeFunction('x^2', WINDOW);

    expect(analysis).toEqual({
      domain: { kind: 'exact', value: '(-∞, ∞)' },
      range: { kind: 'exact', value: '[0, ∞)' },
      xIntercepts: { kind: 'exact', value: 'x = 0' },
      yIntercept: { kind: 'exact', value: 'y = 0' },
      verticalAsymptotes: { kind: 'not-applicable' },
      horizontalAsymptotes: { kind: 'not-applicable' },
    });

    expect(functionAnalysisFacts(analysis)).toEqual([
      { label: 'Domain', value: '(-∞, ∞)' },
      { label: 'Range', value: '[0, ∞)' },
      { label: 'x-intercepts', value: 'x = 0' },
      { label: 'y-intercept', value: 'y = 0' },
    ]);
  });

  it('omits proven-missing intercepts while retaining reciprocal asymptotes', () => {
    const analysis = analyzeFunction('1/x', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'exact', value: '(-∞, 0) ∪ (0, ∞)' });
    expect(analysis.range).toEqual({ kind: 'exact', value: '(-∞, 0) ∪ (0, ∞)' });
    expect(analysis.xIntercepts).toEqual({ kind: 'not-applicable' });
    expect(analysis.yIntercept).toEqual({ kind: 'not-applicable' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'exact', value: 'x = 0' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'exact', value: 'y = 0' });
  });

  it('analyzes an expanded or factored quadratic exactly', () => {
    const analysis = analyzeFunction('(x - 2)^2 - 4', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'exact', value: '(-∞, ∞)' });
    expect(analysis.range).toEqual({ kind: 'exact', value: '[-4, ∞)' });
    expect(analysis.xIntercepts).toEqual({ kind: 'exact', value: 'x = 0, x = 4' });
    expect(analysis.yIntercept).toEqual({ kind: 'exact', value: 'y = 0' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'not-applicable' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'not-applicable' });
  });

  it('labels polynomial values approximate when display rounding loses exactness', () => {
    const analysis = analyzeFunction('x^2 - 2', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'exact', value: '(-∞, ∞)' });
    expect(analysis.range).toEqual({ kind: 'exact', value: '[-2, ∞)' });
    expect(analysis.xIntercepts).toEqual({
      kind: 'approximate',
      value: 'x = -1.414, x = 1.414',
    });
    expect(functionAnalysisFacts(analysis)).toContainEqual({
      label: 'x-intercepts',
      value: 'Approx. x = -1.414, x = 1.414',
    });
  });

  it('does not erase a small nonzero polynomial coefficient', () => {
    const analysis = analyzeFunction('1e-12*x', WINDOW);

    expect(analysis.range).toEqual({ kind: 'exact', value: '(-∞, ∞)' });
    expect(analysis.xIntercepts).toEqual({ kind: 'exact', value: 'x = 0' });
  });

  it('uses singleton and bounded interval notation where appropriate', () => {
    expect(analyzeFunction('3', WINDOW).range).toEqual({ kind: 'exact', value: '{3}' });
    expect(analyzeFunction('sin(x)', WINDOW).range).toEqual({
      kind: 'exact',
      value: '[-1, 1]',
    });
  });

  it('clearly labels visible-window approximations for an unsupported rational form', () => {
    const analysis = analyzeFunction('1/(x - 2)', WINDOW);
    const facts = functionAnalysisFacts(analysis);

    expect(analysis.domain.kind).toBe('approximate');
    expect(analysis.range.kind).toBe('approximate');
    expect(analysis.domain).toEqual({
      kind: 'approximate',
      value: '[-4, 2) ∪ (2, 4] in visible window',
    });
    expect(analysis.xIntercepts).toEqual({ kind: 'not-determined' });
    expect(analysis.yIntercept).toEqual({
      kind: 'approximate',
      value: 'y = -0.5 in visible window',
    });
    expect(analysis.verticalAsymptotes).toEqual({
      kind: 'approximate',
      value: 'x = 2 in visible window',
    });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'approximate', value: 'y = 0' });
    expect(facts.find((fact) => fact.label === 'Domain')?.value).toMatch(
      /^Approx\..*visible window$/,
    );
    expect(facts).toContainEqual({ label: 'x-intercepts', value: 'Not determined' });
  });

  it('does not mistake an off-grid discontinuity for an x-intercept', () => {
    const analysis = analyzeFunction('1/(x - 2.0013)', WINDOW);

    expect(analysis.xIntercepts).toEqual({ kind: 'not-determined' });
    expect(analysis.verticalAsymptotes).toMatchObject({ kind: 'approximate' });
  });

  it('uses deterministic sampling for a valid expression outside exact support', () => {
    const analysis = analyzeFunction('sin(x^2)', WINDOW);

    expect(analysis.domain).toEqual({
      kind: 'approximate',
      value: '[-4, 4] in visible window',
    });
    expect(analysis.range).toEqual({
      kind: 'approximate',
      value: '[-1, 1] in visible window',
    });
    expect(analysis.xIntercepts.kind).toBe('approximate');
    if (analysis.xIntercepts.kind !== 'approximate') {
      throw new Error('Expected approximate x-intercepts');
    }
    expect(analysis.xIntercepts.value).toContain('x = 0');
    expect(analysis.yIntercept).toEqual({
      kind: 'approximate',
      value: 'y = 0 in visible window',
    });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'not-determined' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'not-determined' });
  });
});
