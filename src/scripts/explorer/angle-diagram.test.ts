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

/**
 * Around θ ≈ 1 rad (57.296°) the `1 rad` tick label and the coordinate readout are
 * drawn at nearly the same point: the tick label sits at (r + 0.22)·unit from centre
 * and the coordinate anchor at r·unit + LABEL_GAP, about 5px apart radially on the
 * same circle. As θ approaches 1 rad the only separation left is angular, and it goes
 * to zero — so the two texts land on top of each other and neither can be read.
 *
 * Neither label can move outward to escape: at the maximum radius 1.5 the tick label
 * already sits 151px from centre inside a 160px half-viewBox. The tick's text is
 * therefore dropped for the duration of the overlap while its tick line stays drawn,
 * so the radian position remains marked even when it is not named.
 */
describe('buildAngleDiagramSvg — tick label vs coordinate label', () => {
  const tickLines = (svg: string) => (svg.match(/data-role="radian-tick"/g) ?? []).length;

  it('drops the tick text where the coordinate label would cover it', () => {
    // 60° is 1.047 rad — 2.7° from the tick, the worst of the measured 55–70° band.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 60,
      coordinateLabel: '(1/2, √3/2)',
    });
    expect(svg).not.toContain('1 rad');
  });

  it('still draws the tick line it suppressed the text for', () => {
    // Dropping the text must not drop the mark: 1 rad stays located, just unnamed.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 60,
      coordinateLabel: '(1/2, √3/2)',
    });
    expect(tickLines(svg)).toBe(1);
  });

  it('keeps the tick text when the sweep is well short of it', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect(svg).toContain('1 rad');
  });

  it('keeps the tick text once the sweep has moved past it', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 90,
      coordinateLabel: '(0, 1)',
    });
    expect(svg).toContain('1 rad');
  });

  it('keeps the tick text when there is no coordinate label to collide with', () => {
    // Suppression is a response to a specific overlap, not a property of the angle.
    const svg = buildAngleDiagramSvg({ ...base, theta: 60 });
    expect(svg).toContain('1 rad');
  });

  it('suppresses only the overlapping tick, not every tick on the figure', () => {
    // 60° into the second radian: the 1 rad tick is far behind the terminal point
    // and must keep its text while the 2 rad tick, sitting under the label, loses it.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 118, // 2.06 rad — just past the 2 rad tick
      coordinateLabel: '(-0.47, 0.88)',
    });
    expect(svg).toContain('1 rad');
    expect(svg).not.toContain('2 rad');
    expect(tickLines(svg)).toBe(2);
  });
});

/** Pull a projection leg's endpoints back out of the markup. */
function readLeg(svg: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const m = svg.match(
    /<line data-role="projection-leg" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/,
  );
  return m
    ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }
    : null;
}

