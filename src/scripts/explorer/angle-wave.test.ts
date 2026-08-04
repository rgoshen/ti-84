import { describe, it, expect } from 'vitest';

import {
  AMP_MAX,
  POLE_MAX,
  WAVE_HEIGHT,
  WAVE_WIDTH,
  buildWaveSvg,
  waveAsymptoteRadians,
  waveAsymptoteTicks,
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
      expect(waveValue('sin', -theta, 1)!).toBeCloseTo(-waveValue('sin', theta, 1)!, 12);
      expect(waveValue('cos', -theta, 1)!).toBeCloseTo(waveValue('cos', theta, 1)!, 12);
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
    expect(v.at(-1)!.y).toBeCloseTo(s.yFor(waveValue('sin', 137, 1)!), 6);
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
  const tanScale = waveScales(WAVE_WIDTH, WAVE_HEIGHT, POLE_MAX);

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
        for (const asymptoteRad of waveAsymptoteRadians('tan')) {
          const asymptoteX = tanScale.xFor(asymptoteRad);
          const allBefore = xs.every((x) => x < asymptoteX);
          const allAfter = xs.every((x) => x > asymptoteX);
          expect(allBefore || allAfter, `subpath straddles an asymptote: ${subpath}`).toBe(true);
        }
      }
    }
  });

  it('breaks at the exact angle where |tan θ| = POLE_MAX, not an interpolated guess', () => {
    const edgeDeg = (Math.atan(POLE_MAX) * 180) / Math.PI;
    const path = wavePath('tan', 120, 1, tanScale);
    const firstSubpath = path.split(' M ')[0]!;
    const lastPoint = [...firstSubpath.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)].at(-1)!;
    expect(Number(lastPoint[1])).toBeCloseTo(tanScale.xFor(degreesToRadians(edgeDeg)), 4);
    expect(Number(lastPoint[2])).toBeCloseTo(tanScale.yFor(POLE_MAX), 4);
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
    expect(waveDomain('tan')).toBe(POLE_MAX);
  });
});

describe('waveScales — custom domain', () => {
  it('rescales the y-axis to the given domain, leaving existing calls untouched', () => {
    const narrow = waveScales(WAVE_WIDTH, WAVE_HEIGHT); // default domain, AMP_MAX
    const wide = waveScales(WAVE_WIDTH, WAVE_HEIGHT, POLE_MAX);
    expect(narrow.yFor(0)).toBeCloseTo(wide.yFor(0), 6); // zero stays at the same pixel
    expect(wide.yFor(POLE_MAX)).toBeCloseTo(narrow.yFor(AMP_MAX), 6); // both land on the top edge
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
    expect(waveAsymptoteRadians('tan')).toEqual([
      -3 * (Math.PI / 2),
      -1 * (Math.PI / 2),
      1 * (Math.PI / 2),
      3 * (Math.PI / 2),
    ]);
  });

  it('lands exactly on members of waveTickRadians — the asymptotes are real gridlines', () => {
    const tickRadians = waveTickRadians().map((t) => t.radians);
    for (const asymptote of waveAsymptoteRadians('tan')) {
      expect(tickRadians.some((r) => Math.abs(r - asymptote) < 1e-12)).toBe(true);
    }
  });
});

describe('waveAsymptoteTicks', () => {
  it('returns tan\'s four asymptote tick indices in ascending order', () => {
    expect(waveAsymptoteTicks('tan')).toEqual([-6, -2, 2, 6]);
  });

  it('returns nothing for the sinusoids, which have no poles', () => {
    expect(waveAsymptoteTicks('sin')).toEqual([]);
    expect(waveAsymptoteTicks('cos')).toEqual([]);
  });
});

describe('waveSpoken — tan', () => {
  it('calls it a curve, not a wave, and reports the value', () => {
    expect(waveSpoken('tan', 45, 1)).toBe(
      'Tangent curve traced from 0 to 45 degrees. tangent of theta is 1.',
    );
  });

  it('reports undefined at an asymptote', () => {
    expect(waveSpoken('tan', 90, 1)).toBe(
      'Tangent curve traced from 0 to 90 degrees. tangent of theta is undefined.',
    );
  });

  it('is independent of r', () => {
    expect(waveSpoken('tan', 30, 0.5)).toBe(waveSpoken('tan', 30, 1.5));
  });
});

