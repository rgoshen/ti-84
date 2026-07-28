import * as React from 'react'; // [G1] required for the React.JSX.Element return type
import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import GraphResultExport from '@/components/export/GraphResultExport';
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
  type Fraction,
} from '@/scripts/explorer/angle';
import {
  formatDegrees,
  formatRadiansDecimal,
  parseAngleInput,
} from '@/scripts/explorer/angle-parse';
import { buildCoordinateReadout } from '@/scripts/explorer/angle-coordinates';
import { buildAngleDiagramSvg } from '@/scripts/explorer/angle-diagram';
import { formatFourDecimals as round4 } from '@/scripts/explorer/format';
import {
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  type ExportSnapshot,
} from '@/scripts/export/model';

/** Slider defaults, also the reset target. */
const DEFAULTS = { theta: 30, r: 1, beta: 0 };

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
 *  Mathematica cannot reflow. The pixels-per-unit and measure-arc radius that
 *  used to live here now default inside `buildAngleDiagramSvg`, which both
 *  this component and the export snapshot draw through. */
const VIEW = 320;

/** Plain-text (non-KaTeX) exact fraction, e.g. "0", "1", "1/12", "-1/4". Mirrors
 *  `formatFractionLatex` without LaTeX markup — the export artifact renders as
 *  plain HTML text, never through KaTeX. */
function formatFractionText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  return f.d === 1 ? `${sign}${mag}` : `${sign}${mag}/${f.d}`;
}

/** Plain-text exact π-multiple, e.g. "0", "π", "2π", "π/6", "-2π/3". Mirrors
 *  `formatPiLatex` without LaTeX markup, for the same reason. */