const legLength = (svg: string): number => {
  const l = readLeg(svg)!;
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

/** The builder's default pixels-per-unit. */
const UNIT = 88;

describe('buildAngleDiagramSvg — projection leg', () => {
  it('draws nothing when no projection is asked for, leaving today\'s markup untouched', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="projection-leg"');
  });

  it('draws the sin leg with length r·|sin θ| — the wave\'s own height', () => {
    // THE core invariant. The highlighted leg and the strip's plotted height are
    // the same quantity, which is what replaces the tie-line the stacked layout
    // cannot draw.
    for (const theta of [30, 45, 137, 210, -60, 300]) {
      for (const r of [0.5, 1, 1.5]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, r, projection: 'sin' });
        const expected = r * Math.abs(Math.sin((theta * Math.PI) / 180)) * UNIT;
        expect(legLength(svg)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('draws the cos leg with length r·|cos θ|', () => {
    for (const theta of [30, 45, 137, 210, -60, 300]) {
      for (const r of [0.5, 1, 1.5]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, r, projection: 'cos' });
        const expected = r * Math.abs(Math.cos((theta * Math.PI) / 180)) * UNIT;
        expect(legLength(svg)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('keeps the leg\'s length invariant under β while its endpoints move', () => {
    // β rotates the figure as a rigid body, so the leg must be computed in the
    // rotated frame. A leg built in the unrotated frame would change length.
    const at = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 50, beta, projection: 'sin' });
    expect(legLength(at(0))).toBeCloseTo(legLength(at(37)), 6);
    expect(legLength(at(0))).toBeCloseTo(legLength(at(-140)), 6);
    expect(readLeg(at(0))).not.toEqual(readLeg(at(37)));
  });

  it('anchors the cos leg at the origin', () => {
    const l = readLeg(buildAngleDiagramSvg({ ...base, theta: 50, projection: 'cos' }))!;
    expect(l.x1).toBeCloseTo(160, 6); // view 320 / 2
    expect(l.y1).toBeCloseTo(160, 6);
  });

  it('anchors the sin leg at the terminal point', () => {
    const l = readLeg(buildAngleDiagramSvg({ ...base, theta: 50, projection: 'sin' }))!;
    const rad = (50 * Math.PI) / 180;
    expect(l.x1).toBeCloseTo(160 + UNIT * Math.cos(rad), 6);
    expect(l.y1).toBeCloseTo(160 - UNIT * Math.sin(rad), 6);
  });

  it('draws the leg in the wave colour, so the strip and the circle agree', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 50, projection: 'sin' });
    expect(svg).toContain(`data-role="projection-leg"`);
    expect(svg.match(/<line data-role="projection-leg"[^>]*>/)![0]).toContain(colors.wave);
  });

  it('collapses to zero length rather than vanishing when the coordinate is 0', () => {
    // sin 0° = 0 and cos 90° = 0. A zero-length line is honest; omitting the
    // element would read as "no projection selected".
    expect(legLength(buildAngleDiagramSvg({ ...base, theta: 0, projection: 'sin' }))).toBeCloseTo(0, 6);
    expect(legLength(buildAngleDiagramSvg({ ...base, theta: 90, projection: 'cos' }))).toBeCloseTo(0, 6);
  });
});

describe('buildAngleDiagramSvg — angle units', () => {
  it('draws radian counting ticks by default, unchanged from before', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).toContain('1 rad');
  });

  it('draws quarter-turn counting ticks in degrees mode', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 260, angleUnit: 'deg' });
    expect(svg).toContain('90°');
    expect(svg).toContain('180°');
    expect(svg).not.toContain('1 rad');
  });
});

describe('buildAngleDiagramSvg — standard angles', () => {
  it("draws nothing when off, leaving today's markup untouched", () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30 });
    expect(svg).not.toContain('data-role="standard-angle"');
  });

  it('draws all sixteen marks when on', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30, showStandardAngles: true });
    expect((svg.match(/data-role="standard-angle"/g) ?? []).length).toBe(16);
  });

  it('labels in degrees when angleUnit is deg', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 0,
      showStandardAngles: true,
      angleUnit: 'deg',
    });
    expect(svg).toContain('30°');
    expect(svg).toContain('330°');
  });

  it('labels in radians when angleUnit is rad', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 0,
      showStandardAngles: true,
      angleUnit: 'rad',
    });
    expect(svg).toContain('π/6');
    expect(svg).toContain('11π/6');
  });

  it('rotates the ring with β', () => {
    const atZero = buildAngleDiagramSvg({ ...base, theta: 0, beta: 0, showStandardAngles: true });
    const rotated = buildAngleDiagramSvg({ ...base, theta: 0, beta: 45, showStandardAngles: true });
    expect(rotated).not.toBe(atZero);
  });

  it('is independent of θ — the ring itself never changes with the sweep', () => {
    const marksOnly = (svg: string) =>
      [...svg.matchAll(/<g data-role="standard-angle">.*?<\/g>/g)].join('');
    const at0 = buildAngleDiagramSvg({ ...base, theta: 0, showStandardAngles: true });
    const at200 = buildAngleDiagramSvg({ ...base, theta: 200, showStandardAngles: true });
    expect(marksOnly(at0)).toBe(marksOnly(at200));
  });
});

