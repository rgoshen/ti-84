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
  countingTicks,
  polarToCartesian,
} from '@/scripts/explorer/angle-render';
import {
  STANDARD_ANGLES,
  standardAngleLabel,
  type AngleUnit,
} from '@/scripts/explorer/angle-standard';
import type { WaveFn } from './angle-wave';

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
  /**
   * Highlight the reference-triangle leg the named wave plots — the vertical leg
   * for `sin`, the leg along the initial side for `cos`. Omitted draws neither.
   *
   * This exists because the wave strip is stacked BELOW the circle rather than
   * beside it, so the two figures share no axis and no horizontal tie-line is
   * geometrically possible. The leg's length is exactly the wave's plotted
   * height, in the same colour, which is what carries the link instead.
   */
  projection?: WaveFn;
  /**
   * Unit for every ANGLE label on the figure — the counting ticks and the
   * standard-angle ring. Defaults to `'rad'`, today's only behaviour. Named
   * `angleUnit` rather than `unit` because `unit` already means "pixels per
   * unit radius" on this interface.
   */
  angleUnit?: AngleUnit;
  /** Draw the static sixteen-mark standard-angle ring. Defaults to `false`. */
  showStandardAngles?: boolean;
}

/**
 * Horizontal space a coordinate label occupies, in viewBox units.
 *
 * A pure string builder has no font metrics, so this estimates from character
 * count at the label's font-size 10 — deliberately a little generous, so the
 * failure mode is clamping the label back from the edge slightly sooner than
 * strictly necessary rather than letting it clip. A single fixed width cannot
 * work here: it is either too wide for a short label like `(1, 0)` (forcing a
 * needless clamp at the default view) or too narrow for a long one like
 * `(-0.71, -0.71)`.
 */
export function labelWidth(text: string, fontSize: number = COORD_FONT_SIZE): number {
  return text.length * 0.56 * fontSize;
}

/** Font size of the coordinate label, in px. */
const COORD_FONT_SIZE = 10;
/** Font size of the whole-radian tick labels, in px. */
const TICK_FONT_SIZE = 9;

/**
 * Half-height of a text box, in px. Estimated a little taller than the font size
 * suggests so ascenders and descenders are covered — the same deliberate
 * generosity as `labelWidth`, and for the same reason: suppressing a hair early
 * beats letting two labels touch.
 */
function labelHalfHeight(fontSize: number): number {
  return fontSize * 0.6;
}

interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Box for text centred on (x, y) — the tick labels' `text-anchor="middle"`. */
function centredBox(x: number, y: number, text: string, fontSize: number): LabelBox {
  const halfWidth = labelWidth(text, fontSize) / 2;
  const halfHeight = labelHalfHeight(fontSize);
  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  };
}
/** Radial gap between the terminal dot and the label anchor, in px. */
const LABEL_GAP = 14;
/** Keep-out margin at the viewBox edges, in px. */
const LABEL_MARGIN = 4;
/** Vertical clearance applied when the anchor clamps onto its own dot, in px. */
const LABEL_NUDGE = 12;

/**
 * The coordinate label, anchored beside the terminal dot and clamped so no
 * combination of r and θ can push it out of the viewBox.
 *
 * Placement is outward from the dot with `text-anchor` fixed to its natural side
 * (`start` when the dot is right of centre, `end` when left) — the text always
 * grows away from the figure, so it can never run back across the origin. At
 * large r the outward anchor would overflow the viewBox; rather than flip the
 * anchor inward (which would grow the text toward the centre and drive it
 * through the origin at mid radii near the horizontal), the anchor clamps in
 * place at the edge. A clamp alone would then sit the label directly on top of
 * its own terminal dot, so when the clamp engages the label also nudges
 * vertically clear of the dot, away from the horizontal.
 *
 * `labelWidth(text)` estimates from character count rather than a fixed budget,
 * so a short label like `(1, 0)` is not needlessly clamped at the default view.
 *
 * There is deliberately no vertical clamp: the anchor is `dotRadiusPx + GAP`
 * from centre and the nudge only fires on the near-horizontal positions where
 * the x-clamp engages, so `y` stays well inside the viewBox by construction.
 * The domain sweep in the tests holds it to that.
 */
