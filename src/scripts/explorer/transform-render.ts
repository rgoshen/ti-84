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
import type { Window2D } from '@/scripts/graphing/math';
import { themeColors, explorerColors } from '@/scripts/graphing/theme';
import {
  applyThemeToPlot,
  boldZeroAxes,
  asNumericScale,
  type FunctionPlotInstance,
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

export function renderTransform(opts: TransformRenderOptions): TransformHandle {
  const { target, window: win, baseExpr, coeffs, showParent, dark, grid, onViewChange } = opts;
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
      onViewChange({ xMin: xd[0], xMax: xd[1], yMin: yd[0], yMax: yd[1] });
    });
  });

  return { instance };
}
