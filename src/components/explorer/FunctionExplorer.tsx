import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluate } from 'mathjs';

import { evalAt, type Window2D } from '@/scripts/graphing/math';
import { formatNumber } from '@/scripts/graphing/hover';
import {
  renderExplorer,
  pointerToData,
  localOf,
  type ExplorerHandle,
  type OverlayScene,
} from '@/scripts/explorer/render';
import { clampDragX, resolveX, sweepX, pinToWindow, type Sweep } from '@/scripts/explorer/branch';
import { findVerticalAsymptotes, classifyEndBehavior } from '@/scripts/explorer/limits';
import { describeReadout } from '@/scripts/explorer/notation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

// Tunables, in one place [G8].
const DEFAULT_WINDOW: Window2D = { xMin: -4, xMax: 4, yMin: -1, yMax: 7 };
const WALL_FRAC_OF_WIDTH = 0.005; // [G1] epsilon = this * window width
const POINT_HIT_RADIUS_PX = 16; // grab radius for the draggable point [G3]
const SWEEP_MS = 1400; // limit-sweep animation duration
const READOUT_SETTLE_MS = 250; // coalesce aria-live announcements [G7]

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

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const sweepEq = (a: Sweep | null, b: Sweep): boolean => {
  if (a === null) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'approach' && b.kind === 'approach') return a.a === b.a && a.side === b.side;
  if (a.kind === 'end' && b.kind === 'end') return a.dir === b.dir;
  return false;
};

