import { describe, it, expect } from 'vitest';
import { STANDARD_ANGLES, standardAngleLabel, type AngleUnit } from './angle-standard';

describe('STANDARD_ANGLES', () => {
  it('is the sixteen multiples of 30 and 45, ascending', () => {
    expect(STANDARD_ANGLES).toEqual([
      0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(STANDARD_ANGLES).size).toBe(STANDARD_ANGLES.length);
  });
});

describe('standardAngleLabel', () => {
  it('formats degrees plainly, including zero', () => {
    expect(standardAngleLabel(0, 'deg')).toBe('0°');
    expect(standardAngleLabel(30, 'deg')).toBe('30°');
    expect(standardAngleLabel(330, 'deg')).toBe('330°');
  });

  it('formats radians as exact π fractions', () => {
    expect(standardAngleLabel(0, 'rad')).toBe('0');
    expect(standardAngleLabel(30, 'rad')).toBe('π/6');
    expect(standardAngleLabel(45, 'rad')).toBe('π/4');
    expect(standardAngleLabel(90, 'rad')).toBe('π/2');
    expect(standardAngleLabel(180, 'rad')).toBe('π');
    expect(standardAngleLabel(330, 'rad')).toBe('11π/6');
  });

  it('covers every standard angle in both units without throwing', () => {
    const units: AngleUnit[] = ['deg', 'rad'];
    for (const deg of STANDARD_ANGLES) {
      for (const unit of units) {
        expect(() => standardAngleLabel(deg, unit)).not.toThrow();
      }
    }
  });
});
