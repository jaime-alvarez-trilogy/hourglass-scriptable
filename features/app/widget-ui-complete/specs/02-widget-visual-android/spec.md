# 02-widget-visual-android

**Status:** Draft
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Owner:** @trilogy

---

## Overview

This spec addresses three remaining visual gaps in the Android widget (`src/widgets/android/HourglassWidget.tsx`) after the `widget-layout-polish` feature:

1. **GlassPanel opacity** — The inner card background `#16151F` is nearly indistinguishable from the widget base `#0D0C14` (only 9/9/11 RGB steps apart). Raising it to `#1F1E2C` increases the delta to 18/18/24 steps, making card panels clearly visible while staying dark and on-brand.

2. **Daily bar chart** — Android has no Large widget, so the daily Mon–Sun bar chart belongs in the Medium Hours mode. A new `buildBarChartSvg` function generates an inline SVG string (matching the existing `buildMeshSvg` / `blProgressBar` pattern) and is rendered via `SvgWidget` below the BrainLift row.

3. **`isFuture` consumption** — Spec 01 adds `WidgetDailyEntry.isFuture: boolean` and populates it in `bridge.ts`. This spec consumes it: future-day bars render in the muted colour `#2F2E41` instead of the active colour, so the chart clearly separates tracked history from the unfilled remainder of the week.

### What Is Being Built

- A one-line colour constant change in `GlassPanel` (no structural change — the border-trick layout is preserved).
- A new exported function `buildBarChartSvg(daily, width, barAreaHeight, accentColor): string` that returns a 7-bar SVG sparkline with proportional heights, day labels, colour-coded bars (today = accent, past with hours = `#4A4A6A`, zero/future = `#2F2E41`), and a minimum 2px floor for zero/future bars.
- Integration of `buildBarChartSvg` into the MediumWidget Hours mode rendering path via a `SvgWidget` element inserted after the BrainLift row.

---

## Out of Scope

1. **Android Large widget** — **Descoped:** Android has no Large widget size in this project. The Large widget is a separate future feature.

2. **iOS widget changes** — **Deferred to 01-widget-visual-ios:** All iOS glass card, gradient background, and bar chart work is owned by Spec 01 (confirmed complete).

3. **`WidgetDailyEntry.isFuture` field definition and bridge population** — **Deferred to 01-widget-visual-ios:** Spec 01 adds `isFuture` to `src/widgets/types.ts` and populates it in `bridge.ts buildDailyEntries()`. This spec only consumes the field.

4. **Dynamic bar chart width** — **Descoped:** The SVG width is a caller-supplied constant (typically 280–320px for Android Medium). Responsive/adaptive sizing is not required.

5. **Accessibility labels for bar chart** — **Descoped:** SVG content in Android widgets is not accessible to screen readers in the current `react-native-android-widget` architecture. No `aria-label` or `contentDescription` is applicable.

6. **Custom font embedding** — **Descoped:** Bar chart day labels use `font-size="9"` with system default font. Custom font embedding in widgets is a separate non-goal for this feature.

7. **Data fetching or bridge logic changes** — **Descoped:** This spec makes no changes to API calls, data fetching, or bridge logic beyond consuming the `isFuture` field added by Spec 01.

8. **GlassPanel structural changes** — **Descoped:** Only the inner `backgroundColor` hex value changes. The outer border-trick (1px padding creating a border via `#2F2E41`) is preserved unchanged to avoid layout risk.

---

## Functional Requirements

### FR1: GlassPanel Inner Card Opacity

**What:** Change the inner `FlexWidget` `backgroundColor` in the `GlassPanel` component from `#16151F` to `#1F1E2C`.

**Why:** The current inner card colour is nearly identical to the widget base colour (`#0D0C14`), making card panels visually indistinguishable. The new value increases perceptual separation while remaining dark and brand-consistent.

**Success Criteria:**
- [ ] `GlassPanel`'s inner `FlexWidget` has `backgroundColor: '#1F1E2C'`
- [ ] `GlassPanel`'s outer `FlexWidget` retains `backgroundColor: '#2F2E41'` (unchanged)
- [ ] No structural changes to `GlassPanel` (padding, borderRadius, flex remain identical)
- [ ] Existing tests for `GlassPanel` pass with updated colour assertion

