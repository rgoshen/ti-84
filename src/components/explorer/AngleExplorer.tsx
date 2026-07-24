import * as React from 'react'; // [G1] required for the React.JSX.Element return type
import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { explorerColors } from '@/scripts/graphing/theme';
import {
  arcLength,
  degreesToRadians,
  formatFractionLatex,
  formatFractionSpoken,
  formatPiLatex,
  formatPiSpoken,
  isIntegerDegrees,
  piMultiple,
  turnFraction,
} from '@/scripts/explorer/angle';
import {
  formatDegrees,
  formatRadiansDecimal,
  parseAngleInput,
} from '@/scripts/explorer/angle-parse';
import {
  arcPath,
  arrowheadPoints,
  polarToCartesian,
  tickAngles,
} from '@/scripts/explorer/angle-render';

/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 30, r: 1, beta: 0 };

/** Round for display without exposing float noise. */
const round4 = (n: number): string => String(Number(n.toFixed(4)));

/**
 * The five-way identity plus arc length, as KaTeX source.
 *
 * Exact π and turn forms are shown ONLY for whole degrees. `piMultiple` reduces
 * deg/180 with integer gcd, so a typed 1.047 rad (59.9885°) would otherwise render
 * as an absurd fraction. Non-integer angles fall back to decimals alone.
 */
function buildReadout(theta: number, r: number): { chain: string; arc: string; spoken: string } {
  const rad = degreesToRadians(theta);
  const decimal = round4(rad);
  const s = arcLength(r, rad);

  if (!isIntegerDegrees(theta)) {
    const absDecimal = round4(Math.abs(rad));
    // "1 radian(s)" must agree with English grammar for both the signed
    // conversion and the unsigned value the arc equation substitutes.
    const radianWord = (value: string): string => (Math.abs(Number(value)) === 1 ? 'radian' : 'radians');
    return {
      chain: `${round4(theta)}^\\circ = ${decimal}\\text{ rad}`,
      // s = r|θ|: the arc length is a magnitude, so the substituted angle
      // must be unsigned too, or the equation is untrue for negative sweeps.
      arc: `s = r|\\theta| = ${round4(r)} \\times ${absDecimal} \\approx ${round4(s)}`,
      spoken:
        `${round4(theta)} degrees is ${decimal} ${radianWord(decimal)}. ` +
        `Arc length uses the absolute angle, ${absDecimal} ${radianWord(absDecimal)}, giving ${round4(s)}.`,
    };
  }

  // isIntegerDegrees only confirms θ is WITHIN epsilon of an integer — it can still
  // be 59.99999999999999 (e.g. from typing pi/3 into Radians). Rounding to the
  // nearest whole degree before handing it to turnFraction/piMultiple is required:
  // those reduce n/d with an integer gcd, which is meaningless on a raw float and
  // renders as an astronomically large "reduced" fraction otherwise.
  const whole = Math.round(theta);
  const turn = formatFractionLatex(turnFraction(whole));
  const pi = formatPiLatex(piMultiple(whole));
  const turnSpoken = formatFractionSpoken(turnFraction(whole));
  const piSpoken = formatPiSpoken(piMultiple(whole));
  // The arc substitution uses the unsigned angle (see the non-integer branch above).
  const piAbsLatex = formatPiLatex(piMultiple(Math.abs(whole)));
  const piAbsSpoken = formatPiSpoken(piMultiple(Math.abs(whole)));
  return {
    chain:
      `${whole}^\\circ = ${turn}\\text{ of a full turn} = ${turn} \\times 2\\pi ` +
      `= ${pi} \\approx ${decimal}\\text{ rad}`,
    // Written out with real numbers, not a bare s = rθ. |θ| keeps the equation
    // true for negative sweeps: a length has no sign even when θ does.
    arc: `s = r|\\theta| = ${round4(r)} \\times ${piAbsLatex} \\approx ${round4(s)}`,
    spoken:
      `${whole} degrees is ${turnSpoken} of a full turn, ${piSpoken} radians, about ${decimal}. ` +
      `Arc length uses the absolute angle, ${piAbsSpoken} radians, giving ${round4(s)}.`,
  };
}

/** viewBox is fixed and the container is fluid, so the figure scales with no
 *  "large format" toggle — the source Demonstration only needed one because
 *  Mathematica cannot reflow. */
const VIEW = 320;
const C = VIEW / 2;
/** Pixels per unit radius, leaving room for tick labels outside r = 1.5. */
const UNIT = 88;
/** Radius of the small angle-measure arc, in units. */
const MEASURE_R = 0.3;

