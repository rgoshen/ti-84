import { describe, it, expect } from 'vitest';

import {
  exactCoordinates,
  exactToNumber,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
} from './unit-circle';

/** The 16 angles the reference chart labels. */
const CHART_ANGLES = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

describe('exactCoordinates', () => {
  it('agrees with Math.cos and Math.sin at every chart angle', () => {
    for (const deg of CHART_ANGLES) {
      const point = exactCoordinates(deg);
      expect(point, `no exact point for ${deg}°`).not.toBeNull();
      const rad = (deg * Math.PI) / 180;
      expect(exactToNumber(point!.x)).toBeCloseTo(Math.cos(rad), 12);
      expect(exactToNumber(point!.y)).toBeCloseTo(Math.sin(rad), 12);
    }
  });

  it('places the quadrantals exactly, with no floating-point residue', () => {
    expect(exactCoordinates(0)).toEqual({
      x: { sign: 1, radicand: 1, denominator: 1 },
      y: { sign: 0, radicand: 1, denominator: 1 },
    });
    expect(exactCoordinates(180)).toEqual({
      x: { sign: -1, radicand: 1, denominator: 1 },
      y: { sign: 0, radicand: 1, denominator: 1 },
    });
    expect(exactCoordinates(270)).toEqual({
      x: { sign: 0, radicand: 1, denominator: 1 },
      y: { sign: -1, radicand: 1, denominator: 1 },
    });
  });

  it('normalises negative and past-360° angles onto the same point', () => {
    expect(exactCoordinates(-330)).toEqual(exactCoordinates(30));
    expect(exactCoordinates(390)).toEqual(exactCoordinates(30));
    expect(exactCoordinates(360)).toEqual(exactCoordinates(0));
    expect(exactCoordinates(-360)).toEqual(exactCoordinates(0));
  });

  it('returns null for integers that are not chart angles', () => {
    expect(exactCoordinates(37)).toBeNull();
    expect(exactCoordinates(15)).toBeNull();
    expect(exactCoordinates(100)).toBeNull();
  });

  it('returns null for non-integer degrees, which have no exact form', () => {
    // 1 radian typed into the Radians field arrives as 57.2958°.
    expect(exactCoordinates(57.2958)).toBeNull();
    expect(exactCoordinates(30.5)).toBeNull();
  });

  it('accepts the float noise a radian-typed pi/3 produces', () => {
    // isIntegerDegrees treats this as 60°; so must the lookup.
    expect(exactCoordinates(59.99999999999999)).toEqual(exactCoordinates(60));
  });
});

describe('formatExactLatex', () => {
  it('renders zero, unit, rational, and radical magnitudes', () => {
    expect(formatExactLatex({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactLatex({ sign: 1, radicand: 1, denominator: 1 })).toBe('1');
    expect(formatExactLatex({ sign: 1, radicand: 1, denominator: 2 })).toBe('\\frac{1}{2}');
    expect(formatExactLatex({ sign: 1, radicand: 3, denominator: 2 })).toBe(
      '\\frac{\\sqrt{3}}{2}',
    );
  });

  it('carries the sign, and never emits a signed zero', () => {
    expect(formatExactLatex({ sign: -1, radicand: 1, denominator: 1 })).toBe('-1');
    expect(formatExactLatex({ sign: -1, radicand: 2, denominator: 2 })).toBe(
      '-\\frac{\\sqrt{2}}{2}',
    );
    expect(formatExactLatex({ sign: 0, radicand: 1, denominator: 1 })).not.toContain('-');
  });
});

describe('formatExactText', () => {
  it('mirrors the latex form without markup, for SVG and export', () => {
    expect(formatExactText({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactText({ sign: 1, radicand: 1, denominator: 2 })).toBe('1/2');
    expect(formatExactText({ sign: 1, radicand: 3, denominator: 2 })).toBe('√3/2');
    expect(formatExactText({ sign: -1, radicand: 2, denominator: 2 })).toBe('-√2/2');
    expect(formatExactText({ sign: -1, radicand: 1, denominator: 1 })).toBe('-1');
  });
});

describe('formatExactSpoken', () => {
  it('reads aloud with no backslashes or braces for a screen reader to mangle', () => {
    expect(formatExactSpoken({ sign: 0, radicand: 1, denominator: 1 })).toBe('0');
    expect(formatExactSpoken({ sign: 1, radicand: 1, denominator: 2 })).toBe('1 over 2');
    expect(formatExactSpoken({ sign: 1, radicand: 3, denominator: 2 })).toBe(
      'square root of 3 over 2',
    );
    expect(formatExactSpoken({ sign: -1, radicand: 2, denominator: 2 })).toBe(
      'negative square root of 2 over 2',
    );
    expect(formatExactSpoken({ sign: -1, radicand: 1, denominator: 1 })).toBe('negative 1');
  });
});
