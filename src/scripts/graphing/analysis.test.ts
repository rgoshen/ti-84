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

  it('analyzes a shifted reciprocal exactly as a global function', () => {
    const analysis = analyzeFunction('1/(x - 2)', WINDOW);
    const facts = functionAnalysisFacts(analysis);

    expect(analysis.domain).toEqual({
      kind: 'exact',
      value: '(-∞, 2) ∪ (2, ∞)',
    });
    expect(analysis.range).toEqual({
      kind: 'exact',
      value: '(-∞, 0) ∪ (0, ∞)',
    });
    expect(analysis.xIntercepts).toEqual({ kind: 'not-applicable' });
    expect(analysis.yIntercept).toEqual({ kind: 'exact', value: 'y = -0.5' });
    expect(analysis.verticalAsymptotes).toEqual({ kind: 'exact', value: 'x = 2' });
    expect(analysis.horizontalAsymptotes).toEqual({ kind: 'exact', value: 'y = 0' });
    expect(facts.some((fact) => fact.label === 'x-intercepts')).toBe(false);
  });

  it('uses the reciprocal power parity for global range', () => {
    expect(analyzeFunction('1/x^2', WINDOW)).toEqual({
      domain: { kind: 'exact', value: '(-∞, 0) ∪ (0, ∞)' },
      range: { kind: 'exact', value: '(0, ∞)' },
      xIntercepts: { kind: 'not-applicable' },
      yIntercept: { kind: 'not-applicable' },
      verticalAsymptotes: { kind: 'exact', value: 'x = 0' },
      horizontalAsymptotes: { kind: 'exact', value: 'y = 0' },
    });

    expect(analyzeFunction('-2/(x + 1)^2', WINDOW).range).toEqual({
      kind: 'exact',
      value: '(-∞, 0)',
    });
    expect(analyzeFunction('1/(2*x - 4)^3', WINDOW).range).toEqual({
      kind: 'exact',
      value: '(-∞, 0) ∪ (0, ∞)',
    });
  });

  it('does not mistake a rounded pole for an x-intercept', () => {
    const analysis = analyzeFunction('1/(x - 2.0013)', WINDOW);

    expect(analysis.xIntercepts).toEqual({ kind: 'not-applicable' });
    expect(analysis.verticalAsymptotes).toMatchObject({ kind: 'approximate' });
  });

  it('uses deterministic sampling for a valid expression outside exact support', () => {
    const analysis = analyzeFunction('sin(x^2)', WINDOW);

    expect(analysis.domain).toEqual({ kind: 'not-determined' });
    expect(analysis.range).toEqual({ kind: 'not-determined' });
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
