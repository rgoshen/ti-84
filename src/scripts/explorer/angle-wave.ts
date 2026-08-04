/**
 * Pure geometry and SVG-markup builder for the Angle Explorer's wave strip.
 *
 * The strip shows what sweeping the angle *generates*: with `sin θ` or `cos θ`
 * selected, the curve is traced from 0 out to the current θ. There is no
 * animation — θ is the single source of truth and this module derives from it,
 * exactly as `angle-coordinates.ts` and `angle-diagram.ts` already do.
 *
 * DOM-free by construction (string concatenation, no `document`), so every
 * scale and arc decision unit-tests in the node environment — the same contract
 * `angle-diagram.ts` follows, and the reason the live figure and the exported
 * artifact draw through one builder and cannot drift.
 */
import type { ExplorerColors } from '@/scripts/graphing/theme';
import { degreesToRadians, formatPiText, isTangentUndefined, reduceFraction } from './angle';

/** Which coordinate of the terminal point the strip plots. */
export type WaveFn = 'sin' | 'cos' | 'tan';

/** The selector's full state. `none` draws no strip at all. */
export type WaveMode = 'none' | WaveFn;

/** Live-figure viewBox. The container is fluid, so this scales with the column. */
export const WAVE_WIDTH = 512;
export const WAVE_HEIGHT = 176;

/**
 * Half-height of the y domain, fixed at the radius slider's maximum.
 *
 * Deliberately NOT derived from the current r: a y-scale that adapted to the
 * radius would redraw every amplitude to the same on-screen height, cancelling
 * out the one thing the radius slider exists to show.
 */
export const AMP_MAX = 1.5;
/** y-domain half-height for a pole function (currently only tan), in units.
 *  atan(4) ≈ 76°, so only the last 14° before each asymptote is off-screen —
 *  atan(1.5) ≈ 56° would hide 34°. */
export const POLE_MAX = 4;

/** A traced curve's branch layout around its asymptotes — how `branchPath`
 *  slices a periodic, unbounded function into the visible sub-intervals that
 *  become separate SVG subpaths. */
export interface WaveBranches {
  /** Each branch is centred at `centerDeg + k * 180`. */
  centerDeg: 0 | 90;
  /** Half-width from a branch's centre to where the curve reaches `domain`. */
  edgeDeg: number;
  /** π/4 tick indices (see `waveTickRadians`) where the function is undefined,
   *  ascending. */
  ticks: readonly number[];
}

/** Everything that distinguishes one wave function's geometry from another's,
 *  collected in one table so adding a function means adding a row rather than
 *  finding every `fn === '…'` branch scattered across this module. */
export interface WaveSpec {
  domain: number;
  evaluate(theta: number, r: number): number;
  isUndefined(theta: number): boolean;
  stepDeg: number;
  noun: string;
  /** `null` for a sinusoid: one polyline, no poles, no asymptote marks. */
  branches: WaveBranches | null;
}

/** Sampling interval along θ, in degrees, for the two sinusoids. 360° yields
 *  181 vertices. */
const SINUSOID_STEP_DEG = 2;

/** Sampling interval for a pole function, in degrees. Tighter than the
 *  sinusoids' 2° because the curve steepens sharply near each asymptote,
 *  where 2° steps facet visibly. */
const POLE_STEP_DEG = 1;

const WAVE_SPEC: Record<WaveFn, WaveSpec> = {
  sin: {
    domain: AMP_MAX,
    evaluate: (theta, r) => r * Math.sin(degreesToRadians(theta)),
    isUndefined: () => false,
    stepDeg: SINUSOID_STEP_DEG,
    noun: 'wave',
    branches: null,
  },
  cos: {
    domain: AMP_MAX,
    evaluate: (theta, r) => r * Math.cos(degreesToRadians(theta)),
    isUndefined: () => false,
    stepDeg: SINUSOID_STEP_DEG,
    noun: 'wave',
    branches: null,
  },
  tan: {
    domain: POLE_MAX,
    evaluate: (theta) => Math.tan(degreesToRadians(theta)),
    // θ arrives from a degree slider (or a parsed, already-rounded field), so
    // a tolerance-checked degree comparison is exact and honest here — unlike
    // testing Math.tan's magnitude, which never actually reaches Infinity.
    isUndefined: isTangentUndefined,
    stepDeg: POLE_STEP_DEG,
    noun: 'curve',
    branches: {
      centerDeg: 0,
      edgeDeg: (Math.atan(POLE_MAX) * 180) / Math.PI,
      ticks: [-6, -2, 2, 6],
    },
  },
};

