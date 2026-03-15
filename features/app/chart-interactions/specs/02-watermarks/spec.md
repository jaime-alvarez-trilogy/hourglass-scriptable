# 02-watermarks

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

`02-watermarks` adds faint contextual text anchors to three charts in the Hourglass app. The charts currently show data without explanation — a user looking at the bar chart doesn't know if the total is good or bad, the AI cone shows lines with no legend, and the earnings sparkline has an uncommunicated ceiling value.

This spec introduces three targeted overlays:

1. **WeeklyBarChart watermark** — a large, low-opacity Skia `<Text>` element centered inside the canvas showing the total weekly hours (e.g. `"38.5h"`). It lives at ~7% opacity, functioning as background texture rather than a visible label. A new `watermarkLabel?: string` prop is added to `WeeklyBarChart`.

2. **AIConeChart legend** — a React Native `View` row rendered below the Skia Canvas (outside it), visible only on the `size="full"` variant. Three inline items: `● AI%` (cyan), `— 75% target` (amber), `⋯ projected` (indigo). Colors are sourced directly from existing constants in `AIConeChart.tsx`. The compact variant (home tab, 100px) gets no legend.

3. **TrendSparkline cap label** — a new `capLabel?: string` prop. When both `showGuide` and `capLabel` are present, a small Skia `<Text>` renders at the right edge of the existing guide line, right-aligned at ~35% opacity. Font size 10sp, matching the AIConeChart axis label pattern already used in the codebase.

All three changes are additive and prop-guarded — omitting the new props leaves existing behavior unchanged. No layout changes are required on the parent screens beyond passing the new props.

---

## Out of Scope

1. **Legend visibility toggling during scrub** — Deferred to `04-ai-scrub`. When scrub interaction is added in that spec, the legend can be conditionally hidden while scrubbing. This spec does not add any scrub interaction.

2. **Compact AIConeChart legend** — Descoped. The compact variant (home tab, ~100px tall) is too small to accommodate a legend without visual clutter. No legend for compact.

3. **WeeklyBarChart axis labels** (X/Y tick marks) — Descoped. The watermark is the only addition to the bar chart. Axis ticks require additional layout space not currently allocated.

4. **TrendSparkline watermark for earnings total** — Descoped. The sparkline receives only a cap label at the guide line. A large centered watermark is specific to the bar chart where the hours number is the primary KPI.

5. **Animated fade-in for watermark/legend** — Descoped. Static rendering is sufficient; the existing chart animations already provide visual richness.

6. **Dark/light theme variants for legend colors** — Descoped. The app uses a fixed dark theme; legend colors use the existing chart color constants directly.

---

## Functional Requirements

### FR1: WeeklyBarChart watermark label

Add a `watermarkLabel?: string` prop to `WeeklyBarChart`. When provided and non-empty, render a centered low-opacity Skia `<Text>` inside the canvas.

**Success Criteria:**
- `WeeklyBarChartProps` includes `watermarkLabel?: string`
- When `watermarkLabel` is a non-empty string, a Skia `<Text>` element is rendered at opacity ≤ 0.10
- Watermark is horizontally centered: `x ≈ width / 2` (adjusted for text width via `font.measureText`)
- Watermark is vertically centered: `y ≈ height / 2`
- Font size is large (48–56sp) to create background-texture effect
- When `watermarkLabel` is `undefined` or `""`, no watermark is rendered and there is no crash
- Uses `matchFont` pattern consistent with `AIConeChart.tsx`

### FR2: AIConeChart legend row

Add a legend View row below the Skia Canvas inside `AIConeChart`, visible only when `size === 'full'`.

**Success Criteria:**
- When `size === 'full'`, a `View` row renders below the Canvas containing three legend items
- Item 1: colored indicator (cyan `HOLO_GLOW` = `#38BDF8`) + text `"AI%"`
- Item 2: colored indicator (amber `AMBER_CORE` = `#FCD34D`) + text `"75% target"`
- Item 3: colored indicator (indigo `PROJ_COLOR` = `#818CF8`) + text `"projected"`
- When `size === 'compact'`, no legend is rendered
- No new props are added to `AIConeChartProps`
- Legend is implemented as React Native `View`/`Text` elements (not Skia), keeping font loading trivial
- Colors sourced from existing constants (`HOLO_GLOW`, `AMBER_CORE`, `PROJ_COLOR`) already defined in `AIConeChart.tsx`

### FR3: TrendSparkline cap label

Add a `capLabel?: string` prop to `TrendSparkline`. When both `showGuide` and `capLabel` are provided, render a small faint Skia `<Text>` at the right edge of the existing guide line.

**Success Criteria:**
- `TrendSparklineProps` includes `capLabel?: string`
- When `showGuide === true` AND `capLabel` is a non-empty string, a Skia `<Text>` is rendered at the guide line's y-position
- Text is right-aligned: `x ≈ width - padding` (right edge of canvas)
- Opacity ≤ 0.40 (faint annotation)
- Font size 10sp matching axis label pattern from `AIConeChart.tsx`
- When `showGuide === false` OR `capLabel` is undefined/empty, no label is rendered
- No crash when `capLabel` is undefined

### FR4: Home tab prop wiring

Update `app/(tabs)/index.tsx` to pass the new `watermarkLabel` prop to `WeeklyBarChart` and the new `capLabel` + `showGuide` + `maxValue` props to the earnings `TrendSparkline`.

