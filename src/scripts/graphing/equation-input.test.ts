import { describe, it, expect } from 'vitest';
import { splitEquation } from './equation-input';

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
