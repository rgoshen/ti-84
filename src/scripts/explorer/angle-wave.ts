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
import { degreesToRadians, formatPiText, reduceFraction } from './angle';

/** Which coordinate of the terminal point the strip plots. */
export type WaveFn = 'sin' | 'cos';

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
): WaveScales {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  return {
    xFor: (radians) => PAD.left + ((radians + X_SPAN / 2) / X_SPAN) * plotW,
    // SVG y grows downward, so the domain is inverted here — the same flip
    // `angle-render.ts` applies by negating its sine.
    yFor: (value) => PAD.top + ((AMP_MAX - value) / (2 * AMP_MAX)) * plotH,
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

/** The plotted value: the terminal point's y (sin) or x (cos), scaled by r. */
export function waveValue(fn: WaveFn, theta: number, r: number): number {
  const rad = degreesToRadians(theta);
  return fn === 'sin' ? r * Math.sin(rad) : r * Math.cos(rad);
}

/** Below this, a sweep is nothing rather than a degenerate path. Mirrors `arcPath`. */
const ZERO_DEG = 1e-9;

/** Sampling interval along θ, in degrees. 360° yields 181 vertices. */
const STEP_DEG = 2;

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
  const steps = Math.ceil(Math.abs(theta) / STEP_DEG);
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const at = i === steps ? theta : dir * i * STEP_DEG;
    const x = scales.xFor(degreesToRadians(at));
    const y = scales.yFor(waveValue(fn, at, r));
    points.push(`${x} ${y}`);
  }

  return `M ${points[0]}${points.slice(1).map((p) => ` L ${p}`).join('')}`;
}

/** Whole-degree display, matching what the Degrees field shows. */
const degreeText = (theta: number): string => String(Math.round(theta * 1e4) / 1e4);

/**
 * The strip as prose, for the existing debounced live region. Both KaTeX boxes
 * are `aria-hidden`, so this is the only channel a screen-reader user has.
 */
export function waveSpoken(fn: WaveFn, theta: number, r: number): string {
  const name = fn === 'sin' ? 'Sine' : 'Cosine';
  const value = Math.round(waveValue(fn, theta, r) * 1e4) / 1e4;
  return (
    `${name} wave traced from 0 to ${degreeText(theta)} degrees. ` +
    `${fn} of theta is ${value}.`
  );
}
