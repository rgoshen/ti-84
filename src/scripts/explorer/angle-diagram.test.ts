import { describe, it, expect } from 'vitest';

import { buildAngleDiagramSvg, labelWidth } from './angle-diagram';
import { buildCoordinateReadout } from './angle-coordinates';
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

/**
 * Parse the coordinate label's anchor and alignment back out of the markup.
 * The attribute order here must match the order the builder emits — `data-role`
 * first, then x and y, with `text-anchor` later in the tag.
 */
function readLabel(svg: string): { x: number; y: number; anchor: string } | null {
  const match = svg.match(
    /<text data-role="coordinate-label" x="([-\d.]+)" y="([-\d.]+)"[^>]*text-anchor="(start|end)"/,
  );
  return match
    ? { x: Number(match[1]), y: Number(match[2]), anchor: match[3]! }
    : null;
}

describe('buildAngleDiagramSvg — coordinate label', () => {
  it('draws nothing when no label is supplied, leaving today\'s markup untouched', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="coordinate-label"');
  });

  it('draws the supplied text beside the terminal dot', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect(svg).toContain('(√3/2, 1/2)');
    expect(readLabel(svg)).not.toBeNull();
  });

  it('keeps the label inside the viewBox across the whole r × θ domain', () => {
    // Drives the label from the real producer (angle-coordinates.ts) rather than
    // a hardcoded string, so this test is pinned to whatever the widest label the
    // feature actually produces is — not to a length nothing else enforces. This
    // seam is test-only: angle-diagram.ts itself stays ignorant of the maths
    // modules.
    const view = 320;
    for (let r = 0.5; r <= 1.5001; r += 0.1) {
      for (let theta = -360; theta <= 360; theta += 15) {
        const roundedR = Number(r.toFixed(1));
        const labelText = buildCoordinateReadout(theta, roundedR).labelText;
        const width = labelWidth(labelText);
        const svg = buildAngleDiagramSvg({
          ...base,
          r: roundedR,
          theta,
          coordinateLabel: labelText,
        });
        const label = readLabel(svg);
        expect(label, `no label at r=${r} θ=${theta}`).not.toBeNull();
        const left = label!.anchor === 'start' ? label!.x : label!.x - width;
        const right = label!.anchor === 'start' ? label!.x + width : label!.x;
        expect(left, `overflows left at r=${r} θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(right, `overflows right at r=${r} θ=${theta}`).toBeLessThanOrEqual(view);
        expect(label!.y).toBeGreaterThanOrEqual(12);
        expect(label!.y).toBeLessThanOrEqual(view - 6);
      }
    }
  });

  it('clamps the anchor rather than flipping inward at the widest radius', () => {
    // r = 1.5, θ = 0: the dot sits at x = 292 of 320. Outward placement would run
    // the label off the right edge, so it must clamp back rather than flip inward
    // across the dot.
    const svg = buildAngleDiagramSvg({
      ...base,
      r: 1.5,
      theta: 0,
      coordinateLabel: '(1.50, 0.00)',
    });
    const label = readLabel(svg)!;
    const width = labelWidth('(1.50, 0.00)');
    expect(label.anchor).toBe('start');
    expect(label.x).toBe(320 - 4 - width);
  });

  it('never runs the label across the origin or over its own terminal dot', () => {
    const view = 320;
    const unit = 88;
    const c = view / 2;
    for (let step = 5; step <= 15; step += 1) {
      const r = step / 10;
      for (let theta = -360; theta <= 360; theta += 1) {
        const text = '(-0.80, 0.00)'; // a wide, representative label
        const svg = buildAngleDiagramSvg({ ...base, r, theta, coordinateLabel: text });
        const label = readLabel(svg)!;
        const width = labelWidth(text);
        const left = label.anchor === 'start' ? label.x : label.x - width;
        const right = label.anchor === 'start' ? label.x + width : label.x;
        expect(left < c && right > c, `crosses the origin at r=${r} θ=${theta}`).toBe(false);

        const rad = (theta * Math.PI) / 180;
        const dotX = c + r * unit * Math.cos(rad);
        const dotY = c - r * unit * Math.sin(rad);
        const overlapsDot =
          dotX >= left - 2 && dotX <= right + 2 && Math.abs(dotY - label.y) < 9;
        expect(overlapsDot, `sits on its own dot at r=${r} θ=${theta}`).toBe(false);
      }
    }
  });

  it('keeps the label outside the dot at the default view, where it fits', () => {
    // r = 1, θ = 30°: the outward anchor is x = 248.3 and "(√3/2, 1/2)" needs
    // ~62px, so 310.3 < 316 — no flip. A fixed reserved width wide enough for
    // the longest label would wrongly push this one inside the circle.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(√3/2, 1/2)',
    });
    const label = readLabel(svg)!;
    expect(label.anchor).toBe('start');
    expect(label.x).toBeGreaterThan(236.2); // outside the terminal dot
  });

  it('places the label at β + θ, so it travels with the dot it belongs to', () => {
    const atZero = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(0.87, 0.50)',
    });
    const rotated = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      beta: 90,
      coordinateLabel: '(0.87, 0.50)',
    });
    expect(readLabel(rotated)!.x).not.toBeCloseTo(readLabel(atZero)!.x, 3);
  });
});