---

### FR2: `buildBarChartSvg` Function

**What:** Export a new function `buildBarChartSvg` from `src/widgets/android/HourglassWidget.tsx` that generates a 7-bar inline SVG string for the weekly hours bar chart.

**Signature:**
```typescript
export function buildBarChartSvg(
  daily: WidgetDailyEntry[],
  width: number,
  barAreaHeight: number,
  accentColor: string,
): string
```

**Layout Geometry:**
- Column width: `width / 7`
- Bar width: `colW * 0.6`
- Bar gap (each side): `colW * 0.2`
- SVG total height: `barAreaHeight + 12` (bar area + label area)
- Day labels: first 3 chars of day name ("Mon", "Tue", etc.), `font-size="9"`, `fill="#777777"`, centered under each bar at `y = barAreaHeight + 10`

**Bar Colouring:**
- `daily[i].isToday === true` → `fill = accentColor`
- `daily[i].isFuture === true` → `fill = '#2F2E41'`
- `daily[i].hours === 0` (past, not future) → `fill = '#2F2E41'`
- Past day with `hours > 0` → `fill = '#4A4A6A'`

**Bar Heights:**
- `maxHours = Math.max(...daily.map(d => d.hours), 0.01)` (prevent division by zero)
- `barH = Math.max(Math.round(d.hours / maxHours * barAreaHeight), 2)` — minimum 2px for all bars (zero and future bars show a floor reference line)
- Bar `y` position: `barAreaHeight - barH` (bars grow upward from bottom of bar area)

**Success Criteria:**
- [ ] Returns a string starting with `<svg`
- [ ] SVG contains exactly 7 `<rect` elements
- [ ] SVG contains exactly 7 `<text` elements
- [ ] Today's bar has `fill` equal to `accentColor`
- [ ] A past bar with `hours > 0` has `fill="#4A4A6A"`
- [ ] A future bar has `fill="#2F2E41"`
- [ ] A past bar with `hours = 0` has `fill="#2F2E41"`
- [ ] All bars have height >= 2 (floor enforced, no division-by-zero when all hours = 0)
- [ ] When all hours = 0: all bars are minimum height (2px), no error thrown
- [ ] When today hours = max: today bar height equals `barAreaHeight`
- [ ] With exactly 7 entries: exactly 7 bars rendered
- [ ] `accentColor = '#FF2D55'`: today bar fill is `#FF2D55`

---

### FR3: MediumWidget Hours Mode Bar Chart Integration

**What:** Insert a `SvgWidget` displaying the `buildBarChartSvg` output into the MediumWidget Hours mode layout, after the BrainLift progress bar row and before the stale indicator.

**Layout Position:**
```
... (existing rows: hero panels, spacer, pace badge, stats, hours remaining, BrainLift row)
[NEW] SvgWidget (bar chart, height=40, width=280)
[UNCHANGED] stale indicator (conditional)
[UNCHANGED] manager pending badge (conditional)
```

**Sizing Constants:**
- `BAR_CHART_WIDTH = 280`
- `BAR_AREA_HEIGHT = 28`
- SVG height passed to SvgWidget: `BAR_AREA_HEIGHT + 12 = 40`

**Success Criteria:**
- [ ] MediumWidget Hours mode renders a `SvgWidget` after the BrainLift row
- [ ] `SvgWidget`'s `svg` prop is a string starting with `<svg`
- [ ] `SvgWidget`'s `height` prop is `40`
- [ ] The chart receives `data.daily` (7-entry array from `WidgetData`)
- [ ] The chart uses `URGENCY_ACCENT[data.urgency]` as `accentColor`

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `src/widgets/android/HourglassWidget.tsx` | 1) Change `GlassPanel` inner `backgroundColor` from `'#16151F'` to `'#1F1E2C'`. 2) Add exported `buildBarChartSvg` function. 3) Insert `SvgWidget` with bar chart into MediumWidget Hours mode layout. |

### Files to Reference (Read Only)