describe('buildWaveSvg — tan', () => {
  const tanBase = { ...waveBase, fn: 'tan' as const };

  it('draws four dashed asymptote lines, and none for sin/cos', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 45 });
    expect([...svg.matchAll(/data-role="wave-asymptote"/g)]).toHaveLength(4);
    expect(buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 })).not.toContain(
      'data-role="wave-asymptote"',
    );
  });

  it('rescales the box to ±POLE_MAX — a value of 1 sits on the dashed unit reference', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 45 }); // tan 45° = 1
    const markerY = Number(svg.match(/data-role="wave-marker"[^>]*cy="([-\d.]+)"/)![1]);
    const s = waveScales(WAVE_WIDTH, WAVE_HEIGHT, POLE_MAX);
    expect(markerY).toBeCloseTo(s.yFor(1), 4);
  });

  it('suppresses the marker and drop-line at an asymptote', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 90 });
    expect(svg).not.toContain('data-role="wave-marker"');
    expect(svg).not.toContain('data-role="wave-drop"');
  });

  it('suppresses the marker once the value leaves the visible domain, short of the true asymptote', () => {
    // tan(80°) ≈ 5.67 > POLE_MAX(4) — a real, finite value, but off-screen.
    const svg = buildWaveSvg({ ...tanBase, theta: 80 });
    expect(svg).not.toContain('data-role="wave-marker"');
  });

  it('still draws the marker for sin/cos everywhere, unaffected by the new domain check', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 90 });
    expect(svg).toContain('data-role="wave-marker"');
  });

  it('draws the curve in one or more subpaths without NaN across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 11) {
      if (Math.abs(theta) < 1e-9) continue;
      const svg = buildWaveSvg({ ...tanBase, theta });
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    }
  });

  it('suppresses the solid gridline at each asymptote so the dashed line reads as dashed, but keeps the tick label', () => {
    const svg = buildWaveSvg({ ...tanBase, theta: 45 });
    const s = waveScales(WAVE_WIDTH, WAVE_HEIGHT, POLE_MAX);
    for (const k of [-6, -2, 2, 6]) {
      const radians = (k * Math.PI) / 4;
      const x = s.xFor(radians);
      const label = waveTickLabel(k);
      expect(svg).not.toContain(`<line x1="${x}" y1=`);
      expect(svg).toContain(`>${label}</text>`);
    }
  });

  it('leaves the gridline at those same x-positions unchanged for sin/cos, which never suppress it', () => {
    const s = waveScales(WAVE_WIDTH, WAVE_HEIGHT, AMP_MAX);
    for (const fn of ['sin', 'cos'] as const) {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 45 });
      for (const k of [-6, -2, 2, 6]) {
        const radians = (k * Math.PI) / 4;
        const x = s.xFor(radians);
        expect(svg).toContain(`<line x1="${x}" y1=`);
      }
    }
  });

  it('draws the asymptotes in the wall colour, not the gridline slate', () => {
    // The mark that means "vertical asymptote" everywhere else in the app —
    // render.ts:169 draws the Function Explorer's walls exactly this way.
    const svg = buildWaveSvg({ ...tanBase, theta: 45 });
    const lines = [...svg.matchAll(/<line data-role="wave-asymptote"[^>]*>/g)].map((m) => m[0]);

    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line).toContain(`stroke="${colors.wall}"`);
      expect(line).not.toContain(`stroke="${colors.axis}"`);
    }
  });

  it('strokes the asymptotes heavier than the gridlines they sit among', () => {
    // The original defect: slate at stroke-width 1 with a "2 4" dash is only
    // 33% ink — LESS than the solid 0.75 gridline beside it — so the asymptote
    // read as a missing gridline rather than as a wall. Compare against a real
    // gridline rather than asserting a literal, so the relationship is what
    // is pinned down.
    const svg = buildWaveSvg({ ...tanBase, theta: 45 });
    const widthOf = (markup: string): number => Number(markup.match(/stroke-width="([\d.]+)"/)![1]);
    // k = -8 (-2π) is even and not an asymptote, so its solid gridline survives.
    const gridline = svg.match(/<g data-role="wave-tick"><line[^>]*>/)![0];
    const lines = [...svg.matchAll(/<line data-role="wave-asymptote"[^>]*>/g)].map((m) => m[0]);

    for (const line of lines) {
      expect(widthOf(line)).toBeGreaterThan(widthOf(gridline));
      // 1.5 is render.ts:123's dashedLine width — the cross-explorer wall value.
      expect(line).toContain('stroke-width="1.5"');
      expect(line).toContain('stroke-dasharray="6 6"');
    }
  });
});

