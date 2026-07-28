/**
 * Pure SVG-markup builder for the Angle Explorer diagram.
 *
 * `AngleExplorer.tsx` and the PNG/PDF export both need to draw the exact same
 * circle-and-sweep figure — the live component in its own themed `<svg>`, the
 * export artifact into a plain string dropped into a detached DOM node. Rather
 * than duplicate the geometry in two places (and risk them drifting), both
 * consume this single builder. It returns only the INNER markup — the caller
 * owns the outer `<svg>` tag, its viewBox, and its accessible name.
 *
 * DOM-free by construction (string concatenation, no `document`), so it
 * unit-tests in the node environment exactly like `angle-render.ts`.
 */
import type { ExplorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians } from '@/scripts/explorer/angle';
import {
  arcPath,
  arrowheadPoints,
  polarToCartesian,
  tickAngles,
} from '@/scripts/explorer/angle-render';

export interface AngleDiagramOptions {
  /** Swept angle, in degrees. */
  theta: number;
  /** Circle radius, in units (1 = the dashed reference unit circle). */
  r: number;
  /** Rotation of the whole figure, in degrees. */
  beta: number;
  colors: ExplorerColors;
  /** Stroke colour for the whole-radian tick labels. */
  tickText: string;
  /** viewBox side length, in px. Defaults to the live diagram's 320. */
  view?: number;
  /** Pixels per unit radius. Defaults to the live diagram's 88. */
  unit?: number;
  /** Radius of the small angle-measure arc, in units. Defaults to 0.3. */
  measureR?: number;
  /**
   * Pre-formatted coordinate text for the terminal point, e.g. `(√3/2, 1/2)`.
   * Supplied by `angle-coordinates.ts` — this builder deliberately knows nothing
   * about exact maths. Omitted or empty draws no label.
   */
  coordinateLabel?: string;
}

/**
 * Horizontal space the coordinate label occupies, in viewBox units. This builder
 * is a pure string function with no font metrics, so overflow is tested against a
 * reserved constant rather than measured text. Sized for the widest pair the
 * feature produces — `(-0.71, -0.71)` at font-size 10 — with margin.
 *
 * Exported so the placement test asserts against this value rather than a copy
 * of it; a test with its own duplicate constant silently stops testing the real
 * one the moment they diverge.
 */
export const LABEL_WIDTH = 96;
/** Radial gap between the terminal dot and the label anchor, in px. */
const LABEL_GAP = 14;
/** Keep-out margin at the viewBox edges, in px. */
const LABEL_MARGIN = 4;

/**
 * The coordinate label, anchored beside the terminal dot and clamped so no
 * combination of r and θ can push it out of the viewBox.
 *
 * Placement is outward from the dot with the text growing away from the figure.
 * At large r that would clip the edge, so it flips to the inward side and swaps
 * the alignment. The inward flip cannot collide with the angle-measure arc: it
 * only triggers at radii where the inward anchor is still far outside that arc's
 * 0.3-unit radius.
 *
 * LABEL_WIDTH is deliberately conservative — wider than the text actually is —
 * so the failure mode is flipping inward slightly sooner than strictly necessary
 * rather than clipping. An early flip is still perfectly readable; a clipped
 * label is not.
 */
function coordinateLabelMarkup(
  c: number,
  dotRadiusPx: number,
  endRad: number,
  view: number,
  text: string,
  fill: string,
): string {
  const outward = polarToCartesian(c, c, dotRadiusPx + LABEL_GAP, endRad);
  const rightSide = outward.x >= c;

  let anchorX = outward.x;
  let anchorY = outward.y;
  let textAnchor = rightSide ? 'start' : 'end';

  const overflows = rightSide
    ? anchorX + LABEL_WIDTH > view - LABEL_MARGIN
    : anchorX - LABEL_WIDTH < LABEL_MARGIN;

  if (overflows) {
    const inward = polarToCartesian(c, c, Math.max(dotRadiusPx - LABEL_GAP, 0), endRad);
    anchorX = inward.x;
    anchorY = inward.y;
    textAnchor = rightSide ? 'end' : 'start';
  }

  const y = Math.min(Math.max(anchorY, 12), view - 6);
  return (
    `<text data-role="coordinate-label" x="${anchorX}" y="${y}" fill="${fill}" ` +
    `font-size="10" font-weight="600" text-anchor="${textAnchor}" ` +
    `dominant-baseline="middle">${text}</text>`
  );
}

