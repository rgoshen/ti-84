# Angle Explorer Tangent Asymptote Legibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the tangent wave's four vertical asymptotes from gridline-slate to the app's established red-dashed asymptote idiom, so they are unmistakable against the seventeen π/4 gridlines they sit among.

**Architecture:** No new code paths, no new exports, no signature changes. `buildWaveSvg` already emits four `data-role="wave-asymptote"` lines; only their three stroke attributes change, from `colors.axis`/`1`/`2 4` to `colors.wall`/`1.5`/`6 6` — the exact values `render.ts`'s `dashedLine` already uses to draw the Function Explorer's vertical asymptotes. Both `buildWaveSvg` call sites (live component and export snapshot) already pass a full `ExplorerColors`, so `colors.wall` is in scope at both with no plumbing.

**Tech Stack:** Astro 7 + React 19 (`client:only="react"`), TypeScript, Tailwind 4, Vitest (node environment) for unit tests, Playwright for e2e.

## Problem Being Fixed

The asymptotes are **not missing** — they are drawn, and both a unit test and `tests/e2e/angle.spec.ts:416` assert all four reach the DOM. Both pass. The defect is legibility:

| | colour | width | dasharray | ink coverage |
| --- | --- | --- | --- | --- |
| π/4 gridline (even k) | `colors.axis` slate | 0.75 | *solid* | 100% |
| asymptote (today) | `colors.axis` slate | 1.0 | `2 4` | **33%** |
| asymptote (after) | `colors.wall` red | 1.5 | `6 6` | 50% |

Identical colour at a third of the ink means each asymptote renders *fainter* than an ordinary gridline. It reads as "a gridline is missing here," not "tangent is undefined here."

## Global Constraints

Every task's requirements implicitly include this section.

- **Strict TDD.** Red → green → refactor. Write the failing test, run it and watch it fail for the expected reason, then implement.
- **Unit tests run in the node environment only.** `vitest.config.ts` sets `environment: 'node'` and `include: ['src/**/*.{test,spec}.ts']`. There is no jsdom. `buildWaveSvg` is a pure string builder, so stroke styling is fully unit-testable.
- **Pure builders are DOM-free by construction.** String concatenation only. No `document`, no `createElementNS`.
- **No new dependencies, no new exports, no new `WaveDiagramOptions` field.** This is an attribute-value change.
- **No new theme colour.** Reuse the existing `colors.wall` slot, documented in `theme.ts` as *"Vertical asymptote guide (drawn dashed)"*. `theme.test.ts`'s `MARK_KEYS` already covers `wall` for 3:1 non-text contrast (WCAG 2.1 SC 1.4.11) in both themes, so no new contrast test is needed.
- **Assert against `explorerColors(...)`, never hard-coded hex.** A literal `'#e24b4a'` would keep passing while the palette moved on. The test must read from the same source the renderer does.
- **No export-legend change.** The legend covers the polar figure's main geometry and already omits gridlines, unit references and the marker. A red asymptote row would duplicate the existing red "Terminal side" swatch.
- **Conventional Commits.** `fix:`, `test:`, `docs:`. **No co-author or AI-generation trailers.**
- **Append a `SUMMARY.md` entry before every commit**, using the format already in that file (`## [YYYY-MM-DD HH:MM] Commit Summary` with Change Type / Scope / Summary / Rationale / Bug Fix Context / References).
- **Branch:** `feature/angle-wave-asymptote-legibility`, already created. No direct commits to `main`.
- **Commands:** unit `npx vitest run src/scripts/explorer/angle-wave.test.ts`; full unit suite `npm test`; e2e `npx playwright test tests/e2e/angle.spec.ts`; typecheck `npx astro check`.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/scripts/explorer/angle-wave.test.ts` | Two new assertions in the existing `describe('buildWaveSvg — tan')` block | 1 |
| `src/scripts/explorer/angle-wave.ts` | The `asymptotes` block's three stroke attributes + its comment; the gridline-suppression comment's rationale | 1 |
| `TODO.md` | Feature entry | 1 |
| `SUMMARY.md` | Commit entry | 1 |

One task: a three-attribute change and its tests are a single reviewable unit. Splitting the test from the implementation would produce a task that cannot be independently verified.

---

### Task 1: Restyle the asymptotes to the `wall` idiom

**Files:**
- Modify: `src/scripts/explorer/angle-wave.test.ts` (extend `describe('buildWaveSvg — tan')`, ~line 463)
- Modify: `src/scripts/explorer/angle-wave.ts:336-349` (the `asymptotes` block) and `:307-311` (suppression comment)
- Modify: `TODO.md`, `SUMMARY.md`

**Interfaces:**
- Consumes: `explorerColors(dark: boolean): ExplorerColors` from `@/scripts/graphing/theme` — already imported by the test file at line 19. Uses its `wall` and `axis` fields.
- Produces: nothing new. No exported signature changes; `buildWaveSvg(opts: WaveDiagramOptions): string` is untouched.

**Existing tests that must stay green, unmodified:** the count-of-4 test (`:463`), the gridline-suppression test (`:504`), the marker-suppression tests, and the sin/cos negative case. The suppression test asserts `not.toContain('<line x1="${x}" y1=')` — asymptote markup opens with `<line data-role="wave-asymptote" x1=`, so it does not collide.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('buildWaveSvg — tan', ...)` block in `src/scripts/explorer/angle-wave.test.ts`. The fixtures `colors` (`= explorerColors(false)`), `waveBase` and `tanBase` already exist at lines 291-293 and 461.

