/**
 * Pure helpers for the hover coordinate readout. No DOM / function-plot
 * dependency, so this is unit-testable in the node environment (like math.ts and
 * theme.ts). plot.ts does the SVG/scale work and calls these.
 */

/** A single coordinate readout reported by the plot's hover handler. */
export interface HoverInfo {
  /** data-space x at the readout. */
  x: number;
  /** data-space y at the readout. */
  y: number;
  /** viewport px for tooltip positioning (the tooltip uses position: fixed). */
  clientX: number;
  clientY: number;
  /** owning curve colour — used ONLY as a non-text accent in the tooltip. */
  color: string;
  /**
   * true when snapped to a discrete marker (its stored coords); false when
   * computed on the nearest curve. NOT a claim of mathematical exactness — the
   * integer-y marker x is found by bisection.
   */
  onMarker: boolean;
}

/** Pointer-to-marker distance (px) that counts as hovering the dot. */
export const DOT_HIT_RADIUS_PX = 8;
/** Pointer-to-curve pixel-y distance (px) that counts as hovering the curve. */
export const CURVE_HIT_RADIUS_PX = 20;
/** Decimals shown before trailing-zero trim. */
export const COORD_DECIMALS = 3;
/** Window (ms) after the last zoom/pan during which the tooltip stays hidden. */
export const GESTURE_SUPPRESS_MS = 150;

/**
 * Format a number for display: round to COORD_DECIMALS, trim trailing zeros, and
 * normalise -0 to 0. e.g. 1.5708 -> "1.571", 2 -> "2", -0.0001 -> "0".
 */
export function formatNumber(n: number): string {
  const rounded = Number(n.toFixed(COORD_DECIMALS));
  const normalised = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalised);
}

/**
 * Index of the value nearest `target` that is within `thresholdPx`, or null if
 * none qualify. Ties resolve to the lowest index (deterministic).
 */
export function nearestWithinThreshold(
  values: number[],
  target: number,
  thresholdPx: number,
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(values[i] - target);
    if (d <= thresholdPx && d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
