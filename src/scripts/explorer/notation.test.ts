import { describe, it, expect } from 'vitest';
import { describeReadout, type ReadoutInput } from './notation';
import type { Window2D } from '@/scripts/graphing/math';
import type { EndBehavior } from './limits';

const WIN: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
const UNKNOWN: EndBehavior = { kind: 'unknown' };

const base = {
  win: WIN,
  endNeg: UNKNOWN,
  endPos: UNKNOWN,
  asymptotes: [],
} satisfies Partial<ReadoutInput>;

describe('describeReadout — arrow-notation precedence', () => {
  it('names a wall approached from the right (even pole, →+∞)', () => {
    const r = describeReadout({
      ...base,
      x: 0.02,
      fx: 2500,
      pin: 'top',
      asymptotes: [{ x: 0, leftSign: 1, rightSign: 1 }],
    });
    expect(r.headline).toContain('x → 0⁺');
    expect(r.headline).toContain('f(x) → ∞');
  });

  it('names a wall approached from the left of an odd pole (→−∞)', () => {
    const r = describeReadout({
      ...base,
      x: -0.02,
      fx: -2500,
      pin: 'bottom',
      asymptotes: [{ x: 0, leftSign: -1, rightSign: 1 }],
    });
    expect(r.headline).toContain('x → 0⁻');
    expect(r.headline).toContain('f(x) → −∞');
  });

  it('reports a horizontal asymptote at the +∞ edge', () => {
    const r = describeReadout({
      ...base,
      x: 3.95,
      fx: 0.001,
      pin: 'onscreen',
      endPos: { kind: 'finite', value: 0, approach: '+' },
    });
    expect(r.headline).toContain('x → ∞');
    expect(r.headline).toContain('f(x) → 0⁺');
  });

  it('reports unbounded growth at the +∞ edge', () => {
    const r = describeReadout({
      ...base,
      x: 3.95,
      fx: 1e6,
      pin: 'top',
      endPos: { kind: 'posInf' },
    });
    expect(r.headline).toContain('x → ∞');
    expect(r.headline).toContain('f(x) → ∞');
  });

  it('gives a neutral note (no false arrow) for an oscillating tail', () => {
    const r = describeReadout({ ...base, x: 3.95, fx: 0.5, pin: 'onscreen', endPos: UNKNOWN });
    expect(r.headline).toContain('x → ∞');
    expect(r.note.toLowerCase()).toContain('oscillat');
  });

  it('falls back to f(x) = value mid-window', () => {
    const r = describeReadout({ ...base, x: 1, fx: 1, pin: 'onscreen' });
    expect(r.headline).toBe('f(1) = 1');
  });

  it('shows → ∞ (not a clipped number) when the point is pinned off-screen mid-window', () => {
    const r = describeReadout({ ...base, x: 1, fx: null, pin: 'top' });
    expect(r.headline).toContain('→ ∞');
  });

  it('picks the nearest wall when several are in range', () => {
    const r = describeReadout({
      ...base,
      x: 1.9,
      fx: 500,
      pin: 'top',
      asymptotes: [
        { x: -2, leftSign: 1, rightSign: 1 },
        { x: 2, leftSign: 1, rightSign: -1 },
      ],
    });
    expect(r.headline).toContain('x → 2⁻');
  });
});
