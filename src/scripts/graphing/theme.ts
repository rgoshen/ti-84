/**
 * Plot theming: the per-theme palette and the colour math used to reason about
 * how visible each plot element is once function-plot's low gridline opacity is
 * applied.
 *
 * Kept free of any DOM / function-plot dependency so the palette decisions can be
 * unit-tested in the node environment. `plot.ts` consumes these values and does
 * the actual SVG mutation.
 */

/** Colours for one theme. */
export interface ThemeColors {
  /** SVG background. */
  bg: string;
  /** Minor + major gridline stroke (drawn faint, at {@link gridOpacity}). */
  grid: string;
  /**
   * Opacity applied to gridlines. function-plot defaults to 0.1, which is too
   * faint to survive on a dark background, so the dark theme raises it.
   */
  gridOpacity: number;
  /** The bold x=0 / y=0 origin cross stroke (drawn at {@link axisOpacity}). */
  axis: string;
  /** Opacity applied to the origin cross. */
  axisOpacity: number;
  /** Axis label / tick text colour. */
  text: string;
}

/**
 * Plot palette for dark vs light.
 *
 * Light mirrors function-plot's own defaults (slate gridlines at 0.1 opacity, a
 * black origin cross at 0.2 — i.e. a #ccc axis on white), which already reads
 * well, so it is kept untouched.
 *
 * Dark cannot be fixed by hex alone: function-plot forces gridlines to ~0.1
 * opacity, where even white only lands ~24/255 above a near-black background,
 * and it paints the origin cross solid black (invisible on dark). So the dark
 * theme brightens the gridline colour AND raises both opacities, and recolours
 * the origin cross to a light slate so the x=0/y=0 axes read as bold.
 */
export function themeColors(dark: boolean): ThemeColors {
  return dark
    ? {
        bg: '#0f172a',
        grid: '#94a3b8',
        gridOpacity: 0.24,
        axis: '#cbd5e1',
        axisOpacity: 0.55,
        text: '#cbd5e1',
      }
    : {
        bg: '#ffffff',
        grid: '#94a3b8',
        gridOpacity: 0.1,
        axis: '#000000',
        axisOpacity: 0.2,
        text: '#334155',
      };
}

/**
 * Extra colours for the Function Explorer's overlay marks. `themeColors` already
 * owns the shared background / grid / axis / text; this adds the elements unique
 * to the explorer — the curve, the vertical-asymptote "wall" and horizontal
 * "floor" guides, the limit-sweep arrow, the draggable point (+ its halo), and
 * the dashed "ghost" parent curve drawn behind a transformed curve.
 *
 * These are drawn as full-opacity SVG overlays (unlike function-plot's forced
 * low-opacity gridlines), so each of curve/wall/floor/arrow/ghost clears WCAG
 * 1.4.11 (3:1 non-text contrast) against `themeColors(dark).bg` in BOTH themes —
 * see theme.test.ts. `pointStroke` is a background-toned halo that separates the
 * point from the curve it rides.
 */
export interface ExplorerColors {
  /** The plotted function. */
  curve: string;
  /** Vertical asymptote guide (drawn dashed). */
  wall: string;
  /** Horizontal asymptote guide (drawn dashed). */
  floor: string;
  /** Limit-sweep trail + arrowhead. */
  arrow: string;
  /** Draggable point fill. */
  point: string;
  /** Halo ring around the point (background-toned) so it reads on the curve. */
  pointStroke: string;
  /** De-emphasised parent curve drawn dashed behind the transformed curve. */
  ghost: string;
}

/**
 * Explorer overlay palette for dark vs light. Dark uses the app's bright chart
 * hues on the near-black plot background; light mirrors the original
 * reciprocal-square-explorer's palette on white. All marks are verified for
 * 3:1 non-text contrast against the background in theme.test.ts.
 */
export function explorerColors(dark: boolean): ExplorerColors {
  return dark
    ? {
        curve: '#a78bfa',
        wall: '#f87171',
        floor: '#60a5fa',
        arrow: '#fb923c',
        point: '#ddd6fe',
        pointStroke: '#0f172a',
        ghost: '#64748b',
      }
    : {
        curve: '#7f77dd',
        wall: '#e24b4a',
        floor: '#378add',
        arrow: '#ea580c',
        point: '#3c3489',
        pointStroke: '#ffffff',
        // #94a3b8 (slate-400) only clears 2.56:1 against white — below the 3:1
        // floor. Darkened to slate-500 (also used for dark's ghost) for margin.
        ghost: '#64748b',
      };
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a `#rgb` or `#rrggbb` string into 0..255 channels. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Alpha-composite a semi-transparent stroke over an opaque background.
 * effective = opacity * stroke + (1 - opacity) * background, per channel.
 */
export function blendOver(strokeHex: string, opacity: number, bgHex: string): Rgb {
  const s = hexToRgb(strokeHex);
  const b = hexToRgb(bgHex);
  const mix = (a: number, c: number): number => opacity * a + (1 - opacity) * c;
  return { r: mix(s.r, b.r), g: mix(s.g, b.g), b: mix(s.b, b.b) };
}

/** WCAG 2.x relative luminance of an sRGB colour. https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio (1..21) of a semi-transparent line over a background.
 * Blends first because function-plot renders lines at low opacity, so the base
 * colour alone overstates how visible the line actually is. Use for the
 * prominent origin cross.
 */
export function lineContrast(strokeHex: string, opacity: number, bgHex: string): number {
  const l1 = relativeLuminance(blendOver(strokeHex, opacity, bgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Largest per-channel sRGB code-value difference (0..255) between a
 * semi-transparent line and its background. A better "is this faint line
 * visible at all" measure than WCAG ratio for near-background gridlines, where
 * the ratio's flare term saturates. Use for the deliberately-faint grid.
 */
export function lineDelta(strokeHex: string, opacity: number, bgHex: string): number {
  const e = blendOver(strokeHex, opacity, bgHex);
  const b = hexToRgb(bgHex);
  return Math.max(Math.abs(e.r - b.r), Math.abs(e.g - b.g), Math.abs(e.b - b.b));
}
