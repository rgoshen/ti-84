// src/scripts/explorer/transform-render.ts
/**
 * function-plot renderer for the Transformation Explorer. Draws TWO native
 * series — the parent f(x) as a dashed "ghost" and the transformed g(x) as the
 * solid curve — reusing the graphing calculator's plotting/theme helpers. Unlike
 * the limits explorer it needs no manual overlay: both marks are real functions,
 * so function-plot's interval-arithmetic discontinuity handling applies to both.
 * The only post-processing is dashing the parent's <g class="graph"> group [G4].
 */
import functionPlotDefault from 'function-plot';
import type { FunctionPlotDatum } from 'function-plot';
import type { Window2D, Point } from '@/scripts/graphing/math';
import { themeColors, explorerColors, type ExplorerColors } from '@/scripts/graphing/theme';
import {
  applyThemeToPlot,
  boldZeroAxes,
  asNumericScale,
  makeMarker,
  SVG_NS,
  type FunctionPlotInstance,
  type PointShape,
} from '@/scripts/graphing/plot';
import { composeExpr, type Coeffs } from './transform';

type FunctionPlotFn = typeof functionPlotDefault;
const functionPlot: FunctionPlotFn =
  (functionPlotDefault as unknown as { default?: FunctionPlotFn }).default ?? functionPlotDefault;

const PLOT_HEIGHT = 480;

export interface TransformRenderOptions {
  target: HTMLElement;
  window: Window2D; // the domain to draw (pass the CURRENT view to preserve zoom)
  baseExpr: string;
  coeffs: Coeffs;
  showParent: boolean;
  /** Precomputed crossings; empty when the toggle is off. Parent markers obey `showParent`. */
  parentPoints: Point[];
  transformedPoints: Point[];
  /** Marker shape, same picker as the graphing calculator. Colour separates the two curves. */
  pointShape: PointShape;
  dark: boolean;
  grid: boolean;
  onViewChange: (w: Window2D) => void;
}

export interface TransformHandle {
  instance: FunctionPlotInstance;
}

/** Dash the parent series (drawn first → the first <g class="graph">). */
function dashParent(target: HTMLElement, showParent: boolean): void {
  if (!showParent) return;
  const graphs = target.querySelectorAll<SVGGElement>('g.graph');
  graphs[0]?.querySelectorAll('path').forEach((p) => {
    p.setAttribute('stroke-dasharray', '6 6');
  });
}

/**
 * Whole-number gridline crossings for both curves. Cleared and rebuilt on every call, so
 * repeated renders never stack duplicates. The class is `.transform-points`, which cannot
 * collide with `dashParent`'s `g.graph` selector. Does no math — the island precomputes.
 */
function drawPoints(
  target: HTMLElement,
  instance: FunctionPlotInstance,
  parentPoints: Point[],
  transformedPoints: Point[],
  pointShape: PointShape,
  eColors: ExplorerColors,
): void {
  const svg = target.querySelector('svg');
  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!svg || !xScale || !yScale) return;
  const canvas = svg.querySelector('g.canvas') ?? svg;

  canvas.querySelectorAll('.transform-points').forEach((n) => n.remove());
  if (parentPoints.length === 0 && transformedPoints.length === 0) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'transform-points');
  const add = (pts: Point[], color: string, kind: string): void => {
    for (const p of pts) {
      const marker = makeMarker(pointShape, xScale(p.x), yScale(p.y), color);
      marker.setAttribute('data-testid', `crossing-marker-${kind}`);
      g.appendChild(marker);
    }
  };
  add(parentPoints, eColors.ghost, 'parent');
  add(transformedPoints, eColors.curve, 'transformed');
  canvas.appendChild(g);
}

export function renderTransform(opts: TransformRenderOptions): TransformHandle {
  const {
    target,
    window: win,
    baseExpr,
    coeffs,
    showParent,
    parentPoints,
    transformedPoints,
    pointShape,
    dark,
    grid,
    onViewChange,
  } = opts;
  const colors = themeColors(dark);
  const eColors = explorerColors(dark);

  // Parent FIRST so it draws underneath and is the first g.graph (dashed); the
  // transformed curve draws on top, solid.
  const data: FunctionPlotDatum[] = [];
  if (showParent && baseExpr)
    data.push({ fn: baseExpr, color: eColors.ghost, graphType: 'polyline' });
  if (baseExpr)
    data.push({ fn: composeExpr(baseExpr, coeffs), color: eColors.curve, graphType: 'polyline' });

  const instance = functionPlot({
    target,
    width: target.clientWidth,
    height: PLOT_HEIGHT,
    grid,
    disableZoom: false,
    xAxis: { domain: [win.xMin, win.xMax], label: 'x' },
    yAxis: { domain: [win.yMin, win.yMax], label: 'y' },
    data,
  });

  applyThemeToPlot(target, colors);
  boldZeroAxes(target);
  dashParent(target, showParent);
  drawPoints(target, instance, parentPoints, transformedPoints, pointShape, eColors);

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
      applyThemeToPlot(target, colors);
      boldZeroAxes(target);
      dashParent(target, showParent);
      // Redraw with the CURRENT (pre-zoom) crossings so markers stay on the curve during the
      // gesture; onViewChange then updates the window, and the island recomputes them for the
      // new view on the next render.
      drawPoints(target, instance, parentPoints, transformedPoints, pointShape, eColors);
      onViewChange({ xMin: xd[0], xMax: xd[1], yMin: yd[0], yMax: yd[1] });
    });
  });

  return { instance };
}