/** Per-function y-domain half-height. sin/cos share AMP_MAX; tan gets its own,
 *  wider domain because it is unbounded and AMP_MAX would hide a third of
 *  every quarter-sweep. */
export function waveDomain(fn: WaveFn): number {
  return WAVE_SPEC[fn].domain;
}

/** Padding inside the viewBox. `bottom` reserves both staggered label baselines. */
const PAD = { left: 8, right: 8, top: 12, bottom: 34 } as const;

/** Total x span: -2π to 2π, matching the angle slider's -360°…360°. */
const X_SPAN = 4 * Math.PI;

export interface WaveTick {
  /** Integer numerator over 4, so k = 6 is 3π/2. */
  k: number;
  radians: number;
}

export interface WaveScales {
  /** Radians → viewBox x. */
  xFor(radians: number): number;
  /** Value (in units) → viewBox y. */
  yFor(value: number): number;
}

export function waveScales(
  width: number = WAVE_WIDTH,
  height: number = WAVE_HEIGHT,
  domain: number = AMP_MAX,
): WaveScales {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  return {
    xFor: (radians) => PAD.left + ((radians + X_SPAN / 2) / X_SPAN) * plotW,
    // SVG y grows downward, so the domain is inverted here — the same flip
    // `angle-render.ts` applies by negating its sine.
    yFor: (value) => PAD.top + ((domain - value) / (2 * domain)) * plotH,
  };
}

/** Every multiple of π/4 from -2π to 2π inclusive: seventeen ticks. */
export function waveTickRadians(): WaveTick[] {
  return Array.from({ length: 17 }, (_, i) => {
    const k = i - 8;
    return { k, radians: (k * Math.PI) / 4 };
  });
}

/**
 * A tick's exact π label: `-2π`, `-7π/4`, … `0` … `7π/4`, `2π`.
 *
 * Routed through `reduceFraction` + `formatPiText` rather than a lookup table,
 * so the axis and the Radians field's exact companion can never express the
 * same quantity in different notation.
 */
export function waveTickLabel(k: number): string {
  return formatPiText(reduceFraction(k, 4));
}

/** The plotted value: the terminal point's y (sin), x (cos), or ratio (tan),
 *  scaled by r for sin/cos. tan is NOT scaled by r — tan θ = (r sin θ)/(r cos θ)
 *  and r cancels, so the radius slider cannot move this curve. `null` marks
 *  the asymptotes, where tan is undefined. */
export function waveValue(fn: WaveFn, theta: number, r: number): number | null {
  const spec = WAVE_SPEC[fn];
  return spec.isUndefined(theta) ? null : spec.evaluate(theta, r);
}

/** The π/4 tick indices (see `waveTickRadians`) where `fn` is undefined,
 *  ascending. `[]` for sin/cos, which have no poles. */
export function waveAsymptoteTicks(fn: WaveFn): readonly number[] {
  return WAVE_SPEC[fn].branches?.ticks ?? [];
}

/** The vertical asymptotes `fn` is undefined at, within [-2π, 2π]. `[]` for
 *  sin/cos. */
export function waveAsymptoteRadians(fn: WaveFn): number[] {
  return waveAsymptoteTicks(fn).map((k) => (k * Math.PI) / 4);
}

/** Below this, a sweep is nothing rather than a degenerate path. Mirrors `arcPath`. */
const ZERO_DEG = 1e-9;

