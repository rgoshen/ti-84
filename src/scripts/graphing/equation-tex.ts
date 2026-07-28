/**
 * LaTeX for a raw equation input, for labelling the form the student actually typed.
 *
 * mathjs `parse()` treats `=` as assignment and throws on `3y + 2x = 6`, so an
 * equation cannot be rendered in one call. Each side is parsed independently and
 * rejoined with `=`.
 *
 * Returns TeX only — no `y =` prefix and no KaTeX rendering, so this stays pure and
 * unit-testable in the node environment.
 */
import { parse } from 'mathjs';
import { splitEquation } from './equation-input';

const TEX_OPTS = { implicit: 'hide' } as const;

export function equationToTex(raw: string): string | null {
  const split = splitEquation(raw);
  try {
    // Exhaustive over SplitResult['kind']: adding a variant without handling it here
    // becomes a compile error at `never` rather than a silent null.
    switch (split.kind) {
      case 'expression':
        return parse(split.expr).toTex(TEX_OPTS);
      case 'equation': {
        const lhs = parse(split.lhs).toTex(TEX_OPTS);
        const rhs = parse(split.rhs).toTex(TEX_OPTS);
        return `${lhs} = ${rhs}`;
      }
      case 'empty':
      case 'multiple':
        return null;
      default: {
        const unhandled: never = split;
        return unhandled;
      }
    }
  } catch {
    return null;
  }
}
