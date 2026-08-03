# Angle Explorer Standard Angles & Circle Label Units — Design

**Date:** 2026-08-02
**Status:** Approved
**Branch:** `feature/angle-standard-angles`
**Extends:** `docs/superpowers/plans/2026-07-23-angle-explorer.md`,
`2026-07-27-unit-circle-coordinates-design.md`,
`2026-07-29-angle-wave-projection-design.md`

## Objective

The Angle Explorer sweeps one angle and names it five ways, traces its wave, and reports
its exact coordinates. What it cannot do is show the student **the chart they are actually
being asked to memorise** — the unit circle marked at 30°, 45°, 60°, 90° and their
reflections, in either degrees or radians.

This adds two controls to the diagram:

1. **Circle labels — Degrees | Radians.** One unit choice governs every label on the
   figure, so the circle never mixes units.
2. **Show standard angles.** A static reference ring of all sixteen multiples of 30° and
   45°, labelled in whichever unit is selected.

Both are diagram-scoped. Nothing below the circle changes.

## Verified before designing

Read directly rather than assumed. Several of these facts changed the design.

| Question | Answer | Source |
| --- | --- | --- |
| Do exact π-multiple text formatters already exist? | Yes. `piMultiple(330)` reduces to `11/6`; `formatPiText` renders `11π/6`. All sixteen labels fall out of existing functions. | `angle.ts:59,127` |
| Does the diagram already have a tick system? | Yes — `tickAngles` emits whole-radian marks that grow *toward* θ. The standard ring is a second, static system that must coexist with it. | `angle-render.ts:63` |
| Is there already a label-suppression precedent? | Yes. Tick text is dropped (line kept) when its box overlaps the coordinate label. | `angle-diagram.ts:218-246` |
| How is β applied? | Every element is positioned at `betaRad + <angle>`, rigid-body. New marks must follow. | `angle-diagram.ts:206-257` |
| Do sixteen radian labels fit the 320 viewBox at max radius? | Yes. The widest labels (`11π/6`, `5π/6`) sit at 30°/150°/210°/330° where `cos` is ±0.866, pulling them inside; the axis-aligned labels are the short ones (`0`, `π`, `π/2`). Verified by rendering real geometry at r = 1.5. | brainstorming mockup, `unit = 88`, `view = 320` |
| Is `Checkbox` available? | Yes. | `src/components/ui/checkbox.tsx` |
| Will this invalidate the visual PNG baselines? | No — provided the defaults preserve today's rendering. Baselines are Linux/Docker-only to regenerate, so this constraint is load-bearing. | `tests/e2e/__snapshots__/export-visual.spec.ts/` |

The last row is why the defaults below are not arbitrary.

## Requirements

1. A **Circle labels** radio group with exactly two options — `Degrees`, `Radians` —
   defaulting to **Radians**.
2. A **Show standard angles** checkbox, defaulting to **off**.
3. With the defaults selected, the figure renders **exactly as it does today**.
4. The unit selection governs every *angle* label on the circle: both the dynamic counting
   ticks and the standard-angle ring. The coordinate label is not an angle label — it reads
   `(√3/2, 1/2)` — and is unaffected.
5. Standard angles are the full sixteen: 0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225,
   240, 270, 300, 315, 330 — drawn as a complete static ring, independent of θ.
6. Standard-angle labels read `30°` in degrees mode and `π/6` in radians mode.
7. Labels ride the adjustable circle at `r + 0.22` units, so they move with the radius
   slider like the existing ticks.
8. All marks rotate with β as a rigid body.
9. `Reset` restores both controls to their defaults alongside the other four.
10. Both settings ride into the PNG/PDF export, the way the wave selection already does.
11. Nothing below the circle changes — the identity chain, coordinates box, and Convert
    fields are untouched.

## Architecture

### New module — `src/scripts/explorer/angle-standard.ts`

Pure and DOM-free like its siblings, so it unit-tests in the node environment.

```ts
export type AngleUnit = 'deg' | 'rad';
export const STANDARD_ANGLES: readonly number[];        // the sixteen, ascending
export function standardAngleLabel(deg: number, unit: AngleUnit): string;
```

Radian output delegates to `formatPiText(piMultiple(deg))` rather than re-deriving
fractions. There is no new arithmetic in this feature.

There is deliberately no `standardAngleSpoken`. The figure carries a single `aria-label`;
sixteen individually-spoken marks would have no consumer, and the live region already
speaks the current angle in both units.

### Counting ticks become unit-aware — `angle-render.ts`

```ts
export function countingTicks(
  thetaDeg: number,
  unit: AngleUnit,
): { radians: number; text: string }[];
```

- **Radians** delegates to today's `tickAngles`, unchanged: whole radians toward θ, always
  at least one, text `"1 rad"`.
