# 04-chart-polish

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

This spec polishes the chart rendering in the Hourglass app to match the "holographic data visualisation" aesthetic required by the brand guidelines. Two targeted changes are made:

1. **TrendSparkline glow enhancement** — The sparkline stroke width is increased from 2px (default) to 3px, and the single outer glow layer is upgraded to a three-layer glow stack (outer + mid + core) that matches the existing `AIConeChart` holographic pattern. This applies globally to all sparkline instances across the app (home earnings sparkline, overview 4-sparklines, AI tab trajectory sparkline).

2. **WeeklyBarChart status-aware today bar** — A new `todayColor` prop is added to `WeeklyBarChart`. The home screen (`index.tsx`) passes a panel-state-derived colour so that "today's" in-progress bar reflects the user's actual pace (green = on track, yellow = behind, red = critical) rather than always showing gold (which is reserved for money/earnings). Backward compatibility is maintained: the prop defaults to `colors.success`.

Both changes are purely cosmetic (no data or logic changes) and are self-contained to three files.

---

## Out of Scope

1. **AIConeChart glow changes** — **Descoped:** The AI cone chart already implements the correct 3-layer holographic glow (HOLO_CORE + HOLO_GLOW + BlurMask). No changes required.

2. **WeeklyBarChart caller changes outside index.tsx** — **Descoped:** Only the home screen hosts a `WeeklyBarChart` that is shown alongside a `panelState`. Other callers (if any) receive the default `success` colour, which is acceptable for non-state-driven contexts.

3. **Tooltip or interactive chart overlays** — **Descoped:** Tooltip system is explicitly out of scope for the brand-compliance feature (see FEATURE.md).

4. **Sparkline colour changes** — **Descoped:** Callers already pass explicit colours (e.g. `colors.gold` for earnings). This spec only changes stroke width and glow; colour selection is owned by each caller.

5. **Custom tab navigator or chart library swap** — **Descoped:** Existing Skia-based rendering stack is retained as-is.

6. **Skeleton or loading state changes** — **Descoped:** Already implemented; outside the scope of this brand-polish spec.

---

## Functional Requirements

### FR1 — TrendSparkline: Increase Default Stroke Width to 3px

**Description:** Change the `strokeWidth` prop default from 2 to 3 so all sparkline instances render a thicker, more visible core line without requiring caller changes.

**Success Criteria:**
- `TrendSparkline` `strokeWidth` prop defaults to `3` (not `2`)
- All existing callers that do not pass `strokeWidth` explicitly receive the new default
- Callers that do pass `strokeWidth` explicitly are unaffected (backward compatible)

---

### FR2 — TrendSparkline: Three-Layer Glow Stack

**Description:** Replace the single outer glow layer with a three-layer glow stack matching the `AIConeChart` holographic pattern.

**Layer specification:**
- Layer 1 (outer glow): `strokeWidth={14}`, `color={color + '40'}`, `BlurMask blur={12}`, `style="solid"`
- Layer 2 (mid glow, NEW): `strokeWidth={7}`, `color={color + '80'}`, `BlurMask blur={4}`, `style="solid"`
- Layer 3 (core line): `strokeWidth` from prop (default 3), sharp (no blur)

**Success Criteria:**
- Outer glow Paint has `strokeWidth={14}` (was 10)
- Outer glow `BlurMask` has `blur={12}` (was 8)
- Mid glow Paint exists with `strokeWidth={7}` and `BlurMask blur={4}`
- Mid glow uses `color + '80'` (50% opacity variant of the sparkline colour)
- Core line remains sharp (no BlurMask)

---

### FR3 — WeeklyBarChart: `todayColor` Prop

**Description:** Add an optional `todayColor` prop to `WeeklyBarChart`. When provided, today's in-progress bar uses that colour instead of the hardcoded `gold`.

**Success Criteria:**
- `WeeklyBarChart` accepts `todayColor?: string` prop
- When `todayColor` is provided, today's bar renders in that colour
- When `todayColor` is omitted, today's bar defaults to `colors.success`
- Completed past days remain `colors.success`
- Future days remain `colors.textMuted`

