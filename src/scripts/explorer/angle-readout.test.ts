import { describe, it, expect } from 'vitest';

import { buildReadout } from './angle-readout';

describe('buildReadout — whole degrees show every exact form', () => {
  it('chains degrees, turn fraction, π multiple and decimal at 30°', () => {
    const out = buildReadout(30, 1);
    expect(out.chain).toBe(
      '30^\\circ = \\frac{1}{12}\\text{ of a full turn} = \\frac{1}{12} \\times 2\\pi ' +
        '= \\frac{\\pi}{6} \\approx 0.5236\\text{ rad}',
    );
  });

  it('substitutes the unsigned angle into the arc equation', () => {
    // s = r|θ|: a length has no sign even when the sweep is clockwise.
    expect(buildReadout(-30, 1).arc).toBe(
      's = r|\\theta| = 1 \\times \\frac{\\pi}{6} \\approx 0.5236',
    );
  });

  it('scales the arc by r', () => {
    expect(buildReadout(180, 1.5).arc).toBe(
      's = r|\\theta| = 1.5 \\times \\pi \\approx 4.7124',
    );
  });

  it('speaks the exact forms as prose, with no LaTeX for a screen reader to mangle', () => {
    const out = buildReadout(30, 1);
    expect(out.spoken).toContain('1 over 12 of a full turn');
    expect(out.spoken).toContain('pi over 6');
    expect(out.spoken).not.toContain('\\');
  });
});

describe('buildReadout — non-integer degrees fall back to decimals', () => {
  it('emits no absurd reduced fraction for a typed radian value', () => {
    // 1 rad is 57.2958°, whose deg/180 has no meaningful integer reduction.
    const out = buildReadout(57.2958, 1);
    expect(out.chain).toBe('57.2958^\\circ = 1\\text{ rad}');
    expect(out.chain).not.toContain('full turn');
  });

  it('agrees with English grammar for a singular radian', () => {
    expect(buildReadout(57.2958, 1).spoken).toContain('1 radian.');
    expect(buildReadout(57.2958, 1).spoken).not.toContain('1 radians');
  });
});

describe('buildReadout — θ = 0 states the identity once', () => {
  it('collapses the chain instead of repeating zero four times', () => {
    // "0° = 0 of a full turn = 0 × 2π = 0 ≈ 0 rad" is true and useless. With the
    // 0° default this is the first mathematics every visitor reads.
    const out = buildReadout(0, 1);
    expect(out.chain).toBe('0^\\circ = 0\\text{ rad}');
    expect(out.chain).not.toContain('full turn');
    expect(out.chain).not.toContain('2\\pi');
  });

  it('uses = rather than ≈ for the arc, because r × 0 is exactly 0', () => {
    expect(buildReadout(0, 1).arc).toBe('s = r|\\theta| = 1 \\times 0 = 0');
    expect(buildReadout(0, 1.5).arc).toBe('s = r|\\theta| = 1.5 \\times 0 = 0');
    expect(buildReadout(0, 1).arc).not.toContain('\\approx');
  });

  it('speaks the collapsed form', () => {
    const out = buildReadout(0, 1);
    expect(out.spoken).toContain('0 degrees is 0 radians.');
    expect(out.spoken).not.toContain('of a full turn');
  });

  it('leaves every non-zero angle untouched', () => {
    // Regression guard: the collapse must be a θ = 0 special case, not a
    // simplification that leaks into small or negative angles.
    expect(buildReadout(1, 1).chain).toContain('full turn');
    expect(buildReadout(-30, 1).chain).toContain('full turn');
    expect(buildReadout(360, 1).chain).toContain('full turn');
  });
});
