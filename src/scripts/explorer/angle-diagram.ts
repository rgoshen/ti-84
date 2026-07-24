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
    `<circle cx="${terminalDot.x}" cy="${terminalDot.y}" r="3.5" fill="${colors.point}" stroke="${colors.pointStroke}" />`
  );
}
