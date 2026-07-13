import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluate } from 'mathjs';

import { evalAt, gridlineCrossings, integerXs, type Window2D } from '@/scripts/graphing/math';
import { explorerColors } from '@/scripts/graphing/theme';
import { formatNumber } from '@/scripts/graphing/hover';
import ValueTable, { type ValueColumn } from '@/components/ValueTable';
import FunctionDetailsPanels, {
  type FunctionDetailsPanelEntry,
} from '@/components/FunctionDetailsPanels';
import { analyzeFunction, functionAnalysisFacts } from '@/scripts/graphing/analysis';
import {
  renderExplorer,
  pointerToData,
  localOf,
  type ExplorerHandle,
  type OverlayScene,
} from '@/scripts/explorer/render';
import { pinToWindow } from '@/scripts/explorer/branch';
import {
  clampToVisible,
  resolveVisibleX,
  sweepEndpoints,
  type Sweep,
  type SweepPath,
} from '@/scripts/explorer/visible';
import {
  findVerticalAsymptotes,
  classifyEndBehavior,
  type EndBehavior,
  type Sign,
} from '@/scripts/explorer/limits';
import { describeReadout } from '@/scripts/explorer/notation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { PointShape } from '@/scripts/graphing/plot';
import GraphResultExport from '@/components/export/GraphResultExport';
import {
  EXPORT_GRAPH_HEIGHT,
  formatExportEquation,
  formatExportValue,
  selectRepresentativeRows,
  type ExportSnapshot,
} from '@/scripts/export/model';

// Tunables, in one place.
const DEFAULT_WINDOW: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
const SHAPES: PointShape[] = ['circle', 'square', 'triangle'];
const POINT_HIT_RADIUS_PX = 16; // grab radius for the draggable point
const SWEEP_MS = 1400; // limit-sweep animation duration
const READOUT_SETTLE_MS = 250; // coalesce aria-live announcements

type WindowFields = Record<keyof Window2D, string>;

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

const windowToFields = (w: Window2D): WindowFields => ({
  xMin: String(round6(w.xMin)),
  xMax: String(round6(w.xMax)),
  yMin: String(round6(w.yMin)),
  yMax: String(round6(w.yMax)),
});

/** Strip a leading "y =" so "y = 1/x" and "1/x" both work. */
const normalizeExpr = (raw: string): string => raw.trim().replace(/^y\s*=\s*/i, '');

