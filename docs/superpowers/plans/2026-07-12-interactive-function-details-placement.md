# Interactive Function Details Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move each live Function Details region to its approved position in the left control column without changing exports or any other behavior.

**Architecture:** Keep all existing detail computation and presentation components intact. Change only JSX mount locations, and prove placement through DOM ancestry and immediate-sibling order assertions. Export builders remain untouched and read-only visual baselines must remain unchanged.

**Tech Stack:** Astro, React, TypeScript, Playwright, Vitest

## Global Constraints

- Graphing details follow Plotted equations.
- Function Explorer details follow Animate a limit.
- Transformation details follow Transform.
- Do not change export snapshots, mathematical facts, graph dimensions, or unrelated UI.

---

### Task 1: Move Interactive Detail Regions

**Files:**
- Modify: `tests/e2e/graphing.spec.ts`
- Modify: `tests/e2e/explorer.spec.ts`
- Modify: `tests/e2e/transformation.spec.ts`
- Modify: `src/components/graphing/GraphingCalculator.tsx`
- Modify: `src/components/explorer/FunctionExplorer.tsx`
- Modify: `src/components/explorer/TransformationExplorer.tsx`
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: existing `graphing-function-details`, `explorer-function-details`, and `function-details` test IDs.
- Produces: interactive DOM order matching the approved left-column placements.

- [ ] **Step 1: Write failing placement assertions**

For each tool, locate the named control card with `getByRole('heading', { name })`,
locate the details region, and evaluate:

```ts
const placement = await details.evaluate((node, headingName) => {
  const heading = [...document.querySelectorAll('h3')]
    .find((candidate) => candidate.textContent === headingName);
  const controlCard = heading?.closest('[data-slot="card"]');
  const detailsRegion = node.closest('section, [data-slot="card"]');
  return {
    sameColumn: controlCard?.parentElement === detailsRegion?.parentElement,
    immediatelyAfter: controlCard?.nextElementSibling === detailsRegion,
  };
}, 'Plotted equations');
expect(placement).toEqual({ sameColumn: true, immediatelyAfter: true });
```

Use `Animate a limit` for Function Explorer. For Transformation Explorer, use the
details table's closest card as `detailsRegion` and `Transform` as the heading.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx playwright test tests/e2e/graphing.spec.ts tests/e2e/explorer.spec.ts tests/e2e/transformation.spec.ts --grep "function details|exports a fixed light"
```

Expected: placement assertions fail because details currently live in the graph column.

- [ ] **Step 3: Move the existing JSX blocks**

In each component, remove the existing details block from below the graph and insert it
as a sibling immediately after the approved left-column card. Do not alter props,
content, analysis, or export code.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2.

Expected: all selected tests pass, including existing live/export content assertions.

- [ ] **Step 5: Verify exports and application diagnostics**

Run:

```bash
npx astro check
npm run test:e2e
npm run test:e2e:visual
```

Expected: zero Astro diagnostics, all Playwright tests pass, and all three existing
export baselines pass without updates.

- [ ] **Step 6: Document and commit**

Update README placement copy, mark TODO and this plan complete with exact results,
append SUMMARY, then commit:

```bash
git commit -m "fix(details): move live panels into control columns"
```

- [ ] **Step 7: Push and verify publication**

```bash
git push origin feature/graph-result-export
git status --short
git rev-parse HEAD
git rev-parse origin/feature/graph-result-export
```

Expected: clean status and matching local/upstream SHAs.