function formatPiText(f: Fraction): string {
  if (f.n === 0) return '0';
  const sign = f.n < 0 ? '-' : '';
  const mag = Math.abs(f.n);
  const numerator = mag === 1 ? 'π' : `${mag}π`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${f.d}`;
}

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

  const readout = useMemo(() => buildReadout(theta, r), [theta, r]);
  const chainHtml = useMemo(
    () => katex.renderToString(readout.chain, { throwOnError: false, displayMode: false, output: 'html' }),
    [readout.chain],
  );
  const arcHtml = useMemo(
    () => katex.renderToString(readout.arc, { throwOnError: false, displayMode: false, output: 'html' }),
    [readout.arc],
  );
  // The exact π form for the Radians field. Only meaningful for whole degrees —
  // a typed 57.2958° (from "1" radian) has no clean π multiple, so this is null
  // and the field shows only its decimal. The input keeps the decimal as its
  // value (so it round-trips); this is a read-only companion showing both forms.
  const radiansExactHtml = useMemo(
    () =>
      isIntegerDegrees(theta)
        ? katex.renderToString(`${formatPiLatex(piMultiple(Math.round(theta)))}\\text{ rad}`, {
            throwOnError: false,
            displayMode: false,
            output: 'html',
          })
        : null,
    [theta],
  );

  // Coordinates depend on θ and r only — β rotates the view, so the point it
  // moves is still the point θ describes, exactly as arc length already treats it.
  const coords = useMemo(() => buildCoordinateReadout(theta, r), [theta, r]);
  const coordHtml = useMemo(
    () => ({
      triple: katex.renderToString(coords.tripleLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
      x: katex.renderToString(coords.xLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
      y: katex.renderToString(coords.yLatex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }),
    }),
    [coords.tripleLatex, coords.xLatex, coords.yLatex],
  );

  // The readout box is aria-hidden (KaTeX markup is noise to a screen reader), so
  // this live region is how the conversion reaches assistive tech at all. Debounced
  // so a slider drag announces once on settle rather than on every frame.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(`${readout.spoken} ${coords.spoken}`), 250);
    return () => clearTimeout(id);
  }, [readout.spoken, coords.spoken]);

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

  const sliders = [
    {
      id: 'angle',
      label: 'angle',
      value: theta,
      // θ can carry float noise (e.g. 59.99999999999999 from typing pi/3 into
      // Radians) that the slider's own step never produces but the linked text
      // field can. formatDegrees is the same rounding the Degrees field already
      // displays, so the chip and aria-valuetext agree with what's on screen
      // elsewhere instead of leaking the raw float.
      display: formatDegrees(theta),
      min: -360,
      max: 360,
      step: 1,
      set: setTheta,
      suffix: '°',
      spoken: `${formatDegrees(theta)} degrees, ${round4(degreesToRadians(theta))} radians`,
    },
    {
      id: 'radius',
      label: 'radius',
      value: r,
      // radius and position are only ever set via their own stepped sliders or
      // reset — never free text — so they can't accumulate float noise and need
      // no formatting.
      display: String(r),
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
      display: String(beta),
      min: -360,
      max: 360,
      step: 1,
      set: setBeta,
      suffix: '°',
      spoken: undefined,
    },
  ];

  // The diagram is drawn in roughly ±1.8 units (r maxes out at 1.5, ticks and
  // rays reach a little past it) — an honest window for the always-printed
  // "x […] | y […]" line, even though this is a polar figure, not a y = f(x)
  // Cartesian plot.
  const createExportSnapshot = (): ExportSnapshot => {
    const snapshotTheta = theta;
    const snapshotR = r;
    const snapshotBeta = beta;
    const lightColors = explorerColors(false);
    const whole = Math.round(snapshotTheta);
    const integer = isIntegerDegrees(snapshotTheta);
    const exactRadiansText = integer ? formatPiText(piMultiple(whole)) : '—';
    const turnText = integer ? formatFractionText(turnFraction(whole)) : '—';
    const arcValue = round4(arcLength(snapshotR, degreesToRadians(snapshotTheta)));
    const snapshotCoords = buildCoordinateReadout(snapshotTheta, snapshotR);

    return {
      model: {
        slug: 'angle-explorer',
        title: 'Angle Explorer',
        exportedAt: new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date()),
        window: { xMin: -1.8, xMax: 1.8, yMin: -1.8, yMax: 1.8 },
        legend: [
          { label: 'Initial side', color: lightColors.floor },
          { label: 'Terminal side', color: lightColors.wall },
          {
            label: 'Arc — length is the radian measure when r = 1',
            color: lightColors.curve,
          },
          { label: 'Angle measure', color: lightColors.arrow },
        ],
        sections: [
          {
            title: 'Angle',
            facts: [
              { label: 'Degrees', value: formatDegrees(snapshotTheta) },
              { label: 'Radians', value: formatRadiansDecimal(snapshotTheta) },
              { label: 'Exact radians', value: exactRadiansText },
            ],
          },
          {
            title: 'Circle',
            facts: [
              { label: 'Radius', value: String(snapshotR) },
              { label: 'Position β', value: `${snapshotBeta}°` },
              { label: 'Arc length s = r|θ|', value: arcValue },
              { label: 'Point (x, y)', value: snapshotCoords.pairText },
            ],
          },
        ],
        table: {
          title: 'Representations',
          headers: ['Form', 'Value'],
          rows: [
            ['Degrees', `${formatDegrees(snapshotTheta)}°`],
            ['Fraction of a turn', turnText],
            ['Exact radians', exactRadiansText],
            ['x = r·cos θ', snapshotCoords.xText],
            ['y = r·sin θ', snapshotCoords.yText],
            ['Decimal radians', formatRadiansDecimal(snapshotTheta)],
            ['Arc length', arcValue],
          ],
        },
      },
      renderGraph: (target) => {
        target.innerHTML = `<svg viewBox="0 0 320 320" width="${EXPORT_GRAPH_WIDTH}" height="${EXPORT_GRAPH_HEIGHT}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${buildAngleDiagramSvg(
          {
            theta: snapshotTheta,
            r: snapshotR,
            beta: snapshotBeta,
            colors: lightColors,
            tickText: '#334155',
            coordinateLabel: snapshotCoords.labelText,
          },
        )}</svg>`;
      },
    };
  };

  return (
    // testid carried over from the Task 4 skeleton rather than dropped [G10].
    <div data-testid="angle-explorer" className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-5">
        {sliders.map((s) => (
          <div key={s.id} className="space-y-2">
            <Label htmlFor={`slider-${s.id}`} className="justify-between">
              <span>{s.label}</span>
              <span className="font-mono text-muted-foreground">
                {s.display}
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
              {/* Radians shows BOTH forms: the decimal in the input above, and the
                  exact π multiple here (e.g. 0.5236 and π/6). aria-hidden because the
                  live region already speaks the exact form as plain prose. */}
              {f.unit === 'rad' && radiansExactHtml && (
                <p
                  data-testid="radians-exact"
                  aria-hidden="true"
                  className="text-xs font-medium"
                >
                  <span className="text-muted-foreground">exact: </span>
                  <span dangerouslySetInnerHTML={{ __html: radiansExactHtml }} />
                </p>
              )}
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
        <GraphResultExport hasGraph={true} createSnapshot={createExportSnapshot} />
      </div>

      <div data-testid="angle-diagram" className="mx-auto w-full max-w-lg">
        {/* The children are delegated to buildAngleDiagramSvg — the SAME pure
            builder the export snapshot draws through — so the live figure and
            the exported PNG/PDF can never drift apart. */}
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${round4(theta)} degrees swept on a circle of radius ${round4(r)}.`}
          dangerouslySetInnerHTML={{
            __html: buildAngleDiagramSvg({
              theta,
              r,
              beta,
              colors,
              tickText,
              coordinateLabel: coords.labelText,
            }),
          }}
        />

        <div
          data-testid="angle-readout"
          aria-hidden="true"
          className="mt-4 space-y-2 rounded-lg border bg-card p-4 text-center"
        >
          <div dangerouslySetInnerHTML={{ __html: chainHtml }} />
          <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: arcHtml }} />
        </div>
        <div
          data-testid="angle-coordinates"
          aria-hidden="true"
          className="mt-3 space-y-2 rounded-lg border bg-card p-4 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Coordinates
          </p>
          <div dangerouslySetInnerHTML={{ __html: coordHtml.triple }} />
          <div className="space-y-1 text-sm text-muted-foreground">
            <div dangerouslySetInnerHTML={{ __html: coordHtml.x }} />
            <div dangerouslySetInnerHTML={{ __html: coordHtml.y }} />
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announced}
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          The position slider β rotates the view; coordinates are measured from θ.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Concept adapted from{' '}
          <a
            className="underline"
            href="https://demonstrations.wolfram.com/AnglesMeasuredInDegreesAndRadians/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Angles Measured in Degrees and Radians
          </a>{' '}
          by Eric Schulz, Wolfram Demonstrations Project (CC BY-NC-SA).
        </p>
      </div>
    </div>
  );
}
