import { describe, it, expect } from 'vitest';

import {
  AMP_MAX,
  TAN_MAX,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  buildWaveSvg,
  waveAsymptoteRadians,
  waveDomain,
  waveScales,
  waveTickLabel,
  waveTickRadians,
  waveValue,
  wavePath,
  waveSpoken,
} from './angle-wave';
import { degreesToRadians } from './angle';
import { explorerColors } from '@/scripts/graphing/theme';

describe('waveTickRadians', () => {
  it('emits every multiple of π/4 across -2π…2π — seventeen of them', () => {
    const ticks = waveTickRadians();
    expect(ticks).toHaveLength(17);
    expect(ticks[0]).toEqual({ k: -8, radians: -2 * Math.PI });
    expect(ticks[8]).toEqual({ k: 0, radians: 0 });
    expect(ticks[16]).toEqual({ k: 8, radians: 2 * Math.PI });
  });

  it('spaces them exactly π/4 apart', () => {
    const ticks = waveTickRadians();
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.radians - ticks[i - 1]!.radians).toBeCloseTo(Math.PI / 4, 12);
    }
  });
});

describe('waveTickLabel', () => {
  it('reduces to the exact π form, reusing the Radians field\'s own formatter', () => {
    expect(waveTickLabel(0)).toBe('0');
    expect(waveTickLabel(1)).toBe('π/4');
    expect(waveTickLabel(2)).toBe('π/2');
    expect(waveTickLabel(3)).toBe('3π/4');
    expect(waveTickLabel(4)).toBe('π');
    expect(waveTickLabel(6)).toBe('3π/2');
    expect(waveTickLabel(8)).toBe('2π');
  });

  it('signs negatives with an ASCII hyphen', () => {
    expect(waveTickLabel(-1)).toBe('-π/4');
    expect(waveTickLabel(-7)).toBe('-7π/4');
    expect(waveTickLabel(-8)).toBe('-2π');
    expect(waveTickLabel(-8)).not.toContain('−');
  });
});

describe('waveValue', () => {
  it('is the terminal point\'s coordinate, so the radius is the amplitude', () => {
    expect(waveValue('sin', 90, 1)).toBeCloseTo(1, 12);
    expect(waveValue('sin', 90, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 0, 1.5)).toBeCloseTo(1.5, 12);
    expect(waveValue('cos', 180, 0.5)).toBeCloseTo(-0.5, 12);
  });

  it('starts sin at zero and cos at r — how the two differ at θ = 0', () => {
    expect(waveValue('sin', 0, 1.2)).toBeCloseTo(0, 12);
    expect(waveValue('cos', 0, 1.2)).toBeCloseTo(1.2, 12);
  });

  it('is odd in θ for sin and even in θ for cos', () => {
    for (const theta of [17, 45, 90, 137, 210, 359]) {
      expect(waveValue('sin', -theta, 1)).toBeCloseTo(-waveValue('sin', theta, 1), 12);
      expect(waveValue('cos', -theta, 1)).toBeCloseTo(waveValue('cos', theta, 1), 12);
    }
  });
});

