# Graph Result Export Design

## Objective

Let a user preserve the mathematical result currently shown in the Graphing
Calculator, Function Explorer, or Transformation Explorer as one downloadable PNG
or PDF. The artifact uses the site's visual language and a wide desktop layout, but
contains only read-only result content. The embedded TI-84 is explicitly excluded.

## Accepted Experience

Each supported tool displays an Export menu with two commands:

- **Download PNG** creates one wide image.
- **Download PDF** places the same image and content on one standard Letter landscape
  page with margins.

The commands are disabled when there is no meaningful graph to export. While an
export is being prepared, the menu reports a busy state and prevents duplicate
requests. Success starts a browser download; failure leaves the current work intact
and shows a concise, accessible error.

The exported artifact always uses fixed desktop proportions, even when initiated
from a mobile viewport. The artifact is 1,440 CSS pixels wide, and its graph region
is 960 x 560 CSS pixels. Height grows only for the result panels and a compact
selected-values table. PNG capture uses pixel ratio 1; PDF fits the PNG proportionally
inside a standard Letter landscape page with 18pt margins.

Artifact height is content-driven rather than a canonical pixel constant because
equation length and tool analysis vary. The canonical fixtures for all three tools
must remain wider than they are tall; tests assert this ratio without coupling the
contract to platform font metrics.

The artifact uses a light presentation palette for consistent printing and sharing.
It excludes the site header, navigation, buttons, editable inputs, sliders,
checkboxes, selectors, hover tooltips, animation controls, and the export menu itself.

## Artifact Content

All artifacts contain the tool title, export date, graph, visible x/y window, and
relevant read-only information.

### Graphing Calculator

- Every plotted equation with its curve color
- For each equation, whether point markers are shown and their shape
- Current graph window
- Up to nine representative whole-number-x values selected across the current window

### Function Explorer

- Plotted function
- Current point and function value
- Current limit/readout headline and explanatory note
- Detected vertical asymptotes, listing each x-position and left/right approach
  (`+infinity` or `-infinity`), plus end behavior for `x -> -infinity` and
  `x -> +infinity`; finite end limits are labeled as horizontal asymptotes, while
  infinite or unknown behavior is stated explicitly
- Visible guide settings plus shared marker visibility and shape as text
- Up to nine representative whole-number-x values selected across the current window

### Transformation Explorer

- Selected parent name or custom-function label
- Concrete transformed equation
- Current `a`, `b`, `h`, and `k` values
- Plain-language transformation steps
- Parent/transformed function details when available
- Visible parent/grid settings plus shared marker visibility and shape as text;
  parent markers are reported as suppressed when the parent curve is hidden
- Up to nine representative parent and transformed values selected across the current window

## Architecture

### Shared Export Boundary

A shared export module owns:

- the `png | pdf` format contract;
- deterministic, sanitized filenames;
- fixed-size export-graph rendering;
- final artifact capture at a fixed CSS width;
- browser download creation and cleanup;
- standard Letter landscape PDF fitting that preserves the artifact aspect ratio;
- normalized user-facing errors.

The module accepts conversion and download adapters. Unit tests inject stubs rather
than invoking canvas, PDF, or browser download APIs.

