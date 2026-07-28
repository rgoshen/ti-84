import { describe, it, expect } from 'vitest';
import { splitEquation, solveLinearY, parseEquationInput } from './equation-input';

describe('splitEquation', () => {
  it('reports empty input', () => {
    expect(splitEquation('')).toEqual({ kind: 'empty' });
    expect(splitEquation('   ')).toEqual({ kind: 'empty' });
  });

  it('treats input with no equals sign as a bare expression', () => {
    expect(splitEquation('sin(x)')).toEqual({ kind: 'expression', expr: 'sin(x)' });
  });

  it('splits a single equation into sides', () => {
    expect(splitEquation('3y + 2x = 6')).toEqual({ kind: 'equation', lhs: '3y + 2x', rhs: '6' });
  });

  it('trims surrounding whitespace', () => {
    expect(splitEquation('  y=x^2  ')).toEqual({ kind: 'equation', lhs: 'y', rhs: 'x^2' });
  });

  // Today's regex is case-insensitive; mathjs treats Y and y as distinct symbols,
  // so without this normalization `Y = sin(x)` would silently stop working.
  it('normalizes a leading uppercase Y that is followed by =', () => {
    expect(splitEquation('Y = sin(x)')).toEqual({ kind: 'equation', lhs: 'y', rhs: 'sin(x)' });
  });

  it('leaves an uppercase Y alone when it is not the leading y=', () => {
    expect(splitEquation('2Y = x')).toEqual({ kind: 'equation', lhs: '2Y', rhs: 'x' });
  });

  // '>=' contains '='. A naive split('=') would produce two sides here.
  it('does not split on comparison operators', () => {
    expect(splitEquation('y >= x')).toEqual({ kind: 'expression', expr: 'y >= x' });
    expect(splitEquation('y == x')).toEqual({ kind: 'expression', expr: 'y == x' });
    expect(splitEquation('y != x')).toEqual({ kind: 'expression', expr: 'y != x' });
    expect(splitEquation('y <= x')).toEqual({ kind: 'expression', expr: 'y <= x' });
  });

  it('rejects more than one equals sign', () => {
    expect(splitEquation('y = x = 3')).toEqual({ kind: 'multiple' });
  });
});

describe('solveLinearY', () => {
  it.each([
    ['2y', 'x + 4', '(x + 4) / 2'],
    ['y - x^2', '0', 'x ^ 2'],
    ['3y + 2x', '6', '(6 - 2 * x) / 3'],
    ['x + y', '5', '5 - x'],
    ['y', 'sin(x)', 'sin(x)'],
    ['y + y', 'x', 'x / 2'],
    ['2', 'y', '2'],
    ['y', '5', '5'],
  ])('solves %s = %s', (lhs, rhs, expected) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: true, expr: expected });
  });

  // A(x) = x here, which is zero AT x=0 but not identically zero. The NO_Y_PRESENT
  // guard must not fire; the resulting 1/x handles its own asymptote via evalAt.
  it('solves an equation whose y coefficient depends on x', () => {
    expect(solveLinearY('x*y', '1')).toEqual({ ok: true, expr: '1 / x' });
  });

  it.each([
    ['y^2', 'x'],
    ['x^2 + y^2', '25'],
    ['e^y', 'x'],
    ['sin(y)', 'x'],
  ])('rejects %s = %s as not linear in y', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: false, reason: 'NOT_LINEAR_IN_Y' });
  });

  // Without the A === 0 guard this divides by zero and emits the literal string
  // "Infinity * (4 - 2*x)".
  it.each([
    ['2*x + 3', '7'],
    ['x', '3'],
    ['0', '0'],
  ])('rejects %s = %s because no y is present', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: false, reason: 'NO_Y_PRESENT' });
  });

  it('reports invalid input rather than throwing', () => {
    expect(solveLinearY('@@@', 'x')).toEqual({ ok: false, reason: 'INVALID' });
  });

  // Domain-restricted functions must not be mistaken for non-linear ones. sqrt, log
  // and cbrt are all parent functions in this app, so `y = sqrt(x)` is real input and
  // worked before this module replaced the y= regex.
  it.each([
    ['y', 'sqrt(x)', 'sqrt(x)'],
    ['y', 'log(x)', 'log(x)'],
    ['2y', 'sqrt(x)', 'sqrt(x) / 2'],
  ])('solves %s = %s despite an undefined region', (lhs, rhs, expected) => {
    expect(solveLinearY(lhs, rhs)).toEqual({ ok: true, expr: expected });
  });

  it('solves a linear equation whose pole lands on a sample point', () => {
    expect(solveLinearY('y', '1/(x-0.5)')).toMatchObject({ ok: true });
  });
});