---

### FR4 — Home Screen: Pass Panel-State Colour to WeeklyBarChart

**Description:** In `app/(tabs)/index.tsx`, add a `TODAY_BAR_COLORS` mapping from `PanelState` to colour, and pass the mapped colour as `todayColor` to `WeeklyBarChart`.

**Panel state to colour mapping:**
| PanelState | Color |
|---|---|
| `onTrack` | `colors.success` |
| `behind` | `colors.warning` |
| `critical` | `colors.critical` |
| `crushedIt` | `colors.overtimeWhiteGold` |
| `overtime` | `colors.overtimeWhiteGold` |
| `idle` | `colors.textMuted` |

**Success Criteria:**
- `TODAY_BAR_COLORS` record covers all 6 `PanelState` values
- `WeeklyBarChart` in `index.tsx` receives `todayColor={TODAY_BAR_COLORS[panelState]}`
- When `panelState === 'critical'`, today bar renders in `colors.critical`
- When `panelState === 'behind'`, today bar renders in `colors.warning`
- When `panelState === 'onTrack'`, today bar renders in `colors.success`

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/components/TrendSparkline.tsx` | FR1: Change `strokeWidth` default from 2 to 3. FR2: Replace single outer glow with 3-layer glow stack. |
| `hourglassws/src/components/WeeklyBarChart.tsx` | FR3: Add `todayColor?: string` prop; use it for today's bar (default `colors.success`). |
| `hourglassws/app/(tabs)/index.tsx` | FR4: Add `TODAY_BAR_COLORS` map; pass `todayColor` to `WeeklyBarChart`. |

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/AIConeChart.tsx` | Reference implementation for 3-layer glow (HOLO_CORE, HOLO_GLOW, BlurMask pattern) |
| `hourglassws/src/lib/colors.ts` | Token values: `success`, `warning`, `critical`, `overtimeWhiteGold`, `textMuted`, `gold` |
| `hourglassws/src/lib/panelState.ts` (or equivalent) | `PanelState` type definition |

### Data Flow

```
panelState (computed in index.tsx)
       |
       v
TODAY_BAR_COLORS[panelState]  -->  todayColor prop
                                        |
                                        v
                               WeeklyBarChart renders
                               today bar in that colour
```

```
TrendSparkline renders:
  Layer 1: outer glow  (strokeWidth=14, blur=12, color+'40')
  Layer 2: mid glow    (strokeWidth=7,  blur=4,  color+'80')   <- NEW
  Layer 3: core line   (strokeWidth=props.strokeWidth default 3)
```

### Implementation Notes

**TrendSparkline glow layers (FR2):**
The current implementation has a single outer glow Paint wrapping the path. The new implementation inserts a mid-glow Paint between the outer glow and the core. Both the outer glow and mid glow use `<BlurMask>` as a child of `<Paint>`. The core line uses no BlurMask. Reference `AIConeChart.tsx` glow pattern for the exact JSX structure.

**WeeklyBarChart todayColor (FR3):**
The chart's bar colour selection logic uses a ternary or conditional expression based on whether the day index matches today. Replace the hardcoded `colors.gold` for the "today" case with the `todayColor` prop value. The prop should be destructured with a default: `todayColor = colors.success`.

**PanelState import (FR4):**
If `PanelState` is not already imported in `index.tsx`, import it from `src/lib/panelState` (or wherever it is defined). The `TODAY_BAR_COLORS` constant can be defined at module scope (outside the component) as a `Record<PanelState, string>`.

### Edge Cases

1. **`panelState` undefined during initial load** — `index.tsx` likely has a loading state before `panelState` is computed. The `todayColor` should fallback to `colors.success` when `panelState` is not yet available.

2. **Callers of `TrendSparkline` that pass explicit `strokeWidth`** — These are unaffected by the default change. No action needed.

3. **`WeeklyBarChart` used without panelState context** — The default `todayColor = colors.success` ensures the chart renders correctly in standalone or test contexts.

4. **Future/past day boundary** — The "today" detection logic in `WeeklyBarChart` is existing; only the colour applied to the "today" case changes.