describe('buildAngleDiagramSvg — three-way label priority', () => {
  it('drops the duplicate counting-tick text where it exactly matches a standard mark (degrees mode)', () => {
    // At θ = 260° the quarter-turn counting ticks land at 90° and 180° — two of
    // the sixteen standard angles. Both systems would print the identical text
    // "90°" / "180°" at the identical position; only the standard mark's copy
    // should survive.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 260,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect([...svg.matchAll(/>90°</g)]).toHaveLength(1);
    expect([...svg.matchAll(/>180°</g)]).toHaveLength(1);
  });

  it('keeps the counting-tick LINE even though its duplicate text is dropped', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 260,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect((svg.match(/data-role="radian-tick"/g) ?? []).length).toBe(2);
  });

  it('drops the counting-tick text on a near-miss too (radians mode: 1 rad vs π/3)', () => {
    // 1 rad = 57.3°, 2.7° from the 60° standard mark — the same near-miss band
    // the original coordinate-label suppression test already exercises.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 60,
      angleUnit: 'rad',
      showStandardAngles: true,
    });
    expect(svg).toContain('π/3'); // the standard label survives
    expect(svg).not.toContain('1 rad'); // the counting tick's text yields
  });

  it('a standard-angle label yields to the coordinate label (priority 1 beats priority 2)', () => {
    // At θ = 30° the terminal dot — and the coordinate label anchored to it —
    // sits at exactly the same angle as the 30° standard mark, only ~5px of
    // radius apart. The coordinate label always wins.
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      angleUnit: 'deg',
      showStandardAngles: true,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect(svg).toContain('(√3/2, 1/2)');
    expect([...svg.matchAll(/>30°</g)]).toHaveLength(0);
  });

  it('keeps the standard-angle tick LINE even though its label yields to the coordinate label', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      theta: 30,
      angleUnit: 'deg',
      showStandardAngles: true,
      coordinateLabel: '(√3/2, 1/2)',
    });
    expect((svg.match(/data-role="standard-angle"/g) ?? []).length).toBe(16);
  });

  it('never suppresses a standard label with no real collision', () => {
    // Sanity check: with no coordinate label and no counting-tick overlap, all
    // sixteen standard labels render.
    const svg = buildAngleDiagramSvg({ ...base, theta: 0, showStandardAngles: true });
    const texts = [...svg.matchAll(/<g data-role="standard-angle">.*?<text[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    );
    expect(texts).toHaveLength(16);
  });

  it('suppresses a 15°-apart neighbor label at small radius, keeping the earlier angle', () => {
    // The label ring radius is (r + 0.22) × 88px — at r = 0.5 that's small
    // enough that 45° and 60°, the closest pair of standard angles at only
    // 15° apart, collide with EACH OTHER rather than with the coordinate
    // label. STANDARD_ANGLES' own ascending order breaks the tie: 45° (the
    // smaller angle) keeps its text, 60° yields.
    const svg = buildAngleDiagramSvg({
      ...base,
      r: 0.5,
      theta: 0,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect(svg).toContain('>45°<');
    expect(svg).not.toContain('>60°<');
  });

  it('keeps both standard-angle tick LINES even when one label yields to its neighbor', () => {
    const svg = buildAngleDiagramSvg({
      ...base,
      r: 0.5,
      theta: 0,
      angleUnit: 'deg',
      showStandardAngles: true,
    });
    expect((svg.match(/data-role="standard-angle"/g) ?? []).length).toBe(16);
  });
});

function readTangentSegment(svg: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const m = svg.match(
    /<line data-role="tangent-segment" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/,
  );
  return m ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) } : null;
}

