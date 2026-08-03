import { describe, it, expect } from 'vitest';
import {
  polarToCartesian,
  arcPath,
  tickAngles,
  arrowheadPoints,
  countingTicks,
} from './angle-render';
import { degreesToRadians } from './angle';

/** Pull the numeric flags out of `A rx ry rot largeArc sweep x y`. */
const flagsOf = (path: string): Array<{ largeArc: string; sweep: string }> =>
  [...path.matchAll(/A [\d.]+ [\d.]+ 0 ([01]) ([01])/g)].map((m) => ({
    largeArc: m[1],
    sweep: m[2],
  }));

describe('polarToCartesian', () => {
  it('places 0 rad to the right of centre', () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(150, 9);
    expect(p.y).toBeCloseTo(100, 9);
  });

  it('flips y so a positive angle rises on screen', () => {
    // SVG y grows downward; +90° must land ABOVE centre (smaller y).
    const p = polarToCartesian(100, 100, 50, Math.PI / 2);
    expect(p.x).toBeCloseTo(100, 9);
    expect(p.y).toBeCloseTo(50, 9);
  });
});

describe('arcPath', () => {
  it('is empty for a zero sweep', () => {
    expect(arcPath(100, 100, 50, 0, 0)).toBe('');
  });

  it('uses large-arc-flag 0 below 180°', () => {
    const flags = flagsOf(arcPath(100, 100, 50, 0, Math.PI / 2));
    expect(flags).toHaveLength(1);
    expect(flags[0].largeArc).toBe('0');
  });

  it('uses large-arc-flag 1 above 180°', () => {
    const flags = flagsOf(arcPath(100, 100, 50, 0, (3 * Math.PI) / 2));
    expect(flags).toHaveLength(1);
    expect(flags[0].largeArc).toBe('1');
  });

  it('flips sweep-flag with the direction of rotation', () => {
    const ccw = flagsOf(arcPath(100, 100, 50, 0, Math.PI / 2))[0];
    const cw = flagsOf(arcPath(100, 100, 50, 0, -Math.PI / 2))[0];
    expect(ccw.sweep).toBe('0');
    expect(cw.sweep).toBe('1');
  });

  it('splits a full 360° sweep into two arcs — one A command would draw nothing', () => {
    const full = arcPath(100, 100, 50, 0, 2 * Math.PI);
    expect(flagsOf(full)).toHaveLength(2);
  });

  it('splits a full −360° sweep too, preserving direction', () => {
    const full = arcPath(100, 100, 50, 0, -2 * Math.PI);
    const flags = flagsOf(full);
    expect(flags).toHaveLength(2);
    expect(flags.every((f) => f.sweep === '1')).toBe(true);
  });
});

describe('tickAngles', () => {
  it('always yields at least one tick, even below 1 radian', () => {
    // 30° is 0.5236 rad. The source demo showed nothing here, which reads as a bug.
    expect(tickAngles(Math.PI / 6)).toEqual([1]);
    expect(tickAngles(0)).toEqual([1]);
  });

  it('yields every whole radian up to θ', () => {
    expect(tickAngles(3.4)).toEqual([1, 2, 3]);
  });

  it('mirrors for a negative sweep', () => {
    expect(tickAngles(-3.4)).toEqual([-1, -2, -3]);
    expect(tickAngles(-Math.PI / 6)).toEqual([-1]);
  });

  it('covers the full ±360° range (2π ≈ 6.28 rad)', () => {
    expect(tickAngles(2 * Math.PI)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('arrowheadPoints', () => {
  it('returns three comma-separated coordinate pairs', () => {
    const pts = arrowheadPoints(100, 100, 50, Math.PI / 2, 1).split(' ');
    expect(pts).toHaveLength(3);
    for (const p of pts) expect(p).toMatch(/^-?[\d.]+,-?[\d.]+$/);
  });

  it('points the opposite way when the sweep reverses', () => {
    const ccw = arrowheadPoints(100, 100, 50, Math.PI / 2, 1);
    const cw = arrowheadPoints(100, 100, 50, Math.PI / 2, -1);
    expect(ccw).not.toBe(cw);
  });
});

describe('countingTicks', () => {
  it('delegates to tickAngles in radians mode, unchanged', () => {
    expect(countingTicks(30, 'rad')).toEqual([{ radians: 1, text: '1 rad' }]);
    expect(countingTicks(0, 'rad')).toEqual([{ radians: 1, text: '1 rad' }]);
  });

  it('matches tickAngles exactly across a signed sweep, in radians mode', () => {
    const thetaDeg = -3.4 * (180 / Math.PI);
    const expected = tickAngles(-3.4).map((n) => ({ radians: n, text: `${n} rad` }));
    expect(countingTicks(thetaDeg, 'rad')).toEqual(expected);
  });

  it('counts quarter turns toward θ in degrees mode', () => {
    expect(countingTicks(260, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
      { radians: degreesToRadians(180), text: '180°' },
    ]);
  });

  it('always yields at least one degree tick, even below 90°', () => {
    expect(countingTicks(30, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
    ]);
    expect(countingTicks(0, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
    ]);
  });

  it('mirrors for a negative sweep in degrees mode', () => {
    expect(countingTicks(-260, 'deg')).toEqual([
      { radians: degreesToRadians(-90), text: '-90°' },
      { radians: degreesToRadians(-180), text: '-180°' },
    ]);
  });

  it('covers the full ±360° range in degrees mode (four quarter turns)', () => {
    expect(countingTicks(360, 'deg')).toEqual([
      { radians: degreesToRadians(90), text: '90°' },
      { radians: degreesToRadians(180), text: '180°' },
      { radians: degreesToRadians(270), text: '270°' },
      { radians: degreesToRadians(360), text: '360°' },
    ]);
  });
});