describe('waveScales', () => {
  const s = waveScales();

  it('puts -2π on the left edge, 0 at the centre and 2π on the right edge', () => {
    const left = s.xFor(-2 * Math.PI);
    const centre = s.xFor(0);
    const right = s.xFor(2 * Math.PI);
    expect(centre).toBeCloseTo(WAVE_WIDTH / 2, 6);
    expect(left).toBeLessThan(centre);
    expect(right).toBeGreaterThan(centre);
    expect(centre - left).toBeCloseTo(right - centre, 6);
  });

  it('is linear in radians', () => {
    const a = s.xFor(0);
    const b = s.xFor(Math.PI / 4);
    const c = s.xFor(Math.PI / 2);
    expect(c - b).toBeCloseTo(b - a, 6);
  });

  it('fixes the y domain at ±AMP_MAX so the amplitude change is visible', () => {
    // A y-scale that adapted to r would cancel out the very change the radius
    // slider is meant to demonstrate.
    expect(s.yFor(AMP_MAX)).toBeLessThan(s.yFor(0));
    expect(s.yFor(-AMP_MAX)).toBeGreaterThan(s.yFor(0));
    expect(s.yFor(0) - s.yFor(AMP_MAX)).toBeCloseTo(s.yFor(-AMP_MAX) - s.yFor(0), 6);
  });

  it('keeps every reachable value inside the box', () => {
    for (const v of [-AMP_MAX, -1, 0, 1, AMP_MAX]) {
      expect(s.yFor(v)).toBeGreaterThanOrEqual(0);
      expect(s.yFor(v)).toBeLessThanOrEqual(WAVE_HEIGHT);
    }
  });

  it('accepts a custom box, so the export can fill its own slot', () => {
    // 960 × 190 is the export slot. Reusing the live 512 × 176 viewBox there
    // would letterbox the strip to ~552px inside a 960px box.
    const wide = waveScales(960, 190);
    expect(wide.xFor(0)).toBeCloseTo(480, 6);
    expect(wide.xFor(2 * Math.PI)).toBeGreaterThan(wide.xFor(0));
  });
});