const tangentSegmentLength = (svg: string): number => {
  const l = readTangentSegment(svg)!;
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

describe('buildAngleDiagramSvg — tangent segment', () => {
  it('draws nothing for sin/cos/undefined, and no old-style projection-leg for tan', () => {
    expect(buildAngleDiagramSvg({ ...base, theta: 30 })).not.toContain('tangent-segment');
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'sin' })).not.toContain(
      'tangent-segment',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'tan' })).not.toContain(
      'data-role="projection-leg"',
    );
  });

  it('has length |tan θ| · unit, for any β and any r — unclamped', () => {
    // Kept well inside ±60° so the segment never clamps at the default view,
    // plus 135° and -135° to test the sign-flip branch when cos(θ) is negative.
    for (const theta of [10, 30, 45, -20, -55, 135, -135]) {
      for (const beta of [0, 40, -90]) {
        for (const r of [0.5, 1, 1.5]) {
          const svg = buildAngleDiagramSvg({ ...base, theta, beta, r, projection: 'tan' });
          const expected = Math.abs(Math.tan((theta * Math.PI) / 180)) * UNIT;
          expect(tangentSegmentLength(svg)).toBeCloseTo(expected, 4);
        }
      }
    }
  });

  it('is unchanged by r — the same cancellation, now in the figure', () => {
    const at = (r: number) => buildAngleDiagramSvg({ ...base, theta: 40, r, projection: 'tan' });
    expect(tangentSegmentLength(at(0.5))).toBeCloseTo(tangentSegmentLength(at(1.5)), 4);
  });

  it('places the segment endpoint at tan(θ)·unit off the tangent point when θ is obtuse, testing the sign-flip branch', () => {
    // At θ = -135°, β = 0, r = 1: tan(-135°) = 1, well under capMax (≈1.4637 at the
    // default view/unit) — this angle is intentionally chosen to stay UNCLAMPED, so
    // the expected endpoint is the plain, unclamped construction: T = (unit, 0) offset
    // by tan(θ)·unit in the direction perpendicular to the initial side (angle β + 90°),
    // matching the source's capMax/cappedTan construction in angle-diagram.ts without
    // that clamp ever engaging. This verifies the sign-flip specifically: at an obtuse
    // angle the endpoint lands on the opposite side of T from the standard acute case.
    const svg = buildAngleDiagramSvg({ ...base, theta: -135, beta: 0, r: 1, projection: 'tan' });
    const seg = readTangentSegment(svg)!;

    const theta = -135;
    const beta = 0;
    const c = 160; // half of 320×320 viewBox
    const unit = 88;
    const thetaRad = (theta * Math.PI) / 180;
    const betaRad = (beta * Math.PI) / 180;

    const rawTan = Math.tan(thetaRad);
    const maxDist = c - 4; // LABEL_MARGIN = 4
    const capMax = Math.sqrt(maxDist ** 2 - unit ** 2) / unit;
    expect(Math.abs(rawTan)).toBeLessThan(capMax); // sanity: confirms this case stays unclamped

    const perpRad = betaRad + Math.PI / 2;
    const expectedX2 = c + unit * Math.cos(betaRad) + rawTan * unit * Math.cos(perpRad);
    const expectedY2 = c - unit * Math.sin(betaRad) - rawTan * unit * Math.sin(perpRad);

    expect(seg.x2).toBeCloseTo(expectedX2, 2);
    expect(seg.y2).toBeCloseTo(expectedY2, 2);
  });

  it('collapses to zero length at θ = 0, drawn with a round cap so it stays visible', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 0, projection: 'tan' });
    expect(tangentSegmentLength(svg)).toBeCloseTo(0, 6);
    expect(svg.match(/<line data-role="tangent-segment"[^>]*>/)![0]).toContain(
      'stroke-linecap="round"',
    );
  });

  it('draws a dashed extension from the terminal point to the segment endpoint', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, projection: 'tan' });
    expect(svg).toContain('data-role="tangent-extension"');
    expect(svg.match(/<line data-role="tangent-extension"[^>]*>/)![0]).toContain(
      'stroke-dasharray',
    );
  });

  it('draws both elements in the wave colour', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, projection: 'tan' });
    expect(svg.match(/<line data-role="tangent-segment"[^>]*>/)![0]).toContain(colors.wave);
    expect(svg.match(/<line data-role="tangent-extension"[^>]*>/)![0]).toContain(colors.wave);
  });

  it('never leaves the viewBox near an asymptote, across β', () => {
    for (const beta of [0, 90, -45, 180]) {
      for (const theta of [88, 89, 89.9, -89, -89.9]) {
        const svg = buildAngleDiagramSvg({ ...base, theta, beta, projection: 'tan' });
        const seg = readTangentSegment(svg)!;
        for (const v of [seg.x1, seg.x2]) {
          expect(v, `x out of range θ=${theta} β=${beta}`).toBeGreaterThanOrEqual(0);
          expect(v, `x out of range θ=${theta} β=${beta}`).toBeLessThanOrEqual(320);
        }
        for (const v of [seg.y1, seg.y2]) {
          expect(v, `y out of range θ=${theta} β=${beta}`).toBeGreaterThanOrEqual(0);
          expect(v, `y out of range θ=${theta} β=${beta}`).toBeLessThanOrEqual(320);
        }
      }
    }
  });

  it('keeps the length invariant under β while its endpoints move, matching the sin/cos legs', () => {
    const at = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 40, beta, projection: 'tan' });
    expect(tangentSegmentLength(at(0))).toBeCloseTo(tangentSegmentLength(at(75)), 4);
    expect(readTangentSegment(at(0))).not.toEqual(readTangentSegment(at(75)));
  });

  it('keeps the endpoint ON the tangent line near an asymptote, even when clamped', () => {
    // Regression guard: the old clamp shortened the segment along the terminal
    // ray, which pulled E off the x = 1 tangent line as θ approached 90°. The
    // fix clamps |tan θ| directly, so E's x-coordinate must always equal the
    // tangent point's x-coordinate — clamped or not.
    const svg = buildAngleDiagramSvg({ ...base, theta: 89, projection: 'tan' });
    const seg = readTangentSegment(svg)!;
    const c = 160;
    const unit = 88;
    const betaRad = 0;
    const tangentPointX = c + unit * Math.cos(betaRad);
    expect(seg.x2).toBeCloseTo(tangentPointX, 6);
  });
});

