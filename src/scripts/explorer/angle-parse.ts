/**
 * Parsing for the linked degrees/radians fields.
 *
 * The slider steps 1°, but 1 radian is 57.2958° — the diagram draws a tick the
 * slider can never land on. These fields close that gap, so parsing must accept
 * exact forms like `pi/3` as well as decimals.
 */
import { evaluate } from 'mathjs';
import { degreesToRadians, radiansToDegrees } from './angle';

export type ParseResult = { ok: true; degrees: number } | { ok: false; error: string };

/** Widest angle accepted, matching the θ slider range. */
export const MAX_DEG = 360;

/** Slack for the range check so a typed `360` is not rejected by float error. */
const RANGE_EPS = 1e-9;

/**
 * SECURITY BOUNDARY. mathjs has a documented history of sandbox-escape
 * advisories, so raw user text must never reach `evaluate()`. The accepted
 * grammar is tiny — digits, `.`, the four operators, parentheses, whitespace and
 * the literal `pi` — so we blank out `pi` and require everything left over to be
 * in that character class. Anything else is rejected before evaluation.
 */
function isSafeExpression(src: string): boolean {
  return /^[0-9+\-*/().\s]*$/.test(src.replace(/pi/g, ' '));
}

/**
 * Parse one field's text into degrees. Degrees are the single source of truth,
 * so radian input is converted here and the caller stores degrees only.
 */
export function parseAngleInput(raw: string, unit: 'deg' | 'rad'): ParseResult {
  const src = raw.trim().toLowerCase().replace(/π/g, 'pi');
  if (src === '') return { ok: false, error: 'Enter an angle.' };
  if (!isSafeExpression(src)) {
    return { ok: false, error: 'Use numbers, + − * /, parentheses, and pi only.' };
  }

  let value: unknown;
  try {
    value = evaluate(src);
  } catch {
    return { ok: false, error: 'That is not a valid expression.' };
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: false, error: 'That is not a finite number.' };
  }

  const degrees = unit === 'deg' ? value : radiansToDegrees(value);
  if (Math.abs(degrees) > MAX_DEG + RANGE_EPS) {
    return { ok: false, error: `Enter an angle between −${MAX_DEG}° and ${MAX_DEG}°.` };
  }
  return { ok: true, degrees };
}

/** Four decimals is enough to show 57.2958 without exposing float noise. */
const DECIMALS = 4;

const trim = (n: number): string => String(Number(n.toFixed(DECIMALS)));

export function formatDegrees(deg: number): string {
  return trim(deg);
}

export function formatRadiansDecimal(deg: number): string {
  return trim(degreesToRadians(deg));
}
