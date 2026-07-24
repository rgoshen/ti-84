import { describe, it, expect } from 'vitest';
import {
  degreesToRadians,
  radiansToDegrees,
  reduceFraction,
  turnFraction,
  piMultiple,
  isIntegerDegrees,
  formatPiLatex,
  formatFractionLatex,
  arcLength,
} from './angle';

describe('degree ↔ radian conversion', () => {
  it('converts the anchor values', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 12);
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 12);
  });

  it('round-trips 1 radian to the value the 1° slider cannot reach', () => {
    expect(radiansToDegrees(1)).toBeCloseTo(57.2958, 4);
  });
});

describe('reduceFraction', () => {
  it('reduces to lowest terms', () => {
    expect(reduceFraction(30, 360)).toEqual({ n: 1, d: 12 });
    expect(reduceFraction(180, 180)).toEqual({ n: 1, d: 1 });
  });

  it('keeps the sign on the numerator', () => {
    expect(reduceFraction(-90, 360)).toEqual({ n: -1, d: 4 });
    expect(reduceFraction(90, -360)).toEqual({ n: -1, d: 4 });
  });

  it('reduces zero to 0/1 rather than dividing by zero', () => {
    expect(reduceFraction(0, 360)).toEqual({ n: 0, d: 1 });
  });

  it('throws on a zero denominator', () => {
    expect(() => reduceFraction(1, 0)).toThrow();
  });
});

describe('turnFraction — θ as a share of a full turn', () => {
  it('matches the readout examples', () => {
    expect(turnFraction(30)).toEqual({ n: 1, d: 12 });
    expect(turnFraction(360)).toEqual({ n: 1, d: 1 });
    expect(turnFraction(-360)).toEqual({ n: -1, d: 1 });
    expect(turnFraction(0)).toEqual({ n: 0, d: 1 });
  });
});

describe('piMultiple — θ as an exact multiple of π', () => {
  it('handles the special angles', () => {
    expect(piMultiple(30)).toEqual({ n: 1, d: 6 });
    expect(piMultiple(90)).toEqual({ n: 1, d: 2 });
    expect(piMultiple(180)).toEqual({ n: 1, d: 1 });
    expect(piMultiple(270)).toEqual({ n: 3, d: 2 });
    expect(piMultiple(360)).toEqual({ n: 2, d: 1 });
    expect(piMultiple(-30)).toEqual({ n: -1, d: 6 });
  });

  it('leaves a non-special angle irreducible', () => {
    expect(piMultiple(37)).toEqual({ n: 37, d: 180 });
  });
});

describe('isIntegerDegrees — guards the exact forms', () => {
  it('accepts integers and rejects typed decimals', () => {
    expect(isIntegerDegrees(30)).toBe(true);
    expect(isIntegerDegrees(-360)).toBe(true);
    expect(isIntegerDegrees(57.2958)).toBe(false);
  });
});

describe('formatPiLatex', () => {
  it('never emits a denominator of 1 or a bare coefficient of 1', () => {
    expect(formatPiLatex({ n: 1, d: 1 })).toBe('\\pi');
    expect(formatPiLatex({ n: 2, d: 1 })).toBe('2\\pi');
    expect(formatPiLatex({ n: 1, d: 6 })).toBe('\\frac{\\pi}{6}');
    expect(formatPiLatex({ n: 3, d: 2 })).toBe('\\frac{3\\pi}{2}');
    expect(formatPiLatex({ n: -2, d: 3 })).toBe('-\\frac{2\\pi}{3}');
    expect(formatPiLatex({ n: 0, d: 1 })).toBe('0');
  });
});

describe('formatFractionLatex', () => {
  it('renders plain fractions for the turn share', () => {
    expect(formatFractionLatex({ n: 1, d: 12 })).toBe('\\frac{1}{12}');
    expect(formatFractionLatex({ n: 1, d: 1 })).toBe('1');
    expect(formatFractionLatex({ n: 0, d: 1 })).toBe('0');
    expect(formatFractionLatex({ n: -1, d: 4 })).toBe('-\\frac{1}{4}');
  });
});

describe('arcLength — s = rθ', () => {
  it('equals the radian measure on the unit circle', () => {
    expect(arcLength(1, Math.PI / 6)).toBeCloseTo(Math.PI / 6, 12);
  });

  it('diverges from the radian measure once r ≠ 1 — the whole teaching point', () => {
    expect(arcLength(1.5, Math.PI / 6)).toBeCloseTo(0.7854, 4);
  });

  it('is a magnitude, so a negative sweep still has positive length', () => {
    expect(arcLength(1, -Math.PI / 2)).toBeCloseTo(Math.PI / 2, 12);
  });
});