/**
 * A pole function's curve traced from 0 to θ, as one or more SVG subpaths.
 *
 * A pole function is periodic every 180° and unbounded within each period, so
 * unlike sin/cos this cannot be one polyline: it is built from the VISIBLE
 * sub-intervals — the portion of each branch where the curve stays inside
 * `spec.domain` — intersected with [0, θ]. Each sub-interval becomes its own
 * `M …` subpath, so no subpath ever crosses an asymptote. Break points are the
 * exact angle where the curve reaches `spec.domain` (± each branch's centre),
 * computed directly rather than interpolated between samples — the curvature
 * near an asymptote makes a straight chord between samples measurably wrong
 * there.
 *
 * The final vertex of the LAST subpath falls out of the same clamp that
 * produces every other subpath's edge: `Math.min(hi, center + edge)` is θ
 * itself whenever θ is the binding constraint (θ inside the visible domain),
 * and the branch's true edge otherwise — so "snap to θ" and "stop at the
 * domain edge" are the same rule, not two.
 */
function branchPath(
  spec: WaveSpec,
  branches: WaveBranches,
  theta: number,
  r: number,
  dir: 1 | -1,
  scales: WaveScales,
): string {
  const { centerDeg, edgeDeg } = branches;
  const lo = Math.min(0, theta);
  const hi = Math.max(0, theta);

  const intervals: Array<[number, number]> = [];
  const kMin = Math.floor((lo - edgeDeg - centerDeg) / 180) - 1;
  const kMax = Math.ceil((hi + edgeDeg - centerDeg) / 180) + 1;
  for (let k = kMin; k <= kMax; k++) {
    const center = centerDeg + k * 180;
    const segLo = Math.max(lo, center - edgeDeg);
    const segHi = Math.min(hi, center + edgeDeg);
    if (segHi - segLo > 1e-6) intervals.push([segLo, segHi]);
  }

  // Intervals are produced in ascending order (k ascending ⇒ centre
  // ascending), which is the sweep order for a positive θ. A negative θ
  // sweeps from 0 DOWN to θ, so both the interval order and each interval's
  // internal sample order must reverse.
  const ordered = dir === 1 ? intervals : [...intervals].reverse();

  return ordered
    .map(([a, b]) => {
      const n = Math.ceil((b - a) / spec.stepDeg);
      const points: string[] = [];
      for (let i = 0; i <= n; i++) {
        const deg =
          dir === 1
            ? i === n
              ? b
              : a + i * spec.stepDeg
            : i === n
              ? a
              : b - i * spec.stepDeg;
        points.push(
          `${scales.xFor(degreesToRadians(deg))} ${scales.yFor(spec.evaluate(deg, r))}`,
        );
      }
      return `M ${points[0]}${points.slice(1).map((p) => ` L ${p}`).join('')}`;
    })
    .join(' ');
}

/**
 * The curve traced from 0 out to θ, as an SVG path.
 *
 * Grows in whichever direction θ points, so a negative angle traces leftward
 * from the origin and sin's odd symmetry / cos's even symmetry become visible by
 * dragging rather than by assertion. The final vertex is snapped to θ exactly
 * (rather than to the last whole step) so the curve always meets the marker,
 * which is positioned from θ itself.
 *
 * Returns `''` below `ZERO_DEG` — the same gate `arcPath` applies, for the same
 * reason. Note the marker is drawn independently of this, so at θ = 0 `cos`
 * still shows a dot at r while `sin` shows one at 0.
 */
export function wavePath(
  fn: WaveFn,
  theta: number,
  r: number,
  scales: WaveScales,
): string {
  if (Math.abs(theta) < ZERO_DEG) return '';

  const dir = theta < 0 ? -1 : 1;
  const spec = WAVE_SPEC[fn];
  const { branches } = spec;

  if (branches !== null) return branchPath(spec, branches, theta, r, dir, scales);

  const steps = Math.ceil(Math.abs(theta) / spec.stepDeg);
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const at = i === steps ? theta : dir * i * spec.stepDeg;
    const x = scales.xFor(degreesToRadians(at));
    const y = scales.yFor(spec.evaluate(at, r));
    points.push(`${x} ${y}`);
  }

  return `M ${points[0]}${points.slice(1).map((p) => ` L ${p}`).join('')}`;
}

