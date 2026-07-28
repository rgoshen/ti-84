import { describe, it, expect } from 'vitest';
import { renderMathHtml } from './katex-html';

describe('renderMathHtml', () => {
  it('renders TeX to KaTeX HTML', () => {
    const html = renderMathHtml('y = \\sin\\left( x\\right)');
    expect(html).not.toBeNull();
    expect(html).toContain('katex');
  });

  // The whole point of this module. KaTeX's `output: 'html'` marks its visual spans
  // aria-hidden and emits no MathML, which leaves every equation on the site silent to
  // screen readers — a WCAG 2.1 AA failure. The MathML track is what AT actually reads.
  it('emits a MathML track so assistive tech can read the equation', () => {
    const html = renderMathHtml('x^2 + y^2 = 25');
    expect(html).toContain('<math');
    expect(html).toContain('katex-mathml');
  });

  it('still marks the visual track aria-hidden so AT does not read it twice', () => {
    const html = renderMathHtml('x^2');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders malformed TeX as an error node rather than throwing', () => {
    expect(() => renderMathHtml('\\frac{')).not.toThrow();
  });

  it('returns null when KaTeX refuses outright', () => {
    // A non-ParseError failure is not suppressed by throwOnError, so the caller needs
    // a null to fall back on rather than an exception escaping into React's render.
    expect(renderMathHtml(undefined as unknown as string)).toBeNull();
  });
});