export default function AngleExplorer(): React.JSX.Element {
  const [theta, setTheta] = useState(DEFAULTS.theta); // degrees, float
  const [r, setR] = useState(DEFAULTS.r);
  const [beta, setBeta] = useState(DEFAULTS.beta); // degrees

  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  // Track the site theme so the diagram re-themes with the header toggle.
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const colors = useMemo(() => explorerColors(dark), [dark]);
  const tickText = dark ? '#e2e8f0' : '#334155'; // [G9] stroke colour for tick labels

  const thetaRad = degreesToRadians(theta);
  const betaRad = degreesToRadians(beta);
  const sign = theta < 0 ? -1 : 1;
  const endRad = betaRad + thetaRad;

  const readout = useMemo(() => buildReadout(theta, r), [theta, r]);
  const chainHtml = useMemo(
    () => katex.renderToString(readout.chain, { throwOnError: false, displayMode: false, output: 'html' }),
    [readout.chain],
  );
  const arcHtml = useMemo(
    () => katex.renderToString(readout.arc, { throwOnError: false, displayMode: false, output: 'html' }),
    [readout.arc],
  );

  // The readout box is aria-hidden (KaTeX markup is noise to a screen reader), so
  // this live region is how the conversion reaches assistive tech at all. Debounced
  // so a slider drag announces once on settle rather than on every frame.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(readout.spoken), 250);
    return () => clearTimeout(id);
  }, [readout.spoken]);

  // [G4] One source of truth for the measure sweep. `arcPath` returns '' at θ = 0, and
  // the arrowhead must vanish with it — otherwise a stray head sits on the circle
  // asserting a counter-clockwise direction for an angle that has no direction.
  const measureArc = arcPath(C, C, MEASURE_R * UNIT, betaRad, endRad);

  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
    setEditing(null);
    setInputError(null);
  };

  // Draft text for the two fields. Kept separate from θ so a half-typed value
  // ("-", "pi/") never destroys the diagram, and so the field being edited is
  // not reformatted mid-keystroke.
  const [degText, setDegText] = useState(() => formatDegrees(DEFAULTS.theta));
  const [radText, setRadText] = useState(() => formatRadiansDecimal(DEFAULTS.theta));
  const [editing, setEditing] = useState<'deg' | 'rad' | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Reflect θ into whichever field is NOT being edited. Slider drags and reset
  // update both; typing updates only the other one.
  useEffect(() => {
    if (editing !== 'deg') setDegText(formatDegrees(theta));
    if (editing !== 'rad') setRadText(formatRadiansDecimal(theta));
  }, [theta, editing]);

  const onFieldChange = (unit: 'deg' | 'rad', raw: string): void => {
    if (unit === 'deg') setDegText(raw);
    else setRadText(raw);

    const result = parseAngleInput(raw, unit);
    if (!result.ok) {
      // Non-destructive: report the problem, leave the diagram on the last valid angle.
      setInputError(result.error);
      return;
    }
    setInputError(null);
    setTheta(result.degrees);
  };

  // Normalise the edited field only on blur, so it cannot fight the typist.
  const onFieldBlur = (): void => {
    setEditing(null);
    setInputError(null);
  };

  const initialTip = polarToCartesian(C, C, (r + 0.2) * UNIT, betaRad);
  const terminalTip = polarToCartesian(C, C, (r + 0.2) * UNIT, endRad);
  const initialDot = polarToCartesian(C, C, r * UNIT, betaRad);
  const terminalDot = polarToCartesian(C, C, r * UNIT, endRad);

  const sliders = [
    {
      id: 'angle',
      label: 'angle',
      value: theta,
      min: -360,
      max: 360,
      step: 1,
      set: setTheta,
      suffix: '°',
      spoken: `${theta} degrees, ${round4(degreesToRadians(theta))} radians`,
    },
    {
      id: 'radius',
      label: 'radius',
      value: r,
      min: 0.5,
      max: 1.5,
      step: 0.1,
      set: setR,
      suffix: '',
      spoken: undefined,
    },
    {
      id: 'position',
      label: 'position',
      value: beta,
      min: -360,
      max: 360,
      step: 1,
      set: setBeta,
      suffix: '°',
      spoken: undefined,
    },
  ];

  return (
    // testid carried over from the Task 4 skeleton rather than dropped [G10].
    <div data-testid="angle-explorer" className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-5">
        {sliders.map((s) => (
          <div key={s.id} className="space-y-2">
            <Label htmlFor={`slider-${s.id}`} className="justify-between">
              <span>{s.label}</span>
              <span className="font-mono text-muted-foreground">
                {s.value}
                {s.suffix}
              </span>
            </Label>
            <Slider
              id={`slider-${s.id}`}
              aria-label={s.label}
              aria-valuetext={s.spoken ?? `${s.value}${s.suffix}`}
              value={[s.value]}
              min={s.min}
              max={s.max}
              step={s.step}
              onValueChange={([v]) => s.set(v)}
            />
          </div>
        ))}
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Convert</p>
          {(
            [
              { unit: 'deg' as const, label: 'Degrees', value: degText, hint: 'e.g. 30 or 180/2' },
              { unit: 'rad' as const, label: 'Radians', value: radText, hint: 'e.g. 1, pi/3, 2*pi/3' },
            ]
          ).map((f) => (
            <div key={f.unit} className="space-y-1">
              <Label htmlFor={`field-${f.unit}`}>{f.label}</Label>
              <Input
                id={`field-${f.unit}`}
                value={f.value}
                inputMode="text"
                aria-invalid={inputError !== null && editing === f.unit}
                aria-describedby={`hint-${f.unit}${inputError !== null && editing === f.unit ? ' angle-input-error' : ''}`}
                onFocus={() => setEditing(f.unit)}
                onBlur={onFieldBlur}
                onChange={(e) => onFieldChange(f.unit, e.target.value)}
              />
              <p id={`hint-${f.unit}`} className="text-xs text-muted-foreground">
                {f.hint}
              </p>
            </div>
          ))}
          {/* Rendered unconditionally with a FIXED (not minimum) two-line height so
              the column's layout never shifts between "no error", "one-line error",
              and "two-line error" — a row that grows and then collapses on blur
              moves the Reset button between mousedown and mouseup, which previously
              made Reset silently unclickable. h-8 reserves two lines of text-xs
              regardless of message length or content; only visibility toggles. */}
          <p
            id="angle-input-error"
            data-testid="angle-input-error"
            role="alert"
            className={`h-8 text-xs font-medium${inputError ? ' text-destructive' : ''}`}
          >
            {inputError ?? ''}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>

      <div data-testid="angle-diagram" className="mx-auto w-full max-w-lg">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${round4(theta)} degrees swept on a circle of radius ${round4(r)}.`}
        >
          {/* Reference axes and the unit circle. */}
          <line x1={C - 1.35 * UNIT} y1={C} x2={C + 1.35 * UNIT} y2={C} stroke={colors.axis} strokeWidth={1} />
          <line x1={C} y1={C - 1.35 * UNIT} x2={C} y2={C + 1.35 * UNIT} stroke={colors.axis} strokeWidth={1} />
          <circle cx={C} cy={C} r={UNIT} fill="none" stroke={colors.axis} strokeWidth={1} strokeDasharray="3 3" />

          {/* The adjustable circle. */}
          <circle cx={C} cy={C} r={r * UNIT} fill="none" stroke={colors.ghost} strokeWidth={1.5} />

          {/* Whole-radian ticks, scaling with r. */}
          {tickAngles(thetaRad).map((a) => {
            const inner = polarToCartesian(C, C, r * UNIT, betaRad + a);
            const outer = polarToCartesian(C, C, (r + 0.1) * UNIT, betaRad + a);
            const label = polarToCartesian(C, C, (r + 0.22) * UNIT, betaRad + a);
            return (
              <g key={a}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={colors.axis} strokeWidth={1.5} />
                <text
                  x={label.x}
                  y={label.y}
                  fill={tickText}
                  fontSize={9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {a} rad
                </text>
              </g>
            );
          })}

          {/* Small angle-measure arc with its direction arrowhead. Both are gated on
              the same non-empty path, so they can never disagree at θ = 0 [G4]. */}
          {measureArc !== '' && (
            <>
              <path d={measureArc} fill="none" stroke={colors.arrow} strokeWidth={1.5} />
              <polygon
                points={arrowheadPoints(C, C, MEASURE_R * UNIT, endRad, sign)}
                fill={colors.arrow}
              />
            </>
          )}

          {/* The swept arc — its length is the radian measure when r = 1. */}
          <path
            d={arcPath(C, C, r * UNIT, betaRad, endRad)}
            fill="none"
            stroke={colors.curve}
            strokeWidth={3}
          />

          {/* Initial and terminal rays. */}
          <line x1={C} y1={C} x2={initialTip.x} y2={initialTip.y} stroke={colors.floor} strokeWidth={2} />
          <line x1={C} y1={C} x2={terminalTip.x} y2={terminalTip.y} stroke={colors.wall} strokeWidth={2} />
          <circle cx={initialDot.x} cy={initialDot.y} r={3.5} fill={colors.point} stroke={colors.pointStroke} />
          <circle cx={terminalDot.x} cy={terminalDot.y} r={3.5} fill={colors.point} stroke={colors.pointStroke} />
        </svg>

        <div
          data-testid="angle-readout"
          aria-hidden="true"
          className="mt-4 space-y-2 rounded-lg border bg-card p-4 text-center"
        >
          <div dangerouslySetInnerHTML={{ __html: chainHtml }} />
          <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: arcHtml }} />
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announced}
        </p>
      </div>
    </div>
  );
}