describe('buildAngleDiagramSvg — standard-angle labels stay inside the frame', () => {
  const view = 320;

  // Standard marks are independent of θ (see the previous describe block), so
  // the domain that matters is r × β, not r × θ — sweeping θ here would only
  // repeat the same sixteen positions. β rotates the whole ring, so sweeping it
  // is equivalent to checking every possible orientation of the ring.
  it('never leaves the viewBox across r ∈ [0.5, 1.5] × β ∈ [-360, 360], in either unit', () => {
    for (const angleUnit of ['deg', 'rad'] as const) {
      for (let r = 0.5; r <= 1.5001; r += 0.1) {
        for (let beta = -360; beta <= 360; beta += 30) {
          const roundedR = Number(r.toFixed(1));
          const svg = buildAngleDiagramSvg({
            ...base,
            r: roundedR,
            theta: 0,
            beta,
            angleUnit,
            showStandardAngles: true,
          });
          const texts = [
            ...svg.matchAll(
              /<g data-role="standard-angle">.*?<text[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*>([^<]*)</g,
            ),
          ];
          for (const [, xStr, yStr, label] of texts) {
            const x = Number(xStr);
            const y = Number(yStr);
            const halfWidth = labelWidth(label!, 9) / 2;
            expect(
              x - halfWidth,
              `left overflow "${label}" r=${roundedR} β=${beta} unit=${angleUnit}`,
            ).toBeGreaterThanOrEqual(0);
            expect(
              x + halfWidth,
              `right overflow "${label}" r=${roundedR} β=${beta} unit=${angleUnit}`,
            ).toBeLessThanOrEqual(view);
            expect(y, `top overflow "${label}"`).toBeGreaterThanOrEqual(0);
            expect(y, `bottom overflow "${label}"`).toBeLessThanOrEqual(view);
          }
        }
      }
    }
  });
});

describe('buildAngleDiagramSvg — standard-angle labels never collide with each other', () => {
  // Same r × β domain as the viewBox sweep above, but checking VISIBLE
  // standard labels pairwise against each other instead of against the
  // frame — this is what caught the 15°-apart-neighbor collision at small r
  // that the viewBox sweep alone could not see (every label individually fit
  // inside the frame; two of them just also overlapped each other).
  it('no two visible standard labels overlap, across r ∈ [0.5, 1.5] × β ∈ [-360, 360], in either unit', () => {
    for (const angleUnit of ['deg', 'rad'] as const) {
      for (let r = 0.5; r <= 1.5001; r += 0.1) {
        for (let beta = -360; beta <= 360; beta += 30) {
          const roundedR = Number(r.toFixed(1));
          const svg = buildAngleDiagramSvg({
            ...base,
            r: roundedR,
            theta: 0,
            beta,
            angleUnit,
            showStandardAngles: true,
          });
          const boxes = [
            ...svg.matchAll(
              /<g data-role="standard-angle">.*?<text[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*>([^<]*)</g,
            ),
          ].map(([, xStr, yStr, text]) => {
            const x = Number(xStr);
            const y = Number(yStr);
            const halfWidth = labelWidth(text!, 9) / 2;
            const halfHeight = 9 * 0.6; // mirrors labelHalfHeight(TICK_FONT_SIZE)
            return {
              text,
              left: x - halfWidth,
              right: x + halfWidth,
              top: y - halfHeight,
              bottom: y + halfHeight,
            };
          });
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i]!;
              const b = boxes[j]!;
              const collide =
                a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
              expect(
                collide,
                `"${a.text}" overlaps "${b.text}" at r=${roundedR} β=${beta} unit=${angleUnit}`,
              ).toBe(false);
            }
          }
        }
      }
    }
  });
});

