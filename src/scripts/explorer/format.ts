/**
 * Shared display-number formatting for the Angle Explorer.
 *
 * `angle-parse.ts` (parsing, depends on mathjs), `angle-coordinates.ts`
 * (presentation strings), and `AngleExplorer.tsx` (the React component) each
 * need the exact same "four decimals, no float noise" rounding for on-screen
 * numbers. This module exists only to hold that one shared formatter so the
 * three layers can agree on it without depending on one another — in
 * particular, without the presentation layer or the component pulling in
 * `mathjs` just to borrow a one-line formatter from the parsing module. It is
 * deliberately dependency-free so importing it never drags anything else
 * along.
 */

/**
 * Four decimals, with no trailing float noise (e.g. `59.99999999999999`
 * reads as `60`). `String(-0)` is `"0"` in JavaScript, so a value that
 * rounds to negative zero (e.g. `cos(270°)` landing on `-1.8e-16`) already
 * displays as `"0"` rather than `"-0"`.
 */
export const formatFourDecimals = (n: number): string => String(Number(n.toFixed(4)));
