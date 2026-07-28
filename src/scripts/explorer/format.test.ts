import { describe, it, expect } from 'vitest';

import { formatFourDecimals } from './format';

describe('formatFourDecimals', () => {
  it('rounds to four decimals', () => {
    expect(formatFourDecimals(1.23455)).toBe('1.2346');
  });

  it('leaves an already-exact value untouched', () => {
    expect(formatFourDecimals(0.5236)).toBe('0.5236');
  });

  it('drops trailing zeros for a whole number', () => {
    expect(formatFourDecimals(5)).toBe('5');
  });

  it('formats zero as "0"', () => {
    expect(formatFourDecimals(0)).toBe('0');
  });

  it('folds negative zero to "0", so it never reaches the screen', () => {
    // cos(270°) lands on -1.8e-16 in floating point, not exactly 0 — this is
    // the real-world source of a -0 that toFixed would otherwise surface.
    expect(formatFourDecimals(-0)).toBe('0');
    expect(formatFourDecimals(-1.8e-16)).toBe('0');
  });
});