```ts
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
      expect(line).toContain('stroke-dasharray="6 6"');
    }
  });
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts -t "wall colour"`

Expected: FAIL. The first test fails on `expected '<line data-role="wave-asymptote" … stroke="#475569" …>' to contain 'stroke="#e24b4a"'`. Run without `-t` to confirm the second fails too: `1.5` is not greater than `0.75` while the width is still `1`… it *is* greater, so that assertion passes today — the `stroke-dasharray="6 6"` assertion is what fails (`2 4` today). Both tests must be red for the *stated* reason before continuing.

- [ ] **Step 3: Restyle the asymptote block**

In `src/scripts/explorer/angle-wave.ts`, replace the `asymptotes` block (currently ~lines 336-349):

```ts
  // Dashed verticals at tan's four asymptotes. Deliberately NOT styled like the
  // π/4 gridlines they sit among: slate at 33% ink coverage put less colour on
  // screen than the solid gridline beside it, so the asymptote read as a gap in
  // the grid. This is `wall` at `dashedLine`'s weight and dash — the same mark
  // render.ts:169 draws the Function Explorer's vertical asymptotes with, so
  // "red dashed vertical" means one thing across the whole app. Absent for
  // sin/cos, which have no asymptote to mark.
  const asymptotes =
    fn === 'tan'
      ? waveAsymptoteRadians()
          .map((rad) => {
            const x = s.xFor(rad);
            return (
              `<line data-role="wave-asymptote" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" ` +
              `stroke="${colors.wall}" stroke-width="1.5" stroke-dasharray="6 6" />`
            );
          })
          .join('')
      : '';
```

- [ ] **Step 4: Update the gridline-suppression rationale**

The suppression itself is correct and stays. Only its *reason* changes — the old comment argues from same-colour, which no longer holds. In `buildWaveSvg`'s tick `.map(...)`, replace the comment above `const isAsymptote`:

```ts
      // At tan's asymptotes, a solid gridline would sit directly under the
      // dashed asymptote line (drawn separately, below), filling its gaps and
      // diluting the dash. Now that the two differ in colour that is worse, not
      // neutral: slate showing through red's gaps interleaves two colours along
      // one line. Suppress just the gridline here; the label stays.
      const isAsymptote = fn === 'tan' && (k === -6 || k === -2 || k === 2 || k === 6);
```

- [ ] **Step 5: Run the file's tests and verify they pass**

Run: `npx vitest run src/scripts/explorer/angle-wave.test.ts`
Expected: PASS, all tests in the file including the pre-existing count-of-4 and suppression tests.

- [ ] **Step 6: Run the full unit suite and typecheck**

Run: `npm test && npx astro check`
Expected: PASS. ~490 unit tests green, no type errors.

- [ ] **Step 7: Verify in the browser, both themes**

```bash
npm run dev
```

Open `/explorers/angles`, select **tan θ**, and drag the angle slider past 90° and 270°. Confirm:
- four red dashed verticals, obvious against the slate gridlines;
- the curve still breaks cleanly at each one, with no vertical stripe;
- the tick labels `-3π/2`, `-π/2`, `π/2`, `3π/2` are still present under their asymptotes.

Toggle the theme and repeat — `wall` is `#e24b4a` in light and `#f87171` in dark.

**Shut the dev server down as soon as this check finishes.** A leftover server has previously caused a false "the app is broken" alarm.

- [ ] **Step 8: Run the e2e suites**

Run: `npx playwright test tests/e2e/angle.spec.ts tests/e2e/angle-export.spec.ts`
Expected: PASS, including the four tan cases.

Then confirm the visual baselines are untouched: `npm run test:e2e:visual`. There is no Angle Explorer PNG baseline — only `graphing-calculator-approved.png`, `function-explorer-approved.png` and `transformation-explorer-approved.png` — so this change cannot require the Linux/Docker baseline regeneration. If it somehow reports a diff, stop and investigate rather than re-recording on macOS.

- [ ] **Step 9: Update `TODO.md` and `SUMMARY.md`**

Append the feature entry to `TODO.md` and the commit entry to `SUMMARY.md` in the formats those files already use. The `SUMMARY.md` entry must carry a **Bug Fix Context** line recording the root cause: the asymptotes were drawn in the gridlines' own colour at a third of their ink coverage, so they rendered fainter than the grid rather than distinct from it.

- [ ] **Step 10: Commit**

```bash
git add src/scripts/explorer/angle-wave.ts src/scripts/explorer/angle-wave.test.ts TODO.md SUMMARY.md
git commit -m "fix(explorer): make tan wave asymptotes read as asymptotes, not gridlines"
```

---

## Self-Review

**Spec coverage.** The design settled three things: restyle-only (Step 3), no legend change (absent from every step by design), no new palette entry (Global Constraints). All covered.

**Placeholder scan.** No TBDs. Every code step carries the literal code. Step 2 names the exact expected failure message.

**Type consistency.** No types change. `colors.wall` and `colors.axis` are both existing `ExplorerColors` fields, spelled identically in the test and the implementation.

**One gap worth flagging to the reviewer:** Step 2's second test is only *partially* red at the start — the width assertion already passes (1 > 0.75) and only the dasharray assertion fails. That is honest and expected, not a broken test; the width assertion exists to pin the relationship going forward, not to catch today's bug. The first test is the one that proves the defect.
