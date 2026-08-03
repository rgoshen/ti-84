/**
 * The sixteen "chart" angles every trigonometry course asks a student to
 * memorise — multiples of 30° and 45° around the circle — plus their labels
 * in either unit.
 *
 * Radian text reuses `angle.ts`'s exact-fraction formatters rather than
 * re-deriving them: `piMultiple(330)` already reduces to `11/6`, and
 * `formatPiText` already renders `11π/6`. This module adds placement data and
 * a thin formatting wrapper, no new arithmetic.
 */
import { formatPiText, piMultiple } from './angle';

export type AngleUnit = 'deg' | 'rad';

/** The sixteen standard angles, in degrees, ascending. */
export const STANDARD_ANGLES: readonly number[] = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

/** A standard angle's label in the requested unit: `30°` or `π/6`. */
export function standardAngleLabel(deg: number, unit: AngleUnit): string {
  return unit === 'deg' ? `${deg}°` : formatPiText(piMultiple(deg));
}
