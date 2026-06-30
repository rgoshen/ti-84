import functionPlotDefault from 'function-plot';
import type { FunctionPlotDatum, FunctionPlotScale } from 'function-plot';
import { gridlineCrossings, type Window2D } from '@/scripts/graphing/math';
import { themeColors, type ThemeColors } from '@/scripts/graphing/theme';

// function-plot ships as CommonJS (`exports.default = functionPlot`). Depending on
// the bundler's ESM interop (Vite/esbuild in dev vs Rollup in build), the default
// import is sometimes the callable and sometimes a namespace wrapper around it.
// Normalize to the callable so it works in both.
type FunctionPlotFn = typeof functionPlotDefault;
const functionPlot: FunctionPlotFn =
  (functionPlotDefault as unknown as { default?: FunctionPlotFn }).default ??
  functionPlotDefault;

/** Marker shape drawn at each whole-number gridline crossing when "Show points" is on. */
export type PointShape = 'circle' | 'square' | 'triangle';

/** One plotted curve and its presentation options. */
export interface PlotEquation {
  expr: string;
  color: string;
  showPoints: boolean;
  pointShape: PointShape;
}

export interface RenderGraphOptions {
  target: HTMLElement;
  window: Window2D;
  equations: PlotEquation[];
  dark: boolean;
  /** Called after an interactive zoom/pan with the new visible domain. */
  onViewChange: (w: Window2D) => void;
}

/** The object returned by function-plot (a Chart instance / event emitter). */
export type FunctionPlotInstance = ReturnType<typeof functionPlot>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const PLOT_HEIGHT = 560;
const MARKER_RADIUS = 4;

/**
 * Minimal view of function-plot's live d3 linear scale: maps a data value to a
 * canvas-local pixel and exposes the current domain. function-plot types the scale
 * as a union of linear/log scales whose overloaded `domain()` signatures don't
 * combine cleanly, so we narrow through this interface (axes are always linear here).
 */
interface NumericScale {
  (value: number): number;
  domain(): number[];
}

function asNumericScale(scale: FunctionPlotScale | undefined): NumericScale | null {
  return scale ? (scale as unknown as NumericScale) : null;
}

/**
 * Recolor the rendered svg for the current theme: background, faint gridlines,
 * the bold x=0/y=0 origin cross, and axis text.
 *
 * function-plot renders the per-tick gridlines and the `.domain` frame at a low
 * fixed opacity, and paints the `.origin` cross solid black — none of which
 * survives a dark background. So we override stroke AND opacity here, not color
 * alone. function-plot recreates these elements on every zoom/pan, so this is
 * re-applied after each redraw.
 */
function applyThemeToPlot(target: HTMLElement, c: ThemeColors): void {
  const svg = target.querySelector('svg');
  if (!svg) return;
  svg.style.background = c.bg;
  // Faint gridlines: the per-tick lines plus the axis domain frame.
  svg.querySelectorAll<SVGElement>('.axis line, .axis path').forEach((el) => {
    el.style.stroke = c.grid;
    el.style.opacity = String(c.gridOpacity);
  });
  // The bold x=0 / y=0 origin cross (function-plot's `.x.origin` / `.y.origin`).
  svg.querySelectorAll<SVGElement>('.origin').forEach((el) => {
    el.style.stroke = c.axis;
    el.style.opacity = String(c.axisOpacity);
  });
  svg.querySelectorAll<SVGElement>('text').forEach((el) => {
    el.style.fill = c.text;
  });
}

/**
 * Make the gridlines at x=0 and y=0 bolder than the rest (graphing.html's
 * boldGridAxes), so the axes stand out. With `grid: true`, function-plot draws
 * gridlines AS the axis tick lines (the 0 tick's line spans the whole plot), so
 * we bold the line of the "0" tick in each axis. function-plot recreates these
 * on every zoom/pan, so this is re-applied after each redraw.
 */
function boldZeroAxes(target: HTMLElement): void {
  const svg = target.querySelector('svg');
  if (!svg) return;
  for (const axis of ['x', 'y'] as const) {
    const g = svg.querySelector(`g.${axis}.axis`);
    if (!g) continue;
    g.querySelectorAll('.tick').forEach((tick) => {
      const text = tick.querySelector('text');
      const line = tick.querySelector<SVGLineElement>('line');
      if (text && line && parseFloat(text.textContent ?? '') === 0) {
        line.style.strokeWidth = '2';
      }
    });
  }
}