describe('parseEquationInput', () => {
  it('passes a bare expression through unchanged', () => {
    expect(parseEquationInput('sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  // The `y =` prefix case short-circuits: it returns the right-hand side verbatim,
  // without sampling or simplify(), which is what replaces the three duplicated
  // normalizeExpr regexes.
  it('accepts a y-prefixed equation without marking it as rearranged', () => {
    expect(parseEquationInput('y = sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  it('accepts an uppercase Y prefix', () => {
    expect(parseEquationInput('Y = sin(x)')).toEqual({ ok: true, expr: 'sin(x)' });
  });

  // A restricted domain that starts beyond the probe's sample range must not be
  // mistaken for a failure. These all worked before this module replaced the y= regex.
  it.each([
    ['y = sqrt(x-5)', 'sqrt(x-5)'],
    ['y = log(x-5)', 'log(x-5)'],
    ['y = asin(x-3)', 'asin(x-3)'],
    ['y = 1/sqrt(x-9)', '1/sqrt(x-9)'],
  ])('passes %s through untouched', (raw, expected) => {
    expect(parseEquationInput(raw)).toEqual({ ok: true, expr: expected });
  });

  // The student's own arrangement of terms must survive; simplify() would reorder it.
  it('does not rewrite the expression on the y= path', () => {
    expect(parseEquationInput('y = x^2-4x+3')).toEqual({ ok: true, expr: 'x^2-4x+3' });
  });

  // `evaluate('')` returns undefined rather than throwing, so the y= short-circuit
  // needs its own empty guard to keep reporting this the way the old regex did.
  it('reports an empty right hand side as empty input', () => {
    expect(parseEquationInput('y = ')).toMatchObject({ ok: false, reason: 'EMPTY' });
  });

  it('records the entered form when a real rearrangement happened', () => {
    expect(parseEquationInput('3y + 2x = 6')).toEqual({
      ok: true,
      expr: '(6 - 2 * x) / 3',
      input: '3y + 2x = 6',
    });
  });

  it('reports empty input', () => {
    const r = parseEquationInput('  ');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'EMPTY' });
  });

  it('explains that a relation is not a function', () => {
    const r = parseEquationInput('x^2 + y^2 = 25');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'NOT_LINEAR_IN_Y' });
    if (!r.ok) expect(r.message).toContain('two y values');
  });

  it('explains that an equation without y cannot be plotted', () => {
    const r = parseEquationInput('2x + 3 = 7');
    expect(r).toMatchObject({ ok: false, reason: 'NO_Y_PRESENT' });
  });

  it('rejects more than one equals sign', () => {
    expect(parseEquationInput('y = x = 3')).toMatchObject({
      ok: false,
      reason: 'MULTIPLE_EQUALS',
    });
  });

  // '>=' is not split, so this reaches the expression path and fails validation on
  // the undefined symbol y.
  it('rejects an inequality', () => {
    expect(parseEquationInput('y >= x')).toMatchObject({ ok: false, reason: 'INVALID' });
  });

  it('rejects an unparseable expression', () => {
    expect(parseEquationInput('@@@')).toMatchObject({ ok: false, reason: 'INVALID' });
  });

  it('every failure carries a non-empty message', () => {
    for (const raw of ['', 'y = x = 3', '2x + 3 = 7', 'x^2 + y^2 = 25', '@@@']) {
      const r = parseEquationInput(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(0);
    }
  });
});
