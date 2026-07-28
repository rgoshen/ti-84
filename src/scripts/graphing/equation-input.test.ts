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

  // `2x + 3 = 7` and `x = 3` describe the vertical line x = 2 and x = 3. There is no y,
  // but there IS a curve — Phase 2 draws them implicitly.
  it.each([
    ['2*x + 3', '7'],
    ['x', '3'],
  ])('reports %s = %s as having no y but not degenerate', (lhs, rhs) => {
    expect(solveLinearY(lhs, rhs)).toEqual({
      ok: false,
      reason: 'NO_Y_PRESENT',
      degenerate: false,
    });
  });

  // `0 = 0` is true at every point, so there is nothing to draw at all.
  it('reports 0 = 0 as degenerate', () => {
    expect(solveLinearY('0', '0')).toEqual({
      ok: false,
      reason: 'NO_Y_PRESENT',
      degenerate: true,
    });
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

  // A mismatch at ANY defined sample is positive proof of non-linearity, so the reason
  // must say so even when too few samples were usable to have confirmed linearity.
  // `sqrt(x-4.05)` is defined at only one sample (4.1), and y is squared there.
  it('reports non-linearity even when too few samples were usable', () => {
    expect(solveLinearY('sqrt(x-4.05)*y^2', 'x')).toEqual({
      ok: false,
      reason: 'NOT_LINEAR_IN_Y',
    });
  });

  // Still INVALID when nothing contradicted linearity but too little was defined to
  // confirm it — absence of evidence, not evidence of non-linearity.
  it('reports invalid when too few samples were usable and none contradicted linearity', () => {
    expect(solveLinearY('sqrt(x-4.05)*y', 'x')).toEqual({ ok: false, reason: 'INVALID' });
  });
});

describe('parseEquationInput', () => {
  it('passes a bare expression through unchanged', () => {
    expect(parseEquationInput('sin(x)')).toEqual({ ok: true, kind: 'function', expr: 'sin(x)' });
  });

  // The `y =` prefix case short-circuits: it returns the right-hand side verbatim,
  // without sampling or simplify(), which is what replaces the three duplicated
  // normalizeExpr regexes.
  it('accepts a y-prefixed equation without marking it as rearranged', () => {
    expect(parseEquationInput('y = sin(x)')).toEqual({
      ok: true,
      kind: 'function',
      expr: 'sin(x)',
    });
  });

  it('accepts an uppercase Y prefix', () => {
    expect(parseEquationInput('Y = sin(x)')).toEqual({
      ok: true,
      kind: 'function',
      expr: 'sin(x)',
    });
  });

  // A restricted domain that starts beyond the probe's sample range must not be
  // mistaken for a failure. These all worked before this module replaced the y= regex.
  it.each([
    ['y = sqrt(x-5)', 'sqrt(x-5)'],
    ['y = log(x-5)', 'log(x-5)'],
    ['y = asin(x-3)', 'asin(x-3)'],
    ['y = 1/sqrt(x-9)', '1/sqrt(x-9)'],
  ])('passes %s through untouched', (raw, expected) => {
    expect(parseEquationInput(raw)).toEqual({ ok: true, kind: 'function', expr: expected });
  });

  // The student's own arrangement of terms must survive; simplify() would reorder it.
  it('does not rewrite the expression on the y= path', () => {
    expect(parseEquationInput('y = x^2-4x+3')).toEqual({
      ok: true,
      kind: 'function',
      expr: 'x^2-4x+3',
    });
  });

  // `evaluate('')` returns undefined rather than throwing, so the y= short-circuit
  // needs its own empty guard to keep reporting this the way the old regex did.
  it('reports an empty right hand side as empty input', () => {
    expect(parseEquationInput('y = ')).toMatchObject({ ok: false, reason: 'EMPTY' });
  });

  it('records the entered form when a real rearrangement happened', () => {
    expect(parseEquationInput('3y + 2x = 6')).toEqual({
      ok: true,
      kind: 'function',
      expr: '(6 - 2 * x) / 3',
      input: '3y + 2x = 6',
    });
  });

  it('reports empty input', () => {
    const r = parseEquationInput('  ');
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'EMPTY' });
  });

  // A relation parses fine — it just is not a function. It routes to the implicit
  // renderer rather than being rejected.
  it.each([
    ['x^2 + y^2 = 25', '(x^2 + y^2) - (25)'],
    ['y^2 = x', '(y^2) - (x)'],
    ['e^y = x', '(e^y) - (x)'],
    ['sin(y) = x', '(sin(y)) - (x)'],
  ])('routes %s to the implicit renderer', (raw, expected) => {
    expect(parseEquationInput(raw)).toEqual({
      ok: true,
      kind: 'relation',
      expr: expected,
      input: raw,
    });
  });

  // No y, but still a curve: the vertical line x = 3.
  it.each([
    ['x = 3', '(x) - (3)'],
    ['2x + 3 = 7', '(2x + 3) - (7)'],
  ])('routes %s to the implicit renderer as a vertical line', (raw, expected) => {
    expect(parseEquationInput(raw)).toMatchObject({
      ok: true,
      kind: 'relation',
      expr: expected,
    });
  });

  it('still rejects an equation that is true everywhere', () => {
    expect(parseEquationInput('0 = 0')).toMatchObject({ ok: false, reason: 'DEGENERATE' });
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
    for (const raw of ['', 'y = x = 3', '0 = 0', '@@@']) {
      const r = parseEquationInput(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(0);
    }
  });

  // Functions keep their existing shape, now explicitly tagged.
  it.each([
    ['sin(x)', 'sin(x)'],
    ['y = sin(x)', 'sin(x)'],
    ['3y + 2x = 6', '(6 - 2 * x) / 3'],
  ])('tags %s as a function', (raw, expr) => {
    expect(parseEquationInput(raw)).toMatchObject({ ok: true, kind: 'function', expr });
  });

  // A relation's expression contains y. Binding only x — as the function path does —
  // would make mathjs throw and reject every relation as INVALID.
  it('validates a relation with both x and y bound', () => {
    expect(parseEquationInput('x^2 + y^2 = 25')).toMatchObject({ ok: true });
  });

  // A solver INVALID must keep its own reason. Routing it to DEGENERATE would tell a
  // student their typo is an equation that is true everywhere.
  it.each([['@@@ = 3'], ['x @ = 3'], ['z^2 + y^2 = 25']])(
    'reports %s as invalid rather than degenerate',
    (raw) => {
      expect(parseEquationInput(raw)).toMatchObject({ ok: false, reason: 'INVALID' });
    },
  );
});
