import { describe, it, expect } from 'vitest';

import { buildAngleDiagramSvg } from './angle-diagram';
import { explorerColors } from '@/scripts/graphing/theme';

const colors = explorerColors(false);
const tickText = '#334155';

const base = { r: 1, beta: 0, colors, tickText };

describe('buildAngleDiagramSvg', () => {
  it('draws no arrowhead at θ = 0 — the measure arc and its head vanish together [G4]', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 0 });
    expect(svg).not.toContain('<polygon');
  });

  it('splits a full 360° sweep across two A commands, or the arc renders as nothing', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 360 });
    const hasTwoArcCommands = [...svg.matchAll(/d="([^"]*)"/g)].some(
      (m) => (m[1].match(/A/g) ?? []).length === 2,
    );
    expect(hasTwoArcCommands).toBe(true);
  });

  it('always labels the first whole-radian tick', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).toContain('1 rad');
  });

  it('rotates the whole figure when β changes — every element carries betaRad', () => {
    const atZero = buildAngleDiagramSvg({ ...base, theta: 30, beta: 0 });
    const rotated = buildAngleDiagramSvg({ ...base, theta: 30, beta: 45 });
    expect(rotated).not.toBe(atZero);
  });
});