/** Pull the vertices back out of an `M x y L x y …` path. */
function vertices(path: string): Array<{ x: number; y: number }> {
  return [...path.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('wavePath', () => {
  const s = waveScales();

  it('draws nothing at θ = 0 — a zero-length trace is nothing, not a degenerate path', () => {
    // Same threshold and same reasoning as arcPath in angle-render.ts.
    expect(wavePath('sin', 0, 1, s)).toBe('');
    expect(wavePath('cos', 0, 1, s)).toBe('');
    expect(wavePath('sin', 1e-12, 1, s)).toBe('');
  });

  it('starts at θ = 0 and ends exactly at θ, so the curve meets the marker', () => {
    const v = vertices(wavePath('sin', 137, 1, s));
    expect(v[0]!.x).toBeCloseTo(s.xFor(0), 6);
    expect(v.at(-1)!.x).toBeCloseTo(s.xFor(degreesToRadians(137)), 6);
    expect(v.at(-1)!.y).toBeCloseTo(s.yFor(waveValue('sin', 137, 1)), 6);
  });

  it('grows rightward for positive θ and leftward for negative θ', () => {
    expect(vertices(wavePath('sin', 90, 1, s)).at(-1)!.x).toBeGreaterThan(s.xFor(0));
    expect(vertices(wavePath('sin', -90, 1, s)).at(-1)!.x).toBeLessThan(s.xFor(0));
  });

  it('samples densely enough to read as a curve, and bounds the vertex count', () => {
    // 2° steps: 360° needs 181 vertices. Enough to look smooth, few enough that
    // a slider drag redraws without a visible cost.
    const full = vertices(wavePath('sin', 360, 1, s));
    expect(full.length).toBe(181);
    expect(vertices(wavePath('sin', 10, 1, s)).length).toBe(6);
  });

  it('scales the traced height by r', () => {
    const peakAt = (r: number) => vertices(wavePath('sin', 90, r, s)).at(-1)!.y;
    expect(peakAt(1.5)).toBeCloseTo(s.yFor(1.5), 6);
    expect(peakAt(0.5)).toBeCloseTo(s.yFor(0.5), 6);
    expect(peakAt(1.5)).toBeLessThan(peakAt(0.5));
  });

  it('emits no NaN across the whole θ × r domain', () => {
    for (let theta = -360; theta <= 360; theta += 7) {
      for (const r of [0.5, 1, 1.5]) {
        for (const fn of ['sin', 'cos'] as const) {
          const path = wavePath(fn, theta, r, s);
          expect(path).not.toContain('NaN');
          expect(path).not.toContain('undefined');
        }
      }
    }
  });

  it('keeps every vertex inside the viewBox', () => {
    for (let theta = -360; theta <= 360; theta += 11) {
      for (const v of vertices(wavePath('cos', theta, AMP_MAX, s))) {
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(WAVE_WIDTH);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(WAVE_HEIGHT);
      }
    }
  });
});

describe('wavePath — tan', () => {
  // tan needs its own domain-matched scale; the default waveScales() is
  // still ±1.5 and would clip every tan sample well before the real edge.
  const tanScale = waveScales(WAVE_WIDTH, WAVE_HEIGHT, TAN_MAX);

  it('draws one subpath for a sweep that never reaches the visible edge', () => {
    const path = wavePath('tan', 45, 1, tanScale);
    expect((path.match(/M/g) ?? []).length).toBe(1);
  });

  it('breaks into multiple subpaths once the sweep crosses an asymptote', () => {
    const path = wavePath('tan', 120, 1, tanScale);
    expect((path.match(/M/g) ?? []).length).toBeGreaterThan(1);
  });

  it('never lets one subpath span an asymptote', () => {
    // Every asymptote (odd multiple of 90°) must fall strictly BETWEEN two
    // subpaths, never inside the degree range one subpath covers.
    for (const path of [
      wavePath('tan', 180, 1, tanScale),
      wavePath('tan', 400, 1, tanScale),
      wavePath('tan', -260, 1, tanScale),
    ]) {
      for (const subpath of path.split(' M ').map((s, i) => (i === 0 ? s : `M ${s}`))) {
        const xs = [...subpath.matchAll(/[ML] ([-\d.e]+) /g)].map((m) => Number(m[1]));
        for (const asymptoteRad of waveAsymptoteRadians()) {
          const asymptoteX = tanScale.xFor(asymptoteRad);
          const allBefore = xs.every((x) => x < asymptoteX);
          const allAfter = xs.every((x) => x > asymptoteX);
          expect(allBefore || allAfter, `subpath straddles an asymptote: ${subpath}`).toBe(true);
        }
      }
    }
  });

  it('breaks at the exact angle where |tan θ| = TAN_MAX, not an interpolated guess', () => {
    const edgeDeg = (Math.atan(TAN_MAX) * 180) / Math.PI;
    const path = wavePath('tan', 120, 1, tanScale);
    const firstSubpath = path.split(' M ')[0]!;
    const lastPoint = [...firstSubpath.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].at(-1)!;
    expect(Number(lastPoint[1])).toBeCloseTo(tanScale.xFor(degreesToRadians(edgeDeg)), 4);
    expect(Number(lastPoint[2])).toBeCloseTo(tanScale.yFor(TAN_MAX), 4);
  });

  it('snaps the final vertex to θ exactly when θ is inside the visible domain', () => {
    const v = [...wavePath('tan', 30, 1, tanScale).matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].at(-1)!;
    expect(Number(v[1])).toBeCloseTo(tanScale.xFor(degreesToRadians(30)), 6);
    expect(Number(v[2])).toBeCloseTo(tanScale.yFor(waveValue('tan', 30, 1)!), 6);
  });

  it('traces leftward for a negative sweep, mirroring sin/cos', () => {
    const xs = [...wavePath('tan', -45, 1, tanScale).matchAll(/[ML] ([-\d.e]+) /g)].map((m) =>
      Number(m[1]),
    );
    expect(xs.at(-1)!).toBeLessThan(xs[0]!);
  });

  it('is independent of r, matching waveValue', () => {
    expect(wavePath('tan', 45, 0.5, tanScale)).toBe(wavePath('tan', 45, 1.5, tanScale));
  });

  it('keeps every vertex inside the viewBox across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 13) {
      if (Math.abs(theta) < 1e-9) continue;
      for (const v of [...wavePath('tan', theta, 1, tanScale).matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)]) {
        const x = Number(v[1]);
        const y = Number(v[2]);
        expect(x, `x out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(x, `x out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_WIDTH);
        expect(y, `y out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
        expect(y, `y out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_HEIGHT);
      }
    }
  });

  it('emits no NaN or undefined across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 9) {
      const path = wavePath('tan', theta, 1, tanScale);
      expect(path).not.toContain('NaN');
      expect(path).not.toContain('undefined');
    }
  });
});