function coordinateLabelLayout(
  c: number,
  dotRadiusPx: number,
  endRad: number,
  view: number,
  text: string,
): { x: number; y: number; textAnchor: 'start' | 'end'; box: LabelBox } {
  const width = labelWidth(text);
  const outward = polarToCartesian(c, c, dotRadiusPx + LABEL_GAP, endRad);
  const rightSide = outward.x >= c;
  const textAnchor = rightSide ? 'start' : 'end';

  let anchorX = outward.x;
  let anchorY = outward.y;

  const limit = rightSide ? view - LABEL_MARGIN - width : LABEL_MARGIN + width;
  const clamped = rightSide ? anchorX > limit : anchorX < limit;
  anchorX = rightSide ? Math.min(anchorX, limit) : Math.max(anchorX, limit);

  if (clamped) anchorY += Math.sin(endRad) >= 0 ? -LABEL_NUDGE : LABEL_NUDGE;

  const halfHeight = labelHalfHeight(COORD_FONT_SIZE);
  return {
    x: anchorX,
    y: anchorY,
    textAnchor,
    box: {
      left: rightSide ? anchorX : anchorX - width,
      right: rightSide ? anchorX + width : anchorX,
      top: anchorY - halfHeight,
      bottom: anchorY + halfHeight,
    },
  };
}

