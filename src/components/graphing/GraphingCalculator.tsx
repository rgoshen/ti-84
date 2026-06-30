import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { evaluate, parse } from 'mathjs';
import katex from 'katex';

import { evalAt, integerXs, type Window2D } from '@/scripts/graphing/math';
import { formatNumber, type HoverInfo } from '@/scripts/graphing/hover';
import {
  renderGraph,
  type FunctionPlotInstance,
  type PlotEquation,
  type PointShape,
} from '@/scripts/graphing/plot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const DEFAULT_WINDOW: Window2D = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };
const PALETTE = [
  '#60a5fa',
  '#f87171',
  '#4ade80',
  '#fbbf24',
  '#a78bfa',
  '#22d3ee',
  '#f472b6',
  '#a3e635',
];
const SHAPES: PointShape[] = ['circle', 'square', 'triangle'];

/** A plotted equation plus a stable id for React keys and list mutations. */
interface EquationItem extends PlotEquation {
  id: string;
}

type WindowFields = Record<keyof Window2D, string>;

/** Strip a leading "y =" so "y = sin(x)" and "sin(x)" both plot. */
function normalizeExpr(raw: string): string {
  return raw.trim().replace(/^y\s*=\s*/i, '');
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function windowToFields(w: Window2D): WindowFields {
  return {
    xMin: String(round6(w.xMin)),
    xMax: String(round6(w.xMax)),
    yMin: String(round6(w.yMin)),
    yMax: String(round6(w.yMax)),
  };
}

/**
 * Render "y = <expr>" as KaTeX HTML, mirroring graphing.html prettyExpr().
 * Returns null if parsing/rendering fails so callers can fall back to plain text.
 */
function exprToKatex(expr: string): string | null {
  try {
    const tex = parse(expr).toTex({ implicit: 'hide' });
    return katex.renderToString(`y = ${tex}`, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
    });
  } catch {
    return null;
  }
}

/** Pretty equation label: KaTeX when it parses, plain "y = expr" otherwise. */
function EquationLabel({ expr, className }: { expr: string; className?: string }): React.JSX.Element {
  const html = exprToKatex(expr);
  if (html) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={className}>{`y = ${expr}`}</span>;
}

/**
 * Floating coordinate readout. Positioned with `position: fixed` at the pointer's
 * viewport coords and clamped to the plot bounds. The (x, y) text stays in the
 * popover foreground (AA contrast); the curve colour is a non-text swatch only.
 */