**Success Criteria:**
- `WeeklyBarChart` receives `watermarkLabel={`${hoursData.total.toFixed(1)}h`}` (or graceful fallback when data is loading)
- Earnings `TrendSparkline` receives `showGuide`, `maxValue`, and `capLabel` props with values derived from available data/config
- Existing behavior is unchanged when data is not yet loaded (props omitted or undefined)

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/components/WeeklyBarChart.tsx` | Add `watermarkLabel` prop; render centered Skia `<Text>` at low opacity |
| `hourglassws/src/components/AIConeChart.tsx` | Wrap Canvas in a `View`, add legend row below canvas when `size === 'full'` |
| `hourglassws/src/components/TrendSparkline.tsx` | Add `capLabel` prop; render Skia `<Text>` at guide line right edge |
| `hourglassws/app/(tabs)/index.tsx` | Pass `watermarkLabel` to `WeeklyBarChart`; pass `capLabel`/`showGuide`/`maxValue` to earnings sparkline |

### Files to Reference

- `hourglassws/src/components/WeeklyBarChart.tsx` — existing Skia Canvas pattern, `matchFont` not yet used (needs adding)
- `hourglassws/src/components/AIConeChart.tsx` — existing `matchFont` + Skia `<Text>` usage, color constants (`HOLO_GLOW`, `AMBER_CORE`, `PROJ_COLOR`), `size` prop
- `hourglassws/src/components/TrendSparkline.tsx` — existing `showGuide` guide line at `y=2`, Skia imports
- `hourglassws/src/lib/colors.ts` — color palette
- `hourglassws/app/(tabs)/index.tsx` — `useHoursData` hook usage, `WeeklyBarChart` and `TrendSparkline` render sites

### Data Flow

```
FR1 (watermark):
  useHoursData().data.total
    → index.tsx: watermarkLabel={`${total.toFixed(1)}h`}
    → WeeklyBarChart(watermarkLabel)
    → Skia <Text> centered in Canvas at opacity 0.07

FR2 (legend):
  AIConeChart internal
    → size === 'full' → render View below Canvas
    → 3 items with HOLO_GLOW / AMBER_CORE / PROJ_COLOR

FR3 (cap label):
  maxValue (passed from index.tsx, e.g. config.hourlyRate * weeklyLimit)
    → index.tsx: capLabel={`$${maxValue.toFixed(0)}`}
    → TrendSparkline(capLabel, showGuide, maxValue)
    → Skia <Text> at guide line right edge, opacity 0.35
```

### Implementation Notes

**FR1 — WeeklyBarChart watermark:**
- Import `matchFont` and `Text` from `@shopify/react-native-skia` (already imported in AIConeChart as a pattern)
- `const font = matchFont({ fontFamily: 'System', fontSize: 52 })`
- Render after the bar rects (top of z-stack) so watermark appears above tracks but the z-order doesn't matter much at 7% opacity
- Center: use `font.measureText(watermarkLabel)` to get width, then `x = (width - textWidth) / 2`
- Y center: `y = h / 2 + fontSize / 3` (Skia text y is baseline, not top)
- Guard: `{watermarkLabel && font && (...)}`

**FR2 — AIConeChart legend:**
- AIConeChart currently returns a bare `<Canvas>`. Wrap in `<View>` (or `<React.Fragment>`) only when `size === 'full'` to add the legend below.
- Legend row: `flexDirection: 'row'`, `gap: 12`, `marginTop: 8`, `paddingHorizontal: 4`
- Each legend item: `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 4`
- Indicator styles:
  - AI%: small `View` circle, width/height 8, borderRadius 4, backgroundColor `HOLO_GLOW`
  - 75% target: `Text` `"—"` in `AMBER_CORE`
  - projected: `Text` `"⋯"` in `PROJ_COLOR`
- Label text: `fontSize: 10`, `color: colors.textMuted`
- Wrap condition: only when `size === 'full'`

**FR3 — TrendSparkline cap label:**
- Import `Text` and `matchFont` from `@shopify/react-native-skia` (add to existing import)
- `const capFont = matchFont({ fontFamily: 'System', fontSize: 10 })`
- Render inside the Canvas after the guide line
- Position: `x = width - capFont.measureText(capLabel).width - 4`, `y = guideY + 10` (just below guide, not overlapping)
- Opacity: 0.35
- Guard: `{showGuide && capLabel && capFont && (...)}`

**FR4 — Home tab wiring:**
- `watermarkLabel`: derive from `hoursData?.total` — use `hoursData ? `${hoursData.total.toFixed(1)}h` : undefined`
- Cap label for earnings: the sparkline's `maxValue` already represents a ceiling — derive `capLabel` from the same value: `maxValue ? `$${Math.round(maxValue).toLocaleString()}` : undefined`

### Edge Cases

| Case | Handling |
|------|----------|
| `watermarkLabel=""` | Guard `watermarkLabel && ...` skips rendering |
| `watermarkLabel` undefined | Same guard skips rendering |
| `width === 0` | Existing early return in WeeklyBarChart catches this |
| `capLabel` without `showGuide` | Guard `showGuide && capLabel` prevents rendering |
| `capLabel` undefined | Guard prevents rendering, no crash |
| `size === 'compact'` for legend | Conditional `size === 'full'` prevents legend render |
| `font === null` (matchFont returns null on some platforms) | Guard `font &&` on all Skia Text renders |

### Test File Locations

- `hourglassws/src/components/__tests__/WeeklyBarChart.test.tsx` — create if not exists
- `hourglassws/src/components/__tests__/AIConeChart.test.tsx` — already exists, add FR2 tests
- `hourglassws/src/components/__tests__/TrendSparkline.test.tsx` — create if not exists
