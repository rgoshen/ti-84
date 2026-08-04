import * as React from 'react'; // [G1] required for the React.JSX.Element return type
import { useEffect, useId, useMemo, useState } from 'react';
import { renderMathHtml } from '@/scripts/katex-html';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import GraphResultExport from '@/components/export/GraphResultExport';
import { explorerColors } from '@/scripts/graphing/theme';
import {
  arcLength,
  degreesToRadians,
  formatFractionText,
  formatPiLatex,
  formatPiText,
  isIntegerDegrees,
  piMultiple,
  turnFraction,
} from '@/scripts/explorer/angle';
import {
  formatDegrees,
  formatRadiansDecimal,
  parseAngleInput,
} from '@/scripts/explorer/angle-parse';
import { buildCoordinateReadout } from '@/scripts/explorer/angle-coordinates';
import { buildAngleDiagramSvg } from '@/scripts/explorer/angle-diagram';
import { buildReadout } from '@/scripts/explorer/angle-readout';
import type { AngleUnit } from '@/scripts/explorer/angle-standard';
import { round4 } from '@/scripts/explorer/format';
import {
  buildWaveSvg,
  waveSpoken,
  waveValue,
  WAVE_HEIGHT,
  WAVE_SPOKEN_FN_NAME,
  WAVE_WIDTH,
  type WaveFn,
  type WaveMode,
} from '@/scripts/explorer/angle-wave';
import {
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  type ExportSnapshot,
} from '@/scripts/export/model';

/** Slider defaults, also the reset target. */
const DEFAULTS = {
  theta: 0,
  r: 1,
  beta: 0,
  wave: 'none' as WaveMode,
  angleUnit: 'rad' as AngleUnit,
  standardAngles: false,
};

/** Export legend copy for the selected wave, keyed so a new `WaveFn` member is
 *  a compile error here rather than a silent fallback to tan's row. */
const WAVE_LEGEND: Record<WaveFn, string> = {
  sin: 'sin θ — height is the y-coordinate',
  cos: 'cos θ — height is the x-coordinate',
  tan: 'tan θ — height is the tangent segment; dashed verticals mark its asymptotes',
};

/** Export "Function" fact copy for the selected wave, same exhaustiveness
 *  rationale as `WAVE_LEGEND`. */
const WAVE_FUNCTION_FACT: Record<WaveFn, string> = {
  sin: 'y = r·sin θ',
  cos: 'y = r·cos θ',
  tan: 'tan θ = y/x',
};

/** viewBox is fixed and the container is fluid, so the figure scales with no
 *  "large format" toggle — the source Demonstration only needed one because
 *  Mathematica cannot reflow. The pixels-per-unit and measure-arc radius that
 *  used to live here now default inside `buildAngleDiagramSvg`, which both
 *  this component and the export snapshot draw through. */
const VIEW = 320;

