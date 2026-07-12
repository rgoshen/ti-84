# Graph Result Export Design

## Objective

Let a user preserve the mathematical result currently shown in the Graphing
Calculator, Function Explorer, or Transformation Explorer as one downloadable PNG
or PDF. The artifact uses the site's visual language and a wide desktop layout, but
contains only read-only result content. The embedded TI-84 is explicitly excluded.

## Accepted Experience

Each supported tool displays an Export menu with two commands:

- **Download PNG** creates one wide image.
- **Download PDF** creates one single-page PDF containing the same image and content.

The commands are disabled when there is no meaningful graph to export. While an
export is being prepared, the menu reports a busy state and prevents duplicate
requests. Success starts a browser download; failure leaves the current work intact
and shows a concise, accessible error.

The exported artifact always uses fixed desktop proportions, even when initiated
from a mobile viewport. It uses a light presentation palette for consistent printing
and sharing. It excludes the site header, navigation, buttons, editable inputs,
sliders, checkboxes, selectors, hover tooltips, animation controls, and the export
menu itself.

## Artifact Content

All artifacts contain the tool title, export date, graph, visible x/y window, and
relevant read-only information.

### Graphing Calculator

- Every plotted equation with its curve color
- Whether point markers are shown, including their shape
- Current graph window
- Complete whole-number-x value table for the current window

### Function Explorer

- Plotted function
- Current point and function value
- Current limit/readout headline and explanatory note
- Detected vertical and horizontal asymptote behavior
- Visible guide and point settings as text
- Complete whole-number-x value table

### Transformation Explorer

- Selected parent name or custom-function label
- Concrete transformed equation
- Current `a`, `b`, `h`, and `k` values
- Plain-language transformation steps
- Parent/transformed function details when available
- Visible parent/grid/point settings as text
- Complete parent and transformed value table

## Architecture

### Shared Export Boundary

A shared export module owns:

- the `png | pdf` format contract;
- deterministic, sanitized filenames;
- graph-node capture;
- final artifact capture at a fixed CSS width;
- browser download creation and cleanup;
- one-page PDF sizing that preserves the artifact aspect ratio;
- normalized user-facing errors.

The module accepts conversion and download adapters. Unit tests inject stubs rather
than invoking canvas, PDF, or browser download APIs.

[`html-to-image`](https://github.com/bubkoo/html-to-image) converts both the existing
graph DOM and final export surface to PNG. [`jsPDF`](https://github.com/parallax/jsPDF)
places that same final PNG on a custom-sized PDF page. Both dependencies are
MIT-licensed and will be pinned in `package.json` and `package-lock.json`.

### Read-Only Surface

A shared `ExportArtifact` shell defines the desktop canvas, title metadata, graph-first
layout, equation legend, information panels, table region, and footer. Small
tool-specific artifact components map their current React state into this shell.

The export surface is mounted only while a request is active. It is positioned outside
the viewport at a fixed width rather than hidden with `display: none`, because DOM
capture needs computed layout. It is marked `aria-hidden` and contains no focusable
elements, so assistive technology does not encounter duplicate page content.

The graph is not recalculated. The live plot DOM is captured first and inserted as an
image into the read-only surface. This keeps the graph, zoom, colors, markers, and
overlays exactly aligned with what the user sees while avoiding a second renderer.

### Tool Integration

Each React island supplies its existing state and plot ref to a shared export
controller. Tool-specific mapping remains next to the tool component so the shared
module does not depend on explorer or transformation domain rules.

The export menu uses familiar download/file icons, descriptive text, keyboard
navigation, visible focus, and an `aria-live` status for progress or errors. Existing
graph interaction remains unchanged.

## Data Flow

1. User chooses PNG or PDF.
2. The controller snapshots the current state and captures the live graph node.
3. The tool mounts its read-only artifact with the graph image.
4. After images and fonts are ready, the controller captures the complete artifact.
5. PNG downloads that data directly; PDF embeds it on one aspect-ratio-matched page.
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
   models.
4. Integrate one tool at a time, starting with the Graphing Calculator.
5. Add Playwright download tests for PNG and PDF signatures and filenames.
6. Add Function Explorer and Transformation Explorer coverage plus a TI-84 exclusion
   assertion.
7. Visually verify generated artifacts at desktop and mobile browser widths.

Changed code must maintain at least 80% coverage, pass Astro typecheck, Vitest, the
production build, and the complete Playwright suite.

## Risks and Tradeoffs

- `html-to-image` relies on SVG `foreignObject`. Its documented current-browser
  support is adequate for this client-only site, but a capture failure must remain
  recoverable.
- Large value tables increase canvas dimensions. The first version preserves all rows
  and relies on the tools' practical graph-window sizes; explicit limits can be added
  only if measured browser failures justify them.
- PDF text is rasterized and therefore not selectable. This is the deliberate cost of
  guaranteeing that PDF and PNG are visually identical and remain one artifact.
- A custom-size single-page PDF may print with scaling on standard Letter/A4 paper.
  Preserving the complete result in one artifact is prioritized over standard paper
  pagination.

## Non-Goals

- Exporting or packaging the tools themselves
- TI-84 capture
- CSV, JSON, SVG, or editable-session persistence
- Multi-file ZIP downloads
- Multi-page PDF pagination
- Recreating interactivity inside the downloaded artifact
