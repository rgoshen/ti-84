# Export Interval Notation and Local Timestamps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Graphing Calculator export domains and ranges with mathematically correct interval notation and append the user's local date and time through seconds to every supported download filename.

**Architecture:** A focused interval-notation module formats the existing structured `Interval` type and visible-window numeric intervals without parsing display strings. The graph-analysis module owns confidence and chooses exact, approximate, or singleton output. The existing pure filename formatter reads local `Date` fields and remains shared by all three export controllers.

**Tech Stack:** TypeScript 6, React 19, mathjs 15, Vitest 4, Playwright 1.61, Astro 7.

## Global Constraints

- Follow strict Red -> Green -> Refactor.
- Scope interval notation to Graphing Calculator export Function Details.
- Preserve interactive Transformation Explorer inequality notation.
- Preserve intercept, asymptote, omission, and `Not determined` behavior.
- Prefix numerical results `Approx.` and suffix them `in visible window`.
- Format filenames as `<tool-slug>-YYYY-MM-DD-HHmmss.<format>` from local calendar fields.
- Keep TI-84 excluded from exports.
- Update approved raster baselines only through the explicit snapshot command.

---

### Task 1: Structured Interval Notation

**Files:**
- Create: `src/scripts/graphing/interval-notation.ts`
- Create: `src/scripts/graphing/interval-notation.test.ts`
- Modify: `src/scripts/graphing/analysis.ts`
- Modify: `src/scripts/graphing/analysis.test.ts`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: `Interval` from `src/scripts/explorer/parents.ts`, `Window2D`, and `formatNumber`.
- Produces: `formatIntervalNotation(interval: Interval): string`.
- Produces: `formatClosedInterval(lo: number, hi: number): string`.
- Produces: `formatVisibleDomainInterval(window: Window2D, exclusions: number[]): string`.

- [x] **Step 1: Write failing formatter tests**

Add tests covering the complete structured interval vocabulary:

```ts
expect(formatIntervalNotation({ kind: 'all' })).toBe('(-∞, ∞)');
expect(formatIntervalNotation({ kind: 'bound', value: 0, dir: 'ge', strict: false })).toBe('[0, ∞)');
expect(formatIntervalNotation({ kind: 'bound', value: 2, dir: 'ge', strict: true })).toBe('(2, ∞)');
expect(formatIntervalNotation({ kind: 'bound', value: 3, dir: 'le', strict: false })).toBe('(-∞, 3]');
expect(formatIntervalNotation({ kind: 'exclude', value: 0 })).toBe('(-∞, 0) ∪ (0, ∞)');
expect(formatIntervalNotation({ kind: 'between', lo: -1, hi: 1 })).toBe('[-1, 1]');
expect(formatVisibleDomainInterval(WINDOW, [2])).toBe('[-4, 2) ∪ (2, 4]');
expect(formatClosedInterval(-0.9998, 1)).toBe('[-1, 1]');
```

- [x] **Step 2: Run the formatter test and verify RED**

Run: `npx vitest run src/scripts/graphing/interval-notation.test.ts`

Expected: FAIL because `interval-notation.ts` does not exist.

- [x] **Step 3: Implement the pure formatter**

Create exhaustive `switch` formatting over `Interval`. Sort and de-duplicate visible
exclusions, retain closed brackets at visible window edges, use open parentheses at
excluded asymptotes, and join multiple pieces with ` ∪ `.

- [x] **Step 4: Run the formatter test and verify GREEN**

Run: `npx vitest run src/scripts/graphing/interval-notation.test.ts`

Expected: all interval formatter tests pass.

- [x] **Step 5: Write failing graph-analysis expectations**

Update analysis tests to require:

```ts
expect(analyzeFunction('x^2', WINDOW).domain).toMatchObject({ value: '(-∞, ∞)' });
expect(analyzeFunction('x^2', WINDOW).range).toMatchObject({ value: '[0, ∞)' });
expect(analyzeFunction('1/x', WINDOW).domain)
  .toMatchObject({ value: '(-∞, 0) ∪ (0, ∞)' });
expect(analyzeFunction('sin(x)', WINDOW).range).toMatchObject({ value: '[-1, 1]' });
expect(analyzeFunction('3', WINDOW).range).toMatchObject({ value: '{3}' });
expect(analyzeFunction('1/(x - 2)', WINDOW).domain)
  .toMatchObject({ value: '[-4, 2) ∪ (2, 4] in visible window' });
```

Also require sampled range to match `[...] in visible window` and preserve existing
intercept/asymptote facts.

- [x] **Step 6: Run analysis tests and verify RED**

Run: `npx vitest run src/scripts/graphing/analysis.test.ts`

Expected: failures show the existing prose/inequality domain and range values.

- [x] **Step 7: Integrate interval notation into graph analysis**

For curated parents, format `parent.props.domain` and `parent.props.range` directly,
while retaining `parentDetails(parent)` for intercepts and asymptotes. For polynomials:

```ts
const domain = EXACT('(-∞, ∞)');
const linearRange = EXACT('(-∞, ∞)');
const constantRange = formattedPolynomialValue(c, `{${formatNumber(c)}}`);
const quadraticRange = a > 0
  ? `[${formatNumber(vertexY)}, ∞)`
  : `(-∞, ${formatNumber(vertexY)}]`;
```

For numerical fallback, use `formatVisibleDomainInterval` with detected vertical
asymptotes and `formatClosedInterval` with sampled y-extrema, retaining `Approx.` and
`in visible window` through the existing fact mapper.

- [x] **Step 8: Run focused and complete unit tests**

