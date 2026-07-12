/**
 * function-plot renderer for the Function Explorer. Reuses the graphing
 * calculator's plotting stack (`renderGraph`'s helpers) and adds an SVG overlay
 * — the draggable point, the animated limit-sweep trail + arrowhead, and the
 * dashed wall / floor guides — drawn into function-plot's `g.canvas` group and
 * positioned with the live D3 scales, so every mark sits exactly on the curve.
 *
 * This is the only DOM-bound module in the feature; all decisions it renders
 * (asymptotes, pins, sweep path) come from the pure, tested modules.
 */

import functionPlotDefault from 'function-plot';
import type { FunctionPlotDatum } from 'function-plot';
import { evalAt, type Window2D, type Point } from '@/scripts/graphing/math';
import {
  themeColors,
  explorerColors,
  type ExplorerColors,
} from '@/scripts/graphing/theme';
import {
  applyThemeToPlot,
  boldZeroAxes,
  asNumericScale,
  makeMarker,
  SVG_NS,
  type FunctionPlotInstance,
  type PointShape,
} from '@/scripts/graphing/plot';
import { pinToWindow } from './branch';
import type { Asymptote, EndBehavior } from './limits';

// Same CJS/ESM interop normalisation as plot.ts (default export vs namespace).
type FunctionPlotFn = typeof functionPlotDefault;
const functionPlot: FunctionPlotFn =
  (functionPlotDefault as unknown as { default?: FunctionPlotFn }).default ?? functionPlotDefault;

const PLOT_HEIGHT = 480;
const POINT_RADIUS = 6;

/** Everything the overlay needs to draw one frame. */
export interface OverlayScene {
  expr: string;
  window: Window2D; // current view (drives the pin clamp + full-height guides)
  x: number; // draggable point x
  asymptotes: Asymptote[];
  endNeg: EndBehavior;
  endPos: EndBehavior;
  showWall: boolean;
  showFloor: boolean;
  /** Whole-number gridline crossings to mark, already computed by the island (empty = off). */
  points: Point[];
  /** Marker shape, same picker as the graphing calculator. */
  pointShape: PointShape;
  /** Active limit-sweep trail (start x → leading x), or null when idle. */
  sweepTrail: { fromX: number; leadX: number } | null;
}

export interface RenderExplorerOptions {
  target: HTMLElement;
  window: Window2D;
  expr: string;
  dark: boolean;
  grid: boolean;
  /** Optional fixed render height; interactive callers use the existing default. */
  height?: number;
  getScene: () => OverlayScene;
  onViewChange: (w: Window2D) => void;
}

export interface ExplorerHandle {
  instance: FunctionPlotInstance;
  /** Redraw the overlay from the latest getScene(). */
  redraw: () => void;
}

/** Pointer viewport coords → data coords + g.canvas-local pixels (for hit-testing). */
export interface PointerData {
  dataX: number;
  dataY: number;
  localX: number;
  localY: number;
}

export function pointerToData(
  instance: FunctionPlotInstance,
  target: HTMLElement,
  clientX: number,
  clientY: number,
): PointerData | null {
  const svg = target.querySelector('svg');
  const canvas = svg?.querySelector<SVGGElement>('g.canvas');
  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!svg || !canvas || !xScale || !yScale) return null;
  const ctm = canvas.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { dataX: xScale.invert(local.x), dataY: yScale.invert(local.y), localX: local.x, localY: local.y };
}

/** Data coords → g.canvas-local pixels (for hit-testing the draggable point). */
export function localOf(
  instance: FunctionPlotInstance,
  dataX: number,
  dataY: number,
): { x: number; y: number } | null {
  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!xScale || !yScale) return null;
  return { x: xScale(dataX), y: yScale(dataY) };
}

function dashedLine(x1: number, y1: number, x2: number, y2: number, color: string): SVGElement {
  const el = document.createElementNS(SVG_NS, 'line');
  el.setAttribute('x1', String(x1));
  el.setAttribute('y1', String(y1));
  el.setAttribute('x2', String(x2));
  el.setAttribute('y2', String(y2));
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', '1.5');
  el.setAttribute('stroke-dasharray', '6 6');
  return el;
}

function arrowHead(from: [number, number], to: [number, number], color: string): SVGElement {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = 9;
  const a1 = ang + Math.PI - 0.5;
  const a2 = ang + Math.PI + 0.5;
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute(
    'd',
    `M ${to[0]} ${to[1]} L ${to[0] + size * Math.cos(a1)} ${to[1] + size * Math.sin(a1)} ` +
      `L ${to[0] + size * Math.cos(a2)} ${to[1] + size * Math.sin(a2)} Z`,
  );
  p.setAttribute('fill', color);
  return p;
}

