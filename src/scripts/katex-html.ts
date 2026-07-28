/**
 * The one place this app turns TeX into KaTeX markup.
 *
 * Centralised for accessibility as much as for DRY. KaTeX's `output: 'html'` builds
 * the visual layout out of spans marked `aria-hidden="true"` and emits no MathML at
 * all, so every rendered equation — the graphing labels, the angle readouts, the
 * coordinate triples — is silent to a screen reader. `htmlAndMathml` adds the MathML
 * track that assistive tech actually reads, while KaTeX's own stylesheet keeps it
 * visually clipped, so nothing changes on screen.
 *
 * `katex.renderToString` needs no DOM, which is what lets this live in `src/scripts`
 * and be unit-tested in the node environment.
 */
import katex from 'katex';

const KATEX_OPTIONS = {
  // Malformed input renders as a KaTeX error node instead of throwing, so a half-typed
  // equation degrades to a visible red fragment rather than blanking the panel.
  throwOnError: false,
  displayMode: false,
  output: 'htmlAndMathml',
} as const;

/**
 * KaTeX markup for `tex`, or null if KaTeX refuses it outright.
 *
 * `throwOnError: false` suppresses ParseErrors only — KaTeX can still throw on other
 * internal failures, so the null return gives callers something to fall back on
 * instead of letting an exception escape into a React render.
 */
export function renderMathHtml(tex: string): string | null {
  try {
    return katex.renderToString(tex, KATEX_OPTIONS);
  } catch {
    return null;
  }
}
