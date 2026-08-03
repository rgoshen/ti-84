/**
 * SVG path geometry for the Angle Explorer diagram. Pure number → string, with
 * no DOM access, so every arc-flag decision is unit-testable in the node env.
 *
 * Coordinate convention: SVG y grows DOWNWARD, so every conversion negates the
 * sine. Without that flip, positive angles would sweep clockwise on screen —
 * backwards from every textbook.
 */

import { degreesToRadians } from './angle';
import type { AngleUnit } from './angle-standard';

export interface Point {
  x: number;
  y: number;
}

export function polarToCartesian(cx: number, cy: number, r: number, radians: number): Point {
  return { x: cx + r * Math.cos(radians), y: cy - r * Math.sin(radians) };
}

/** Below this, a sweep is treated as nothing rather than a degenerate arc. */
const ZERO = 1e-9;

/**
 * A circular arc from `startRad` to `endRad`.
 *
 * Two traps this exists to avoid:
 *  1. An arc wider than 180° needs large-arc-flag = 1, or SVG draws the minor arc.
 *  2. A FULL ±360° arc cannot be expressed with one `A` command — start and end
 *     coincide, so the renderer draws nothing at all. θ reaches exactly ±360°, so
 *     the full turn is split into two half-arcs.
 *
 * Sweep-flag 1 is clockwise in screen space; because y is flipped, a
 * mathematically positive (counter-clockwise) sweep is sweep-flag 0.
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): string {
  const delta = endRad - startRad;
  if (Math.abs(delta) < ZERO) return '';

  if (Math.abs(delta) >= 2 * Math.PI - ZERO) {
    const mid = startRad + delta / 2;
    return `${arcPath(cx, cy, r, startRad, mid)} ${arcPath(cx, cy, r, mid, endRad)}`;
  }

  const start = polarToCartesian(cx, cy, r, startRad);
  const end = polarToCartesian(cx, cy, r, endRad);
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta > 0 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

/**
 * Whole-radian tick positions from the initial side toward θ.
 *
 * The source Demonstration emitted nothing below |θ| = 1 rad, so at its own 30°
 * default the radian scale vanished — which reads as a bug. We always emit the
 * first tick, so a student at 30° can see that the angle is about half a radian.
 */
export function tickAngles(thetaRad: number): number[] {
  const dir = thetaRad < 0 ? -1 : 1;
  const whole = Math.floor(Math.abs(thetaRad));
  const count = Math.max(1, whole);
  return Array.from({ length: count }, (_, i) => dir * (i + 1));
}

/** One counting tick: its angular position (radians) and display text. */
export interface CountingTick {
  radians: number;
  text: string;
}

/**
 * Counting ticks toward θ, in the requested unit.
 *
 * Radians mode is `tickAngles` unchanged — whole radians, always at least
 * one. Degrees mode counts quarter turns instead (`90°`, `180°`, `270°`),
 * the round unit a student counts degrees in, with the same always-emit-one
 * floor: a scale that vanishes at small θ reads as a bug, in either unit.
 */
export function countingTicks(thetaDeg: number, unit: AngleUnit): CountingTick[] {
  if (unit === 'rad') {
    return tickAngles(degreesToRadians(thetaDeg)).map((n) => ({
      radians: n,
      text: `${n} rad`,
    }));
  }
  const dir = thetaDeg < 0 ? -1 : 1;
  const whole = Math.floor(Math.abs(thetaDeg) / 90);
  const count = Math.max(1, whole);
  return Array.from({ length: count }, (_, i) => {
    const deg = dir * (i + 1) * 90;
    return { radians: degreesToRadians(deg), text: `${deg}°` };
  });
}

/** How far behind the tip the arrowhead's base sits, in radians. */
const HEAD_SWEEP = 0.12;

/**
 * Triangle for the sweep arrowhead as an SVG `points` attribute. `sign` is the
 * sweep direction (+1 counter-clockwise, −1 clockwise) so the head always points
 * the way the angle is growing.
 */
export function arrowheadPoints(
  cx: number,
  cy: number,
  r: number,
  radians: number,
  sign: number,
): string {
  const back = radians - sign * HEAD_SWEEP;
  const tip = polarToCartesian(cx, cy, r, radians);
  const inner = polarToCartesian(cx, cy, r * 0.93, back);
  const outer = polarToCartesian(cx, cy, r * 1.07, back);
  return `${tip.x},${tip.y} ${inner.x},${inner.y} ${outer.x},${outer.y}`;
}