function drawExplorerOverlay(
  instance: FunctionPlotInstance,
  target: HTMLElement,
  scene: OverlayScene,
  c: ExplorerColors,
): void {
  const svg = target.querySelector('svg');
  const xScale = asNumericScale(instance.meta.xScale);
  const yScale = asNumericScale(instance.meta.yScale);
  if (!svg || !xScale || !yScale) return;
  const canvasG = svg.querySelector('g.canvas') ?? svg;

  canvasG.querySelectorAll('.explorer-overlay').forEach((n) => n.remove());
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'explorer-overlay');

  const win = scene.window;
  const yTop = yScale(win.yMax);
  const yBot = yScale(win.yMin);
  const xLeft = xScale(win.xMin);
  const xRight = xScale(win.xMax);

  // Vertical asymptote guides.
  if (scene.showWall) {
    for (const a of scene.asymptotes) {
      const X = xScale(a.x);
      g.appendChild(dashedLine(X, yTop, X, yBot, c.wall));
    }
  }

  // Horizontal asymptote guides — up to two (one per side) [G2].
  if (scene.showFloor) {
    const floors = new Set<number>();
    if (scene.endPos.kind === 'finite' && scene.endPos.value !== undefined) floors.add(scene.endPos.value);
    if (scene.endNeg.kind === 'finite' && scene.endNeg.value !== undefined) floors.add(scene.endNeg.value);
    for (const fy of floors) {
      const Y = yScale(fy);
      g.appendChild(dashedLine(xLeft, Y, xRight, Y, c.floor));
    }
  }

  // Whole-number gridline crossings. Precomputed by the island — this renderer does no math.
  for (const p of scene.points) {
    const marker = makeMarker(scene.pointShape, xScale(p.x), yScale(p.y), c.curve);
    marker.setAttribute('data-testid', 'crossing-marker');
    g.appendChild(marker);
  }

  // Animated limit-sweep trail (one polyline, per G9 — not 48 nodes) + arrowhead.
  if (scene.sweepTrail) {
    const { fromX, leadX } = scene.sweepTrail;
    const pts: Array<[number, number]> = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const xx = fromX + ((leadX - fromX) * i) / n;
      const pinned = pinToWindow(evalAt(scene.expr, xx), win);
      if (pinned.status === 'undefined') continue;
      pts.push([xScale(xx), yScale(pinned.drawY)]);
    }
    if (pts.length >= 2) {
      const poly = document.createElementNS(SVG_NS, 'polyline');
      poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', c.arrow);
      poly.setAttribute('stroke-width', '3');
      poly.setAttribute('stroke-linecap', 'round');
      g.appendChild(poly);
      g.appendChild(arrowHead(pts[pts.length - 2], pts[pts.length - 1], c.arrow));
    }
  }

  // The draggable point (pinned to the window edge instead of clipping).
  const pinned = pinToWindow(evalAt(scene.expr, scene.x), win);
  if (pinned.status !== 'undefined') {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(xScale(scene.x)));
    dot.setAttribute('cy', String(yScale(pinned.drawY)));
    dot.setAttribute('r', String(POINT_RADIUS));
    dot.setAttribute('fill', c.point);
    dot.setAttribute('stroke', c.pointStroke);
    dot.setAttribute('stroke-width', '2');
    dot.setAttribute('data-testid', 'explorer-point');
    dot.setAttribute('data-x', String(scene.x));
    dot.setAttribute('data-pin', pinned.status);
    g.appendChild(dot);
  }

  canvasG.appendChild(g);
}

export function renderExplorer(opts: RenderExplorerOptions): ExplorerHandle {
  const { target, window: win, expr, dark, grid, height = PLOT_HEIGHT, getScene, onViewChange } = opts;
  const colors = themeColors(dark);
  const eColors = explorerColors(dark);

  // No default function — with an empty expression the plot shows only the axes.
  const data: FunctionPlotDatum[] = expr
    ? [{ fn: expr, color: eColors.curve, graphType: 'polyline' }]
    : [];
  const instance = functionPlot({
    target,
    width: target.clientWidth,
    height,
    grid,
    disableZoom: false,
    xAxis: { domain: [win.xMin, win.xMax], label: 'x' },
    yAxis: { domain: [win.yMin, win.yMax], label: 'y' },
    data,
  });

  applyThemeToPlot(target, colors);
  boldZeroAxes(target);

  const redraw = (): void => drawExplorerOverlay(instance, target, getScene(), eColors);
  redraw();

  // Interactive zoom/pan: re-theme, redraw the overlay for the new scales, and
  // report the new domain so the island can recompute asymptotes / epsilon.
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
      redraw();
      onViewChange({ xMin: xd[0], xMax: xd[1], yMin: yd[0], yMax: yd[1] });
    });
  });

  return { instance, redraw };
}