Run: `npx vitest run src/scripts/graphing/interval-notation.test.ts src/scripts/graphing/analysis.test.ts`

Then run: `npm run test:coverage`

Expected: all tests pass and changed-code aggregate coverage remains at least 80%.

- [x] **Step 9: Document and commit Task 1**

Append `SUMMARY.md`, remove generated `coverage/`, stage only Task 1 files, and commit:

```bash
git commit -m "feat(export): use interval notation for graph details"
```

---

### Task 2: Local Date-Time Filenames

**Files:**
- Modify: `src/scripts/export/model.ts`
- Modify: `src/scripts/export/model.test.ts`
- Modify: `src/scripts/export/download.test.ts`
- Modify: `tests/e2e/graphing.spec.ts`
- Modify: `tests/e2e/explorer.spec.ts`
- Modify: `tests/e2e/transformation.spec.ts`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: the existing `exportFilename(slug, format, now)` signature.
- Produces: local `YYYY-MM-DD-HHmmss` filename suffixes without changing download-controller APIs.

- [x] **Step 1: Write failing local-time filename tests**

Construct the date with local numeric components so the expected value is independent
of machine timezone:

```ts
const localNow = new Date(2026, 6, 12, 18, 15, 30);
expect(exportFilename('function-explorer', 'png', localNow))
  .toBe('function-explorer-2026-07-12-181530.png');
```

Update PNG/PDF dependency tests to use the same local date and exact filenames.

- [x] **Step 2: Run model and download tests and verify RED**

Run: `npx vitest run src/scripts/export/model.test.ts src/scripts/export/download.test.ts`

Expected: filename assertions fail because the current formatter emits only the UTC date.

- [x] **Step 3: Implement local zero-padded timestamp formatting**

Keep `exportFilename` pure and use local getters:

```ts
const pad2 = (value: number): string => String(value).padStart(2, '0');
const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
return `${slug}-${date}-${time}.${format}`;
```

- [x] **Step 4: Run model and download tests and verify GREEN**

Run: `npx vitest run src/scripts/export/model.test.ts src/scripts/export/download.test.ts`

Expected: all focused filename tests pass.

- [x] **Step 5: Update browser filename contracts**

Require `-YYYY-MM-DD-HHmmss` before `.png`/`.pdf` for every supported tool. In the
fixed-clock Graphing test, require the exact approved local timestamp when stable;
otherwise require the complete six-digit time component and rely on unit tests for
timezone semantics.

- [x] **Step 6: Run all export browser tests**

Run:

```bash
npx playwright test tests/e2e/graphing.spec.ts tests/e2e/explorer.spec.ts tests/e2e/transformation.spec.ts
```

Expected: all export workflow and filename assertions pass.

- [x] **Step 7: Document and commit Task 2**

Append `SUMMARY.md`, stage only timestamp-related files, and commit:

```bash
git commit -m "feat(export): timestamp downloads with local time"
```

---

### Task 3: Artifact Integration, Baselines, and Completion

**Files:**
- Modify: `src/components/export/ExportArtifact.test.ts`
- Modify: `tests/e2e/graphing.spec.ts`
- Modify: `tests/e2e/__snapshots__/export-visual.spec.ts/graphing-calculator-approved.png`
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`
- Modify: `docs/superpowers/specs/2026-07-12-export-interval-notation-local-timestamps-design.md`
- Modify: `docs/superpowers/plans/2026-07-12-export-interval-notation-local-timestamps.md`

**Interfaces:**
- Consumes: interval-formatted `FunctionAnalysisFact[]` and timestamped `exportFilename`.
- Produces: mounted-artifact and visual contracts for the final user-visible behavior.

- [ ] **Step 1: Add mounted-artifact interval assertions**

Require the Graphing export callback to contain `Domain(-∞, ∞)` and `Range[0, ∞)` for
`x^2`, while still omitting non-applicable asymptotes. Retain the fallback browser
test for `Approx.`, visible-window scope, and `Not determined`.

- [ ] **Step 2: Run the read-only visual suite and verify intentional failure scope**

Run: `npm run test:e2e:visual`

Expected: Graphing Calculator fails because visible notation changed. Untouched
explorer artifacts should remain unchanged; investigate before approving any shared
text-raster drift.

- [ ] **Step 3: Explicitly update and inspect raster baselines**

Run: `npm run test:e2e:update-snapshots`.

Inspect all three approved PNGs. Commit only explicitly reviewed baseline files;
actual/diff output under ignored `test-results/` remains untracked.

- [ ] **Step 4: Rerun the read-only visual suite**

Run: `npm run test:e2e:visual`

Expected: 3/3 pass without modifying tracked files.

- [ ] **Step 5: Update user and completion documentation**

Document interval notation and local timestamp examples in `README.md`. Mark the spec,
plan, and `TODO.md` entry complete with exact verification counts. Append the mandatory
`SUMMARY.md` commit record.

- [ ] **Step 6: Run the full completion gate**

Run each command and inspect its exit status:

```bash
npm run test:coverage
npx astro check
npm run build
npm run test:e2e
npm audit --omit=dev
```

Remove generated `coverage/` before the Astro check. Expected: all tests pass, aggregate
coverage is at least 80%, zero Astro errors/warnings/hints, six production pages build,
all browser and visual tests pass, and production audit reports zero vulnerabilities.

- [ ] **Step 7: Commit completion documentation**

```bash
git commit -m "docs(export): record notation and timestamp verification"
```

- [ ] **Step 8: Push and verify remote parity**

Push `feature/graph-result-export`, then confirm `git rev-parse HEAD` equals
`git rev-parse @{upstream}` and `git status --short --branch` is clean.