/** Whole-degree display, matching what the Degrees field shows. */
const degreeText = (theta: number): string => String(Math.round(theta * 1e4) / 1e4);

const WAVE_DISPLAY_NAME: Record<WaveFn, string> = { sin: 'Sine', cos: 'Cosine', tan: 'Tangent' };
export const WAVE_SPOKEN_FN_NAME: Record<WaveFn, string> = { sin: 'sine', cos: 'cosine', tan: 'tangent' };

/**
 * The strip as prose, for the existing debounced live region. Both KaTeX boxes
 * are `aria-hidden`, so this is the only channel a screen-reader user has.
 *
 * tan is called a "curve", not a "wave" — it is periodic but not a sinusoid —
 * and reports "undefined" at the asymptotes rather than a bogus huge number.
 */
export function waveSpoken(fn: WaveFn, theta: number, r: number): string {
  const noun = WAVE_SPEC[fn].noun;
  const value = waveValue(fn, theta, r);
  const valueText = value === null ? 'undefined' : String(Math.round(value * 1e4) / 1e4);
  return (
    `${WAVE_DISPLAY_NAME[fn]} ${noun} traced from 0 to ${degreeText(theta)} degrees. ` +
    `${WAVE_SPOKEN_FN_NAME[fn]} of theta is ${valueText}.`
  );
}

/** Font size of the π/4 tick labels, in px. */
const TICK_FONT_SIZE = 10;
/** Offsets of the two staggered label baselines from the viewBox bottom, in px. */
const LABEL_BASELINE = { primary: 20, secondary: 6 } as const;
/** Half-length of a tick's vertical line beyond the plot area, in px. */
const TICK_OVERSHOOT = 4;
/** Marker radius, in px. Matches the polar figure's endpoint dots. */
const MARKER_R = 3.5;

export interface WaveDiagramOptions {
  fn: WaveFn;
  /** Swept angle in degrees — the same θ that drives the circle. */
  theta: number;
  /** Circle radius. The wave's amplitude. */
  r: number;
  colors: ExplorerColors;
  /** Stroke colour for the π/4 tick labels. */
  tickText: string;
  /** viewBox width, px. Defaults to the live strip's 512. */
  width?: number;
  /** viewBox height, px. Defaults to the live strip's 176. */
  height?: number;
}

/**
 * Build the wave strip's SVG children as a markup string — π/4 gridlines and
 * their staggered exact-π labels, the zero axis, the dashed ±1 references, the
 * curve traced from 0 to θ, and the marker with its drop-line.
 *
 * Returns only the INNER markup; the caller owns the outer `<svg>`, its viewBox
 * and its accessible name. Both the live component and the export snapshot draw
 * through this one builder, differing only in the box they pass, so the figure
 * on screen and the figure in the PNG cannot drift apart.
 */
