import { describe, it, expect } from 'vitest';
import { equationToTex } from './equation-tex';

describe('equationToTex', () => {
  it('renders both sides of an equation joined by =', () => {
    const tex = equationToTex('3y + 2x = 6');
    expect(tex).toContain('=');
    expect(tex).toContain('y');
    expect(tex).toContain('6');
  });

  it('renders a relation that mathjs.parse would reject as a whole', () => {
    const tex = equationToTex('x^2 + y^2 = 25');
    expect(tex).not.toBeNull();
    expect(tex).toContain('25');
  });

  it('renders a bare expression', () => {
    expect(equationToTex('sin(x)')).toBe('\\sin\\left( x\\right)');
  });

  it('returns null when a side cannot be parsed', () => {
    expect(equationToTex('@@@ = 6')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(equationToTex('   ')).toBeNull();
  });

  it('returns null when there is more than one equals sign', () => {
    expect(equationToTex('y = x = 3')).toBeNull();
  });
});
