import { describe, it, expect } from 'vitest';

import { buildCoordinateReadout } from './angle-coordinates';
import type { WaveFn } from './angle-wave';
import { renderMathHtml } from '@/scripts/katex-html';

describe('buildCoordinateReadout — worked equations', () => {
  it('drops the "1 ×" prefix on the unit circle, where it is only noise', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.xLatex).toBe('x = r\\cos\\theta = \\frac{\\sqrt{3}}{2} \\approx 0.866');
    expect(out.yLatex).toBe('y = r\\sin\\theta = \\frac{1}{2} = 0.5');
  });

  it('shows r × the unit-circle value when the radius is not 1', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times \\frac{\\sqrt{3}}{2} \\approx 1.0392',
    );
    expect(out.yLatex).toBe('y = r\\sin\\theta = 1.2 \\times \\frac{1}{2} = 0.6');
  });

  it('uses = for rational values and ≈ only where a radical forces rounding', () => {
    const out = buildCoordinateReadout(30, 1);
    // y = 1/2 is exactly 0.5; x = √3/2 is not exactly 0.866.
    expect(out.yLatex).toContain(' = 0.5');
    expect(out.yLatex).not.toContain('\\approx');
    expect(out.xLatex).toContain('\\approx');
  });

  it('falls back to a named cosine and sine when no exact form exists', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.xLatex).toBe('x = r\\cos\\theta = \\cos 37^\\circ \\approx 0.7986');
    expect(out.yLatex).toBe('y = r\\sin\\theta = \\sin 37^\\circ \\approx 0.6018');
  });

  it('scales the fallback by r as well', () => {
    // 1.2 × cos 37° = 1.2 × 0.79863551 = 0.95836261, which rounds to 0.9584.
    const out = buildCoordinateReadout(37, 1.2);
    expect(out.xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times \\cos 37^\\circ \\approx 0.9584',
    );
  });

  it('states a whole coordinate once instead of writing "0 = 0"', () => {
    // At 90° on the unit circle the exact x is 0 and the decimal is 0 — repeating
    // it as "0 = 0" is noise. Same for the exact 1 at 0°.
    expect(buildCoordinateReadout(90, 1).xLatex).toBe('x = r\\cos\\theta = 0');
    expect(buildCoordinateReadout(90, 1).yLatex).toBe('y = r\\sin\\theta = 1');
    expect(buildCoordinateReadout(0, 1).xLatex).toBe('x = r\\cos\\theta = 1');
    // With an r prefix the substitution is worth showing in full.
    expect(buildCoordinateReadout(0, 1.2).xLatex).toBe(
      'x = r\\cos\\theta = 1.2 \\times 1 = 1.2',
    );
  });
});

describe('buildCoordinateReadout — chart-style triple line', () => {
  it('reads degrees, exact radians, and the exact pair on the unit circle', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.tripleLatex).toBe(
      '30^\\circ \\quad \\frac{\\pi}{6} \\quad \\left(\\frac{\\sqrt{3}}{2},\\ \\frac{1}{2}\\right)',
    );
  });

  it('shows decimals once the radius leaves the unit circle', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.tripleLatex).toBe(
      '30^\\circ \\quad \\frac{\\pi}{6} \\quad \\left(1.0392,\\ 0.6\\right)',
    );
  });

  it('shows a decimal radian measure and decimal pair for a non-chart angle', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.tripleLatex).toBe(
      '37^\\circ \\quad 0.6458\\text{ rad} \\quad \\left(0.7986,\\ 0.6018\\right)',
    );
  });
});

describe('buildCoordinateReadout — diagram label and export text', () => {
  it('labels the figure with the exact pair on the unit circle', () => {
    expect(buildCoordinateReadout(30, 1).labelText).toBe('(√3/2, 1/2)');
    expect(buildCoordinateReadout(225, 1).labelText).toBe('(-√2/2, -√2/2)');
  });

  it('labels the figure with two decimals elsewhere, keeping it narrow', () => {
    expect(buildCoordinateReadout(30, 1.2).labelText).toBe('(1.04, 0.60)');
    expect(buildCoordinateReadout(37, 1).labelText).toBe('(0.80, 0.60)');
  });

  it('never emits a signed zero in the label', () => {
    // cos(270°) is -1.8e-16 in floating point, which naively renders as "-0.00".
    expect(buildCoordinateReadout(270, 1.1).labelText).toBe('(0.00, -1.10)');
  });

  it('supplies four-decimal export text for the facts block and table', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.pairText).toBe('(1.0392, 0.6)');
    expect(out.xText).toBe('1.2 × √3/2 ≈ 1.0392');
    expect(out.yText).toBe('1.2 × 1/2 = 0.6');
  });

  it('supplies bare export text on the unit circle, with no 1 × prefix', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.xText).toBe('√3/2 ≈ 0.866');
    expect(out.yText).toBe('1/2 = 0.5');
  });

  it('supplies a named cosine in export text when no exact form exists', () => {
    expect(buildCoordinateReadout(37, 1).xText).toBe('cos 37° ≈ 0.7986');
  });
});

