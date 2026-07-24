import { describe, it, expect } from 'vitest';
import { parseAngleInput, formatDegrees, formatRadiansDecimal, MAX_DEG } from './angle-parse';

/** Narrow to the success branch so the tests read cleanly. */
const deg = (raw: string, unit: 'deg' | 'rad'): number => {
  const r = parseAngleInput(raw, unit);
  if (!r.ok) throw new Error(`expected success, got: ${r.error}`);
  return r.degrees;
};

describe('parseAngleInput — degrees', () => {
  it('accepts plain and signed decimals', () => {
    expect(deg('30', 'deg')).toBeCloseTo(30, 9);
    expect(deg('-45.5', 'deg')).toBeCloseTo(-45.5, 9);
    expect(deg('  90  ', 'deg')).toBeCloseTo(90, 9);
  });

  it('accepts arithmetic', () => {
    expect(deg('180/2', 'deg')).toBeCloseTo(90, 9);
  });
});

describe('parseAngleInput — radians', () => {
  it('converts exact π expressions', () => {
    expect(deg('pi/3', 'rad')).toBeCloseTo(60, 9);
    expect(deg('2*pi/3', 'rad')).toBeCloseTo(120, 9);
    expect(deg('-pi/6', 'rad')).toBeCloseTo(-30, 9);
  });

  it('accepts the unicode π and is case-insensitive', () => {
    expect(deg('π/3', 'rad')).toBeCloseTo(60, 9);
    expect(deg('PI/3', 'rad')).toBeCloseTo(60, 9);
  });

  it('converts 1 radian to the value the 1° slider cannot reach', () => {
    expect(deg('1', 'rad')).toBeCloseTo(57.2958, 4);
  });
});

describe('parseAngleInput — rejection', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(parseAngleInput('', 'deg').ok).toBe(false);
    expect(parseAngleInput('   ', 'deg').ok).toBe(false);
  });

  it('rejects unparseable text', () => {
    expect(parseAngleInput('abc', 'deg').ok).toBe(false);
    expect(parseAngleInput('(', 'deg').ok).toBe(false);
  });

  it('rejects non-finite results', () => {
    // `1/0` is the case that actually exercises the isFinite branch: every one of
    // its characters is whitelisted, so it reaches evaluate() and returns Infinity.
    expect(parseAngleInput('1/0', 'deg').ok).toBe(false);
  });

  it('rejects characters outside the whitelist [G7]', () => {
    // `1e999` never reaches isFinite — `e` is not an allowed character, so the guard
    // rejects it first. Filing it under "non-finite" would misreport which branch is
    // covered and leave the isFinite path looking better tested than it is.
    const r = parseAngleInput('1e999', 'deg');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/numbers/i);
  });

  it('rejects values beyond the slider range', () => {
    expect(parseAngleInput('361', 'deg').ok).toBe(false);
    expect(parseAngleInput('-361', 'deg').ok).toBe(false);
    expect(parseAngleInput(String(MAX_DEG), 'deg').ok).toBe(true);
  });

  it('rejects injection-shaped input BEFORE it can reach the evaluator', () => {
    // mathjs has a documented history of sandbox-escape advisories; the whitelist
    // is the security boundary, so these must fail on the guard, not on evaluate().
    for (const attack of [
      'config',
      'import("fs")',
      'x.constructor',
      '[].map(f)',
      'evaluate("1")',
    ]) {
      const r = parseAngleInput(attack, 'deg');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/numbers/i);
    }
  });
});

describe('formatters', () => {
  it('trims float noise for display', () => {
    expect(formatDegrees(60.000000001)).toBe('60');
    expect(formatDegrees(57.29577951)).toBe('57.2958');
  });

  it('renders decimal radians', () => {
    expect(formatRadiansDecimal(180)).toBe('3.1416');
    expect(formatRadiansDecimal(0)).toBe('0');
  });
});