/** Pull one pole mark's solid-segment endpoints back out of the markup, by role. */
function readSegment(
  svg: string,
  role: string,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const m = svg.match(
    new RegExp(
      `<line data-role="${role}" x1="([-\\d.]+)" y1="([-\\d.]+)" x2="([-\\d.]+)" y2="([-\\d.]+)"`,
    ),
  );
  return m ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) } : null;
}

const segmentLength = (svg: string, role: string): number => {
  const l = readSegment(svg, role)!;
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

describe('buildAngleDiagramSvg — secant segment', () => {
  it('draws nothing for sin/cos/undefined, and no tan-shaped or old-style marks for sec', () => {
    expect(buildAngleDiagramSvg({ ...base, theta: 30 })).not.toContain(
      'data-role="secant-segment"',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'sin' })).not.toContain(
      'data-role="secant-segment"',
    );
    const svg = buildAngleDiagramSvg({ ...base, theta: 30, projection: 'sec' });
    expect(svg).not.toContain('data-role="projection-leg"');
    expect(svg).not.toContain('data-role="tangent-segment"');
    expect(svg).not.toContain('data-role="tangent-extension"');
  });

  it("has length |sec θ| · unit, for any β and any r — unclamped, reusing tan's own theta set", () => {
    // Same theta set tan's own unclamped length test uses: every value keeps
    // |tan θ| under capMax (≈1.4637 at the default view/unit), and sec reuses
    // that exact clamp, so this is the same "stays unclamped" guarantee.
    for (const theta of [10, 30, 45, -20, -55, 135, -135]) {
      for (const beta of [0, 40, -90]) {
        for (const r of [0.5, 1, 1.5]) {
          const svg = buildAngleDiagramSvg({ ...base, theta, beta, r, projection: 'sec' });
          const expected = Math.abs(1 / Math.cos((theta * Math.PI) / 180)) * UNIT;
          expect(segmentLength(svg, 'secant-segment')).toBeCloseTo(expected, 4);
        }
      }
    }
  });

  it('reuses tan\'s exact clamp: at θ=89°, |O→T| equals maxDist, the bound tan\'s own near-asymptote test already exercises', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 89, projection: 'sec' });
    const c = 160; // half of 320×320 viewBox
    const maxDist = c - 4; // LABEL_MARGIN = 4
    expect(segmentLength(svg, 'secant-segment')).toBeCloseTo(maxDist, 4);
  });

  it('keeps the length invariant under β, matching tan\'s own leg', () => {
    const at = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 40, beta, projection: 'sec' });
    expect(segmentLength(at(0), 'secant-segment')).toBeCloseTo(
      segmentLength(at(75), 'secant-segment'),
      4,
    );
  });

  it('draws the dashed extension from the tangent point to the segment endpoint, in the wave colour', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, projection: 'sec' });
    expect(svg).toContain('data-role="secant-extension"');
    const dashed = svg.match(/<line data-role="secant-extension"[^>]*>/)![0];
    expect(dashed).toContain('stroke-dasharray');
    expect(dashed).toContain(colors.wave);
  });
});