describe('buildCoordinateReadout — spoken', () => {
  it('speaks the exact form with no latex markup', () => {
    const spoken = buildCoordinateReadout(30, 1).spoken;
    expect(spoken).toBe(
      'The point is x equals square root of 3 over 2, about 0.866, ' +
        'and y equals 1 over 2, 0.5.',
    );
    expect(spoken).not.toContain('\\');
  });

  it('speaks the scaling factor when the radius is not 1', () => {
    expect(buildCoordinateReadout(30, 1.2).spoken).toBe(
      'The point is x equals 1.2 times square root of 3 over 2, about 1.0392, ' +
        'and y equals 1.2 times 1 over 2, 0.6.',
    );
  });

  it('speaks decimals only when no exact form exists', () => {
    expect(buildCoordinateReadout(37, 1).spoken).toBe(
      'The point is x equals about 0.7986, and y equals about 0.6018.',
    );
  });

  it('states a whole coordinate once instead of stuttering "0, 0" or "1, 1"', () => {
    // Both KaTeX boxes are aria-hidden, so the live region is the only channel a
    // screen-reader user has for this — unlike equation(), there is no visual
    // form compensating for the repeat.
    expect(buildCoordinateReadout(90, 1).spoken).toBe(
      'The point is x equals 0, and y equals 1.',
    );
    expect(buildCoordinateReadout(270, 1).spoken).toBe(
      'The point is x equals 0, and y equals -1.',
    );
    expect(buildCoordinateReadout(0, 1).spoken).toBe(
      'The point is x equals 1, and y equals 0.',
    );
  });
});

describe('buildCoordinateReadout — tan', () => {
  it('shows the r cancelling out of the ratio, exact and irrational', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = ' +
        '\\frac{\\sqrt{3}}{3} \\approx 0.5774',
    );
    expect(out.tanText).toBe(
      'tan θ = y/x = (r sin θ)/(r cos θ) = √3/3 ≈ 0.5774',
    );
  });

  it('is identical for every r — the whole point of the cancellation', () => {
    expect(buildCoordinateReadout(30, 0.5).tanLatex).toBe(
      buildCoordinateReadout(30, 1.5).tanLatex,
    );
  });

  it('uses = for an exact rational value', () => {
    const out = buildCoordinateReadout(45, 1);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = 1',
    );
    expect(out.tanLatex).not.toContain('\\approx');
  });

  it('states 0 once rather than "0 = 0"', () => {
    expect(buildCoordinateReadout(0, 1).tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = 0',
    );
  });

  it('reads as undefined at 90° and 270°, in both alphabets', () => {
    const at90 = buildCoordinateReadout(90, 1);
    expect(at90.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta}\\text{ is undefined}',
    );
    expect(at90.tanText).toBe(
      'tan θ = y/x = (r sin θ)/(r cos θ) is undefined',
    );
    expect(buildCoordinateReadout(270, 1).tanText).toContain('is undefined');
  });

  it('falls back to a named tangent when no exact form exists', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.tanLatex).toBe(
      '\\tan\\theta = \\frac{y}{x} = \\frac{r\\sin\\theta}{r\\cos\\theta} = ' +
        '\\tan 37^\\circ \\approx 0.7536',
    );
  });
});

