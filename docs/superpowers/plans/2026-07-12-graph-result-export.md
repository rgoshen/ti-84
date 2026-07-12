# Graph Result Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-file PNG and PDF exports for the Graphing Calculator, Function Explorer, and Transformation Explorer while excluding the TI-84 and all interactive controls.

**Architecture:** Each tool snapshots its current state into a shared read-only artifact model and supplies a callback that renders the graph with the existing renderer into a fixed 960 x 560 off-screen target. A shared controller renders the 1,440px light artifact, captures it once with `html-to-image`, and either downloads the PNG or embeds the identical image in a custom-size one-page PDF through `jsPDF`.

**Tech Stack:** Astro 7, React 19, TypeScript 6, Tailwind CSS 4, Radix Dropdown Menu, function-plot, html-to-image 1.11.13, jsPDF 4.2.1, Vitest, Playwright.

## Global Constraints

- Follow strict Red -> Green -> Refactor for every behavior change.
- Support only the Graphing Calculator, Function Explorer, and Transformation Explorer; do not add export UI to the TI-84.
- Produce exactly one file per action in `png` or `pdf` format.
- Render every artifact at 1,440 CSS pixels wide with a 960 x 560 graph region and PNG pixel ratio 1.
- Always use the light export palette, independent of the application theme.
- Snapshot state before rendering; live animation, zoom, and edits cannot mutate an in-progress artifact.
- Disable export above 201 whole-number-x rows and never truncate rows silently.
- Keep all artifact content read-only and exclude navigation, controls, hover UI, and animation UI.
- Pin all dependency versions and preserve at least 80% changed-code coverage.

---

## File Structure

- Create `src/scripts/export/model.ts`: pure types, dimensions, eligibility, filename, and display formatting.
- Create `src/scripts/export/model.test.ts`: unit coverage for every pure export rule.
- Create `src/scripts/export/download.ts`: DOM capture and dependency-injected PNG/PDF download boundary.
- Create `src/scripts/export/download.test.ts`: adapter orchestration tests without canvas or browser downloads.
- Create `src/components/export/ExportArtifact.tsx`: fixed light, read-only artifact shell.
- Create `src/components/export/ExportArtifact.test.tsx`: static-markup assertions for dimensions/content/control exclusion.
- Create `src/components/export/GraphResultExport.tsx`: accessible menu, snapshot lifecycle, busy/error state, and off-screen mount.
- Create `src/components/ui/dropdown-menu.tsx`: local shadcn-style Radix menu primitive.
- Modify the three plot renderers only to accept an optional height while retaining current defaults.
- Modify each tool component to build its own immutable snapshot and render its own domain-specific graph through the shared controller.
- Modify the three existing Playwright specs for real file download coverage and mobile/dark invariants.
- Modify `README.md`, `TODO.md`, and `SUMMARY.md` after verification.

---

### Task 1: Pure Export Contract and Dependency Pins

**Files:**
- Create: `src/scripts/export/model.test.ts`
- Create: `src/scripts/export/model.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `ExportFormat`, `ExportToolSlug`, `ExportArtifactModel`, `ExportGraphRenderer`, `ExportSnapshot`, `exportEligibility`, `exportFilename`, `formatExportValue`, and fixed dimension constants.

- [ ] **Step 1: Write the failing model tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_WIDTH,
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  MAX_EXPORT_ROWS,
  exportEligibility,
  exportFilename,
  formatExportValue,
} from './model';

describe('graph export model', () => {
  it('pins audited export dimensions', () => {
    expect({ ARTIFACT_WIDTH, EXPORT_GRAPH_WIDTH, EXPORT_GRAPH_HEIGHT, MAX_EXPORT_ROWS })
      .toEqual({ ARTIFACT_WIDTH: 1440, EXPORT_GRAPH_WIDTH: 960, EXPORT_GRAPH_HEIGHT: 560, MAX_EXPORT_ROWS: 201 });
  });

  it('rejects empty and oversized exports without truncating', () => {
    expect(exportEligibility(false, 1)).toEqual({ enabled: false, reason: 'Graph something before exporting.' });
    expect(exportEligibility(true, 201)).toEqual({ enabled: true, reason: null });
    expect(exportEligibility(true, 202)).toEqual({
      enabled: false,
      reason: 'Narrow the x window to 201 whole-number values or fewer.',
    });
  });

  it('builds fixed, input-free filenames', () => {
    expect(exportFilename('function-explorer', 'png', new Date('2026-07-12T19:00:00Z')))
      .toBe('function-explorer-2026-07-12.png');
  });

  it('formats missing and finite table values consistently', () => {
    expect(formatExportValue(null)).toBe('-');
    expect(formatExportValue(1.23456789)).toBe('1.234568');
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm test -- src/scripts/export/model.test.ts`

