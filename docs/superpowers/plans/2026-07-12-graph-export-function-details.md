# Graph Export Function Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace viewport-summary export panels with reliable per-equation mathematical Function Details.

**Architecture:** A pure graph-analysis module returns typed property states (`exact`, `approximate`, `not-applicable`, or `not-determined`). Exact analyzers recognize curated parents and degree-two-or-lower polynomials; a deterministic numerical fallback reuses existing evaluation, bisection, asymptote, and end-behavior helpers. The Graphing Calculator maps each result to a color-coded export section without embedding analysis policy in React.

**Tech Stack:** TypeScript 6, mathjs 15, Vitest 4, React 19, Playwright 1.61.

## Global Constraints

- Follow strict Red -> Green -> Refactor.
- Produce one analysis section per plotted equation, preserving its curve color.
- Never display an approximate value without `Approx.`.
- Scope numerical domain, range, intercept, and vertical-asymptote claims to the visible window.
- Omit `not-applicable`; display `Not determined` for unresolved properties.
- Preserve the fixed 1,440px artifact and 960x560 graph.
- Regenerate approved raster baselines only through the explicit update command.

---

### Task 1: Pure Exact and Approximate Analysis

**Files:**
- Create: `src/scripts/graphing/analysis.ts`
- Create: `src/scripts/graphing/analysis.test.ts`

**Interfaces:**
- Produces: `analyzeFunction(expr: string, window: Window2D): FunctionAnalysis`.
- Produces: `functionAnalysisFacts(analysis: FunctionAnalysis): Array<{ label: string; value: string }>`.
- Consumes: `evalAt`, `bisect`, `findVerticalAsymptotes`, `classifyEndBehavior`, and curated `PARENTS` metadata.

- [x] Write failing tests for `x^2`, `1/x`, `(x - 2)^2 - 4`, `1/(x - 2)`, and `sin(x^2)`.
- [x] Run `npx vitest run src/scripts/graphing/analysis.test.ts` and verify failure because the module is absent.
- [x] Implement typed result states, curated-parent matching, and AST polynomial coefficient extraction.
- [x] Implement deterministic visible-window sampling, root bisection, asymptote reuse, and result-to-fact mapping.
- [x] Rerun the focused test and the complete Vitest suite until green.
- [x] Append `SUMMARY.md` and commit with `feat(export): analyze graph function details`.

### Task 2: Per-Equation Export Integration

**Files:**
- Modify: `src/scripts/export/model.ts`
- Modify: `src/components/export/ExportArtifact.tsx`
- Modify: `src/components/export/ExportArtifact.test.ts`
- Modify: `src/components/graphing/GraphingCalculator.tsx`
- Modify: `tests/e2e/graphing.spec.ts`

**Interfaces:**
- `ExportSection` gains optional `color?: string`.
- `InformationSection` renders the section color without changing uncolored explorer panels.
- Graphing snapshots call `analyzeFunction` once per immutable equation snapshot.

- [x] Add failing static and browser assertions for color-coded per-equation Function Details and removal of `Graph information`.
- [x] Run focused tests and confirm the expected missing-section/color failures.
- [x] Add optional section color rendering and map analysis facts beside each equation.
- [x] Run focused unit and Playwright tests until green.
- [x] Append `SUMMARY.md` and commit the mathematical Function Details integration.

### Task 3: Prototype, Baselines, and Verification

**Files:**
- Create: `.superpowers/brainstorm/<active-session>/content/function-details-v4.html` (ignored prototype)
- Modify: `tests/e2e/export-visual.spec.ts`
- Modify: `tests/e2e/__snapshots__/export-visual.spec.ts/graphing-calculator-approved.png`
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`

- [x] Push an updated content-only browser prototype showing color-coded mathematical details.
- [x] Run the read-only visual test and inspect the expected Graphing change plus deterministic text-raster diffs in the unchanged explorer artifacts.
- [x] Run `npm run test:e2e:update-snapshots`, visually inspect all generated baselines, then rerun the read-only visual suite.
- [x] Run coverage, Astro check, production build, all Playwright tests, and `npm audit --omit=dev`.
- [x] Complete a spec-gap audit, resolve its confidence and ownership findings, and rerun all verification gates.
- [x] Mark TODO Done with exact evidence, append `SUMMARY.md`, commit documentation, and push the branch.
