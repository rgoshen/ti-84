import { describe, it, expect } from 'vitest';

import {
  AMP_MAX,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  waveScales,
  waveTickLabel,
  waveTickRadians,
  waveValue,
} from './angle-wave';

describe('waveTickRadians', () => {
  it('emits every multiple of π/4 across -2π…2π — seventeen of them', () => {
    const ticks = waveTickRadians();
    expect(ticks).toHaveLength(17);
    expect(ticks[0]).toEqual({ k: -8, radians: -2 * Math.PI });
    expect(ticks[8]).toEqual({ k: 0, radians: 0 });
    expect(ticks[16]).toEqual({ k: 8, radians: 2 * Math.PI });
  });

  it('spaces them exactly π/4 apart', () => {
    const ticks = waveTickRadians();
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.radians - ticks[i - 1]!.radians).toBeCloseTo(Math.PI / 4, 12);
    }
  });
});

describe('waveTickLabel', () => {
  it('reduces to the exact π form, reusing the Radians field\'s own formatter', () => {
    expect(waveTickLabel(0)).toBe('0');
    expect(waveTickLabel(1)).toBe('π/4');
    expect(waveTickLabel(2)).toBe('π/2');
    expect(waveTickLabel(3)).toBe('3π/4');
    expect(waveTickLabel(4)).toBe('π');
    expect(waveTickLabel(6)).toBe('3π/2');
    expect(waveTickLabel(8)).toBe('2π');
  });

  it('signs negatives with an ASCII hyphen', () => {
    expect(waveTickLabel(-1)).toBe('-π/4');
    expect(waveTickLabel(-7)).toBe('-7π/4');
    expect(waveTickLabel(-8)).toBe('-2π');
    expect(waveTickLabel(-8)).not.toContain('−');
  });
});

describe('waveValue', () => {
  it('is the terminal point\'s coordinate, so the radius is the amplitude', () => {
    expect(waveValue('sin', 90, 1)).toBeCloseTo(1, 12);
    expect(waveValue('sin', 90, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 0, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 180, 0.5)).toBeCloseTo(-0.5, 12);
  });

  it('starts sin at zero and cos at r — how the two differ at θ = 0', () => {
    expect(waveValue('sin', 0, 1.2)).toBeCloseTo(0, 12);
    expect(waveValue('cos', 0, 1.2)).toBeCloseTo(1.2, 12);
  });

  it('is odd in θ for sin and even in θ for cos', () => {
    for (const theta of [17, 45, 90, 137, 210, 359]) {
      expect(waveValue('sin', -theta, 1)).toBeCloseTo(-waveValue('sin', theta, 1), 12);
      expect(waveValue('cos', -theta, 1)).toBeCloseTo(waveValue('cos', theta, 1), 12);
    }
  });
});

describe('waveScales', () => {
  const s = waveScales();

  it('puts -2π on the left edge, 0 at the centre and 2π on the right edge', () => {
    const left = s.xFor(-2 * Math.PI);
    const centre = s.xFor(0);
    const right = s.xFor(2 * Math.PI);
    expect(centre).toBeCloseTo(WAVE_WIDTH / 2, 6);
    expect(left).toBeLessThan(centre);
    expect(right).toBeGreaterThan(centre);
    expect(centre - left).toBeCloseTo(right - centre, 6);
  });

  it('is linear in radians', () => {
    const a = s.xFor(0);
    const b = s.xFor(Math.PI / 4);
    const c = s.xFor(Math.PI / 2);
    expect(c - b).toBeCloseTo(b - a, 6);
  });

  it('fixes the y domain at ±AMP_MAX so the amplitude change is visible', () => {
    // A y-scale that adapted to r would cancel out the very change the radius
    // slider is meant to demonstrate.
    expect(s.yFor(AMP_MAX)).toBeLessThan(s.yFor(0));
    expect(s.yFor(-AMP_MAX)).toBeGreaterThan(s.yFor(0));
    expect(s.yFor(0) - s.yFor(AMP_MAX)).toBeCloseTo(s.yFor(-AMP_MAX) - s.yFor(0), 6);
  });

  it('keeps every reachable value inside the box', () => {
    for (const v of [-AMP_MAX, -1, 0, 1, AMP_MAX]) {
      expect(s.yFor(v)).toBeGreaterThanOrEqual(0);
      expect(s.yFor(v)).toBeLessThanOrEqual(WAVE_HEIGHT);
    }
  });

  it('accepts a custom box, so the export can fill its own slot', () => {
    // 960 × 190 is the export slot. Reusing the live 512 × 176 viewBox there
    // would letterbox the strip to ~552px inside a 960px box.
    const wide = waveScales(960, 190);
    expect(wide.xFor(0)).toBeCloseTo(480, 6);
    expect(wide.xFor(2 * Math.PI)).toBeGreaterThan(wide.xFor(0));
  });
});