describe('buildAngleDiagramSvg — cosecant and cotangent segments', () => {
  // Both share one cap, driven by cot's raw value — so both stay unclamped
  // exactly when |cot θ| stays under capMax (≈1.4637), which holds well away
  // from cot's own poles at 0°/180°. Centred on 90°, mirroring csc/cot's own
  // branch centre.
  const nearNinety = [45, 60, 70, 110, 120, 135, -45, -60, -70, -110, -120, -135];

  it('draws nothing for sin/cos/tan/undefined', () => {
    expect(buildAngleDiagramSvg({ ...base, theta: 30 })).not.toContain(
      'data-role="cosecant-segment"',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30 })).not.toContain(
      'data-role="cotangent-segment"',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'cos' })).not.toContain(
      'data-role="cotangent-segment"',
    );
    expect(buildAngleDiagramSvg({ ...base, theta: 30, projection: 'tan' })).not.toContain(
      'data-role="cosecant-segment"',
    );
  });

  it('has length |csc θ| · unit, for any β and any r — unclamped', () => {
    for (const theta of nearNinety) {
      for (const beta of [0, 40, -90]) {
        for (const r of [0.5, 1, 1.5]) {
          const svg = buildAngleDiagramSvg({ ...base, theta, beta, r, projection: 'csc' });
          const expected = Math.abs(1 / Math.sin((theta * Math.PI) / 180)) * UNIT;
          expect(segmentLength(svg, 'cosecant-segment')).toBeCloseTo(expected, 4);
        }
      }
    }
  });

  it('has length |cot θ| · unit, for any β and any r — unclamped', () => {
    for (const theta of nearNinety) {
      for (const beta of [0, 40, -90]) {
        for (const r of [0.5, 1, 1.5]) {
          const svg = buildAngleDiagramSvg({ ...base, theta, beta, r, projection: 'cot' });
          const expected = Math.abs(1 / Math.tan((theta * Math.PI) / 180)) * UNIT;
          expect(segmentLength(svg, 'cotangent-segment')).toBeCloseTo(expected, 4);
        }
      }
    }
  });

  it('keeps the length invariant under β for both csc and cot', () => {
    const cscAt = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 60, beta, projection: 'csc' });
    const cotAt = (beta: number) =>
      buildAngleDiagramSvg({ ...base, theta: 60, beta, projection: 'cot' });
    expect(segmentLength(cscAt(0), 'cosecant-segment')).toBeCloseTo(
      segmentLength(cscAt(75), 'cosecant-segment'),
      4,
    );
    expect(segmentLength(cotAt(0), 'cotangent-segment')).toBeCloseTo(
      segmentLength(cotAt(75), 'cotangent-segment'),
      4,
    );
  });

  it('keeps the clamped endpoint exactly on its tangent line near θ=0 — meetC.y equals anchorB.y at β=0', () => {
    // The B-side twin of the existing tan test that pins the tangent
    // segment's x-coordinate to the tangent point's x-coordinate: the
    // tangent line at B is horizontal, so here it is meetC's y that must stay
    // locked to anchorB's y, clamped or not.
    const c = 160;
    const unit = 88;
    for (const theta of [1, 5, 10, -1, -5]) {
      const svg = buildAngleDiagramSvg({ ...base, theta, beta: 0, projection: 'cot' });
      const seg = readSegment(svg, 'cotangent-segment')!;
      expect(seg.x1).toBeCloseTo(c, 6); // anchorB.x at β=0
      expect(seg.y1).toBeCloseTo(c - unit, 6); // anchorB.y at β=0
      expect(seg.y2).toBeCloseTo(seg.y1, 6); // meetC.y === anchorB.y
    }
  });

  it('collapses to zero length at θ=90° for cot, drawn with a round cap so it stays visible', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 90, projection: 'cot' });
    expect(segmentLength(svg, 'cotangent-segment')).toBeCloseTo(0, 6);
    expect(svg.match(/<line data-role="cotangent-segment"[^>]*>/)![0]).toContain(
      'stroke-linecap="round"',
    );
  });

  it('emits no NaN in the markup at θ=0, where cot and csc are both undefined but still drawn clamped', () => {
    for (const fn of ['cot', 'csc'] as const) {
      const svg = buildAngleDiagramSvg({ ...base, theta: 0, projection: fn });
      expect(svg).not.toContain('NaN');
    }
  });

  it('draws the dashed guides in the wave colour: the terminal ray for cot, the closing leg for csc', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 40, beta: 0, projection: 'cot' });
    expect(svg).toContain('data-role="cotangent-extension"');
    expect(svg.match(/<line data-role="cotangent-extension"[^>]*>/)![0]).toContain(colors.wave);

    const cscSvg = buildAngleDiagramSvg({ ...base, theta: 40, beta: 0, projection: 'csc' });
    expect(cscSvg).toContain('data-role="cosecant-extension"');
    expect(cscSvg.match(/<line data-role="cosecant-extension"[^>]*>/)![0]).toContain(colors.wave);
  });
});

describe('buildAngleDiagramSvg — pole marks do not cross-contaminate', () => {
  it('sec emits none of tan\'s marks and no old-style projection-leg', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30, projection: 'sec' });
    expect(svg).not.toContain('data-role="tangent-segment"');
    expect(svg).not.toContain('data-role="tangent-extension"');
    expect(svg).not.toContain('data-role="projection-leg"');
  });

  it('cot emits none of tan\'s, sec\'s, or csc\'s marks', () => {
    const svg = buildAngleDiagramSvg({ ...base, theta: 30, projection: 'cot' });
    expect(svg).not.toContain('data-role="tangent-segment"');
    expect(svg).not.toContain('data-role="secant-segment"');
    expect(svg).not.toContain('data-role="cosecant-segment"');
    expect(svg).not.toContain('data-role="projection-leg"');
  });
});
