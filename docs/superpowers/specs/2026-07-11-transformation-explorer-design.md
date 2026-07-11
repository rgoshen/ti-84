# Design: Transformation Explorer

**Date:** 2026-07-11
**Status:** Audited (spec-gap-auditor, gaps G1–G9 closed) — pending user review before plan
**Branch:** `feature/function-explorer` (continues the Explorers section)

> **Audited before writing:** the spec-gap-auditor ran against the Software Code Review
> Checklist on the presented design. All load-bearing codebase claims were verified
> (multi-series `function-plot`, mathjs `parse`+transform, shadcn `Slider`, zero-touch
> nav). Gaps G1–G9 are closed inline (tagged `[Gxx]`) with a changelog at the foot.

## Context

The shipped **Function Explorer** (`/explorers/function`) teaches limits & asymptotes:
a point rides the on-screen curve, auto-detected asymptotes drive `x→a±` sweeps, and an
arrow-notation readout narrates the behaviour. This new **Transformation Explorer** is a
**second, sibling entry** in the Explorers section that teaches a different idea: how the
general form **g(x) = a·f(b(x − h)) + k** moves and reshapes a whole graph.

The two tools are pedagogically orthogonal and share a rendering stack but almost no UI or
logic, so this is a new tool — **not** a mode bolted onto the 522-line limits component.

## Decisions

1. **Placement:** new route `/explorers/transformations`; a second card on the `/explorers`
   hub. Nav needs **no change** — `Header.astro:20-24` already matches child routes
   (verified), so "Explorers" highlights on the new page.
2. **Base function f(x) [G1]:** a **single source of truth** — one `baseExpr` string.
   A curated **parent picker** (8 toolkit functions) *fills and overrides* `baseExpr`
   (and mirrors its expression into the custom box); typing in the **custom f(x)** box and
   pressing **Plot** makes the box the base and **deselects** the parent chip. No hidden
   dual state.
3. **Knobs:** all four of the general form — `a` (vertical stretch / x-axis reflect),
   `b` (horizontal stretch / y-axis reflect), `h` (horizontal shift), `k` (vertical shift).
4. **Comparison model:** the **parent f(x)** is drawn as a faded **dashed ghost**; the
   **transformed g(x)** is the bold solid curve. Sliders reshape g live; the ghost stays as
   a fixed reference. No animation in v1 (`[G9]` reduced-motion N/A).