export default function FunctionExplorer(): React.JSX.Element {
  const [expr, setExpr] = useState('1/x^2');
  const [exprInput, setExprInput] = useState('1/x^2');
  const [error, setError] = useState<string | null>(null);
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(DEFAULT_WINDOW));
  const [x, setX] = useState(1);
  const [showWall, setShowWall] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [sweep, setSweep] = useState<Sweep | null>(null);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );

  const plotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ExplorerHandle | null>(null);
  const rafRef = useRef<number | null>(null);

  // Derived limit structure, recomputed only when the function or the visible window changes.
  const asymptotes = useMemo(() => findVerticalAsymptotes(expr, displayWindow), [expr, displayWindow]);
  const endNeg = useMemo(() => classifyEndBehavior(expr, 'neg'), [expr]);
  const endPos = useMemo(() => classifyEndBehavior(expr, 'pos'), [expr]);
  const poles = useMemo(() => asymptotes.map((a) => a.x), [asymptotes]);
  const epsilon = (displayWindow.xMax - displayWindow.xMin) * WALL_FRAC_OF_WIDTH;

  const sweepButtons = useMemo(() => {
    const list: Array<{ label: string; sweep: Sweep }> = [];
    for (const a of asymptotes) {
      list.push({ label: `x → ${formatNumber(a.x)}⁻`, sweep: { kind: 'approach', a: a.x, side: '-' } });
      list.push({ label: `x → ${formatNumber(a.x)}⁺`, sweep: { kind: 'approach', a: a.x, side: '+' } });
    }
    list.push({ label: 'x → −∞', sweep: { kind: 'end', dir: 'neg' } });
    list.push({ label: 'x → ∞', sweep: { kind: 'end', dir: 'pos' } });
    return list;
  }, [asymptotes]);

  const fx = evalAt(expr, x);
  const pin = pinToWindow(fx, displayWindow).status;
  const readout = describeReadout({ x, fx, pin, win: displayWindow, asymptotes, endNeg, endPos });

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
    sweepTrail: sweep ? { fromX: sweepX(0, sweep, displayWindow, poles, epsilon), leadX: x } : null,
  };
  const xRef = useRef(x);
  xRef.current = x;
  const exprRef = useRef(expr);
  exprRef.current = expr;
  const polesRef = useRef(poles);
  polesRef.current = poles;
  const winRef = useRef(displayWindow);
  winRef.current = displayWindow;
  const epsRef = useRef(epsilon);
  epsRef.current = epsilon;

  const stopSweep = (): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setSweep(null);
  };

  const startSweep = (s: Sweep): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setSweep(s);
    const win = winRef.current;
    const pol = polesRef.current;
    const eps = epsRef.current;
    if (prefersReducedMotion()) {
      setX(sweepX(1, s, win, pol, eps));
      rafRef.current = null;
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      setX(sweepX(t, s, win, pol, eps));
      rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Track the site theme (re-themes the plot when the header toggle flips <html class>).
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Mirror the live (zoom-updated) window into the input fields.
  useEffect(() => {
    setFields(windowToFields(displayWindow));
  }, [displayWindow]);

  // Build / rebuild the plot and (re)attach pointer arbitration. displayWindow is
  // deliberately NOT a dependency, so interactive zoom/pan re-syncs the overlay
  // without resetting the view (mirrors GraphingCalculator).
  useEffect(() => {
    const target = plotRef.current;
    if (!target) return;
    let disposed = false;
    let cleanupDrag: (() => void) | null = null;

    // Pointer arbitration [G3]: a pointerdown ON the point (capture phase) grabs it
    // and blocks function-plot's pan; a pointerdown elsewhere falls through to pan.
    const attachDrag = (): (() => void) | null => {
      const handle = handleRef.current;
      const svg = target.querySelector('svg');
      if (!handle || !svg) return null;
      let dragging = false;

      const moveTo = (e: PointerEvent): void => {
        const pd = pointerToData(handle.instance, target, e.clientX, e.clientY);
        if (!pd) return;
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setSweep(null);
        setX(clampDragX(pd.dataX, xRef.current, polesRef.current, winRef.current, epsRef.current));
      };
      const onDown = (e: PointerEvent): void => {
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
            // A user zoom/pan cancels any running sweep [G5] and re-syncs the view.
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
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
  }, [x, sweep, showWall, showFloor, asymptotes, displayWindow, endNeg, endPos, dark]);

  // [G4] Re-seat the point off any new pole / out-of-branch when expr or window changes.
  useEffect(() => {
    setX((prev) => resolveX(prev, poles, displayWindow, epsilon));
    // poles/epsilon derive from expr+displayWindow, so those two deps suffice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, displayWindow]);

  // Cancel any in-flight animation on unmount.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Coalesced screen-reader announcement — settles after interaction stops [G7].
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
    setX(clampDragX(v, xRef.current, poles, displayWindow, epsilon));
  };

  const step = (displayWindow.xMax - displayWindow.xMin) / 1000;

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
              placeholder="1/x^2"
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
            <span className="font-mono text-sm tabular-nums">{formatNumber(x)}</span>
          </div>
          <Slider
            id="x-slider"
            aria-label="x value"
            min={displayWindow.xMin}
            max={displayWindow.xMax}
            step={step}
            value={[x]}
            onValueChange={([v]) => onSlider(v)}
          />
          <div className="rounded-md bg-accent/60 p-3" aria-hidden="true">
            <p className="text-sm font-medium text-accent-foreground">{readout.headline}</p>
            <p className="mt-1 text-xs text-muted-foreground">{readout.note}</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              x = <span className="font-mono text-foreground tabular-nums">{formatNumber(x)}</span>
            </span>
            <span>
              f(x) ={' '}
              <span className="font-mono text-foreground tabular-nums">
                {pin === 'undefined' || fx === null
                  ? 'undefined'
                  : pin === 'top'
                    ? '→ ∞'
                    : pin === 'bottom'
                      ? '→ −∞'
                      : formatNumber(fx)}
              </span>
            </span>
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Animate a limit</h3>
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
          </div>
          <p className="text-[11px] text-muted-foreground">
            Drag the point along the curve, or scroll to zoom and drag the background to pan.
          </p>
        </Card>
      </div>

      {/* Plot */}
      <div>
        <Card className="overflow-hidden p-2">
          <div
            ref={plotRef}
            data-testid="explorer-plot"
            role="img"
            aria-label={`Interactive graph of y = ${expr}`}
            className="w-full"
            style={{ minHeight: 480 }}
          />
        </Card>
        <div className="sr-only" role="status" aria-live="polite">
          {announced}
        </div>
      </div>
    </div>
  );
}