[`html-to-image`](https://github.com/bubkoo/html-to-image) converts the complete
off-screen export surface, including its dedicated graph render, to PNG.
[`jsPDF`](https://github.com/parallax/jsPDF) places that same final PNG on a standard
Letter landscape PDF page. Both dependencies are MIT-licensed and pinned in
`package.json` and `package-lock.json`.

### Read-Only Surface

A shared `ExportArtifact` shell defines the desktop canvas, title metadata, graph-first
layout, equation legend, information panels, table region, and footer. Small
tool-specific artifact components map their current React state into this shell.

The export surface is mounted only while a request is active. It is positioned outside
the viewport at a fixed width rather than hidden with `display: none`, because DOM
capture needs computed layout. It is marked `aria-hidden` and contains no focusable
elements, so assistive technology does not encounter duplicate page content.

The live responsive plot is not captured or resized. Each tool invokes its existing
plot renderer against an off-screen 960 x 560 CSS-pixel target using an immutable
snapshot of the current equations, window, markers, overlays, and analysis state. The
export plot is always rendered with `dark: false`; curve colors and marker settings
are preserved. This gives mobile and desktop users identical artifact geometry and
keeps the light-palette requirement true for both the shell and graph without mutating
the interactive plot.

### Tool Integration

Each React island supplies its existing state and plot ref to a shared export
controller. Tool-specific mapping remains next to the tool component so the shared
module does not depend on explorer or transformation domain rules.

Export eligibility is explicit:

- Graphing Calculator requires at least one plotted equation.
- Function Explorer requires a nonempty plotted `expr`.
- Transformation Explorer requires a concrete equation.

Each command attempts the off-screen export render before download. A render or
conversion failure produces the accessible error state and no file; it does not
mutate the live graph or permanently disable later attempts.

The artifact selects at most nine representative whole-number-x rows across the
visible window, always including the first and last available rows. The interactive
page remains the source for the complete table.

The export menu uses familiar download/file icons, descriptive text, keyboard
navigation, visible focus, and an `aria-live` status for progress or errors. Existing
graph interaction remains unchanged.

## Data Flow

1. User chooses PNG or PDF.
2. In one animation frame, the controller snapshots the complete view model.
3. The tool renders an off-screen, fixed-size light export graph and mounts its
   read-only artifact from that immutable snapshot.
4. After images and fonts are ready, the controller captures the complete artifact.
5. PNG downloads that data directly; PDF fits it within margins on one standard
   Letter landscape page.
6. Temporary object URLs and the export surface are removed in a `finally` path.

## Error Handling and Security

- Empty graphing/function tools cannot start an export.
- Conversion failures produce one generic message without exposing stack traces.
- Filenames are constructed from fixed tool slugs and an ISO-style date, never raw
  equations or user input.
- No graph or equation data leaves the browser.
- Generated object URLs are revoked after use.
- The export operation does not mutate equations, zoom, selected function, or tool
  controls.

## Testing Strategy

Strict Red -> Green -> Refactor slices:

1. Unit-test filenames, dimensions, and dependency-injected PNG/PDF execution.
2. Unit-test export controller busy/error cleanup behavior.
3. Add the shared read-only surface and test its content mapping through pure view
   models, including marker ownership and Function Explorer asymptote wording.
4. Integrate one tool at a time, starting with the Graphing Calculator.
5. Add Playwright download tests for PNG and PDF signatures and filenames.
6. Add Function Explorer and Transformation Explorer coverage plus a TI-84 exclusion
   assertion.
7. Export from desktop, mobile, and dark application states; verify identical artifact
   and graph dimensions plus the light graph background and axes.
8. Cover representative row selection, rounded window bounds, standard landscape PDF
   dimensions, and immutable Function Explorer snapshots during active animation.

Changed code must maintain at least 80% coverage, pass Astro typecheck, Vitest, the
production build, and the complete Playwright suite.

## Risks and Tradeoffs

- `html-to-image` relies on SVG `foreignObject`. Its documented current-browser
  support is adequate for this client-only site, but a capture failure must remain
  recoverable.
- The artifact intentionally selects representative table values to preserve the
  approved visual hierarchy; the interactive page retains the complete data.
- PDF text is rasterized and therefore not selectable. This is the deliberate cost of
  guaranteeing that PDF and PNG are visually identical and remain one artifact.
- The standard Letter landscape PDF scales the raster artifact to fit one page. This
  improves printing consistency but retains raster, non-selectable text.

## User Review Correction

The first implementation was rejected after inspection because it diverged from the
approved preview: raw floating-point bounds, machine equation notation, a full table
that dominated the graph, and a custom portrait PDF page. This section supersedes the
earlier complete-table/custom-page decisions. Display bounds use at most three
decimals, integer powers use superscript notation, the artifact shows at most nine
representative rows, and PDF output is standard Letter landscape with margins.

## Non-Goals

- Exporting or packaging the tools themselves
- TI-84 capture
- CSV, JSON, SVG, or editable-session persistence
- Multi-file ZIP downloads
- Multi-page PDF pagination
- Recreating interactivity inside the downloaded artifact

## Spec Audit Resolution

The `spec-gap-auditor` review identified and closed eight gaps before implementation:

1. Replaced responsive live-plot capture with a fixed-size export render.
2. Made the entire artifact, including the graph, explicitly light-themed.
3. Defined deterministic artifact, graph, PNG, and PDF dimensions.
4. Initially bounded the complete value table; user review superseded that decision
   with a tested nine-row representative selection that preserves the graph-first
   composition.
5. Required an immutable snapshot so active animation cannot alter an export.
6. Defined export eligibility for each supported tool and render-failure behavior.
7. Specified Function Explorer asymptote and end-behavior content precisely.
8. Clarified per-equation versus shared marker-setting ownership.

## Post-Implementation Audit

The requested `spec-gap-auditor` review was repeated after the user rejected the first
downloaded output. Its actionable findings were closed as follows:

- Browser tests inspect the mounted artifact passed to capture for all three tools,
  including formatted content, nine rows, a 960x560 graph, and zero controls.
- All three tools download and validate a standard Letter landscape PDF; unit tests
  verify proportional fitting and minimum 18pt margins for the taller explorer
  artifacts.
- Wide-window tests export after applying the window and verify nine rows plus a wide
  1,440px PNG.
- Exponent formatting covers compact, spaced, negative, and parenthesized integer
  powers. Long equations wrap in legends and fixed-layout table headers.
- Exact artifact heights remain deliberately non-contractual because system font
  metrics and valid equation length vary; the wide ratio is the stable requirement.