5. **Reflections:** signed `a`/`b` sliders (dragging through 0 flips the graph — a built-in
   "aha") **plus** convenience toggle buttons ("Reflect over x-axis" negates `a`; "Reflect
   over y-axis" negates `b`). `a`/`b` are the **sole** numeric state; a toggle just negates,
   `aria-pressed = coef < -EPS` `[G8]`.
6. **Degenerate settings [G3]:** never crash or hide the math — let `function-plot` draw
   whatever is defined and **explain it in the readout** (b=0 → constant line; empty-domain
   reflections → "no real values in view"; shifted 1/x pole handled by the renderer).
7. **Default window [G7]:** each parent carries a **sensible default window**; picking a
   parent resets the window to frame it well. The window remains user-editable.

## Module boundaries

Pure, DOM-free, Vitest-tested — `src/scripts/explorer/`:

- **`parents.ts`** — the parent-function catalog: an array of
  `{ id, label, expr, window }` (e.g. `{ id:'square', label:'x²', expr:'x^2',
  window:{xMin:-10,xMax:10,yMin:-2,yMax:10} }`). Pure data + a `parentById` lookup.
  Default windows `[G7]`: sin/cos → x∈[−2π,2π], y∈[−3,3]; eˣ → x∈[−3,3], y∈[−1,10];
  √x → x∈[−2,10], y∈[−2,8]; 1/x → [−10,10]×[−10,10]; x²/x³/|x| → [−10,10]×[−2,10].
- **`transform.ts`** — the pedagogical core (the TDD target):
  - `EPS = 1e-6` — the single tolerance for all "is this knob active?" tests `[G2]`.
  - `type Coeffs = { a; b; h; k }`.
  - **`composeExpr(baseExpr, c): string`** — mathjs `parse(baseExpr)`, `.transform()` to
    substitute every `x` symbol node with `(b·(x − h))`, then wrap `a·(…) + k`, return
    `.toString()`. Node substitution (not text replace) — robust for `exp(x)`, `1/x`, etc.
    (Verified: `parse('x^2').transform(x→(2*(x-1)))` → `(2 * (x - 1)) ^ 2`.)
  - **`describeTransform(c, parentLabel): { equation; steps: string[] }`** — the narration.
    All knob-state branches are enumerated with **tolerance, never float `===`** `[G2][G5]`:
    - order = **horizontal (inside-out) then vertical**: y-reflect → x-scale → x-shift →
      x-reflect → y-scale → y-shift. (Teaches "work inside the parentheses first".)
    - `b < -EPS` → "Reflected over the y-axis"; `|b|>1+EPS` → "Horizontal compression by
      factor |b|"; `0<|b|<1−EPS` → "Horizontal stretch by factor 1/|b|".
    - `|h|>EPS` → `h>0` "Shifted right h" / else "Shifted left |h|".
    - `a < -EPS` → "Reflected over the x-axis"; `|a|>1+EPS` → "Vertical stretch by factor
      |a|"; `0<|a|<1−EPS` → "Vertical compression by factor |a|".
    - `|k|>EPS` → `k>0` "Shifted up k" / else "Shifted down |k|".
    - **Identity** (no active knob) → "This is the parent function — move a slider to
      transform it." **Degenerate** `[G3]`: `|b|<EPS` → "b = 0: the graph collapses to a
      horizontal line"; `|a|<EPS` → "a = 0: the graph flattens to y = k".
    - Numbers formatted via the existing `formatNumber` (from `graphing/hover`).
- **`graphing/theme.ts` extension** — add **`ghost`** to `ExplorerColors`: a de-emphasised
  parent hue, validated ≥3:1 non-text contrast in both themes with the existing
  `lineContrast` (extend `theme.test.ts`).

DOM / integration layer:

- **`src/scripts/explorer/transform-render.ts`** — `renderTransform`: builds `function-plot`
  with **two native series** — parent (`ghost` color) + transformed (`curve` color) — reusing
  `applyThemeToPlot`, `boldZeroAxes`, `asNumericScale`, and the `on('all:zoom')` re-sync
  pattern from `render.ts`/`plot.ts`. **Parent dashing `[G4]`:** primary approach dashes the
  parent series' path via post-processing (mirrors `boldZeroAxes` SVG mutation); **documented
  fallback** if per-series selection proves unreliable — draw the parent as a manual dashed
  sampled overlay polyline (the exact technique already used for the sweep trail,
  `render.ts:177-197`, which skips `undefined` samples). The dashing is prototyped first, the
  way pointer-arbitration was de-risked in the limits tool.
- **`src/components/explorer/TransformationExplorer.tsx`** — React island: theme
  `MutationObserver` (mirrors `FunctionExplorer.tsx:163-168`), `appliedWindow`/`displayWindow`
  split for zoom/pan, parent picker + custom input (Plot), four sliders, reflect toggles,
  reset, show-parent/show-grid checkboxes, window fields, and the `role="status"` readout.
  All tunables (slider min/max/step defaults, `EPS`) in one named-constants block.
- **Routes/config** — `src/pages/explorers/transformations.astro` (mirrors `function.astro`),
  a second card in `explorers/index.astro`, `SITE_TITLE_TRANSFORMATION_EXPLORER` in
  `config.ts`. No `Header.astro` change.

## Controls & validation

- Parent picker: `x², x³, |x|, √x, 1/x, sin x, cos x, eˣ` `[G1]`.
- Sliders: `a`,`b` ∈ [−5, 5] step 0.1 (default 1); `h`,`k` ∈ [−10, 10] step 0.1 (default 0).
  Reflect toggles negate `a`/`b`; **Reset** returns to identity (parent).
- **Custom-input validation reuses the shipped pattern `[G6]`**: `normalizeExpr` (strips a
  leading `y =`), `evaluate(e,{x:1})` in try/catch, errors surfaced via `role="alert"`. A
  valid base can only produce a valid composed string; if `function-plot` still rejects it,
  the render try/catch surfaces the same error (mirrors `render.ts` build guard).

## Accessibility (WCAG 2.1 AA)

The SVG plot is `role="img"` with an `aria-label` naming the parent (dashed) and the current
g(x) (solid); the authoritative content is a `role="status" aria-live="polite"` block with the
equation + plain-English `steps` as **real text**, coalesced to settle after interaction.
Sliders are keyboard-native (shadcn/radix); reflect toggles are `aria-pressed` buttons; meaning
is never by colour alone (dashed vs solid + text). Reduced-motion is **N/A in v1** (no
animation) `[G9]`.

## Testing

TDD-first per slice. **Vitest (node):**
- `transform.test.ts` — `composeExpr` numeric-equivalence to `a·f(b(x−h))+k` per family and
  combined; `describeTransform` wording for every branch incl. the "backwards" horizontal
  cases, `|a|=1`/`b=1` no-ops, negative shifts, identity, and the b=0/a=0 degenerate messages
  `[G2][G3][G5]`.
- `parents.test.ts` — every parent `expr` parses and evaluates; every `window` is valid.
- `theme.test.ts` — `ghost` contrast ≥3:1 in both themes.

**Playwright (`transformation.spec.ts`):** parent+transformed render; picking a parent resets
the window and fills the box; slider updates equation/steps + the transformed path; reflect
toggles flip sign and `aria-pressed`; reset → identity message; custom function; b=0 readout
message; dark mode; `aria-current` on Explorers; keyboard slider; `role="status"`.
**Coverage target ≥ 80% on changed code `[G9]`.**

## Risks

- **Per-series dashing** (`[G4]`) is the main integration risk — de-risked by prototyping the
  dash-the-parent-path step first, with the manual dashed-overlay fallback fully specified.
- **Composed-expression compatibility:** mathjs `toString()` output is fed to function-plot's
  own parser; same idiom as the graphing calculator, guarded by the render try/catch `[G6]`.
- **Custom functions** with no real values in the window degrade gracefully to the G3 readout
  message rather than a blank, confusing plot.

## Revision changelog (gaps closed)

| Gap | Severity | Summary | Where closed |
|-----|----------|---------|--------------|
| G1 | Material | Single-source base; preset fills/overrides, custom+Plot deselects chip | Decisions §2; Controls |
| G2 | Should-fix | `EPS=1e-6` tolerance for all active-knob tests; no float `===` | `transform.ts` |
| G3 | Should-fix | Degenerate b=0/a=0/empty-domain → draw valid + explain in readout | Decisions §6; `transform.ts` |
| G4 | Should-fix | Parent dashing: primary path-dash + documented overlay fallback, prototyped first | `transform-render.ts`; Risks |
| G5 | Should-fix | Full branch enumeration + horizontal-then-vertical order + identity/default | `transform.ts` |
| G6 | Minor | Reuse `normalizeExpr`+`evaluate` try/catch + `role="alert"`; render guard | Controls & validation |
| G7 | Minor | Per-parent default windows; picking a parent reframes the view | Decisions §7; `parents.ts` |
| G8 | Minor | `a`/`b` sole state; toggles negate; `aria-pressed = coef<-EPS`; coef=0 no-op | Decisions §5 |
| G9 | Note | ≥80% changed-code coverage; reduced-motion N/A (v1 no animation) | Testing; A11y |