export function buildWaveSvg(opts: WaveDiagramOptions): string {
  const { fn, theta, r, colors, tickText } = opts;
  const width = opts.width ?? WAVE_WIDTH;
  const height = opts.height ?? WAVE_HEIGHT;
  const domain = waveDomain(fn);
  const s = waveScales(width, height, domain);

  const top = s.yFor(domain);
  const bottom = s.yFor(-domain);
  const zeroY = s.yFor(0);

  // Full-height gridlines rather than short ticks at the axis: the label sits at
  // the bottom of the box, and a line spanning the plot is what ties the two
  // together without ambiguity about which tick a label belongs to.
  const ticks = waveTickRadians()
    .map(({ k, radians }) => {
      const x = s.xFor(radians);
      const label = waveTickLabel(k);
      const even = k % 2 === 0;
      const labelY =
        height - (even ? LABEL_BASELINE.primary : LABEL_BASELINE.secondary);
      // At tan's asymptotes, a solid gridline would sit directly under the
      // dashed asymptote line (drawn separately, below), filling its gaps and
      // diluting the dash. Now that the two differ in colour that is worse, not
      // neutral: slate showing through red's gaps interleaves two colours along
      // one line. Suppress just the gridline here; the label stays.
      const isAsymptote = fn === 'tan' && (k === -6 || k === -2 || k === 2 || k === 6);
      return (
        `<g data-role="wave-tick">` +
        (isAsymptote
          ? ''
          : `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom + TICK_OVERSHOOT}" ` +
            `stroke="${colors.axis}" stroke-width="${even ? 0.75 : 0.5}" />`) +
        `<text x="${x}" y="${labelY}" fill="${tickText}" font-size="${TICK_FONT_SIZE}" ` +
        `text-anchor="middle" dominant-baseline="middle">${label}</text>` +
        `</g>`
      );
    })
    .join('');

  // The strip's counterpart to the polar figure's dashed unit circle — same
  // dasharray, same idea: this is the reference, the solid thing is yours.
  const unitRefs = [1, -1]
    .map(
      (v) =>
        `<line data-role="wave-unit-ref" x1="${s.xFor(-X_SPAN / 2)}" y1="${s.yFor(v)}" ` +
        `x2="${s.xFor(X_SPAN / 2)}" y2="${s.yFor(v)}" stroke="${colors.axis}" ` +
        `stroke-width="1" stroke-dasharray="3 3" />`,
    )
    .join('');

  // Dashed verticals at tan's four asymptotes. Deliberately NOT styled like the
  // π/4 gridlines they sit among: slate at 33% ink coverage put less colour on
  // screen than the solid gridline beside it, so the asymptote read as a gap in
  // the grid. This is `wall` at `dashedLine`'s weight and dash — the same mark
  // render.ts:169 draws the Function Explorer's vertical asymptotes with, so
  // "red dashed vertical" means one thing across the whole app. Absent for
  // sin/cos, which have no asymptote to mark.
  const asymptotes =
    fn === 'tan'
      ? waveAsymptoteRadians(fn)
          .map((rad) => {
            const x = s.xFor(rad);
            return (
              `<line data-role="wave-asymptote" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" ` +
              `stroke="${colors.wall}" stroke-width="1.5" stroke-dasharray="6 6" />`
            );
          })
          .join('')
      : '';

  const path = wavePath(fn, theta, r, s);
  const curve =
    path !== ''
      ? `<path data-role="wave-curve" d="${path}" fill="none" stroke="${colors.wave}" ` +
        `stroke-width="2.5" stroke-linejoin="round" />`
      : '';

  // The marker/drop-line pair is suppressed whenever the value is null (the
  // exact asymptote) OR simply outside the visible domain (a real but
  // off-screen tan value) — a marker pinned to the box edge would assert a
  // value that was clipped away. For sin/cos this check never fires: their
  // values never exceed AMP_MAX, so the marker still draws unconditionally,
  // matching today's behaviour exactly.
  const value = waveValue(fn, theta, r);
  const showMarker = value !== null && Math.abs(value) <= domain;
  const markerX = s.xFor(degreesToRadians(theta));
  const markerMarkup = showMarker
    ? `<line data-role="wave-drop" x1="${markerX}" y1="${zeroY}" x2="${markerX}" y2="${s.yFor(value)}" ` +
      `stroke="${colors.wave}" stroke-width="1" stroke-dasharray="2 2" />` +
      `<circle data-role="wave-marker" cx="${markerX}" cy="${s.yFor(value)}" r="${MARKER_R}" ` +
      `fill="${colors.point}" stroke="${colors.pointStroke}" />`
    : '';

  return (
    ticks +
    unitRefs +
    asymptotes +
    // Zero axis and the x = 0 vertical, matching the polar figure's reference axes.
    `<line x1="${s.xFor(-X_SPAN / 2)}" y1="${zeroY}" x2="${s.xFor(X_SPAN / 2)}" y2="${zeroY}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    `<line x1="${s.xFor(0)}" y1="${top}" x2="${s.xFor(0)}" y2="${bottom}" ` +
    `stroke="${colors.axis}" stroke-width="1" />` +
    curve +
    markerMarkup
  );
}