describe('waveAsymptoteTicks — sec/csc/cot', () => {
  it("returns sec's four tick indices, matching tan — both die where cos = 0", () => {
    expect(waveAsymptoteTicks('sec')).toEqual([-6, -2, 2, 6]);
  });

  it('returns csc and cot\'s five tick indices — the extra one at tick 0, where sin = 0', () => {
    expect(waveAsymptoteTicks('csc')).toEqual([-8, -4, 0, 4, 8]);
    expect(waveAsymptoteTicks('cot')).toEqual([-8, -4, 0, 4, 8]);
  });
});

describe('waveAsymptoteRadians — every pole function', () => {
  const tickRadians = waveTickRadians().map((t) => t.radians);
  const poleFns = ['tan', 'sec', 'csc', 'cot'] as const;

  it('lands exactly on members of waveTickRadians, for every pole function', () => {
    for (const fn of poleFns) {
      for (const asymptote of waveAsymptoteRadians(fn)) {
        expect(tickRadians.some((r) => Math.abs(r - asymptote) < 1e-12)).toBe(true);
      }
    }
  });

  it('is where the definition itself blows up, independent of the literal tick list', () => {
    // sec dies where cos = 0; csc and cot both die where sin = 0. Cross-checking
    // against the raw reciprocal, not the tick table, is what would catch a
    // hand-typed tick list that simply copied the wrong four/five numbers.
    for (const fn of ['sec', 'csc', 'cot'] as const) {
      for (const asymptote of waveAsymptoteRadians(fn)) {
        const magnitude =
          fn === 'sec' ? Math.abs(1 / Math.cos(asymptote)) : Math.abs(1 / Math.sin(asymptote));
        expect(magnitude).toBeGreaterThan(1e12);
      }
    }
  });
});

describe('waveValue — cross-family pole confusion', () => {
  it('sec and csc break at different angles, never both and never neither', () => {
    expect(waveValue('csc', 0, 1)).toBeNull();
    expect(waveValue('sec', 0, 1)).toBeCloseTo(1, 12);
    expect(waveValue('sec', 90, 1)).toBeNull();
    expect(waveValue('csc', 90, 1)).toBeCloseTo(1, 12);
  });
});

