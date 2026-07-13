# Shared Live and Export Function Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Function Details in the interactive Graphing Calculator and Function Explorer, and guarantee interval-notation parity between every live surface and its export.

**Architecture:** A reusable live presentation component renders display-ready fact arrays. Graphing Calculator and Function Explorer each build one details model and pass the same facts to live UI and export snapshots. Transformation Explorer continues sharing `FunctionDetails`, with interval notation produced at its pure details source.

**Tech Stack:** TypeScript 6, React 19, Vitest 4, Playwright 1.61, Astro 7.

## Global Constraints

- Follow strict Red -> Green -> Refactor.
- Do not infer mathematical facts in React components.
- Live and export surfaces must consume identical fact strings.
- Domain and range use interval notation.
- Preserve global-domain/range confidence, explorer supplementary readouts, and TI-84 exclusion.
- Keep graph dimensions stable and allow long equations/interval unions to wrap.
- Update raster baselines only through the explicit approval workflow.

---

### Task 1: Transformation Interval Source

**Files:**
- Modify: `src/scripts/explorer/details.ts`
- Modify: `src/scripts/explorer/details.test.ts`
- Modify: `tests/e2e/transformation.spec.ts`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: `formatIntervalNotation(interval: Interval): string`.
- Produces: interval-formatted `FunctionDetails.domain` and `FunctionDetails.range` for both live and export consumers.

- [x] Change unit expectations for every interval shape and transformed parent case.
- [x] Run `npx vitest run src/scripts/explorer/details.test.ts` and verify inequality/prose failures.
- [x] Delegate `formatInterval` to `formatIntervalNotation` while preserving its public signature.
- [x] Rerun focused tests until green.
- [x] Add browser assertions comparing live and mounted-export parent/transformed interval text.
- [x] Run focused Transformation Playwright tests.
- [x] Append `SUMMARY.md` and commit `feat(details): use interval notation in transformations`.

### Task 2: Reusable Live Fact Presentation

**Files:**
- Create: `src/components/FunctionDetailsPanels.tsx`
- Create: `src/components/FunctionDetailsPanels.test.tsx`
- Modify: `SUMMARY.md`

**Interfaces:**
- Produces: `FunctionDetailsPanelEntry` with `id`, `title`, optional `color`, and `facts`.
- Produces: `FunctionDetailsPanels({ entries, testId })` returning `null` for no entries.
- Consumes: `ExportFact[]` display-ready values without mathematical transformation.

- [x] Write static-render tests for empty output, semantic heading/list relationships, stable IDs, equation color, and long-value wrapping.
- [x] Run the focused test and verify the missing-component failure.
- [x] Implement compact repeated sections using existing `Card`, semantic definition lists, `overflowWrap: anywhere`, and a 4px color border.
- [x] Rerun the focused test and Astro diagnostics until green.
- [x] Append `SUMMARY.md` and commit `feat(details): add live function detail panels`.

### Task 3: Graphing Live/Export Parity

**Files:**
- Modify: `src/components/graphing/GraphingCalculator.tsx`
- Modify: `tests/e2e/graphing.spec.ts`
- Modify: `SUMMARY.md`

**Interfaces:**
- Produces one local `buildEquationDetails(equations, window)` result reused by live rendering and snapshot sections.
- Consumes: `analyzeFunction`, `functionAnalysisFacts`, and `FunctionDetailsPanels`.

- [x] Add failing browser tests: no live panel before plotting; `x^2` live/export parity; `1/x^2` exact global parity; multiple-equation color ownership.
- [x] Run focused Graphing tests and verify the live-panel failures.
- [x] Memoize details on equations/display window and render immediately below the graph.
- [x] Reuse the same builder in `createExportSnapshot`.
- [x] Run focused unit, Astro, and Graphing browser tests until green.
- [x] Append `SUMMARY.md` and commit `feat(graphing): show live function details`.

### Task 4: Function Explorer Live/Export Parity

**Files:**
- Modify: `src/components/explorer/FunctionExplorer.tsx`
- Modify: `tests/e2e/explorer.spec.ts`
- Modify: `SUMMARY.md`

**Interfaces:**
- Produces one local details-entry builder reused for live UI and export.
- Consumes: `analyzeFunction`, `functionAnalysisFacts`, `explorerColors`, and `FunctionDetailsPanels`.

- [x] Add failing browser tests: no details before plotting; `1/x^2` live/export fact parity; Current Readout and end-behavior sections remain exported.
- [x] Run focused Function Explorer tests and verify missing live/export detail failures.
- [x] Memoize live analysis on expression/display window and render below the graph.
- [x] Add the same fact entry to export sections without removing supplementary sections.
- [x] Run focused unit, Astro, and Function Explorer browser tests until green.
- [x] Append `SUMMARY.md` and commit `feat(explorer): share live and exported function details`.

### Task 5: Visual Approval and Completion

**Files:**
- Modify: `tests/e2e/__snapshots__/export-visual.spec.ts/function-explorer-approved.png`
- Modify: `tests/e2e/__snapshots__/export-visual.spec.ts/transformation-explorer-approved.png`
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`
- Modify: `docs/superpowers/specs/2026-07-12-shared-live-export-function-details-design.md`
- Modify: `docs/superpowers/plans/2026-07-12-shared-live-export-function-details.md`

- [ ] Run read-only visual tests and identify only intentional Function/Transformation export changes.
- [ ] Run explicit snapshot update, inspect every changed PNG, then rerun read-only visual tests 3/3.
- [ ] Document live details and interval parity in README.
- [ ] Run `npm run test:coverage`, remove `coverage/`, `npx astro check`, `npm run build`, `npm run test:e2e`, and `npm audit --omit=dev`.
- [ ] Mark spec/TODO/plan complete with exact results and append `SUMMARY.md`.
- [ ] Commit `docs(details): record live and export parity verification`.
- [ ] Push `feature/graph-result-export`; verify clean status and matching local/upstream SHA.