function CoordTooltip({
  hover,
  boundsRef,
}: {
  hover: HoverInfo;
  boundsRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const OFFSET = 12;
  const b = boundsRef.current?.getBoundingClientRect();
  let left = hover.clientX + OFFSET;
  let top = hover.clientY - OFFSET;
  if (b) {
    left = Math.min(Math.max(left, b.left), Math.max(b.left, b.right - 96));
    top = Math.min(Math.max(top, b.top), Math.max(b.top, b.bottom - 28));
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
      style={{ left, top }}
    >
      <span
        aria-hidden="true"
        className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
        style={{ background: hover.color }}
      />
      ({formatNumber(hover.x)}, {formatNumber(hover.y)})
    </div>
  );
}

export default function GraphingCalculator(): React.JSX.Element {
  const [equations, setEquations] = useState<EquationItem[]>([]);
  // appliedWindow drives plot creation; displayWindow mirrors interactive zoom/pan
  // and feeds the value table + window inputs WITHOUT rebuilding the plot.
  const [appliedWindow, setAppliedWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [displayWindow, setDisplayWindow] = useState<Window2D>(DEFAULT_WINDOW);
  const [fields, setFields] = useState<WindowFields>(() => windowToFields(DEFAULT_WINDOW));
  const [exprInput, setExprInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true,
  );
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const plotRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<FunctionPlotInstance | null>(null);
  const nextId = useRef(0);

  // Track the site theme so the plot re-themes when the header toggle flips the
  // `.dark` class on <html>. The plot effect depends on `dark`, so updating this
  // state re-renders the graph with the matching palette.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Keep the window input fields in sync with the live (zoom-mirrored) view.
  useEffect(() => {
    setFields(windowToFields(displayWindow));
  }, [displayWindow]);

  // Recreate the plot whenever the equations, the applied window, or the theme change.
  // The zoom-mirrored displayWindow is intentionally NOT a dependency: rebuilding here
  // would reset the user's interactive zoom.
  useEffect(() => {
    const target = plotRef.current;
    if (!target) return;
    let disposed = false;

    const build = (): void => {
      if (disposed) return;
      target.replaceChildren();
      setHover(null);
      try {
        instanceRef.current = renderGraph({
          target,
          window: appliedWindow,
          equations,
          dark,
          onViewChange: (w) => {
            if (!disposed) setDisplayWindow(w);
          },
          onHover: (info) => {
            if (!disposed) setHover(info);
          },
        });
        setError(null);
      } catch {
        setError('Could not plot that equation. Check your syntax and try again.');
      }
    };

    build();

    // Re-render on resize so the svg width tracks the container (throttled per frame).
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
      window.removeEventListener('resize', onResize);
    };
  }, [equations, appliedWindow, dark]);

  const addEquation = (): void => {
    const expr = normalizeExpr(exprInput);
    if (!expr) {
      setError('Enter an equation first.');
      return;
    }
    // Validate that the expression parses/evaluates, mirroring graphing.html.
    try {
      evaluate(expr, { x: 1 });
    } catch (e) {
      setError(`Invalid expression: ${(e as Error).message}`);
      return;
    }
    const color = PALETTE[equations.length % PALETTE.length];
    const item: EquationItem = {
      id: `eq-${nextId.current++}`,
      expr,
      color,
      showPoints: false,
      pointShape: 'circle',
    };
    setEquations((prev) => [...prev, item]);
    setExprInput('');
    setError(null);
  };

  const updateEquation = (id: string, patch: Partial<PlotEquation>): void => {
    setEquations((prev) => prev.map((eq) => (eq.id === id ? { ...eq, ...patch } : eq)));
  };

  const removeEquation = (id: string): void => {
    setEquations((prev) => prev.filter((eq) => eq.id !== id));
  };

  const clearEquations = (): void => setEquations([]);

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
    setError(null);
    setAppliedWindow(next);
    setDisplayWindow(next);
  };

  const setField = (key: keyof Window2D, value: string): void => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const tableXs = integerXs(displayWindow);
  const showTable = equations.length > 0 && tableXs.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Controls column */}
      <div className="space-y-4">
        <Card className="gap-3 p-4">
          <Label htmlFor="eq-input">Add an equation</Label>
          <p className="text-xs text-muted-foreground">
            Use x as the variable, e.g. <code className="rounded bg-muted px-1">x^2</code>,{' '}
            <code className="rounded bg-muted px-1">sin(x)</code>,{' '}
            <code className="rounded bg-muted px-1">2x + 1</code>. The plotter accepts{' '}
            <code className="rounded bg-muted px-1">y =</code> or just the expression.
          </p>
          <div className="flex gap-2">
            <Input
              id="eq-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="y = sin(x)"
              value={exprInput}
              onChange={(e) => setExprInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addEquation();
              }}
            />
            <Button type="button" onClick={addEquation}>
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
            <h3 className="text-sm font-medium">Plotted equations</h3>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearEquations}
              disabled={equations.length === 0}
            >
              Clear all
            </Button>
          </div>

          {equations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No equations plotted yet. Add one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {equations.map((eq) => (
                <li key={eq.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {/* Native color picker (shadcn has no color input). */}
                      <label
                        className="relative inline-flex flex-shrink-0 cursor-pointer items-center"
                        title="Click to change color"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-block h-4 w-4 rounded-full border"
                          style={{ background: eq.color }}
                        />
                        <input
                          type="color"
                          aria-label={`Color for y = ${eq.expr}`}
                          value={eq.color}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          onChange={(e) => updateEquation(eq.id, { color: e.target.value })}
                        />
                      </label>
                      <EquationLabel expr={eq.expr} className="truncate text-xs" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEquation(eq.id)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <Checkbox
                        checked={eq.showPoints}
                        onCheckedChange={(v) =>
                          updateEquation(eq.id, { showPoints: v === true })
                        }
                      />
                      <span className="text-muted-foreground">Show points</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <span className="text-muted-foreground">Shape:</span>
                      <Select
                        value={eq.pointShape}
                        onValueChange={(v) =>
                          updateEquation(eq.id, { pointShape: v as PointShape })
                        }
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
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-sm font-medium">Window</h3>
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
          <p className="text-[11px] text-muted-foreground">
            Scroll on the graph to zoom; drag to pan.
          </p>
        </Card>
      </div>

      {/* Plot + table column */}
      <div className="space-y-4">
        <Card className="overflow-hidden p-2">
          <div ref={plotRef} data-testid="plot" className="w-full" style={{ minHeight: 560 }} />
        </Card>
        {hover ? <CoordTooltip hover={hover} boundsRef={plotRef} /> : null}

        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Value table (whole-number x)</h3>
            <span className="text-[11px] text-muted-foreground">
              y values evaluated at each integer x in the window
            </span>
          </div>
          {showTable ? (
            <div className="max-h-72 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    <th className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium">
                      x
                    </th>
                    {equations.map((eq) => (
                      <th
                        key={eq.id}
                        className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium"
                        style={{ color: eq.color }}
                      >
                        <EquationLabel expr={eq.expr} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableXs.map((x, idx) => (
                    <tr key={x} className={idx % 2 ? 'bg-muted/40' : ''}>
                      <td className="whitespace-nowrap border-b px-2 py-1 font-mono">{x}</td>
                      {equations.map((eq) => {
                        const y = evalAt(eq.expr, x);
                        return (
                          <td
                            key={eq.id}
                            className="whitespace-nowrap border-b px-2 py-1 font-mono"
                          >
                            {y === null ? '—' : round6(y)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add an equation to see its value table.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
