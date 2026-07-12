# Export Raster Baselines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic golden-image comparisons for the actual PNG downloaded by each supported graph tool.

**Architecture:** A dedicated Playwright spec drives each canonical tool state, freezes the browser clock, downloads the real PNG through the existing export UI, and passes its bytes to Playwright's image snapshot matcher. Inter is bundled into the existing export surface so macOS development and Linux CI render the same font; approved snapshots use one platform-independent path and can change only through an explicit npm command.

**Tech Stack:** Astro 7, React 19, TypeScript 6, `@fontsource/inter`, Playwright 1.61, `html-to-image` 1.11.13.

## Global Constraints

- Follow strict Red -> Green -> Refactor.
- Cover Graphing Calculator, Function Explorer, and Transformation Explorer; exclude TI-84.
- Compare the actual downloaded PNG, not the live page or an intermediate screenshot.
- Freeze the canonical export date at July 12, 2026.
- Use a platform-independent snapshot path and a maximum 0.1% differing-pixel ratio.
- Never update snapshots during ordinary `npm run test:e2e` execution.
- Pin every added dependency and retain the existing semantic export assertions.

---

### Task 1: Deterministic Downloaded-PNG Snapshots

**Files:**
- Create: `tests/e2e/export-visual.spec.ts`
- Create: `tests/e2e/__snapshots__/export-visual.spec.ts/*.png`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/components/export/ExportArtifact.tsx`

**Interfaces:**
- Consumes: `downloadExport(page, 'PNG')` and `readDownload(download)` from `tests/e2e/export-helpers.ts`.
- Produces: `npm run test:e2e:visual` and `npm run test:e2e:update-snapshots`.

- [ ] **Step 1: Write the failing visual spec**

Create three independent tests in `tests/e2e/export-visual.spec.ts`. Each test starts with:

```ts
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-12T12:00:00-07:00'));
});
```

Drive the canonical state, download PNG, and compare bytes:

```ts
const png = await downloadExport(page, 'PNG');
expect(await readDownload(png)).toMatchSnapshot('graphing-calculator-approved.png', {
  maxDiffPixelRatio: 0.001,
});
```

Use the reported decimal regression window for Graphing, `1/x^2` for Function Explorer, and the default identity quadratic for Transformation Explorer.

- [ ] **Step 2: Run the visual spec and verify RED**

Run:

```bash
npx playwright test tests/e2e/export-visual.spec.ts
```

Expected: three failures stating that the approved snapshots do not exist. Playwright writes actual PNG evidence but does not create approved baselines.

- [ ] **Step 3: Pin and load Inter**

Run:

```bash
npm install --save-exact @fontsource/inter
```

Import regular, semibold, and bold Inter weights at the top of `ExportArtifact.tsx`:

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
```

Keep the existing `Inter`-first artifact font stack. Verify the installed package license is OFL-1.1 and the lockfile records one exact version.

- [ ] **Step 4: Configure stable snapshot paths and scripts**

Add to `playwright.config.ts`:

```ts
snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
```

Add these scripts to `package.json`:

```json
"test:e2e:visual": "playwright test tests/e2e/export-visual.spec.ts",
"test:e2e:update-snapshots": "playwright test tests/e2e/export-visual.spec.ts --update-snapshots"
```

- [ ] **Step 5: Generate and verify the approved baselines**

Run:

```bash
npm run test:e2e:update-snapshots
npm run test:e2e:visual
```

Expected: three baselines are written under `tests/e2e/__snapshots__/export-visual.spec.ts/`, then the read-only visual run passes 3/3 without modifying them.

- [ ] **Step 6: Commit the deterministic visual contract**

Append the mandatory `SUMMARY.md` entry, then run:

```bash
git add package.json package-lock.json playwright.config.ts src/components/export/ExportArtifact.tsx tests/e2e/export-visual.spec.ts tests/e2e/__snapshots__ SUMMARY.md
git commit -m "test(export): add approved raster baselines"
```

### Task 2: Documentation and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `SUMMARY.md`

**Interfaces:**
- Consumes: the two visual npm scripts from Task 1.
- Produces: maintainer instructions for reviewing and intentionally replacing golden PNGs.

- [ ] **Step 1: Document baseline review**

Add a README subsection stating that `npm run test:e2e:visual` is read-only, `npm run test:e2e:update-snapshots` intentionally replaces approved PNGs, and every replacement requires visual review of the committed image diff.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm run test:coverage
npx astro check
npm run build
npm run test:e2e
npm audit --omit=dev
```

Expected: all unit and browser tests pass, including the three visual checks; coverage remains at least 80%, Astro reports zero diagnostics, six pages build, and the production audit reports zero vulnerabilities.

- [ ] **Step 3: Complete task records and commit**

Mark the raster-baseline TODO entry Done with exact evidence, append `SUMMARY.md`, then run:

```bash
git add README.md TODO.md SUMMARY.md
git commit -m "docs(export): document visual baseline review"
```