| File | Why |
|------|-----|
| `src/widgets/android/HourglassWidget.tsx` lines 19–43 | `buildMeshSvg` — existing SVG string generation pattern to mirror |
| `src/widgets/android/HourglassWidget.tsx` lines 94–107 | `blProgressBar` — existing bar SVG pattern |
| `src/widgets/android/HourglassWidget.tsx` lines 144–172 | `GlassPanel` — target of FR1 colour change |
| `src/widgets/android/HourglassWidget.tsx` lines 498–617 | MediumWidget Hours mode — insertion point for FR3 |
| `src/widgets/types.ts` | `WidgetDailyEntry` type (includes `isFuture` from Spec 01) |
| `src/__tests__/widgets/android/HourglassWidget.test.tsx` | Existing test patterns |

### Files to Create

| File | Why |
|------|-----|
| _(none)_ | All changes are in existing files |

### Data Flow

```
WidgetData.daily: WidgetDailyEntry[]     (populated by bridge.ts, isFuture set by Spec 01)
  ↓
MediumWidget Hours mode (HourglassWidget.tsx)
  ↓ calls
buildBarChartSvg(data.daily, 280, 28, URGENCY_ACCENT[data.urgency])
  ↓ returns
SVG string "<svg width="280" height="40" ...>...</svg>"
  ↓
<SvgWidget svg={svgString} width={280} height={40} />
  ↓
Android widget renders inline SVG bar chart
```

### Implementation Order

1. **FR1** (trivial): Change one hex constant in `GlassPanel`.
2. **FR2** (core logic): Implement `buildBarChartSvg`. Export it so tests can import directly.
3. **FR3** (integration): Wire `buildBarChartSvg` into MediumWidget Hours mode.

FR1 and FR2 are independent and can be written simultaneously. FR3 depends on FR2 being present.

### SVG Generation Pattern

```typescript
export function buildBarChartSvg(
  daily: WidgetDailyEntry[],
  width: number,
  barAreaHeight: number,
  accentColor: string,
): string {
  const colW = width / 7;
  const barW = Math.round(colW * 0.6);
  const maxHours = Math.max(...daily.map(d => d.hours), 0.01);
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const bars = daily.map((d, i) => {
    const x = Math.round(i * colW + colW * 0.2);
    const barH = Math.max(Math.round(d.hours / maxHours * barAreaHeight), 2);
    const y = barAreaHeight - barH;
    const color = d.isToday
      ? accentColor
      : (d.isFuture || d.hours === 0)
        ? '#2F2E41'
        : '#4A4A6A';
    const labelX = Math.round(i * colW + colW / 2);
    return (
      `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${color}"/>` +
      `<text x="${labelX}" y="${barAreaHeight + 10}" text-anchor="middle" font-size="9" fill="#777777">${DAY_LABELS[i]}</text>`
    );
  }).join('');

  return `<svg width="${width}" height="${barAreaHeight + 12}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}
```

### MediumWidget Insertion Point

In the MediumWidget Hours mode render, after the BrainLift row element and before the stale indicator conditional:

```typescript
// After BrainLift row:
<SvgWidget
  svg={buildBarChartSvg(data.daily, 280, 28, URGENCY_ACCENT[data.urgency])}
  width={280}
  height={40}
/>
// Before: {isStale && <TextWidget .../>}
```

### Edge Cases

| Case | Handling |
|------|----------|
| All hours = 0 | `maxHours = 0.01` prevents division by zero; all bars render at 2px minimum |
| Today is first or last day of week | `isToday` flag from `WidgetDailyEntry` handles correctly regardless of position |
| `daily` has fewer than 7 entries | Not expected (bridge always returns 7 entries); `map` produces fewer bars gracefully |
| `accentColor` is empty string | SVG renders with empty `fill` attribute — caller's responsibility to provide valid hex |
| Future bars | `isFuture === true` takes precedence → `#2F2E41` muted colour |

### No New Dependencies

All primitives used (`FlexWidget`, `SvgWidget`, `TextWidget`) are already imported in `HourglassWidget.tsx`. `WidgetDailyEntry` type is already imported from `src/widgets/types.ts`. No new npm packages required.
