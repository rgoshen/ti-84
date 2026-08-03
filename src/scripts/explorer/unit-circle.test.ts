import { describe, it, expect } from 'vitest';

import {
  exactCoordinates,
  exactTangent,
  exactToNumber,
  formatExactLatex,
  formatExactSpoken,
  formatExactText,
  type ExactValue,
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

describe('exactTangent', () => {
  it('agrees with Math.tan at every chart angle away from the asymptotes', () => {
    for (const deg of CHART_ANGLES) {
      if (deg === 90 || deg === 270) continue;
      const v = exactTangent(deg);
      expect(v, `no exact tangent for ${deg}°`).not.toBeNull();
      expect(v).not.toBe('undefined');
      expect(exactToNumber(v as ExactValue)).toBeCloseTo(Math.tan((deg * Math.PI) / 180), 10);
    }
  });

  it('is undefined at 90° and 270°, and at their normalized equivalents', () => {
    for (const deg of [90, 270, -90, -270, 450]) {
      expect(exactTangent(deg)).toBe('undefined');
    }
  });

  it('renders √3/3 at 30° and 150°, with the correct sign', () => {
    expect(exactTangent(30)).toEqual({ sign: 1, radicand: 3, denominator: 3 });
    expect(exactTangent(150)).toEqual({ sign: -1, radicand: 3, denominator: 3 });
  });

  it('is 0 at 0° and 180°, and exactly √3 at 60°', () => {
    expect(exactTangent(0)).toEqual({ sign: 0, radicand: 1, denominator: 1 });
    expect(exactTangent(180)).toEqual({ sign: 0, radicand: 1, denominator: 1 });
    expect(exactTangent(60)).toEqual({ sign: 1, radicand: 3, denominator: 1 });
  });

  it('is positive in Q1/Q3 and negative in Q2/Q4', () => {
    expect(exactToNumber(exactTangent(210) as ExactValue)).toBeGreaterThan(0); // Q3
    expect(exactToNumber(exactTangent(300) as ExactValue)).toBeLessThan(0); // Q4
  });

  it('returns null for integers off the chart and for non-integer degrees', () => {
    expect(exactTangent(37)).toBeNull();
    expect(exactTangent(30.5)).toBeNull();
  });

  it('normalises past-360° and negative angles onto the same value', () => {
    expect(exactTangent(390)).toEqual(exactTangent(30));
    expect(exactTangent(-330)).toEqual(exactTangent(30));
  });
});

describe('exactCoordinates — never needs a denominator of 3', () => {
  it('proves the ExactValue.denominator widening is non-invasive for x/y', () => {
    for (const deg of CHART_ANGLES) {
      const point = exactCoordinates(deg)!;
      expect(point.x.denominator).not.toBe(3);
      expect(point.y.denominator).not.toBe(3);
    }
  });
});

describe('formatters — denominator 3', () => {
  const rootThirdOverThree = { sign: 1 as const, radicand: 3 as const, denominator: 3 as const };

  it('renders √3/3 across all three formatters with no formatter changes needed', () => {
    expect(formatExactLatex(rootThirdOverThree)).toBe('\\frac{\\sqrt{3}}{3}');
    expect(formatExactText(rootThirdOverThree)).toBe('√3/3');
    expect(formatExactSpoken(rootThirdOverThree)).toBe('square root of 3 over 3');
  });
});