- **Degrees** emits quarter turns toward θ — `90°`, `180°`, `270°` — also always at least
  one. The quarter turn is the round unit a student counts degrees in, and the
  always-emit-one floor is the same reasoning that made the first radian tick unconditional:
  a scale that vanishes at small θ reads as a bug.

`tickAngles` keeps its current signature and tests.

### Diagram options — `angle-diagram.ts`

`AngleDiagramOptions` gains `unit: AngleUnit` and `showStandardAngles: boolean`.

Standard marks draw a short radial tick (`r → r + 0.08`) with the label at `r + 0.22` — the
**same** label radius as the counting ticks, so the two read as a single ring and collisions
are exact rather than near-miss. Counting-tick lines run `r → r + 0.1`, slightly longer, so
a de-labelled counting tick stays visually distinct from a standard mark.

### Suppression is a total priority order

Three systems now compete for the same ring. The existing rule generalises:

| Priority | Element | Yields to |
| --- | --- | --- |
| 1 | Coordinate label | nothing |
| 2 | Standard-angle label | coordinate label |
| 3 | Counting-tick text | both above |

Only **text** is ever dropped. Tick lines always survive, so a position stays marked even
while unnamed — the same bargain `angle-diagram.ts` already strikes.

This matters most in degrees mode, where the conflict is exact rather than approximate: the
quarter-turn counting ticks land at 90°/180°/270°, which *are* three of the sixteen standard
angles. Under the order above the duplicate counting text is dropped and the standard label
stands.

### Component — `AngleExplorer.tsx`

Two new state values, `unit` (default `'rad'`) and `standardAngles` (default `false`), both
added to `DEFAULTS` so `Reset` clears them. A new bordered panel matching the Wave group's
existing markup: a `RadioGroup` labelled *Circle labels*, and a `Checkbox` labelled *Show
standard angles*. Ids are namespaced through `useId`, following the wave group precedent
that keeps two mounted explorers from colliding.

### Export

Both settings flow into `createExportSnapshot`, so the artifact matches the screen. Adds a
`Circle labels` fact to the `Circle` section and one legend entry while standard angles are
shown.

### Accessibility

The radio group and checkbox announce their own state natively, so nothing is stuffed into
the debounced live region — that region carries mathematics, not control state. The figure's
`aria-label` gains a clause naming the unit and whether the standard ring is shown.

## Testing

Red first, per the project's TDD rule.

**`angle-standard.test.ts`** — all sixteen labels in both units, including the edges
`0 → "0"`, `180 → "π"`, `330 → "11π/6"`; and that `STANDARD_ANGLES` is ascending, sixteen
long, and free of duplicates.

**`angle-render.test.ts`** — degrees quarter-turns; the always-at-least-one floor; negative
θ producing negative-direction ticks; radians behaviour asserted unchanged.

**`angle-diagram.test.ts`** — no standard marks when off; sixteen when on; labels track the
unit; β rotates them; each row of the priority table; and a domain sweep over
r ∈ [0.5, 1.5] × θ ∈ [−360, 360] in both units asserting no label leaves the viewBox.

**`tests/e2e/angle.spec.ts`** — toggle on and count the marks; switch to Degrees and assert
a label reads `30°`; `Reset` restores both defaults.

Per the project's Playwright conventions, mark queries use `[data-role="standard-angle"]`
rather than any bare descendant `svg` selector.

## Risks & Tradeoffs

**Label density.** Three systems on one ring is the real risk. The priority order is the
mitigation and the domain sweep is the proof. If a combination still crowds in practice, the
escape hatch is dropping the standard label's font size to 8 — it does not change the
architecture.

**A new idea in degrees mode.** Quarter-turn counting ticks have no precedent in the
explorer, so `angles.astro` gains one clause of copy explaining them.

**Flicker during a drag.** Suppression means a counting label can vanish and reappear as θ
sweeps past a standard mark. This was accepted deliberately over the alternative — hiding
the counting ticks entirely whenever standard angles are on — because keeping both lessons
visible at once is the point of the feature.

**Visual baselines.** Safe only because the defaults preserve today's rendering. Any later
change to those defaults requires regenerating the PNG baselines on Linux/Docker.

## Files

| Action | Path |
| --- | --- |
| new | `src/scripts/explorer/angle-standard.ts` |
| new | `src/scripts/explorer/angle-standard.test.ts` |
| edit | `src/scripts/explorer/angle-render.ts` + test |
| edit | `src/scripts/explorer/angle-diagram.ts` + test |
| edit | `src/components/explorer/AngleExplorer.tsx` |
| edit | `src/pages/explorers/angles.astro` |
| edit | `tests/e2e/angle.spec.ts` |
