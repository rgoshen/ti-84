import { describe, it, expect } from 'vitest';
import { formatNumber, nearestWithinThreshold, COORD_DECIMALS } from './hover';

describe('formatNumber', () => {
  it('keeps integers integer', () => {
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(2.0)).toBe('2');
  });
  it('rounds to COORD_DECIMALS and trims trailing zeros', () => {
    expect(formatNumber(1.5708)).toBe('1.571');
    expect(formatNumber(0.5)).toBe('0.5');
    expect(formatNumber(1.23456)).toBe('1.235');
  });
  it('normalises negative zero to "0"', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.0001)).toBe('0');
  });
  it('exposes the configured decimal count', () => {
    expect(COORD_DECIMALS).toBe(3);
  });
});

describe('nearestWithinThreshold', () => {
  it('returns the index of the closest value within the threshold', () => {
    expect(nearestWithinThreshold([100, 50, 5], 0, 20)).toBe(2);
  });
  it('returns null when every value exceeds the threshold', () => {
    expect(nearestWithinThreshold([100, 50, 30], 0, 20)).toBeNull();
  });
  it('breaks ties toward the lowest index', () => {
    expect(nearestWithinThreshold([10, -10], 0, 20)).toBe(0);
  });
  it('returns null for an empty candidate list', () => {
    expect(nearestWithinThreshold([], 0, 20)).toBeNull();
  });
});