describe('buildCoordinateReadout — sec/csc/cot', () => {
  it('shows the r cancelling out of the ratio, exact and irrational, for sec', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.secLatex).toBe(
      '\\sec\\theta = \\frac{r}{x} = \\frac{r}{r\\cos\\theta} = \\frac{1}{\\cos\\theta} = ' +
        '\\frac{2\\sqrt{3}}{3} \\approx 1.1547',
    );
    expect(out.secText).toBe(
      'sec θ = r/x = r/(r cos θ) = 1/cos θ = 2√3/3 ≈ 1.1547',
    );
  });

  it('shows the r cancelling out of the ratio, exact and rational, for csc', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.cscLatex).toBe(
      '\\csc\\theta = \\frac{r}{y} = \\frac{r}{r\\sin\\theta} = \\frac{1}{\\sin\\theta} = 2',
    );
    expect(out.cscText).toBe(
      'csc θ = r/y = r/(r sin θ) = 1/sin θ = 2',
    );
    expect(out.cscLatex).not.toContain('\\approx');
  });

  it('shows the r cancelling out of the ratio, exact and irrational, for cot', () => {
    const out = buildCoordinateReadout(30, 1);
    expect(out.cotLatex).toBe(
      '\\cot\\theta = \\frac{x}{y} = \\frac{r\\cos\\theta}{r\\sin\\theta} = ' +
        '\\frac{\\cos\\theta}{\\sin\\theta} = \\sqrt{3} \\approx 1.7321',
    );
    expect(out.cotText).toBe(
      'cot θ = x/y = (r cos θ)/(r sin θ) = cos θ/sin θ = √3 ≈ 1.7321',
    );
  });

  it('is identical for every r — the whole point of the cancellation', () => {
    const at30half = buildCoordinateReadout(30, 0.5);
    const at30r1p5 = buildCoordinateReadout(30, 1.5);
    expect(at30half.secLatex).toBe(at30r1p5.secLatex);
    expect(at30half.cscLatex).toBe(at30r1p5.cscLatex);
    expect(at30half.cotLatex).toBe(at30r1p5.cotLatex);
  });

  it('uses = for an exact rational sec value, contrasted with sec 30°\'s ≈', () => {
    const out = buildCoordinateReadout(60, 1);
    expect(out.secLatex).toBe(
      '\\sec\\theta = \\frac{r}{x} = \\frac{r}{r\\cos\\theta} = \\frac{1}{\\cos\\theta} = 2',
    );
    expect(out.secLatex).not.toContain('\\approx');
    expect(buildCoordinateReadout(30, 1).secLatex).toContain('\\approx');
  });

  it('reads as undefined at sec\'s own pole, in both alphabets', () => {
    const at90 = buildCoordinateReadout(90, 1);
    expect(at90.secLatex).toBe(
      '\\sec\\theta = \\frac{r}{x} = \\frac{r}{r\\cos\\theta} = ' +
        '\\frac{1}{\\cos\\theta}\\text{ is undefined}',
    );
    expect(at90.secText).toBe(
      'sec θ = r/x = r/(r cos θ) = 1/cos θ is undefined',
    );
  });

  it('reads as undefined at csc and cot\'s own poles (0° and 180°), in both alphabets', () => {
    const at0 = buildCoordinateReadout(0, 1);
    expect(at0.cscLatex).toBe(
      '\\csc\\theta = \\frac{r}{y} = \\frac{r}{r\\sin\\theta} = ' +
        '\\frac{1}{\\sin\\theta}\\text{ is undefined}',
    );
    expect(at0.cscText).toBe(
      'csc θ = r/y = r/(r sin θ) = 1/sin θ is undefined',
    );
    expect(at0.cotLatex).toBe(
      '\\cot\\theta = \\frac{x}{y} = \\frac{r\\cos\\theta}{r\\sin\\theta} = ' +
        '\\frac{\\cos\\theta}{\\sin\\theta}\\text{ is undefined}',
    );
    expect(at0.cotText).toBe(
      'cot θ = x/y = (r cos θ)/(r sin θ) = cos θ/sin θ is undefined',
    );

    const at180 = buildCoordinateReadout(180, 1);
    expect(at180.cscText).toContain('is undefined');
    expect(at180.cotText).toContain('is undefined');
  });

  it('falls back to a named secant when no exact form exists', () => {
    const out = buildCoordinateReadout(37, 1);
    expect(out.secLatex).toBe(
      '\\sec\\theta = \\frac{r}{x} = \\frac{r}{r\\cos\\theta} = \\frac{1}{\\cos\\theta} = ' +
        '\\sec 37^\\circ \\approx 1.2521',
    );
  });

  it('states 0 once rather than "0 = 0" for cot at its own zero (90°)', () => {
    expect(buildCoordinateReadout(90, 1).cotLatex).toBe(
      '\\cot\\theta = \\frac{x}{y} = \\frac{r\\cos\\theta}{r\\sin\\theta} = ' +
        '\\frac{\\cos\\theta}{\\sin\\theta} = 0',
    );
  });
});

describe('buildCoordinateReadout — waveLatex/waveText', () => {
  // The regression test for "a new function silently renders as tan": each
  // key must point at ITS OWN equation, at the layer where the wave strip's
  // caption now looks it up, not at whatever the component's old ternary
  // chain happened to fall through to.
  it('maps each wave function to its own equation, in both alphabets', () => {
    const out = buildCoordinateReadout(30, 1.2);
    expect(out.waveLatex.sin).toBe(out.yLatex);
    expect(out.waveLatex.cos).toBe(out.xLatex);
    expect(out.waveLatex.tan).toBe(out.tanLatex);
    expect(out.waveLatex.sec).toBe(out.secLatex);
    expect(out.waveLatex.csc).toBe(out.cscLatex);
    expect(out.waveLatex.cot).toBe(out.cotLatex);

    expect(out.waveText.sin).toBe(out.yText);
    expect(out.waveText.cos).toBe(out.xText);
    expect(out.waveText.tan).toBe(out.tanText);
    expect(out.waveText.sec).toBe(out.secText);
    expect(out.waveText.csc).toBe(out.cscText);
    expect(out.waveText.cot).toBe(out.cotText);
  });

  it('holds at an undefined angle too, where the equation states "is undefined"', () => {
    const out = buildCoordinateReadout(0, 1);
    expect(out.waveLatex.csc).toBe(out.cscLatex);
    expect(out.waveLatex.cot).toBe(out.cotLatex);
    expect(out.waveText.csc).toBe(out.cscText);
    expect(out.waveText.cot).toBe(out.cotText);
  });

  it('renders every waveLatex and waveText value through KaTeX without returning null, pinning \\sec/\\csc/\\cot support', () => {
    const out = buildCoordinateReadout(30, 1);
    const fns: WaveFn[] = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'];
    for (const fn of fns) {
      expect(renderMathHtml(out.waveLatex[fn])).not.toBeNull();
      expect(renderMathHtml(out.waveText[fn])).not.toBeNull();
    }
  });
});
