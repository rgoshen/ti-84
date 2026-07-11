import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluate } from 'mathjs';

import { evalAt, gridlineCrossings, integerXs, type Window2D } from '@/scripts/graphing/math';
import { explorerColors } from '@/scripts/graphing/theme';
import { renderTransform, type TransformHandle } from '@/scripts/explorer/transform-render';
import { composeExpr, describeTransform, EPS, type Coeffs } from '@/scripts/explorer/transform';
import { PARENTS, parentById } from '@/scripts/explorer/parents';
import ValueTable, { type ValueColumn } from '@/components/ValueTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

// Tunables, in one place.
const IDENTITY: Coeffs = { a: 1, b: 1, h: 0, k: 0 };
const A_RANGE = { min: -5, max: 5, step: 0.1 };
const H_RANGE = { min: -10, max: 10, step: 0.1 };
const round2 = (n: number): number => Math.round(n * 100) / 100;

const normalizeExpr = (raw: string): string => raw.trim().replace(/^y\s*=\s*/i, '');

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

type WindowFields = Record<keyof Window2D, string>;
const windowToFields = (w: Window2D): WindowFields => ({
  xMin: String(round6(w.xMin)), xMax: String(round6(w.xMax)),
  yMin: String(round6(w.yMin)), yMax: String(round6(w.yMax)),
});