describe('waveSpoken', () => {
  it('names the function and the swept range for the live region', () => {
    expect(waveSpoken('sin', 135, 1)).toBe(
      'Sine wave traced from 0 to 135 degrees. sine of theta is 0.7071.',
    );
    expect(waveSpoken('cos', 0, 1.5)).toBe(
      'Cosine wave traced from 0 to 0 degrees. cosine of theta is 1.5.',
    );
  });

  it('carries no LaTeX for a screen reader to read aloud', () => {
    expect(waveSpoken('cos', -210, 1.2)).not.toContain('\\');
    expect(waveSpoken('cos', -210, 1.2)).toContain('-210 degrees');
  });
});

const colors = explorerColors(false);
const tickText = '#334155';
const waveBase = { r: 1, colors, tickText };

describe('buildWaveSvg', () => {
  it('draws all seventeen π/4 ticks with their exact labels', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect([...svg.matchAll(/data-role="wave-tick"/g)]).toHaveLength(17);
    for (const label of ['-2π', '-7π/4', '-π/2', '0', 'π/4', 'π', '3π/2', '2π']) {
      expect(svg).toContain(`>${label}</text>`);
    }
  });

  it('staggers odd π/4 labels onto a second baseline so they do not collide', () => {
    // 17 labels on one baseline gives each ~29px where -7π/4 needs ~25px.
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    const yOf = (label: string) =>
      Number(svg.match(new RegExp(`<text[^>]*y="([-\\d.]+)"[^>]*>${label.replace('/', '\\/')}</text>`))![1]);
    expect(yOf('π/2')).not.toBe(yOf('π/4'));
    expect(yOf('π/2')).toBe(yOf('π'));
    expect(yOf('π/4')).toBe(yOf('3π/4'));
  });

  it('draws the ±1 references dashed, like the figure\'s dashed unit circle', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect([...svg.matchAll(/data-role="wave-unit-ref"/g)]).toHaveLength(2);
    expect(svg).toContain('stroke-dasharray="3 3"');
  });

  it('draws the traced curve in the wave colour', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect(svg).toContain('data-role="wave-curve"');
    expect(svg).toContain(colors.wave);
  });

  it('omits the curve element entirely at θ = 0 rather than emitting an empty path', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 0 });
    expect(svg).not.toContain('data-role="wave-curve"');
    expect(svg).not.toContain('d=""');
  });

  it('always draws the marker, so cos reads as non-zero at θ = 0 where sin reads as zero', () => {
    const s = waveScales();
    const markerY = (fn: 'sin' | 'cos') => {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 0 });
      return Number(svg.match(/data-role="wave-marker"[^>]*cy="([-\d.]+)"/)![1]);
    };
    expect(markerY('sin')).toBeCloseTo(s.yFor(0), 6);
    expect(markerY('cos')).toBeCloseTo(s.yFor(1), 6);
    expect(markerY('sin')).not.toBeCloseTo(markerY('cos'), 3);
  });

  it('uses the circle\'s own point colours for the marker — this is the link', () => {
    // Stacked layout forecloses a tie-line, so a shared marker colour and the
    // projection leg are what connect the strip to the terminal point.
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 });
    const marker = svg.match(/<circle data-role="wave-marker"[^>]*>/)![0];
    expect(marker).toContain(`fill="${colors.point}"`);
    expect(marker).toContain(`stroke="${colors.pointStroke}"`);
  });

  it('drops a line from the marker to the zero axis to show the signed height', () => {
    expect(buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 })).toContain(
      'data-role="wave-drop"',
    );
  });

  it('honours a custom box so the export can fill its 960 × 190 slot', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90, width: 960, height: 190 });
    const cx = Number(svg.match(/data-role="wave-marker"[^>]*cx="([-\d.]+)"/)![1]);
    expect(cx).toBeCloseTo(waveScales(960, 190).xFor(Math.PI / 2), 6);
  });

  it('emits no NaN across the whole domain', () => {
    for (let theta = -360; theta <= 360; theta += 7) {
      for (const r of [0.5, 1, 1.5]) {
        for (const fn of ['sin', 'cos'] as const) {
          const svg = buildWaveSvg({ ...waveBase, fn, theta, r });
          expect(svg).not.toContain('NaN');
          expect(svg).not.toContain('undefined');
        }
      }
    }
  });
});