export default function AngleExplorer(): React.JSX.Element {
  const [theta, setTheta] = useState(DEFAULTS.theta); // degrees, float
  const [r, setR] = useState(DEFAULTS.r);
  const [beta, setBeta] = useState(DEFAULTS.beta); // degrees
  const [wave, setWave] = useState<WaveMode>(DEFAULTS.wave);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>(DEFAULTS.angleUnit);
  const [standardAngles, setStandardAngles] = useState(DEFAULTS.standardAngles);

  // Unique per mounted instance, so the wave radio group's ids never collide
  // if two AngleExplorer components ever land on the same page.
  const waveGroupId = useId();
  // Unique per mounted instance, matching the wave group's rationale above.
  const labelsGroupId = useId();

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
  const chainHtml = useMemo(() => renderMathHtml(readout.chain) ?? '', [readout.chain]);
  const arcHtml = useMemo(() => renderMathHtml(readout.arc) ?? '', [readout.arc]);
  // The exact π form for the Radians field. Only meaningful for whole degrees —
  // a typed 57.2958° (from "1" radian) has no clean π multiple, so this is null
  // and the field shows only its decimal. The input keeps the decimal as its
  // value (so it round-trips); this is a read-only companion showing both forms.
  const radiansExactHtml = useMemo(
    () =>
      isIntegerDegrees(theta)
        ? renderMathHtml(`${formatPiLatex(piMultiple(Math.round(theta)))}\\text{ rad}`)
        : null,
    [theta],
  );

  // Coordinates depend on θ and r only — β rotates the view, so the point it
  // moves is still the point θ describes, exactly as arc length already treats it.
  const coords = useMemo(() => buildCoordinateReadout(theta, r), [theta, r]);
  const coordHtml = useMemo(
    () => ({
      triple: renderMathHtml(coords.tripleLatex) ?? '',
      x: renderMathHtml(coords.xLatex) ?? '',
      y: renderMathHtml(coords.yLatex) ?? '',
      tan: renderMathHtml(coords.tanLatex) ?? '',
    }),
    [coords.tripleLatex, coords.xLatex, coords.yLatex, coords.tanLatex],
  );
  // The wave caption keyed by function, so a new `WaveFn` member is a compile
  // error here too. `waveLatex` (a table owned by angle-coordinates.ts) is a
  // later task's widening; this reuses coordHtml's existing fields exhaustively
  // rather than inventing one early.
  const waveCaptionHtml: Record<WaveFn, string> = {
    sin: coordHtml.y,
    cos: coordHtml.x,
    tan: coordHtml.tan,
  };

  // `undefined` rather than 'none' is what both builders expect for "draw neither".
  const waveFn: WaveFn | undefined = wave === 'none' ? undefined : wave;

  // The readout box is aria-hidden (KaTeX markup is noise to a screen reader), so
  // this live region is how the conversion reaches assistive tech at all. Debounced
  // so a slider drag announces once on settle rather than on every frame.
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => {
      const wavePart = waveFn ? ` ${waveSpoken(waveFn, theta, r)}` : '';
      setAnnounced(`${readout.spoken} ${coords.spoken}${wavePart}`);
    }, 250);
    return () => clearTimeout(id);
  }, [readout.spoken, coords.spoken, waveFn, theta, r]);

  const reset = (): void => {
    setTheta(DEFAULTS.theta);
    setR(DEFAULTS.r);
    setBeta(DEFAULTS.beta);
    setWave(DEFAULTS.wave);
    setAngleUnit(DEFAULTS.angleUnit);
    setStandardAngles(DEFAULTS.standardAngles);
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
    const snapshotWave = waveFn;
    const snapshotAngleUnit = angleUnit;
    const snapshotStandardAngles = standardAngles;
    const lightColors = explorerColors(false);
    const whole = Math.round(snapshotTheta);
    const integer = isIntegerDegrees(snapshotTheta);
    const exactRadiansText = integer ? formatPiText(piMultiple(whole)) : '—';
    const turnText = integer ? formatFractionText(turnFraction(whole)) : '—';
    const arcValue = round4(arcLength(snapshotR, degreesToRadians(snapshotTheta)));
    const snapshotCoords = buildCoordinateReadout(snapshotTheta, snapshotR);
    const waveNumericValue = snapshotWave
      ? waveValue(snapshotWave, snapshotTheta, snapshotR)
      : null;

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
          ...(snapshotStandardAngles
            ? [
                {
                  label: 'Standard angles — multiples of 30° and 45°',
                  color: lightColors.axis,
                },
              ]
            : []),
          ...(snapshotWave
            ? [
                {
                  label: WAVE_LEGEND[snapshotWave],
                  color: lightColors.wave,
                },
              ]
            : []),
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
              {
                label: 'Circle labels',
                value: snapshotAngleUnit === 'deg' ? 'Degrees' : 'Radians',
              },
              { label: 'Arc length s = r|θ|', value: arcValue },
              { label: 'Point (x, y)', value: snapshotCoords.pairText },
            ],
          },
          ...(snapshotWave
            ? [
                {
                  title: 'Wave',
                  color: lightColors.wave,
                  facts: [
                    {
                      label: 'Function',
                      value: WAVE_FUNCTION_FACT[snapshotWave],
                    },
                    {
                      label: 'Value',
                      value: waveNumericValue === null ? 'undefined' : round4(waveNumericValue),
                    },
                    { label: 'Traced', value: `0° to ${formatDegrees(snapshotTheta)}°` },
                  ],
                },
              ]
            : []),
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
        // With a wave, the circle yields height so both figures fit the 560 the
        // artifact template allows. Without one, the export is unchanged.
        const circleHeight = snapshotWave ? 360 : EXPORT_GRAPH_HEIGHT;
        const circle =
          `<svg viewBox="0 0 320 320" width="${EXPORT_GRAPH_WIDTH}" height="${circleHeight}" ` +
          `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" ` +
          // display:block: an inline (the SVG default) element carries baseline
          // leading below its own box, which is exactly the ~2px the container's
          // fixed height and overflow:hidden were found to clip against.
          `style="display:block">${buildAngleDiagramSvg(
            {
              theta: snapshotTheta,
              r: snapshotR,
              beta: snapshotBeta,
              colors: lightColors,
              tickText: '#334155',
              coordinateLabel: snapshotCoords.labelText,
              projection: snapshotWave,
              angleUnit: snapshotAngleUnit,
              showStandardAngles: snapshotStandardAngles,
            },
          )}</svg>`;

        // A matching viewBox, NOT the live strip's 512 × 176. Reusing that here
        // would make `meet` fit to the height and render the wave ~552px wide,
        // letterboxed inside a 960px box.
        const strip = snapshotWave
          ? `<svg viewBox="0 0 ${EXPORT_GRAPH_WIDTH} 190" width="${EXPORT_GRAPH_WIDTH}" height="190" ` +
            `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" ` +
            `style="display:block">${buildWaveSvg(
              {
                fn: snapshotWave,
                theta: snapshotTheta,
                r: snapshotR,
                colors: lightColors,
                tickText: '#334155',
                width: EXPORT_GRAPH_WIDTH,
                height: 190,
              },
            )}</svg>`
          : '';

        target.innerHTML = circle + strip;
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
          <p className="text-sm font-medium" id={`${waveGroupId}-wave-group-label`}>
            Wave
          </p>
          <RadioGroup
            aria-labelledby={`${waveGroupId}-wave-group-label`}
            value={wave}
            onValueChange={(v) => setWave(v as WaveMode)}
          >
            {(
              [
                { value: 'none' as const, label: 'none' },
                { value: 'sin' as const, label: 'sin θ' },
                { value: 'cos' as const, label: 'cos θ' },
                { value: 'tan' as const, label: 'tan θ' },
              ]
            ).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`${waveGroupId}-wave-${o.value}`} value={o.value} />
                <Label htmlFor={`${waveGroupId}-wave-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Drag <strong>angle</strong> to trace the wave from 0.
          </p>
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium" id={`${labelsGroupId}-labels-group-label`}>
            Circle labels
          </p>
          <RadioGroup
            aria-labelledby={`${labelsGroupId}-labels-group-label`}
            value={angleUnit}
            onValueChange={(v) => setAngleUnit(v as AngleUnit)}
          >
            {(
              [
                { value: 'deg' as const, label: 'Degrees' },
                { value: 'rad' as const, label: 'Radians' },
              ]
            ).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem id={`${labelsGroupId}-unit-${o.value}`} value={o.value} />
                <Label htmlFor={`${labelsGroupId}-unit-${o.value}`}>{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${labelsGroupId}-standard-angles`}
              checked={standardAngles}
              onCheckedChange={(checked) => setStandardAngles(checked === true)}
            />
            <Label htmlFor={`${labelsGroupId}-standard-angles`}>Show standard angles</Label>
          </div>
        </div>
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
          data-testid="angle-figure"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Angle of ${round4(theta)} degrees swept on a circle of radius ${round4(r)}. Circle labels in ${
            angleUnit === 'deg' ? 'degrees' : 'radians'
          }${standardAngles ? ', showing standard angles' : ''}.`}
          dangerouslySetInnerHTML={{
            __html: buildAngleDiagramSvg({
              theta,
              r,
              beta,
              colors,
              tickText,
              coordinateLabel: coords.labelText,
              projection: waveFn,
              angleUnit,
              showStandardAngles: standardAngles,
            }),
          }}
        />

        {waveFn && (
          <div data-testid="angle-wave" className="mt-4">
            <svg
              data-testid="angle-wave-figure"
              viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Graph of ${WAVE_SPOKEN_FN_NAME[waveFn]} traced from 0 to ${formatDegrees(theta)} degrees, on an axis from negative 2 pi to 2 pi.`}
              dangerouslySetInnerHTML={{
                __html: buildWaveSvg({
                  fn: waveFn,
                  theta,
                  r,
                  colors,
                  tickText,
                }),
              }}
            />
            {/* The value is the coordinate the strip plots, so this reuses the
                equation angle-coordinates.ts already built rather than
                formatting it a second time — the strip's number and the
                coordinate box's number cannot then disagree. */}
            <div
              data-testid="angle-wave-caption"
              aria-hidden="true"
              className="mt-2 text-center text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: waveCaptionHtml[waveFn],
              }}
            />
          </div>
        )}

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