describe('waveValue — sec/csc/cot', () => {
  it('matches 1/cos, 1/sin, 1/tan away from the poles', () => {
    for (const theta of [10, 30, 45, 60, 80, -50, 200]) {
      expect(waveValue('sec', theta, 1)).toBeCloseTo(1 / Math.cos(degreesToRadians(theta)), 10);
      expect(waveValue('csc', theta, 1)).toBeCloseTo(1 / Math.sin(degreesToRadians(theta)), 10);
      expect(waveValue('cot', theta, 1)).toBeCloseTo(1 / Math.tan(degreesToRadians(theta)), 10);
    }
  });

  it('never has magnitude below 1 wherever sec or csc is defined', () => {
    for (let theta = -360; theta <= 360; theta += 5) {
      const sec = waveValue('sec', theta, 1);
      const csc = waveValue('csc', theta, 1);
      if (sec !== null) expect(Math.abs(sec)).toBeGreaterThanOrEqual(1 - 1e-9);
      if (csc !== null) expect(Math.abs(csc)).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it('is independent of r for all three — the radius cancels out of the ratio', () => {
    for (const theta of [10, 30, 45, 60, 80, -50, 200]) {
      for (const fn of ['sec', 'csc', 'cot'] as const) {
        const a = waveValue(fn, theta, 0.5);
        const b = waveValue(fn, theta, 1.5);
        expect(a).not.toBeNull();
        expect(a).toBeCloseTo(b!, 12);
      }
    }
  });

  it('is null exactly at its own poles', () => {
    for (const theta of [90, -90, 270, -270]) {
      expect(waveValue('sec', theta, 1)).toBeNull();
    }
    for (const theta of [0, 180, -180, 360]) {
      expect(waveValue('csc', theta, 1)).toBeNull();
      expect(waveValue('cot', theta, 1)).toBeNull();
    }
  });
});

describe('wavePath — sec/csc/cot', () => {
  const poleScale = waveScales(WAVE_WIDTH, WAVE_HEIGHT, POLE_MAX);

  it('never lets one subpath span an asymptote', () => {
    for (const fn of ['sec', 'csc', 'cot'] as const) {
      for (const theta of [190, 400, -260]) {
        const path = wavePath(fn, theta, 1, poleScale);
        for (const subpath of path.split(' M ').map((s, i) => (i === 0 ? s : `M ${s}`))) {
          const xs = [...subpath.matchAll(/[ML] ([-\d.e]+) /g)].map((m) => Number(m[1]));
          for (const asymptoteRad of waveAsymptoteRadians(fn)) {
            const asymptoteX = poleScale.xFor(asymptoteRad);
            const allBefore = xs.every((x) => x < asymptoteX);
            const allAfter = xs.every((x) => x > asymptoteX);
            expect(
              allBefore || allAfter,
              `${fn} subpath straddles an asymptote: ${subpath}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('draws nothing until θ passes the branch edge — cot (~14.04°) and csc (~14.48°), both centred on 90°', () => {
    expect(wavePath('cot', 10, 1, poleScale)).toBe('');
    expect(wavePath('cot', 20, 1, poleScale)).not.toBe('');
    expect(wavePath('csc', 10, 1, poleScale)).toBe('');
    expect(wavePath('csc', 20, 1, poleScale)).not.toBe('');
  });

  it('breaks at the exact edge angle, not an interpolated guess', () => {
    const cotEdgeDeg = 90 - (Math.atan(POLE_MAX) * 180) / Math.PI;
    const path = wavePath('cot', 30, 1, poleScale);
    const firstPoint = [...path.matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g)][0]!;
    expect(Number(firstPoint[1])).toBeCloseTo(poleScale.xFor(degreesToRadians(cotEdgeDeg)), 4);
    expect(Number(firstPoint[2])).toBeCloseTo(poleScale.yFor(POLE_MAX), 4);
  });

  it('is independent of r, matching waveValue', () => {
    for (const fn of ['sec', 'csc', 'cot'] as const) {
      for (const theta of [30, 45, 60, 120, -50]) {
        expect(wavePath(fn, theta, 0.5, poleScale)).toBe(wavePath(fn, theta, 1.5, poleScale));
      }
    }
  });

  it('keeps every vertex inside the viewBox across a full sweep', () => {
    for (const fn of ['sec', 'csc', 'cot'] as const) {
      for (let theta = -360; theta <= 360; theta += 13) {
        if (Math.abs(theta) < 1e-9) continue;
        for (const v of [
          ...wavePath(fn, theta, 1, poleScale).matchAll(/[ML] ([-\d.e]+) ([-\d.e]+)/g),
        ]) {
          const x = Number(v[1]);
          const y = Number(v[2]);
          expect(x, `${fn} x out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
          expect(x, `${fn} x out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_WIDTH);
          expect(y, `${fn} y out of range at θ=${theta}`).toBeGreaterThanOrEqual(0);
          expect(y, `${fn} y out of range at θ=${theta}`).toBeLessThanOrEqual(WAVE_HEIGHT);
        }
      }
    }
  });

  it('emits no NaN, Infinity, or undefined across a full sweep', () => {
    for (let theta = -360; theta <= 360; theta += 9) {
      for (const fn of ['sec', 'csc', 'cot'] as const) {
        const path = wavePath(fn, theta, 1, poleScale);
        expect(path).not.toContain('NaN');
        expect(path).not.toContain('Infinity');
        expect(path).not.toContain('undefined');
      }
    }
  });
});

describe('waveDomain — sec/csc/cot', () => {
  it('shares POLE_MAX with tan for all three reciprocals', () => {
    expect(waveDomain('sec')).toBe(POLE_MAX);
    expect(waveDomain('csc')).toBe(POLE_MAX);
    expect(waveDomain('cot')).toBe(POLE_MAX);
  });
});

describe('waveSpoken — sec/csc/cot', () => {
  it('names each function and calls it a curve, mirroring tan', () => {
    expect(waveSpoken('sec', 45, 1)).toContain('Secant curve traced from 0 to 45 degrees.');
    expect(waveSpoken('sec', 45, 1)).toContain('secant of theta is');
    expect(waveSpoken('csc', 45, 1)).toContain('Cosecant curve traced from 0 to 45 degrees.');
    expect(waveSpoken('csc', 45, 1)).toContain('cosecant of theta is');
    expect(waveSpoken('cot', 45, 1)).toContain('Cotangent curve traced from 0 to 45 degrees.');
    expect(waveSpoken('cot', 45, 1)).toContain('cotangent of theta is');
  });

  it('reports undefined at its own pole', () => {
    expect(waveSpoken('sec', 90, 1)).toContain('secant of theta is undefined.');
    expect(waveSpoken('csc', 0, 1)).toContain('cosecant of theta is undefined.');
    expect(waveSpoken('cot', 0, 1)).toContain('cotangent of theta is undefined.');
  });
});

describe('buildWaveSvg — sec/csc/cot', () => {
  it('sec draws four asymptotes, matching tan', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sec', theta: 45 });
    expect([...svg.matchAll(/data-role="wave-asymptote"/g)]).toHaveLength(4);
  });

  it('csc and cot draw five — the extra one at tick 0', () => {
    for (const fn of ['csc', 'cot'] as const) {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 45 });
      expect([...svg.matchAll(/data-role="wave-asymptote"/g)]).toHaveLength(5);
    }
  });

  it('never draws an asymptote line outside [0, WAVE_WIDTH]', () => {
    for (const fn of ['tan', 'sec', 'csc', 'cot'] as const) {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 45 });
      const xs = [
        ...svg.matchAll(/<line data-role="wave-asymptote" x1="([-\d.]+)"/g),
      ].map((m) => Number(m[1]));
      expect(xs.length).toBeGreaterThan(0);
      for (const x of xs) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(WAVE_WIDTH);
      }
    }
  });

  it('suppresses the marker at θ=0 for csc and cot, both undefined there', () => {
    for (const fn of ['csc', 'cot'] as const) {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 0 });
      expect(svg).not.toContain('data-role="wave-marker"');
    }
  });

  it('draws the marker for sec where its value is in range', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sec', theta: 45 }); // sec 45° = √2 ≈ 1.414, well inside ±4
    expect(svg).toContain('data-role="wave-marker"');
  });

  it('emits no NaN across the whole domain', () => {
    for (let theta = -360; theta <= 360; theta += 7) {
      for (const fn of ['sec', 'csc', 'cot'] as const) {
        const svg = buildWaveSvg({ ...waveBase, fn, theta });
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('undefined');
      }
    }
  });
});

describe('buildWaveSvg — y-axis suppression fires for csc/cot at tick 0', () => {
  // top and x0 are both independent of the per-function y-domain: yFor(domain)
  // always lands on PAD.top and xFor(0) always lands on the centre column, for
  // any domain — see waveScales. So the default AMP_MAX scale is a valid probe
  // for every function's own line, without rebuilding a per-fn scale.
  const s = waveScales();
  const x0 = s.xFor(0);
  const top = s.yFor(AMP_MAX);
  const bottom = s.yFor(-AMP_MAX);

  it('suppresses the solid y-axis for csc and cot, which have a pole at tick 0', () => {
    for (const fn of ['csc', 'cot'] as const) {
      const svg = buildWaveSvg({ ...waveBase, fn, theta: 45 });
      expect(svg).not.toContain(`<line x1="${x0}" y1="${top}"`);
    }
  });

  // The y-axis line ends at y2="${bottom}"; the k=0 gridline (drawn whenever a
  // function has no pole there) shares the same x1/y1 but ends at
  // y2="${bottom + TICK_OVERSHOOT}" instead. Asserting only the x1/y1 prefix
  // would pass on the gridline alone even if the y-axis itself were missing —
  // the full endpoint is what makes these positive controls non-vacuous.
  it('positive control: sin still draws its y-axis', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'sin', theta: 45 });
    expect(svg).toContain(`<line x1="${x0}" y1="${top}" x2="${x0}" y2="${bottom}" `);
  });

  it('leaves tan unaffected — it has no pole at tick 0', () => {
    const svg = buildWaveSvg({ ...waveBase, fn: 'tan', theta: 45 });
    expect(svg).toContain(`<line x1="${x0}" y1="${top}" x2="${x0}" y2="${bottom}" `);
  });
});
