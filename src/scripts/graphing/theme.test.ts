import { describe, it, expect } from 'vitest';
import {
  themeColors,
  hexToRgb,
  blendOver,
  lineContrast,
  lineDelta,
} from './theme';

// Thresholds for "legible" plot elements once function-plot's low opacity is
// applied. The origin cross must read as a clear axis (WCAG contrast); the grid
// must be a visible-but-faint hairline (sRGB code-value separation).
const ORIGIN_MIN_CONTRAST = 2.0;
const GRID_MIN_DELTA = 24;

describe('colour helpers', () => {
  it('parses #rrggbb and #rgb', () => {
    expect(hexToRgb('#0f172a')).toEqual({ r: 15, g: 23, b: 42 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('alpha-composites a stroke over a background', () => {
    // black @ 50% over white -> mid grey.
    expect(blendOver('#000000', 0.5, '#ffffff')).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
  });

  it('blends before measuring contrast (low-opacity line is not its base colour)', () => {
    // A white line at 10% over white has essentially no contrast despite being "white".
    expect(lineContrast('#ffffff', 0.1, '#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('dark theme legibility', () => {
  const c = themeColors(true);

  it('renders the x=0/y=0 origin cross with clear contrast against the background', () => {
    expect(lineContrast(c.axis, c.axisOpacity, c.bg)).toBeGreaterThanOrEqual(ORIGIN_MIN_CONTRAST);
  });

  it('renders gridlines visibly separated from the background', () => {
    expect(lineDelta(c.grid, c.gridOpacity, c.bg)).toBeGreaterThanOrEqual(GRID_MIN_DELTA);
  });
});

describe('light theme is preserved (no regression to invisible)', () => {
  const c = themeColors(false);

  it('keeps a clearly visible origin cross', () => {
    expect(lineContrast(c.axis, c.axisOpacity, c.bg)).toBeGreaterThanOrEqual(1.5);
  });

  it('keeps a visible gridline', () => {
    expect(lineDelta(c.grid, c.gridOpacity, c.bg)).toBeGreaterThan(8);
  });
});

describe('dark mode is at least as legible as light (the reported asymmetry)', () => {
  const dark = themeColors(true);
  const light = themeColors(false);

  it('gridlines are not fainter in dark than in light', () => {
    expect(lineDelta(dark.grid, dark.gridOpacity, dark.bg)).toBeGreaterThanOrEqual(
      lineDelta(light.grid, light.gridOpacity, light.bg),
    );
  });

  it('the origin cross is not fainter in dark than in light', () => {
    expect(lineContrast(dark.axis, dark.axisOpacity, dark.bg)).toBeGreaterThanOrEqual(
      lineContrast(light.axis, light.axisOpacity, light.bg),
    );
  });
});