const buildFunctionDetails = (
  expression: string,
  window: Window2D,
  color: string,
): FunctionDetailsPanelEntry[] => {
  if (!expression.trim()) return [];

  return [
    {
      id: 'function-explorer-function',
      title: `Function details · f(x) = ${formatExportEquation(expression)}`,
      color,
      facts: functionAnalysisFacts(analyzeFunction(expression, window)),
    },
  ];
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const sweepEq = (a: Sweep | null, b: Sweep): boolean => {
  if (a === null || a.kind !== b.kind) return false;
  if (a.kind === 'approach' && b.kind === 'approach') return a.a === b.a && a.side === b.side;
  if (a.kind === 'end' && b.kind === 'end') return a.dir === b.dir;
  return false;
};

const infinityForSign = (sign: Sign): string => (sign === 1 ? '+infinity' : '-infinity');

const describeEndBehaviorForExport = (end: EndBehavior): string => {
  if (end.kind === 'finite') {
    const approach = end.approach ? ` from ${end.approach === '+' ? 'above' : 'below'}` : '';
    return `Horizontal asymptote y = ${formatNumber(end.value ?? 0)}${approach}`;
  }
  if (end.kind === 'posInf') return '+infinity';
  if (end.kind === 'negInf') return '-infinity';
  return 'Unknown or oscillating';
};

export default function FunctionExplorer(): React.JSX.Element {
  // No default function — the explorer starts empty until the user plots one.
  const [expr, setExpr] = useState('');
  const [exprInput, setExprInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(DEFAULT_WINDOW));
  const [x, setX] = useState(1);
  const [showWall, setShowWall] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [pointShape, setPointShape] = useState<PointShape>('circle');
  const [sweep, setSweep] = useState<Sweep | null>(null);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );

  const hasFunction = expr.trim().length > 0;

  const plotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ExplorerHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const sweepPathRef = useRef<SweepPath | null>(null);

  const asymptotes = useMemo(() => findVerticalAsymptotes(expr, displayWindow), [expr, displayWindow]);
  const endNeg = useMemo(() => classifyEndBehavior(expr, 'neg'), [expr]);
  const endPos = useMemo(() => classifyEndBehavior(expr, 'pos'), [expr]);
  const poles = useMemo(() => asymptotes.map((a) => a.x), [asymptotes]);

  // Points + table data are computed HERE and passed down precomputed: `evalAt` re-parses its
  // expression on every call, so it must stay out of the renderer's and the table's render path.
  const points = useMemo(
    () => (showPoints && hasFunction ? gridlineCrossings(expr, displayWindow) : []),
    [showPoints, hasFunction, expr, displayWindow],
  );
  const tableXs = useMemo(
    () => (hasFunction ? integerXs(displayWindow) : []),
    [hasFunction, displayWindow],
  );
  const tableColumns = useMemo<ValueColumn[]>(
    () =>
      hasFunction
        ? [
            {
              key: 'fx',
              header: `f(x) = ${expr}`,
              color: explorerColors(dark).curve,
              values: tableXs.map((x) => evalAt(expr, x)),
            },
          ]
        : [],
    [hasFunction, expr, tableXs, dark],
  );
  const liveFunctionDetails = useMemo(
    () => buildFunctionDetails(expr, displayWindow, explorerColors(dark).curve),
    [expr, displayWindow, dark],
  );

  const sweepButtons = useMemo(() => {
    if (!hasFunction) return [];
    const list: Array<{ label: string; sweep: Sweep }> = [];
    for (const a of asymptotes) {
      list.push({ label: `x → ${formatNumber(a.x)}⁻`, sweep: { kind: 'approach', a: a.x, side: '-' } });
      list.push({ label: `x → ${formatNumber(a.x)}⁺`, sweep: { kind: 'approach', a: a.x, side: '+' } });
    }
    list.push({ label: 'x → −∞', sweep: { kind: 'end', dir: 'neg' } });
    list.push({ label: 'x → ∞', sweep: { kind: 'end', dir: 'pos' } });
    return list;
  }, [asymptotes, hasFunction]);

  const fx = hasFunction ? evalAt(expr, x) : null;
  const pin = pinToWindow(fx, displayWindow).status;
  const readout = hasFunction
    ? describeReadout({ x, fx, pin, win: displayWindow, asymptotes, endNeg, endPos })
    : {
        headline: 'Enter a function to begin',
        note: 'Type a function above (e.g. 1/x^2, tan(x), 1/(x-2)) and press Plot.',
      };

  // Latest scene for the renderer + latest values for the drag/sweep closures.
  const sceneRef = useRef<OverlayScene>(undefined as unknown as OverlayScene);
  sceneRef.current = {
    expr,
    window: displayWindow,
    x,
    asymptotes,
    endNeg,
    endPos,
    showWall,
    showFloor,
    points,
    pointShape,
    sweepTrail: sweep && sweepPathRef.current ? { fromX: sweepPathRef.current.from, leadX: x } : null,
  };
  const xRef = useRef(x);
  xRef.current = x;
  const exprRef = useRef(expr);
  exprRef.current = expr;
  const polesRef = useRef(poles);
  polesRef.current = poles;
  const winRef = useRef(displayWindow);
  winRef.current = displayWindow;

  const stopSweep = (): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sweepPathRef.current = null;
    setSweep(null);
  };

  const startSweep = (s: Sweep): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const path = sweepEndpoints(s, exprRef.current, winRef.current, polesRef.current);
    if (!path) return; // nothing visible on that branch
    sweepPathRef.current = path;
    setSweep(s);
    if (prefersReducedMotion()) {
      setX(path.to);
      rafRef.current = null;
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      setX(path.from + t * (path.to - path.from));
      rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Track the site theme so the plot re-themes when the header toggle flips <html class>.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setFields(windowToFields(displayWindow));
  }, [displayWindow]);

  // Build / rebuild the plot and (re)attach pointer arbitration. displayWindow is
  // NOT a dependency, so interactive zoom/pan re-syncs the overlay without a rebuild.
  useEffect(() => {
    const target = plotRef.current;
    if (!target) return;
    let disposed = false;
    let cleanupDrag: (() => void) | null = null;

    // Pointer arbitration: a pointerdown ON the point (capture phase) grabs it and
    // blocks function-plot's pan; a pointerdown elsewhere falls through to pan.
    const attachDrag = (): (() => void) | null => {
      const handle = handleRef.current;
      const svg = target.querySelector('svg');
      if (!handle || !svg) return null;
      let dragging = false;

      const cancelActiveSweep = (): void => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        sweepPathRef.current = null;
        setSweep(null);
      };
      const moveTo = (e: PointerEvent): void => {
        const pd = pointerToData(handle.instance, target, e.clientX, e.clientY);
        if (!pd) return;
        cancelActiveSweep();
        setX(clampToVisible(pd.dataX, xRef.current, exprRef.current, winRef.current, polesRef.current));
      };
      const onDown = (e: PointerEvent): void => {
        if (!exprRef.current) return; // nothing to drag until a function is plotted
        const pd = pointerToData(handle.instance, target, e.clientX, e.clientY);
        const fxv = evalAt(exprRef.current, xRef.current);
        const pinnedY = pinToWindow(fxv, winRef.current).drawY;
        const pp = localOf(handle.instance, xRef.current, pinnedY);
        if (!pd || !pp) return;
        if (Math.hypot(pd.localX - pp.x, pd.localY - pp.y) > POINT_HIT_RADIUS_PX) return;
        e.stopPropagation();
        e.preventDefault();
        dragging = true;
        svg.setPointerCapture?.(e.pointerId);
        moveTo(e);
      };
      const onMove = (e: PointerEvent): void => {
        if (dragging) moveTo(e);
      };
      const onUp = (e: PointerEvent): void => {
        dragging = false;
        svg.releasePointerCapture?.(e.pointerId);
      };

      svg.addEventListener('pointerdown', onDown, true);
      svg.addEventListener('pointermove', onMove);
      svg.addEventListener('pointerup', onUp);
      svg.addEventListener('pointercancel', onUp);
      return () => {
        svg.removeEventListener('pointerdown', onDown, true);
        svg.removeEventListener('pointermove', onMove);
        svg.removeEventListener('pointerup', onUp);
        svg.removeEventListener('pointercancel', onUp);
      };
    };

    const build = (): void => {
      if (disposed) return;
      cleanupDrag?.();
      cleanupDrag = null;
      target.replaceChildren();
      try {
        handleRef.current = renderExplorer({
          target,
          window: appliedWindow,
          expr,
          dark,
          grid: showGrid,
          getScene: () => sceneRef.current,
          onViewChange: (w) => {
            if (disposed) return;
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            sweepPathRef.current = null;
            setSweep(null);
            setDisplayWindow(w);
          },
        });
        setError(null);
        cleanupDrag = attachDrag();
      } catch {
        setError('Could not plot that function. Check the syntax and try again.');
      }
    };

    build();

    let resizeQueued = false;
    const onResize = (): void => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        build();
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      cleanupDrag?.();
      window.removeEventListener('resize', onResize);
    };
  }, [expr, appliedWindow, dark, showGrid]);

  // Redraw the overlay when any scene input changes (no plot rebuild).
  useEffect(() => {
    handleRef.current?.redraw();
  }, [x, sweep, showWall, showFloor, points, pointShape, asymptotes, displayWindow, endNeg, endPos, dark]);

  // Re-seat the point onto the visible curve when the function or window changes.
  useEffect(() => {
    if (!hasFunction) return;
    setX((prev) => resolveVisibleX(expr, prev, displayWindow, poles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, displayWindow]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Coalesced screen-reader announcement — settles after interaction stops.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${readout.headline}. ${readout.note}`), READOUT_SETTLE_MS);
    return () => clearTimeout(id);
  }, [readout.headline, readout.note]);

  const plot = (): void => {
    const e = normalizeExpr(exprInput);
    if (!e) {
      setError('Enter a function first.');
      return;
    }
    try {
      evaluate(e, { x: 1 });
    } catch (err) {
      setError(`Invalid function: ${(err as Error).message}`);
      return;
    }
    stopSweep();
    setError(null);
    setExpr(e);
  };

  const applyWindow = (): void => {
    const next: Window2D = {
      xMin: parseFloat(fields.xMin),
      xMax: parseFloat(fields.xMax),
      yMin: parseFloat(fields.yMin),
      yMax: parseFloat(fields.yMax),
    };
    if (Object.values(next).some((n) => !Number.isFinite(n))) {
      setError('Enter valid numbers for the window.');
      return;
    }
    if (next.xMax <= next.xMin || next.yMax <= next.yMin) {
      setError('Window max must be greater than min.');
      return;
    }
    stopSweep();
    setError(null);
    setAppliedWindow(next);
    setDisplayWindow(next);
  };

  const setField = (key: keyof Window2D, value: string): void => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const onSlider = (v: number): void => {
    stopSweep();
    setX(clampToVisible(v, xRef.current, expr, displayWindow, poles));
  };

  const sliderStep = (displayWindow.xMax - displayWindow.xMin) / 1000;

  const fxDisplay =
    !hasFunction || pin === 'undefined' || fx === null
      ? '—'
      : pin === 'top'
        ? '→ ∞'
        : pin === 'bottom'
          ? '→ −∞'
          : formatNumber(fx);

  const createExportSnapshot = (): ExportSnapshot => {
    const snapshotExpr = expr;
    const snapshotWindow = { ...displayWindow };
    const snapshotX = x;
    const snapshotAsymptotes = asymptotes.map((asymptote) => ({ ...asymptote }));
    const snapshotEndNeg = { ...endNeg };
    const snapshotEndPos = { ...endPos };
    const snapshotPoints = points.map((point) => ({ ...point }));
    const snapshotXs = selectRepresentativeRows(tableXs);
    const snapshotReadout = { ...readout };
    const snapshotFx = evalAt(snapshotExpr, snapshotX);
    const lightColors = explorerColors(false);
    const snapshotDetails = buildFunctionDetails(
      snapshotExpr,
      snapshotWindow,
      lightColors.curve,
    );

    const asymptoteFacts = snapshotAsymptotes.length
      ? snapshotAsymptotes.map((asymptote) => ({
          label: `x = ${formatNumber(asymptote.x)}`,
          value: `Left -> ${infinityForSign(asymptote.leftSign)}; right -> ${infinityForSign(asymptote.rightSign)}`,
        }))
      : [{ label: 'Vertical asymptotes', value: 'None detected' }];

    const scene: OverlayScene = {
      expr: snapshotExpr,
      window: snapshotWindow,
      x: snapshotX,
      asymptotes: snapshotAsymptotes,
      endNeg: snapshotEndNeg,
      endPos: snapshotEndPos,
      showWall,
      showFloor,
      points: snapshotPoints,
      pointShape,
      sweepTrail: null,
    };

    return {
      model: {
        slug: 'function-explorer',
        title: 'Function Explorer',
        exportedAt: new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date()),
        window: snapshotWindow,
        legend: [
          {
            label: `f(x) = ${formatExportEquation(snapshotExpr)}`,
            color: lightColors.curve,
            detail: showPoints ? `Points shown (${pointShape})` : 'Points hidden',
          },
        ],
        sections: [
          ...snapshotDetails,
          {
            title: 'Current readout',
            facts: [
              { label: 'x', value: formatNumber(snapshotX) },
              { label: 'f(x)', value: formatExportValue(snapshotFx) },
              { label: 'Statement', value: snapshotReadout.headline },
              { label: 'Meaning', value: snapshotReadout.note },
            ],
          },
          {
            title: 'Asymptotes and end behavior',
            facts: [
              ...asymptoteFacts,
              { label: 'x -> -infinity', value: describeEndBehaviorForExport(snapshotEndNeg) },
              { label: 'x -> +infinity', value: describeEndBehaviorForExport(snapshotEndPos) },
            ],
          },
          {
            title: 'Visible guides',
            facts: [
              { label: 'Vertical asymptotes', value: showWall ? 'Shown' : 'Hidden' },
              { label: 'Horizontal asymptotes', value: showFloor ? 'Shown' : 'Hidden' },
              { label: 'Grid', value: showGrid ? 'Shown' : 'Hidden' },
              { label: 'Markers', value: showPoints ? `Shown (${pointShape})` : 'Hidden' },
            ],
          },
        ],
        table: {
          title: 'Selected values',
          headers: ['x', `f(x) = ${formatExportEquation(snapshotExpr)}`],
          rows: snapshotXs.map((tableX) => [
            String(tableX),
            formatExportValue(evalAt(snapshotExpr, tableX)),
          ]),
        },
      },
      renderGraph: (target) => {
        renderExplorer({
          target,
          window: snapshotWindow,
          expr: snapshotExpr,
          dark: false,
          grid: showGrid,
          height: EXPORT_GRAPH_HEIGHT,
          getScene: () => scene,
          onViewChange: () => {},
        });
      },
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Controls */}
      <div className="space-y-4">
        <Card className="gap-3 p-4">
          <Label htmlFor="fx-input">Function</Label>
          <p className="text-xs text-muted-foreground">
            Use x as the variable, e.g. <code className="rounded bg-muted px-1">1/x^2</code>,{' '}
            <code className="rounded bg-muted px-1">tan(x)</code>,{' '}
            <code className="rounded bg-muted px-1">1/(x-2)</code>.
          </p>
          <div className="flex gap-2">
            <Input
              id="fx-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Enter a function, e.g. 1/x^2"
              value={exprInput}
              onChange={(e) => setExprInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') plot();
              }}
            />
            <Button type="button" onClick={plot}>
              Plot
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </Card>

        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="x-slider">x</Label>
            <span className="font-mono text-sm tabular-nums">{hasFunction ? formatNumber(x) : '—'}</span>
          </div>
          <Slider
            id="x-slider"
            aria-label="x value"
            disabled={!hasFunction}
            min={displayWindow.xMin}
            max={displayWindow.xMax}
            step={sliderStep}
            value={[x]}
            onValueChange={([v]) => onSlider(v)}
          />
          <div className="rounded-md bg-accent/60 p-3" aria-hidden="true">
            <p className="text-sm font-medium text-accent-foreground">{readout.headline}</p>
            <p className="mt-1 text-xs text-muted-foreground">{readout.note}</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              x = <span className="font-mono text-foreground tabular-nums">{hasFunction ? formatNumber(x) : '—'}</span>
            </span>
            <span>
              f(x) = <span className="font-mono text-foreground tabular-nums">{fxDisplay}</span>
            </span>
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Animate a limit</h3>
          {hasFunction ? (
            <div className="flex flex-wrap gap-2">
              {sweepButtons.map((b) => (
                <Button
                  key={b.label}
                  type="button"
                  size="sm"
                  variant={sweepEq(sweep, b.sweep) ? 'default' : 'outline'}
                  aria-pressed={sweepEq(sweep, b.sweep)}
                  onClick={() => startSweep(b.sweep)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Plot a function to animate its limits.</p>
          )}
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Window &amp; guides</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(
              [
                ['xMin', 'x min'],
                ['xMax', 'x max'],
                ['yMin', 'y min'],
                ['yMax', 'y max'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-muted-foreground">{label}</span>
                <Input
                  type="number"
                  step="any"
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1 h-8"
                />
              </label>
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={applyWindow}>
            Apply window
          </Button>
          <div className="flex flex-col gap-2 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showWall} onCheckedChange={(v) => setShowWall(v === true)} />
              <span className="text-muted-foreground">Show walls (vertical asymptotes)</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showFloor} onCheckedChange={(v) => setShowFloor(v === true)} />
              <span className="text-muted-foreground">Show floors (horizontal asymptotes)</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showGrid} onCheckedChange={(v) => setShowGrid(v === true)} />
              <span className="text-muted-foreground">Show grid</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={showPoints}
                  disabled={!hasFunction}
                  onCheckedChange={(v) => setShowPoints(v === true)}
                />
                <span className="text-muted-foreground">Show points</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <span className="text-muted-foreground">Shape:</span>
                <Select
                  value={pointShape}
                  onValueChange={(v) => setPointShape(v as PointShape)}
                  disabled={!hasFunction}
                >
                  <SelectTrigger size="sm" className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Drag the point along the curve, or scroll to zoom and drag the background to pan.
          </p>
        </Card>
      </div>

      {/* Plot + value table */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <GraphResultExport
            hasGraph={hasFunction}
            createSnapshot={createExportSnapshot}
          />
        </div>
        <Card className="overflow-hidden p-2">
          <div
            ref={plotRef}
            data-testid="explorer-plot"
            role="img"
            aria-label={hasFunction ? `Interactive graph of y = ${expr}` : 'Empty graph — no function plotted yet'}
            className="w-full"
            style={{ minHeight: 480 }}
          />
        </Card>

        <FunctionDetailsPanels
          entries={liveFunctionDetails}
          testId="explorer-function-details"
        />

        <ValueTable
          xs={tableXs}
          columns={tableColumns}
          note="y values at each integer x in the window"
          emptyMessage="Plot a function to see its value table."
        />

        <div className="sr-only" role="status" aria-live="polite">
          {announced}
        </div>
      </div>
    </div>
  );
}