function coordinateLabelMarkup(
  layout: ReturnType<typeof coordinateLabelLayout>,
  text: string,
  fill: string,
): string {
  return (
    `<text data-role="coordinate-label" x="${layout.x}" y="${layout.y}" fill="${fill}" ` +
    `font-size="${COORD_FONT_SIZE}" font-weight="600" text-anchor="${layout.textAnchor}" ` +
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
  const angleUnit: AngleUnit = opts.angleUnit ?? 'rad';
  const showStandardAngles = opts.showStandardAngles ?? false;

  const thetaRad = degreesToRadians(theta);
  const betaRad = degreesToRadians(beta);
  const sign = theta < 0 ? -1 : 1;
  const endRad = betaRad + thetaRad;

  // Same non-empty-path gate the live component used [G4]: the measure arc and
  // its arrowhead must vanish together at θ = 0, never one without the other.
  const measureArc = arcPath(c, c, measureR * unit, betaRad, endRad);

  const hasCoordinateLabel =
    opts.coordinateLabel !== undefined && opts.coordinateLabel !== '';
  const coordinateLayout = hasCoordinateLabel
    ? coordinateLabelLayout(c, r * unit, endRad, view, opts.coordinateLabel!)
    : null;

  // The standard-angle ring: sixteen static marks, independent of θ, rotating
  // with β like everything else. Priority 2 in the suppression order — a
  // label yields only to the coordinate label (priority 1). The counting-tick
  // interaction (priority 3) is layered in below.
  const standardItems = (showStandardAngles ? STANDARD_ANGLES : []).map((deg) => {
    const angle = betaRad + degreesToRadians(deg);
    const raw = polarToCartesian(c, c, (r + 0.22) * unit, angle);
    const text = standardAngleLabel(deg, angleUnit);
    // Degree-mode labels ("180°", "270°") are wider than the short radian-mode
    // axis labels ("0", "π") this ring's radius was originally sized against —
    // at the maximum radius they can run past the viewBox edge on an
    // axis-aligned mark. Clamp into the frame the same way the coordinate
    // label already does, rather than growing the ring's radius for everyone.
    const halfWidth = labelWidth(text, TICK_FONT_SIZE) / 2;
    const halfHeight = labelHalfHeight(TICK_FONT_SIZE);
    const label = {
      x: Math.min(Math.max(raw.x, LABEL_MARGIN + halfWidth), view - LABEL_MARGIN - halfWidth),
      y: Math.min(Math.max(raw.y, LABEL_MARGIN + halfHeight), view - LABEL_MARGIN - halfHeight),
    };
    const box = centredBox(label.x, label.y, text, TICK_FONT_SIZE);
    const suppressed =
      coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box);
    return { angle, label, text, box, suppressed };
  });

  // Neighbours 15° apart (e.g. 30°/45°, 300°/315°) sit close enough that at
  // small r their labels can collide with EACH OTHER, not just with the
  // coordinate label — the ring's label radius shrinks with r while label
  // width doesn't. Same rule as everywhere else in this priority chain: only
  // text is ever dropped, never the tick line. Walking in STANDARD_ANGLES'
  // own ascending order makes the outcome deterministic — of two colliding
  // neighbours, the smaller angle keeps its label.
  for (let i = 0; i < standardItems.length; i++) {
    const item = standardItems[i]!;
    if (item.suppressed) continue;
    for (let j = 0; j < i; j++) {
      const earlier = standardItems[j]!;
      if (!earlier.suppressed && boxesOverlap(item.box, earlier.box)) {
        item.suppressed = true;
        break;
      }
    }
  }

  const standardMarkup = standardItems
    .map((item) => {
      const inner = polarToCartesian(c, c, r * unit, item.angle);
      const outer = polarToCartesian(c, c, (r + 0.08) * unit, item.angle);
      return (
        `<g data-role="standard-angle">` +
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${colors.axis}" stroke-width="1.5" />` +
        (item.suppressed
          ? ''
          : `<text x="${item.label.x}" y="${item.label.y}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${item.text}</text>`) +
        `</g>`
      );
    })
    .join('');

  const activeStandardBoxes = standardItems
    .filter((item) => !item.suppressed)
    .map((item) => item.box);

  const ticks = countingTicks(theta, angleUnit)
    .map((tick) => {
      const angle = betaRad + tick.radians;
      const inner = polarToCartesian(c, c, r * unit, angle);
      const outer = polarToCartesian(c, c, (r + 0.1) * unit, angle);
      const label = polarToCartesian(c, c, (r + 0.22) * unit, angle);

      // Near θ ≈ a rad the tick label and the coordinate readout are drawn a few
      // pixels apart on the same circle, and neither can move outward to escape:
      // at the maximum radius the tick label already sits within ~9px of the
      // viewBox edge. Drop the text for the duration of the overlap and keep the
      // tick line, so the radian position stays marked even while unnamed. The
      // same rule now also applies against any un-suppressed standard-angle
      // label — in degrees mode a quarter-turn tick and a standard mark can
      // land on the exact same spot with the exact same text.
      const text = tick.text;
      const box = centredBox(label.x, label.y, text, TICK_FONT_SIZE);
      const hidden =
        (coordinateLayout !== null && boxesOverlap(box, coordinateLayout.box)) ||
        activeStandardBoxes.some((standardBox) => boxesOverlap(box, standardBox));

      return (
        `<g data-role="radian-tick">` +
        `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${colors.axis}" stroke-width="1.5" />` +
        (hidden
          ? ''
          : `<text x="${label.x}" y="${label.y}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" text-anchor="middle" dominant-baseline="middle">${text}</text>`) +
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

  const projectionMarkup = (() => {
    if (opts.projection === undefined) return '';

    if (opts.projection === 'tan') {
      // T sits on the UNIT circle (not r·unit) at angle β — the point where
      // the initial side crosses it, and the fixed anchor of the tangent
      // line. E is placed as an offset from T, perpendicular to OT (angle
      // β + 90°), scaled by the tangent value itself — the standard
      // "extend the terminal side until it meets the tangent line"
      // construction, decomposed so E stays ON the tangent line even when
      // clamped. Because T is independent of r and the offset direction is
      // independent of r, segment length is exactly |tan θ|·unit for any
      // r — the cancellation, geometrically.
      //
      // Clamped by capping the tangent VALUE (not the ray distance from the
      // origin, which would pull E off the tangent line as it shrinks): by
      // the right triangle O-T-E (OT = unit, right angle at T),
      // OE² = unit² + TE², so capping TE at sqrt(maxDist² − unit²) caps OE
      // at exactly maxDist — the viewBox's inscribed-circle radius, bounded
      // the same way in every direction regardless of β. One consequence:
      // once the clamp engages near an asymptote, the dashed
      // tangent-extension below is no longer collinear with the terminal
      // side — E has left the ray to stay on the tangent line instead.
      // No endpoint dot is ever drawn at E, clamped or not, so a clamped
      // segment never asserts a value it was truncated out of.
      const tangentPoint = polarToCartesian(c, c, unit, betaRad);
      const rawTan = Math.tan(thetaRad);
      const maxDist = c - LABEL_MARGIN;
      const capMax = Math.sqrt(maxDist ** 2 - unit ** 2) / unit;
      const cappedTan = Math.abs(rawTan) > capMax ? Math.sign(rawTan) * capMax : rawTan;
      const lineEnd = polarToCartesian(
        tangentPoint.x,
        tangentPoint.y,
        cappedTan * unit,
        betaRad + Math.PI / 2,
      );
      return (
        `<line data-role="tangent-extension" x1="${terminalDot.x}" y1="${terminalDot.y}" ` +
        `x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${colors.wave}" stroke-width="1" ` +
        `stroke-dasharray="3 3" />` +
        `<line data-role="tangent-segment" x1="${tangentPoint.x}" y1="${tangentPoint.y}" ` +
        `x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${colors.wave}" stroke-width="2.5" ` +
        `stroke-linecap="round" />`
      );
    }

    // The foot of the perpendicular from the terminal point onto the initial
    // side, expressed in the β-rotated frame. Positioned through betaRad like
    // every other element, so the leg rotates with the rigid body — and its
    // length is therefore r|sin θ| (sin) or r|cos θ| (cos) for ANY β, which is
    // what makes it equal to the wave's plotted height.
    const foot = polarToCartesian(c, c, r * Math.cos(thetaRad) * unit, betaRad);
    const from = opts.projection === 'sin' ? terminalDot : { x: c, y: c };
    // stroke-linecap="round": a zero-length line (sin 0° / cos 90°) is
    // deliberately drawn rather than omitted — a missing element would read
    // as "no projection selected" rather than "the value is zero" — but
    // "butt" (the SVG default) paints nothing for a zero-length line. Only
    // "round" (or "square") gives it any visible extent, so the zero value
    // renders honestly instead of silently as nothing.
    return (
      `<line data-role="projection-leg" x1="${from.x}" y1="${from.y}" ` +
      `x2="${foot.x}" y2="${foot.y}" stroke="${colors.wave}" stroke-width="2.5" ` +
      `stroke-linecap="round" />`
    );
  })();

  // tickText, not the terminal-side red: #e24b4a clears only 3.93:1 against
  // white, below the 4.5:1 floor for text. Weight and size carry the emphasis
  // instead.
  const labelMarkup =
    coordinateLayout !== null
      ? coordinateLabelMarkup(coordinateLayout, opts.coordinateLabel!, tickText)
      : '';

  return (
    // Reference axes and the dashed unit circle.
    `<line x1="${c - 1.35 * unit}" y1="${c}" x2="${c + 1.35 * unit}" y2="${c}" stroke="${colors.axis}" stroke-width="1" />` +
    `<line x1="${c}" y1="${c - 1.35 * unit}" x2="${c}" y2="${c + 1.35 * unit}" stroke="${colors.axis}" stroke-width="1" />` +
    `<circle cx="${c}" cy="${c}" r="${unit}" fill="none" stroke="${colors.axis}" stroke-width="1" stroke-dasharray="3 3" />` +
    // The adjustable circle.
    `<circle cx="${c}" cy="${c}" r="${r * unit}" fill="none" stroke="${colors.ghost}" stroke-width="1.5" />` +
    // Standard-angle reference ring — static, independent of θ.
    standardMarkup +
    // Counting ticks toward θ: whole radians, or quarter turns in degrees mode.
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
    projectionMarkup +
    labelMarkup
  );
}