Expected: FAIL because `./model` does not exist.

- [ ] **Step 3: Implement the minimum pure contract**

```ts
import type { Window2D } from '@/scripts/graphing/math';

export const ARTIFACT_WIDTH = 1440;
export const EXPORT_GRAPH_WIDTH = 960;
export const EXPORT_GRAPH_HEIGHT = 560;
export const MAX_EXPORT_ROWS = 201;

export type ExportFormat = 'png' | 'pdf';
export type ExportToolSlug = 'graphing-calculator' | 'function-explorer' | 'transformation-explorer';

export interface ExportLegendItem { label: string; color: string; detail?: string; }
export interface ExportFact { label: string; value: string; }
export interface ExportSection { title: string; facts: ExportFact[]; }
export interface ExportTable { title: string; headers: string[]; rows: string[][]; }

export interface ExportArtifactModel {
  slug: ExportToolSlug;
  title: string;
  exportedAt: string;
  window: Window2D;
  legend: ExportLegendItem[];
  sections: ExportSection[];
  table: ExportTable;
}

export type ExportGraphRenderer = (target: HTMLElement) => void;
export interface ExportSnapshot { model: ExportArtifactModel; renderGraph: ExportGraphRenderer; }

export function exportEligibility(hasGraph: boolean, rowCount: number): { enabled: boolean; reason: string | null } {
  if (!hasGraph) return { enabled: false, reason: 'Graph something before exporting.' };
  if (rowCount > MAX_EXPORT_ROWS) return { enabled: false, reason: 'Narrow the x window to 201 whole-number values or fewer.' };
  return { enabled: true, reason: null };
}

export function exportFilename(slug: ExportToolSlug, format: ExportFormat, now: Date): string {
  return `${slug}-${now.toISOString().slice(0, 10)}.${format}`;
}

export function formatExportValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return String(Math.round(value * 1e6) / 1e6);
}
```

- [ ] **Step 4: Pin the audited dependencies**

Run: `npm install --save-exact html-to-image@1.11.13 jspdf@4.2.1`

Expected: `package.json` and `package-lock.json` contain exact versions.

- [ ] **Step 5: Run GREEN verification**

Run: `npm test -- src/scripts/export/model.test.ts`

Expected: PASS.

- [ ] **Step 6: Append `SUMMARY.md`, stage, and commit**

```bash
git add package.json package-lock.json src/scripts/export/model.ts src/scripts/export/model.test.ts SUMMARY.md
git commit -m "feat(export): define graph artifact contract"
```

---

### Task 2: Dependency-Injected PNG and PDF Downloads

**Files:**
- Create: `src/scripts/export/download.test.ts`
- Create: `src/scripts/export/download.ts`

**Interfaces:**
- Consumes: `ARTIFACT_WIDTH`, `ExportFormat`, `ExportToolSlug`, `exportFilename`.
- Produces: `ExportDependencies`, `downloadExportArtifact(node, format, slug, now, dependencies?)`.

- [ ] **Step 1: Write failing adapter tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { downloadExportArtifact, type ExportDependencies } from './download';