describe('waveDomain', () => {
  it('is ±1.5 for sin and cos, ±4 for tan', () => {
    expect(waveDomain('sin')).toBe(AMP_MAX);
    expect(waveDomain('cos')).toBe(AMP_MAX);
    expect(waveDomain('tan')).toBe(TAN_MAX);
  });
});

describe('waveScales — custom domain', () => {
  it('rescales the y-axis to the given domain, leaving existing calls untouched', () => {
    const narrow = waveScales(WAVE_WIDTH, WAVE_HEIGHT); // default domain, AMP_MAX
    const wide = waveScales(WAVE_WIDTH, WAVE_HEIGHT, TAN_MAX);
    expect(narrow.yFor(0)).toBeCloseTo(wide.yFor(0), 6); // zero stays at the same pixel
    expect(wide.yFor(TAN_MAX)).toBeCloseTo(narrow.yFor(AMP_MAX), 6); // both land on the top edge
    expect(wide.yFor(1)).toBeGreaterThan(narrow.yFor(1)); // same value, smaller fraction of a wider box
  });
});

describe('waveValue — tan', () => {
  it('is independent of r — the radius cancels out of the ratio', () => {
    for (const theta of [10, 30, 45, 60, 80, -50, 200]) {
      const a = waveValue('tan', theta, 0.5);
      const b = waveValue('tan', theta, 1.5);
      expect(a).not.toBeNull();
      expect(a).toBeCloseTo(b!, 12);
    }
  });

  it('matches Math.tan away from the asymptotes', () => {
    expect(waveValue('tan', 45, 1)).toBeCloseTo(1, 10);
    expect(waveValue('tan', 0, 1)).toBeCloseTo(0, 10);
    expect(waveValue('tan', 30, 1)).toBeCloseTo(Math.tan(Math.PI / 6), 10);
  });

  it('is null at every odd multiple of 90°, positive or negative', () => {
    for (const theta of [90, -90, 270, -270]) {
      expect(waveValue('tan', theta, 1)).toBeNull();
    }
  });

  it('is not null anywhere else, including close neighbours of an asymptote', () => {
    expect(waveValue('tan', 89, 1)).not.toBeNull();
    expect(waveValue('tan', 91, 1)).not.toBeNull();
    expect(waveValue('tan', 180, 1)).not.toBeNull();
  });
});

describe('waveAsymptoteRadians', () => {
  it('returns the four odd π/2 multiples in ascending order', () => {
    expect(waveAsymptoteRadians()).toEqual([
      -3 * (Math.PI / 2),
      -1 * (Math.PI / 2),
      1 * (Math.PI / 2),
      3 * (Math.PI / 2),
    ]);
  });

  it('lands exactly on members of waveTickRadians — the asymptotes are real gridlines', () => {
    const tickRadians = waveTickRadians().map((t) => t.radians);
    for (const asymptote of waveAsymptoteRadians()) {
      expect(tickRadians.some((r) => Math.abs(r - asymptote) < 1e-12)).toBe(true);
    }
  });
});