/** Build one SVG marker of the given shape centered at the canvas-local pixel (cx, cy). */
function makeMarker(shape: PointShape, cx: number, cy: number, color: string): SVGElement {
  const r = MARKER_RADIUS;
  let el: SVGElement;
  if (shape === 'square') {
    el = document.createElementNS(SVG_NS, 'rect');
    el.setAttribute('x', String(cx - r));
    el.setAttribute('y', String(cy - r));
    el.setAttribute('width', String(r * 2));
    el.setAttribute('height', String(r * 2));
  } else if (shape === 'triangle') {
    el = document.createElementNS(SVG_NS, 'path');
    const top = `${cx},${cy - r * 1.4}`;
    const bl = `${cx - r * 1.2},${cy + r}`;
    const br = `${cx + r * 1.2},${cy + r}`;
    el.setAttribute('d', `M ${top} L ${bl} L ${br} Z`);
  } else {
    el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('cx', String(cx));
    el.setAttribute('cy', String(cy));
    el.setAttribute('r', String(r));
  }
  el.setAttribute('fill', color);
  el.setAttribute('stroke', '#ffffff');
  el.setAttribute('stroke-width', '1');
  el.style.opacity = '0.95';
  return el;
}

/**
 * Draw (or redraw) the point overlay for the given window.
 *
 * function-plot draws each curve inside `<g class="canvas">`, which carries the
 * margin transform. We position markers with the instance's OWN scales — exactly
 * what the curve uses — and append them into that same `g.canvas` group, so every
 * marker sits on the curve. Appending to the svg root instead would offset each
 * point by the margin.
 */
function drawPointsOverlay(
  instance: FunctionPlotInstance,
  target: HTMLElement,
  win: Window2D,
  equations: PlotEquation[],
): void {
  const svg = target.querySelector('svg');
  if (!svg) return;

  // Remove any previous overlay before redrawing.
  svg.querySelectorAll('.points-overlay').forEach((n) => n.remove());

  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!xScale || !yScale) return;

  const canvas = svg.querySelector('g.canvas') ?? svg;

  for (const eq of equations) {
    if (!eq.showPoints) continue;
    const overlay = document.createElementNS(SVG_NS, 'g');
    overlay.setAttribute('class', 'points-overlay');
    for (const { x, y } of gridlineCrossings(eq.expr, win)) {
      overlay.appendChild(makeMarker(eq.pointShape, xScale(x), yScale(y), eq.color));
    }
    canvas.appendChild(overlay);
  }
}

/**
 * Render the graph into `target`, draw the point overlay, apply the theme, and wire
 * interactive zoom/pan so the overlay and the consumer's view state stay in sync.
 *
 * Returns the function-plot instance. The caller owns its lifecycle (clear the target
 * and call renderGraph again to rebuild; function-plot has no explicit destroy).
 */
export function renderGraph(opts: RenderGraphOptions): FunctionPlotInstance {
  const { target, window: win, equations, dark, onViewChange } = opts;
  const colors = themeColors(dark);

  const data: FunctionPlotDatum[] = equations.map((eq) => ({
    fn: eq.expr,
    color: eq.color,
    graphType: 'polyline',
  }));

  const instance = functionPlot({
    target,
    width: target.clientWidth,
    height: PLOT_HEIGHT,
    grid: true,
    disableZoom: false,
    xAxis: { domain: [win.xMin, win.xMax], label: 'x' },
    yAxis: { domain: [win.yMin, win.yMax], label: 'y' },
    data,
  });

  applyThemeToPlot(target, colors);
  boldZeroAxes(target);
  drawPointsOverlay(instance, target, win, equations);

  // function-plot owns interactive scroll-zoom / drag-pan; it redraws the curve and
  // axes internally but never touches our overlay. Re-sync on every zoom/pan: read the
  // NEW domain from function-plot's own scales, redraw the overlay for it, and report
  // it back to the caller. Throttled to one redraw per animation frame (zoom fires
  // rapidly). Deliberately does NOT rebuild the plot — that would reset the zoom.
  let queued = false;
  instance.on('all:zoom', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const xScale = asNumericScale(instance.meta.xScale);
      const yScale = asNumericScale(instance.meta.yScale);
      if (!xScale || !yScale) return;
      const xd = xScale.domain();
      const yd = yScale.domain();
      const view: Window2D = { xMin: xd[0], xMax: xd[1], yMin: yd[0], yMax: yd[1] };
      // function-plot recreated the axes/grid for the new view: re-apply theme,
      // re-bold the zero axes, and redraw the overlay.
      applyThemeToPlot(target, colors);
      boldZeroAxes(target);
      drawPointsOverlay(instance, target, view, equations);
      onViewChange(view);
    });
  });

  return instance;
}
