import { describe, it, expect } from 'vitest';

import { round4 } from './format';

describe('round4', () => {
  it('rounds to four decimals', () => {
    expect(round4(1.23455)).toBe('1.2346');
  });

  it('leaves an already-exact value untouched', () => {
    expect(round4(0.5236)).toBe('0.5236');
  });

  it('drops trailing zeros for a whole number', () => {
    expect(round4(5)).toBe('5');
  });

  it('formats zero as "0"', () => {
    expect(round4(0)).toBe('0');
  });

  it('folds negative zero to "0", so it never reaches the screen', () => {
    // cos(270°) lands on -1.8e-16 in floating point, not exactly 0 — this is
    // the real-world source of a -0 that toFixed would otherwise surface.
    expect(round4(-0)).toBe('0');
    expect(round4(-1.8e-16)).toBe('0');
  });
});