describe('downloadExportArtifact', () => {
  const node = { scrollHeight: 900 } as HTMLElement;

  it('captures and saves one PNG with audited dimensions', async () => {
    const dependencies: ExportDependencies = {
      toPng: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      savePng: vi.fn(),
      savePdf: vi.fn(),
    };
    await downloadExportArtifact(node, 'png', 'graphing-calculator', new Date('2026-07-12'), dependencies);
    expect(dependencies.toPng).toHaveBeenCalledWith(node, expect.objectContaining({ width: 1440, height: 900, pixelRatio: 1 }));
    expect(dependencies.savePng).toHaveBeenCalledWith('data:image/png;base64,abc', 'graphing-calculator-2026-07-12.png');
    expect(dependencies.savePdf).not.toHaveBeenCalled();
  });

  it('embeds the identical capture in one PDF', async () => {
    const dependencies: ExportDependencies = {
      toPng: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      savePng: vi.fn(),
      savePdf: vi.fn(),
    };
    await downloadExportArtifact(node, 'pdf', 'function-explorer', new Date('2026-07-12'), dependencies);
    expect(dependencies.savePdf).toHaveBeenCalledWith('data:image/png;base64,abc', 1440, 900, 'function-explorer-2026-07-12.pdf');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/scripts/export/download.test.ts`

Expected: FAIL because `./download` does not exist.

- [ ] **Step 3: Implement capture and lazy browser adapters**

```ts
import { ARTIFACT_WIDTH, exportFilename, type ExportFormat, type ExportToolSlug } from './model';

export interface CaptureOptions { width: number; height: number; canvasWidth: number; canvasHeight: number; pixelRatio: number; backgroundColor: string; }
export interface ExportDependencies {
  toPng(node: HTMLElement, options: CaptureOptions): Promise<string>;
  savePng(dataUrl: string, filename: string): void;
  savePdf(dataUrl: string, width: number, height: number, filename: string): Promise<void> | void;
}

const browserDependencies: ExportDependencies = {
  async toPng(node, options) { return (await import('html-to-image')).toPng(node, options); },
  savePng(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  },
  async savePdf(dataUrl, width, height, filename) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: width >= height ? 'landscape' : 'portrait', unit: 'px', format: [width, height], hotfixes: ['px_scaling'] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save(filename);
  },
};

export async function downloadExportArtifact(node: HTMLElement, format: ExportFormat, slug: ExportToolSlug, now = new Date(), dependencies = browserDependencies): Promise<void> {
  const height = node.scrollHeight;
  const dataUrl = await dependencies.toPng(node, { width: ARTIFACT_WIDTH, height, canvasWidth: ARTIFACT_WIDTH, canvasHeight: height, pixelRatio: 1, backgroundColor: '#f8fafc' });
  const filename = exportFilename(slug, format, now);
  if (format === 'png') dependencies.savePng(dataUrl, filename);
  else await dependencies.savePdf(dataUrl, ARTIFACT_WIDTH, height, filename);
}
```

- [ ] **Step 4: Run GREEN and refactor**

Run: `npm test -- src/scripts/export/download.test.ts src/scripts/export/model.test.ts`

Expected: PASS.

- [ ] **Step 5: Append `SUMMARY.md` and commit**

```bash
git add src/scripts/export/download.ts src/scripts/export/download.test.ts SUMMARY.md
git commit -m "feat(export): add png and pdf download adapters"
```

---

### Task 3: Shared Read-Only Artifact and Accessible Controller

**Files:**
- Create: `src/components/export/ExportArtifact.test.tsx`
- Create: `src/components/export/ExportArtifact.tsx`
- Create: `src/components/export/GraphResultExport.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`

**Interfaces:**
- Consumes: `ExportArtifactModel`, `ExportSnapshot`, `ExportFormat`, fixed dimensions, `exportEligibility`, and `downloadExportArtifact`.
- Produces: `<ExportArtifact model artifactRef graphRef />` and `<GraphResultExport hasGraph rowCount createSnapshot />`.

- [ ] **Step 1: Write the failing static-markup test**

Use `renderToStaticMarkup` to render a representative artifact. Assert the HTML contains `width:1440px`, a `width:960px;height:560px` graph target, title, legend, facts, and table rows. Assert it contains no `<button`, `<input`, `<select`, or navigation landmark.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/components/export/ExportArtifact.test.tsx`

Expected: FAIL because `ExportArtifact` does not exist.

- [ ] **Step 3: Implement the fixed artifact shell**

Build `ExportArtifact.tsx` with explicit light hex colors rather than theme tokens. Use this structure:

```tsx
<article ref={artifactRef} data-testid="export-artifact" aria-hidden="true" style={{ width: ARTIFACT_WIDTH, background: '#f8fafc', color: '#172033', padding: 40 }}>
  <header>{model.title}{model.exportedAt}{window summary}</header>
  <div style={{ display: 'grid', gridTemplateColumns: `${EXPORT_GRAPH_WIDTH}px 1fr` }}>
    <div ref={graphRef} data-testid="export-graph" style={{ width: EXPORT_GRAPH_WIDTH, height: EXPORT_GRAPH_HEIGHT }} />
    <aside>{legend and sections}</aside>
  </div>
  <table>{all headers and rows}</table>
</article>
```

Do not include controls, `dangerouslySetInnerHTML`, theme classes, or user-derived HTML.

- [ ] **Step 4: Add the local Radix dropdown primitive**

Wrap `DropdownMenu.Root`, `Trigger`, `Portal`, `Content`, and `Item` from `radix-ui`, following the repository's existing shadcn class conventions. Preserve forwarded refs and visible focus styles.

- [ ] **Step 5: Implement the controller lifecycle**

`GraphResultExport` must:

1. Compute `exportEligibility(hasGraph, rowCount)`.
2. Snapshot synchronously inside `requestAnimationFrame` after a PNG/PDF menu selection.
3. Mount `ExportArtifact` fixed at `left: -100000px`, not `display:none`.
4. Call `snapshot.renderGraph(graphRef.current)` once, await `document.fonts.ready` and two animation frames, then call `downloadExportArtifact`.
5. Set an `aria-live="polite"` status to `Preparing PNG...`, `Preparing PDF...`, success, or `Could not export this graph. Try again.`
6. Clear the snapshot in `finally`, preventing duplicate requests while busy.
7. Render a `Download` icon in the trigger and `FileImage` / `FileText` icons in menu items from `lucide-react`.

Required prop contract:

```ts
interface GraphResultExportProps {
  hasGraph: boolean;
  rowCount: number;
  createSnapshot: () => ExportSnapshot;
}
```

- [ ] **Step 6: Run unit and type verification**

Run: `npm test -- src/components/export/ExportArtifact.test.tsx src/scripts/export`

Run: `npm run astro -- check`

Expected: PASS and zero type errors.

- [ ] **Step 7: Append `SUMMARY.md` and commit**

```bash
git add src/components/export src/components/ui/dropdown-menu.tsx SUMMARY.md
git commit -m "feat(export): add read-only artifact controller"
```

---

### Task 4: Fixed-Height Export Rendering and Graphing Calculator Integration

**Files:**
- Modify: `src/scripts/graphing/plot.ts`
- Modify: `src/scripts/explorer/render.ts`
- Modify: `src/scripts/explorer/transform-render.ts`
- Modify: `src/components/graphing/GraphingCalculator.tsx`
- Modify: `tests/e2e/graphing.spec.ts`

**Interfaces:**
- Renderer options gain `height?: number`; existing interactive defaults remain 560/480/480.
- Graphing Calculator consumes `<GraphResultExport>` and supplies an immutable `ExportSnapshot`.

- [ ] **Step 1: Write a failing Graphing Calculator download test**

Plot `x^2`, open Export, download PNG, and assert the suggested filename matches `graphing-calculator-YYYY-MM-DD.png`. Read the download and assert the PNG signature bytes `89504e470d0a1a0a` plus IHDR width 1440. Add a PDF case asserting `%PDF-` and `.pdf`. Assert Export is disabled before an equation is plotted and above the 201-row boundary.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/e2e/graphing.spec.ts --grep "export"`

Expected: FAIL because the Export menu does not exist.

- [ ] **Step 3: Add optional renderer heights**

Add `height?: number` to `RenderGraphOptions`, `RenderExplorerOptions`, and `TransformRenderOptions`. Destructure `height = PLOT_HEIGHT` and pass `height` to `functionPlot`. Existing callers require no changes.

- [ ] **Step 4: Build the Graphing Calculator snapshot**

Inside `GraphingCalculator`, create a callback that copies `equations`, `displayWindow`, and all table values into strings. Its `renderGraph(target)` calls:

```ts
renderGraph({
  target,
  window: snapshotWindow,
  equations: snapshotEquations,
  dark: false,
  height: EXPORT_GRAPH_HEIGHT,
  onViewChange: () => {},
});
```

Add `<GraphResultExport hasGraph={equations.length > 0} rowCount={tableXs.length} createSnapshot={createExportSnapshot} />` above the plot/table column. Use the concrete equation text, per-equation marker setting, current display window, and complete value table.

- [ ] **Step 5: Run GREEN and regression checks**

Run: `npx playwright test tests/e2e/graphing.spec.ts --grep "export"`

Run: `npm test && npm run astro -- check`

Expected: export tests pass and existing units remain green.

- [ ] **Step 6: Append `SUMMARY.md` and commit**

```bash
git add src/scripts/graphing/plot.ts src/scripts/explorer/render.ts src/scripts/explorer/transform-render.ts src/components/graphing/GraphingCalculator.tsx tests/e2e/graphing.spec.ts SUMMARY.md
git commit -m "feat(graphing): export graph results"
```

---

### Task 5: Function Explorer Export

**Files:**
- Modify: `src/components/explorer/FunctionExplorer.tsx`
- Modify: `tests/e2e/explorer.spec.ts`

**Interfaces:**
- Consumes: shared export model/controller and `renderExplorer(... height: 560, dark: false)`.
- Produces: exact Function Explorer readout, asymptote/end behavior, guide settings, and value table in one artifact.

- [ ] **Step 1: Write failing Function Explorer tests**

Cover: disabled Export before plotting; PNG signature and filename after plotting `1/x^2`; dark application still produces a 1440px PNG; x window with 202 integer values disables export with the audited message; starting a limit animation and immediately exporting preserves one snapshot rather than changing content during capture.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/e2e/explorer.spec.ts --grep "export"`

Expected: FAIL because the Export menu does not exist.

- [ ] **Step 3: Build the immutable Function Explorer snapshot**

Copy `expr`, `displayWindow`, `x`, `readout`, `asymptotes`, `endNeg`, `endPos`, guides, marker settings, points, and table values before returning the snapshot. `renderGraph` calls `renderExplorer` with a `getScene` closure over only copied values, `dark:false`, `height:560`, `sweepTrail:null`, and no-op `onViewChange`.

Format each vertical asymptote with its x-position and left/right behavior; label finite tails as horizontal asymptotes and explicitly label infinite/unknown tails. Do not include animation buttons or active sweep trails.

- [ ] **Step 4: Run GREEN and regression checks**

Run: `npx playwright test tests/e2e/explorer.spec.ts --grep "export"`

Run: `npm test && npm run astro -- check`

Expected: PASS.

- [ ] **Step 5: Append `SUMMARY.md` and commit**

```bash
git add src/components/explorer/FunctionExplorer.tsx tests/e2e/explorer.spec.ts SUMMARY.md
git commit -m "feat(explorer): export function results"
```

---

### Task 6: Transformation Explorer Export and TI-84 Exclusion

**Files:**
- Modify: `src/components/explorer/TransformationExplorer.tsx`
- Modify: `tests/e2e/transformation.spec.ts`
- Modify: `tests/e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: shared export model/controller and `renderTransform(... height: 560, dark: false)`.
- Produces: transformation equation, coefficients, steps, details, settings, and value table in one artifact.

- [ ] **Step 1: Write failing Transformation/TI-84 tests**

Download a PNG from the default transformation, assert signature/width/filename, then change `h` and assert an export still downloads. Add a navigation test that `/ti-84` contains no button named Export and no Download PNG/PDF menu items.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/e2e/transformation.spec.ts tests/e2e/navigation.spec.ts --grep "export|TI-84"`

Expected: transformation export test fails; TI-84 exclusion already passes and guards against accidental shared-page insertion.

- [ ] **Step 3: Build the immutable Transformation snapshot**

Copy `baseExpr`, `parentLabel`, `coeffs`, `equation`, `readout.steps`, `displayWindow`, current details, settings, points, and table values. `renderGraph` calls `renderTransform` with copied inputs, `dark:false`, `height:560`, and no-op `onViewChange`.

State marker visibility as shared; when `showParent` is false, state that parent markers are suppressed. For custom functions, preserve the existing honest “details unavailable” behavior.

- [ ] **Step 4: Run GREEN and regression checks**

Run: `npx playwright test tests/e2e/transformation.spec.ts tests/e2e/navigation.spec.ts --grep "export|TI-84"`

Run: `npm test && npm run astro -- check`

Expected: PASS.

- [ ] **Step 5: Append `SUMMARY.md` and commit**

```bash
git add src/components/explorer/TransformationExplorer.tsx tests/e2e/transformation.spec.ts tests/e2e/navigation.spec.ts SUMMARY.md
git commit -m "feat(explorer): export transformation results"
```

---

### Task 7: Full Verification, Visual QA, and Documentation

**Files:**
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`

- [ ] **Step 1: Run all automated gates**

```bash
npm test
npm run astro -- check
npm run build
npm run test:e2e
```

Expected: all unit tests, type checks, build pages, and Playwright tests pass.

- [ ] **Step 2: Run changed-code coverage**

Run: `npx vitest run --coverage`

Expected: at least 80% coverage for changed pure export modules. If the coverage provider is unavailable, add the pinned provider required by Vitest and rerun; do not report coverage without evidence.

- [ ] **Step 3: Visually inspect actual exports**

Start the dev server on an unused port, export all three tools in dark application mode from 1,440x1,000 and 390x844 browser viewports, and inspect the PNG files. Confirm light background, 1,440px width, 960x560 graph, no controls, readable legends/tables, and identical desktop proportions from both viewport sizes.

- [ ] **Step 4: Update documentation**

Add README usage text under the tool description: plot a result, open Export, choose PNG or PDF; note the 201-row window limit and TI-84 exclusion. Mark the TODO feature Done with exact verification counts. Append the final SUMMARY entry before committing.

- [ ] **Step 5: Run final diff and regression checks**

```bash
git diff --check
git status --short
npm test
npm run astro -- check
npm run build
npm run test:e2e
```

Expected: clean checks; only intentional feature files remain modified.

- [ ] **Step 6: Commit final documentation**

```bash
git add README.md TODO.md SUMMARY.md
git commit -m "docs(export): document graph result downloads"
```

---

## Plan Self-Review

- Spec coverage: every supported tool, format, dimension, theme, content rule, error state, row boundary, animation snapshot, TI-84 exclusion, and verification gate maps to a task above.
- Placeholder scan: no implementation placeholder or unresolved behavior remains.
- Type consistency: all tasks consume the `ExportSnapshot` / `ExportArtifactModel` contracts defined in Task 1 and the `GraphResultExport` prop contract defined in Task 3.
- Scope: the plan does not add CSV/JSON/SVG, session persistence, multi-page PDFs, or tool downloads.