export default function TransformationExplorer(): React.JSX.Element {
  const [baseExpr, setBaseExpr] = useState(PARENTS[0].expr);
  const [exprInput, setExprInput] = useState(PARENTS[0].expr);
  const [parentId, setParentId] = useState<string | null>(PARENTS[0].id);
  const [parentLabel, setParentLabel] = useState(PARENTS[0].label);
  const [coeffs, setCoeffs] = useState<Coeffs>(IDENTITY);
  const [error, setError] = useState<string | null>(null);
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(PARENTS[0].window);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(PARENTS[0].window);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(PARENTS[0].window));
  const [showParent, setShowParent] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showPoints, setShowPoints] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );

  const plotRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<TransformHandle | null>(null);
  const viewRef = useRef<Window2D>(appliedWindow); // latest view (preserves zoom on coeff change)

  const readout = useMemo(() => describeTransform(coeffs, parentLabel), [coeffs, parentLabel]);

  // Points + table data are computed HERE and passed down precomputed: `evalAt` re-parses its
  // expression on every call, so it must stay out of the renderer's and the table's render path.
  const eColors = useMemo(() => explorerColors(dark), [dark]);
  const composed = useMemo(() => (baseExpr ? composeExpr(baseExpr, coeffs) : ''), [baseExpr, coeffs]);

  // Parent MARKERS follow `showParent`; the parent COLUMN below deliberately does not.
  const parentPoints = useMemo(
    () => (showPoints && showParent && baseExpr ? gridlineCrossings(baseExpr, displayWindow) : []),
    [showPoints, showParent, baseExpr, displayWindow],
  );
  const transformedPoints = useMemo(
    () => (showPoints && composed ? gridlineCrossings(composed, displayWindow) : []),
    [showPoints, composed, displayWindow],
  );

  const tableXs = useMemo(() => integerXs(displayWindow), [displayWindow]);
  const tableColumns = useMemo<ValueColumn[]>(
    () => [
      {
        key: 'fx',
        header: `f(x) = ${parentLabel}`,
        color: eColors.ghost,
        values: tableXs.map((x) => evalAt(baseExpr, x)),
      },
      {
        key: 'gx',
        header: 'g(x)',
        color: eColors.curve,
        values: tableXs.map((x) => evalAt(composed, x)),
      },
    ],
    [tableXs, baseExpr, composed, eColors, parentLabel],
  );

  const setCoeff = (key: keyof Coeffs, value: number): void =>
    setCoeffs((prev) => ({ ...prev, [key]: value }));

  const selectParent = (id: string): void => {
    const p = parentById(id);
    if (!p) return;
    setBaseExpr(p.expr);
    setExprInput(p.expr);
    setParentId(p.id);
    setParentLabel(p.label);
    setCoeffs(IDENTITY);
    setError(null);
    setAppliedWindow(p.window);
    setDisplayWindow(p.window);
    viewRef.current = p.window;
    setFields(windowToFields(p.window));
  };

  const plotCustom = (): void => {
    const e = normalizeExpr(exprInput);
    if (!e) { setError('Enter a function first.'); return; }
    try { evaluate(e, { x: 1 }); } catch (err) {
      setError(`Invalid function: ${(err as Error).message}`); return;
    }
    setBaseExpr(e);
    setParentId(null);
    setParentLabel('your function');
    setCoeffs(IDENTITY);
    setError(null);
  };

  const applyWindow = (): void => {
    const next: Window2D = {
      xMin: parseFloat(fields.xMin), xMax: parseFloat(fields.xMax),
      yMin: parseFloat(fields.yMin), yMax: parseFloat(fields.yMax),
    };
    if (Object.values(next).some((n) => !Number.isFinite(n))) { setError('Enter valid numbers for the window.'); return; }
    if (next.xMax <= next.xMin || next.yMax <= next.yMin) { setError('Window max must be greater than min.'); return; }
    setError(null);
    setAppliedWindow(next);
    setDisplayWindow(next);
    viewRef.current = next;
  };

  // Track site theme so the plot re-themes with the header toggle.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setFields(windowToFields(displayWindow)); }, [displayWindow]);

  // Single draw path, shared by the change-driven effect and the resize handler
  // (DRY — the shipped FunctionExplorer uses the same closure pattern). Draws at
  // the CURRENT view (viewRef) so a slider drag never snaps the zoom back.
  const drawPlot = useCallback((): void => {
    const target = plotRef.current;
    if (!target) return;
    try {
      handleRef.current = renderTransform({
        target,
        window: viewRef.current,
        baseExpr,
        coeffs,
        showParent,
        parentPoints,
        transformedPoints,
        dark,
        grid: showGrid,
        onViewChange: (w) => { viewRef.current = w; setDisplayWindow(w); },
      });
      setError((e) => (e && e.startsWith('Could not plot') ? null : e));
    } catch {
      setError('Could not plot that function. Check the syntax and try again.');
    }
  }, [baseExpr, coeffs, showParent, parentPoints, transformedPoints, dark, showGrid]);

  // Redraw on any change. appliedWindow is a dep (a fresh window resets the view)
  // but displayWindow is NOT, so interactive zoom doesn't retrigger a rebuild.
  useEffect(() => {
    drawPlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPlot, appliedWindow]);

  // Redraw on resize, rAF-throttled.
  useEffect(() => {
    let queued = false;
    const onResize = (): void => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; drawPlot(); });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawPlot]);

  // Coalesced screen-reader announcement.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${readout.equation}. ${readout.steps.join('. ')}`), 250);
    return () => clearTimeout(id);
  }, [readout]);

  const setField = (key: keyof Window2D, value: string): void =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const sliders: Array<{ key: keyof Coeffs; label: string; range: typeof A_RANGE }> = [
    { key: 'a', label: 'a — vertical stretch / reflect', range: A_RANGE },
    { key: 'b', label: 'b — horizontal stretch / reflect', range: A_RANGE },
    { key: 'h', label: 'h — horizontal shift', range: H_RANGE },
    { key: 'k', label: 'k — vertical shift', range: H_RANGE },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Parent function</h3>
          <div className="flex flex-wrap gap-2">
            {PARENTS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={parentId === p.id ? 'default' : 'outline'}
                aria-pressed={parentId === p.id}
                onClick={() => selectParent(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Label htmlFor="fx-input" className="mt-2">Or a custom f(x)</Label>
          <div className="flex gap-2">
            <Input
              id="fx-input" type="text" autoComplete="off" placeholder="e.g. x^2"
              value={exprInput}
              onChange={(e) => setExprInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') plotCustom(); }}
            />
            <Button type="button" onClick={plotCustom}>Plot</Button>
          </div>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        </Card>

        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Transform</h3>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCoeffs(IDENTITY)}>Reset</Button>
          </div>
          {sliders.map((s) => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={`slider-${s.key}`} className="text-xs text-muted-foreground">{s.label}</Label>
                <span className="font-mono text-sm tabular-nums">{round2(coeffs[s.key])}</span>
              </div>
              <Slider
                id={`slider-${s.key}`}
                aria-label={s.label}
                min={s.range.min} max={s.range.max} step={s.range.step}
                value={[coeffs[s.key]]}
                onValueChange={([v]) => setCoeff(s.key, v)}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button" size="sm" variant={coeffs.a < -EPS ? 'default' : 'outline'}
              aria-pressed={coeffs.a < -EPS}
              onClick={() => setCoeff('a', -coeffs.a)}
            >⇅ Reflect x-axis</Button>
            <Button
              type="button" size="sm" variant={coeffs.b < -EPS ? 'default' : 'outline'}
              aria-pressed={coeffs.b < -EPS}
              onClick={() => setCoeff('b', -coeffs.b)}
            >⇄ Reflect y-axis</Button>
          </div>
          <div className="rounded-md bg-accent/60 p-3" aria-hidden="true">
            <p className="font-mono text-sm font-medium text-accent-foreground">{readout.equation}</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
              {readout.steps.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Window &amp; guides</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => (
              <label key={key} className="block">
                <span className="text-muted-foreground">{key}</span>
                <Input type="number" step="any" value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)} className="mt-1 h-8" />
              </label>
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={applyWindow}>Apply window</Button>
          <div className="flex flex-col gap-2 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showParent} onCheckedChange={(v) => setShowParent(v === true)} />
              <span className="text-muted-foreground">Show parent (dashed)</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showGrid} onCheckedChange={(v) => setShowGrid(v === true)} />
              <span className="text-muted-foreground">Show grid</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <Checkbox checked={showPoints} onCheckedChange={(v) => setShowPoints(v === true)} />
              <span className="text-muted-foreground">Show points (whole-number crossings)</span>
            </label>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden p-2">
          <div
            ref={plotRef}
            data-testid="transform-plot"
            role="img"
            aria-label={`Graph of parent f(x) = ${parentLabel} (dashed) and transformed ${readout.equation}`}
            className="w-full"
            style={{ minHeight: 480 }}
          />
        </Card>

        <ValueTable
          xs={tableXs}
          columns={tableColumns}
          note="f(x) and g(x) at each integer x in the window"
          emptyMessage="No whole-number x values in this window."
        />

        <div className="sr-only" role="status" aria-live="polite">{announced}</div>
      </div>
    </div>
  );
}
