import { describe, expect, it } from 'vitest';

import {
  formatClosedInterval,
  formatIntervalNotation,
  formatVisibleDomainInterval,
} from './interval-notation';

const WINDOW = { xMin: -4, xMax: 4, yMin: -5, yMax: 8 };

describe('graph export interval notation', () => {
  it('formats every structured parent interval shape', () => {
    expect(formatIntervalNotation({ kind: 'all' })).toBe('(-∞, ∞)');
    expect(
      formatIntervalNotation({ kind: 'bound', value: 0, dir: 'ge', strict: false }),
    ).toBe('[0, ∞)');
    expect(
      formatIntervalNotation({ kind: 'bound', value: 2, dir: 'ge', strict: true }),
    ).toBe('(2, ∞)');
    expect(
      formatIntervalNotation({ kind: 'bound', value: 3, dir: 'le', strict: false }),
    ).toBe('(-∞, 3]');
    expect(
      formatIntervalNotation({ kind: 'bound', value: -2, dir: 'le', strict: true }),
    ).toBe('(-∞, -2)');
    expect(formatIntervalNotation({ kind: 'exclude', value: 0 })).toBe(
      '(-∞, 0) ∪ (0, ∞)',
    );
    expect(formatIntervalNotation({ kind: 'between', lo: -1, hi: 1 })).toBe('[-1, 1]');
  });

  it('formats sampled bounds as a closed interval', () => {
    expect(formatClosedInterval(-0.9998, 1.0001)).toBe('[-1, 1]');
  });

  it('splits a visible domain at sorted unique in-window exclusions', () => {
    expect(formatVisibleDomainInterval(WINDOW, [2])).toBe('[-4, 2) ∪ (2, 4]');
    expect(formatVisibleDomainInterval(WINDOW, [2, -1, 2, 9])).toBe(
      '[-4, -1) ∪ (-1, 2) ∪ (2, 4]',
    );
    expect(formatVisibleDomainInterval(WINDOW, [])).toBe('[-4, 4]');
  });
});
