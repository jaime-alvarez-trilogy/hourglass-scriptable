# Widget UI Complete

## Overview

Finishes the unimplemented items from the original widget UI guidance: glass card visual treatment on iOS, gradient backgrounds on iOS, daily bar charts on both platforms, and Android card opacity/label polish. The `widget-layout-polish` feature addressed content triage and data logic; this feature addresses the _visual_ gaps that make the widget look flat or unfinished compared to the guidance.

## Goals

- iOS Medium/Large: two glassmorphic cards side-by-side (hours + earned), not plain text
- iOS Small/Medium/Large: subtle top-to-bottom gradient background, not flat solid colour
- iOS Large: daily bar chart (Mon–Sun) below the hero row — today bar highlighted
- Android Medium Hours mode: daily bar chart (Mon–Sun) via inline SVG
- Android GlassPanel inner card opacity increased to ~87% (more distinct from background)
- `WidgetDailyEntry` gains `isFuture: boolean` so future bars render muted

## Non-Goals

- Android Large widget (separate feature)
- Dynamic font sizing / accessibility
- Custom font embedding in widget extension
- Any changes to data fetching or bridge logic beyond `isFuture` field

## Architecture

### New field: `WidgetDailyEntry.isFuture`

```
HoursData.daily[].date (YYYY-MM-DD)
  ↓  bridge.ts buildDailyEntries()
isFuture = new Date(entry.date) > startOfToday()
  ↓
WidgetDailyEntry.isFuture: boolean
  ↓
iOS Large: muted bar color for future days
Android Medium: muted bar color for future days
```

### iOS glass card pattern

`expo-widgets` / `@expo/ui/swift-ui` exposes `RoundedRectangle` and `GlassEffectContainer`. Glass cards are simulated with a `ZStack`: a `RoundedRectangle` background layer + a `VStack` content layer on top.

```
ZStack
  └─ RoundedRectangle (fill: card bg colour, cornerRadius: 12)
  └─ VStack (padding: 10)
       └─ content
```

### iOS gradient background

Replace flat `URGENCY_COLORS[urgency]` with a `ZStack` that layers two `Rectangle` fills:
- Bottom layer: dark base `#0D0C14`
- Middle layer: urgency tint at 20% opacity (achieved via colour with embedded alpha, e.g. `#00000033` trick or `GlassEffectContainer`)

### iOS bar chart

Stacked proportional `RoundedRectangle` shapes inside an `HStack`, one column per day:
- Column = `VStack` with `Spacer` (flex fill) + `RoundedRectangle` (proportional height) + `Text` (day label)
- Heights derived from `hours / maxHours * MAX_BAR_HEIGHT`
- Today: accent colour. Past: `#4A4A6A`. Future: `#2A2A3A`.
- No external chart library needed — pure SwiftUI primitives.

### Android bar chart

`buildBarChartSvg(daily, width, height)` returns an inline SVG string with `<rect>` bars and `<text>` day labels — same pattern as `buildMeshSvg` / `blProgressBar`. Rendered via `SvgWidget`.

## Spec Units

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-widget-visual-ios | isFuture data field + iOS glass cards + gradient bg + Large bar chart | 02 | — | L |
| 02-widget-visual-android | Android GlassPanel opacity + Medium bar chart | — | 01 | M |

## Files Modified

| File | Spec | Change |
|------|------|--------|
| `src/widgets/types.ts` | 01 | Add `isFuture: boolean` to `WidgetDailyEntry` |
| `src/widgets/bridge.ts` | 01 | Populate `isFuture` in `buildDailyEntries()` |
| `src/widgets/ios/HourglassWidget.tsx` | 01 | Glass cards, gradient bg, Large bar chart |
| `src/widgets/android/HourglassWidget.tsx` | 02 | GlassPanel opacity, Medium bar chart, `buildBarChartSvg` |

## Success Criteria

- [ ] `WidgetDailyEntry.isFuture` added; bridge populates it correctly (future = date > today)
- [ ] iOS Medium shows two glassmorphic cards side-by-side (hours, earned)
- [ ] iOS Small/Medium/Large use gradient background (not flat solid)
- [ ] iOS Large shows Mon–Sun bar chart below the hero row; today bar is accent-coloured; future bars muted
- [ ] Android Medium Hours mode shows Mon–Sun bar chart via SvgWidget inline SVG; future bars muted
- [ ] Android GlassPanel inner background is visually distinct from `#0D0C14` base (opacity ~87%)
- [ ] All existing widget tests still pass; new bar chart functions have unit tests