/**
 * Build the diagram's SVG children as a markup string — reference axes, the
 * dashed unit circle, the adjustable circle, whole-radian ticks, the
 * angle-measure arc + arrowhead (gated together so neither survives θ = 0),
 * the swept arc, the initial/terminal rays, and the two endpoint dots.
 *
 * Every element is positioned by `betaRad + <sweep angle>` — β must rotate the
 * whole figure as a rigid body, not just the swept arc, or the ticks/rays end
 * up disagreeing with where the angle is actually drawn.
 */
export function buildAngleDiagramSvg(opts: AngleDiagramOptions): string {
  const { theta, r, beta, colors, tickText } = opts;
  const view = opts.view ?? 320;
  const unit = opts.unit ?? 88;
  const measureR = opts.measureR ?? 0.3;
  const c = view / 2;

  const thetaRad = degreesToRadians(theta);
  const betaRad = degreesToRadians(beta);
  const sign = theta < 0 ? -1 : 1;
  const endRad = betaRad + thetaRad;

  // Same non-empty-path gate the live component used [G4]: the measure arc and
  // its arrowhead must vanish together at θ = 0, never one without the other.
  const measureArc = arcPath(c, c, measureR * unit, betaRad, endRad);

  const ticks = tickAngles(thetaRad)
    .map((a) => {
      const inner = polarToCartesian(c, c, r * unit, betaRad + a);
      const outer = polarToCartesian(c, c, (r + 0.1) * unit, betaRad + a);
      const label = polarToCartesian(c, c, (r + 0.22) * unit, betaRad + a);
      return (
        `<g>` +
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${colors.axis}" stroke-width="1.5" />` +
        `<text x="${label.x}" y="${label.y}" fill="${tickText}" font-size="9" text-anchor="middle" dominant-baseline="middle">${a} rad</text>` +
        `</g>`
      );
    })
    .join('');

  const measureMarkup =
    measureArc !== ''
      ? `<path d="${measureArc}" fill="none" stroke="${colors.arrow}" stroke-width="1.5" />` +
        `<polygon points="${arrowheadPoints(c, c, measureR * unit, endRad, sign)}" fill="${colors.arrow}" />`
      : '';

  const initialTip = polarToCartesian(c, c, (r + 0.2) * unit, betaRad);
  const terminalTip = polarToCartesian(c, c, (r + 0.2) * unit, endRad);
  const initialDot = polarToCartesian(c, c, r * unit, betaRad);
  const terminalDot = polarToCartesian(c, c, r * unit, endRad);

  // tickText, not the terminal-side red: #e24b4a clears only 3.93:1 against
  // white, below the 4.5:1 floor for text. Weight and size carry the emphasis
  // instead.
  const labelMarkup =
    opts.coordinateLabel !== undefined && opts.coordinateLabel !== ''
      ? coordinateLabelMarkup(c, r * unit, endRad, view, opts.coordinateLabel, tickText)
      : '';

  return (
    // Reference axes and the dashed unit circle.
    `<line x1="${c - 1.35 * unit}" y1="${c}" x2="${c + 1.35 * unit}" y2="${c}" stroke="${colors.axis}" stroke-width="1" />` +
    `<line x1="${c}" y1="${c - 1.35 * unit}" x2="${c}" y2="${c + 1.35 * unit}" stroke="${colors.axis}" stroke-width="1" />` +
    `<circle cx="${c}" cy="${c}" r="${unit}" fill="none" stroke="${colors.axis}" stroke-width="1" stroke-dasharray="3 3" />` +
    // The adjustable circle.
    `<circle cx="${c}" cy="${c}" r="${r * unit}" fill="none" stroke="${colors.ghost}" stroke-width="1.5" />` +
    // Whole-radian ticks, scaling with r.
    ticks +
    // Small angle-measure arc with its direction arrowhead.
    measureMarkup +
    // The swept arc — its length is the radian measure when r = 1.
    `<path d="${arcPath(c, c, r * unit, betaRad, endRad)}" fill="none" stroke="${colors.curve}" stroke-width="3" />` +
    // Initial and terminal rays.
    `<line x1="${c}" y1="${c}" x2="${initialTip.x}" y2="${initialTip.y}" stroke="${colors.floor}" stroke-width="2" />` +
    `<line x1="${c}" y1="${c}" x2="${terminalTip.x}" y2="${terminalTip.y}" stroke="${colors.wall}" stroke-width="2" />` +
    `<circle cx="${initialDot.x}" cy="${initialDot.y}" r="3.5" fill="${colors.point}" stroke="${colors.pointStroke}" />` +
    `<circle cx="${terminalDot.x}" cy="${terminalDot.y}" r="3.5" fill="${colors.point}" stroke="${colors.pointStroke}" />` +
    labelMarkup
  );
}
