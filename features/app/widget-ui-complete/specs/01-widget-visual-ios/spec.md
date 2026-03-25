# 01-widget-visual-ios

**Status:** Draft
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Owner:** @trilogy

---

## Overview

### What is Being Built

This spec delivers four visual improvements to the iOS Hourglass widget, plus a shared data field needed by both iOS and Android:

1. **`isFuture` data field** — `WidgetDailyEntry` gains `isFuture: boolean` so rendering code can mute future-day bars without guessing from zero-hours values.
2. **iOS glass cards** — Medium and Large widgets replace plain text with two glassmorphic `ZStack` cards side-by-side (hours on the left, earned on the right).
3. **iOS gradient background** — All three widget sizes replace the flat `URGENCY_COLORS[urgency]` solid fill with a two-layer `ZStack`: a dark base (`#0D0C14`) plus an urgency-tinted overlay at low opacity.
4. **iOS Large bar chart** — The Large widget gains a Mon–Sun daily bar chart below the hero row, rendered with proportional `RoundedRectangle` shapes inside an `HStack` (no external chart library).

### How It Works

**Data layer (`types.ts`, `bridge.ts`):**
`buildDailyEntries()` already produces 7 `WidgetDailyEntry` objects. The function is extended to compute `isFuture` by comparing each entry's calendar date to midnight of today (local time). Gap-filled entries (days with no diary data) derive their date from the Monday of the current week plus the day index.

**iOS widget layer (`ios/HourglassWidget.tsx`):**
- A new `IosGlassCard` render helper wraps content in a `ZStack` with a `RoundedRectangle` background layer (fill: `#1F1E2C`, cornerRadius: 12) and a `VStack` content layer.
- A new gradient background wrapper replaces the `background` prop on the root `VStack` with a `ZStack` of two `Rectangle` fills.
- A new `IosBarChart` render helper renders 7 columns, each a `VStack` with a `Spacer` (flex fill above) + `RoundedRectangle` (proportional height) + `Text` (day label). Bar colour: accent (today), `#4A4A6A` (past with hours), `#2F2E41` (zero or future).

**Sizing constants:**
`MAX_BAR_HEIGHT = 100` (pt). Bar height = `hours / maxHours * MAX_BAR_HEIGHT`, clamped to 0 when `maxHours === 0`.

---

## Out of Scope

1. **Android bar chart** — **Deferred to 02-widget-visual-android.** The `buildBarChartSvg` helper and Medium widget bar chart rendering are handled entirely in that spec.

2. **Android GlassPanel opacity change** — **Deferred to 02-widget-visual-android.** Opacity adjustment to the Android `GlassPanel` inner card is out of scope here.

3. **iOS `Chart` component (native SwiftUI)** — **Descoped.** The `Chart` primitive requires iOS 16+ and its integration with the expo-widgets JSX compiler is unconfirmed. Stacked `RoundedRectangle` shapes cover iOS 14+ reliably.

4. **`GlassEffectContainer` blur effect** — **Descoped.** Available but designed for blur/transparency effects that may not render consistently across wallpapers. `RoundedRectangle` fill approach is the chosen implementation.

5. **`LinearGradient` component** — **Descoped.** If available in expo-widgets, it would be a simpler gradient approach, but two-layer `Rectangle` ZStack is the reliable fallback and is used here.

6. **Dynamic font sizing / accessibility** — **Descoped.** No changes to font size logic or Dynamic Type support. Explicitly listed as a non-goal in FEATURE.md.

7. **Custom font embedding in widget extension** — **Descoped.** Not part of this feature per FEATURE.md non-goals.

8. **Android Large widget** — **Descoped.** Separate future feature per FEATURE.md.

9. **Changes to data fetching or bridge logic beyond `isFuture`** — **Descoped.** No API changes, no new endpoints, no changes to `HoursData` shape beyond what is needed for the `isFuture` calculation.

10. **Lock screen accessory widget styles** — **Descoped.** `accessoryRectangular`, `accessoryCircular`, and `accessoryInline` sizes are not modified by this spec.

---

## Functional Requirements

### FR1: `isFuture` field in `WidgetDailyEntry`

**What:** Add `isFuture: boolean` to the `WidgetDailyEntry` interface and populate it in `buildDailyEntries()`.

**How:**
- In `src/widgets/types.ts`: add `isFuture: boolean` to `WidgetDailyEntry`.
- In `src/widgets/bridge.ts` `buildDailyEntries()`:
  - Compute `startOfToday = new Date(new Date().toDateString())` (midnight local time).
  - For entries from `daily[]`: `isFuture = new Date(entry.date) > startOfToday`.
  - For gap-filled entries: derive `reconstructedDate` from the Monday of the current ISO week plus `dayIndex` (0=Mon … 6=Sun); `isFuture = reconstructedDate > startOfToday`.
  - Accept optional `now: Date` parameter (default `new Date()`) for test injection.

**Success Criteria:**
- `WidgetDailyEntry` type includes `isFuture: boolean`.
- `buildDailyEntries()` returns `isFuture: false` for entries with date ≤ today.
- `buildDailyEntries()` returns `isFuture: true` for entries with date > today.
- Gap-filled future days have `isFuture: true`.
- Gap-filled past days have `isFuture: false`.
- Today's entry has `isFuture: false`.
- All existing `bridge.test.ts` tests still pass.

---

### FR2: iOS glass card components

**What:** Replace the plain-text hour/earnings display in Medium and Large widgets with two glassmorphic `ZStack` cards side-by-side.

**How:**
- In `src/widgets/ios/HourglassWidget.tsx`, add an `IosGlassCard` render helper:
  ```
  ZStack
    └─ RoundedRectangle (fill: '#1F1E2C', cornerRadius: 12, stroke: '#2F2E41', strokeWidth: 1)
    └─ VStack (padding: 10)
         └─ {children}
  ```
- `MediumWidget`: replace the top `HStack` containing two text VStacks with two `IosGlassCard` elements in an `HStack`, flex-equal. Left card: hoursDisplay label + value. Right card: earnings label + value.
- `LargeWidget`: same hero-row card treatment as Medium (top two cards).

**Success Criteria:**
- `MediumWidget` renders two `ZStack` elements with `RoundedRectangle` background in the hero row.
- Each card's `RoundedRectangle` has `cornerRadius ≥ 10`.
- Left card contains the hours display text.
- Right card contains the earnings text.
- `LargeWidget` hero row uses the same two-card layout.

---

### FR3: iOS gradient background

**What:** Replace the flat `URGENCY_COLORS[urgency]` solid fill on all three widget sizes with a two-layer gradient simulation.

**How:**
- Remove the `background` prop from the root `VStack` in `SmallWidget`, `MediumWidget`, and `LargeWidget`.
- Wrap each widget's root `VStack` in a `ZStack`:
  1. `Rectangle` fill `#0D0C14` (base dark layer — always present).
  2. `Rectangle` fill: urgency tint colour — 8-char hex strings at ~20% opacity (e.g. `#00FF8820` for green).
  3. The original content `VStack` on top.
- Define `URGENCY_TINTS` constant mapping urgency keys to 8-char hex tint colours.

**Success Criteria:**
- `SmallWidget`, `MediumWidget`, `LargeWidget` each render an outer `ZStack` with at least 2 `Rectangle` children.
- First `Rectangle` fill = `#0D0C14`.
- Second `Rectangle` fill is derived from the urgency tint (contains the urgency-specific colour channel).
- No `background` prop on the root content `VStack`.
- Urgency changes produce different second `Rectangle` fill values.

---

### FR4: iOS Large widget bar chart

**What:** Add a Mon–Sun daily bar chart below the hero row in the `LargeWidget`.

**How:**
- Add `IosBarChart` render helper in `src/widgets/ios/HourglassWidget.tsx`:
  - Props: `daily: WidgetDailyEntry[]` (7 entries), `accent: string`.
  - Renders an `HStack` of 7 columns.
  - Each column: `VStack(spacing: 2)` with:
    1. `Spacer` (fills remaining height — pushes bar down for short bars)
    2. `RoundedRectangle` (height = `hours / maxHours * MAX_BAR_HEIGHT`, min 0; cornerRadius: 3)
    3. `Text` (day label, 10pt, `#777777`)
  - Bar colours:
    - Today (`isToday: true`): `accent` colour
    - Past with hours > 0: `#4A4A6A`
    - Zero hours or future (`isFuture: true`): `#2F2E41`
  - `MAX_BAR_HEIGHT = 100`
  - Division-by-zero guard: if all hours = 0, all bar heights = 0.
- `LargeWidget`: add `IosBarChart` component below the hero cards row, above the detail rows.

**Success Criteria:**
- `IosBarChart` renders exactly 7 column children.
- Today's column bar uses the `accent` colour.
- Future columns use `#2F2E41`.
- Past with hours columns use `#4A4A6A`.
- Column with maximum hours has bar height ≈ `MAX_BAR_HEIGHT` (within 5%).
- Zero-hours column bar height = 0.
- Day labels render as 3-char strings.
- All-zero `daily` input: no division-by-zero error; all bars height 0.
- Single non-zero entry: that column bar height = `MAX_BAR_HEIGHT`.
- `LargeWidget` renders `IosBarChart` in its layout.

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `src/widgets/types.ts` | Add `isFuture: boolean` to `WidgetDailyEntry` interface |
| `src/widgets/bridge.ts` | Populate `isFuture` in `buildDailyEntries()`; add optional `now` param |
| `src/widgets/ios/HourglassWidget.tsx` | Glass cards, gradient background, Large bar chart |

### Files to Reference

| File | Purpose |
|------|---------|
| `src/widgets/android/HourglassWidget.tsx` | `GlassPanel` ZStack pattern (lines 144–172); `blProgressBar` SVG bar reference |
| `src/components/WeeklyBarChart.tsx` | Colour logic for today/future/past bars (lines 100–116) |
| `src/__tests__/widgets/bridge.test.ts` | Existing test patterns for `buildDailyEntries` |
| `src/lib/colors.ts` | `colors.surface` (`#16151F`), `colors.border` (`#2F2E41`) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/__tests__/widgets/widgetVisualIos.test.ts` | Unit tests for FR1–FR4 |

### Data Flow

```
HoursData.daily[{ date: YYYY-MM-DD, hours: N }]
  ↓ bridge.ts buildDailyEntries(daily, now?)
WidgetDailyEntry[7] { day, hours, isToday, isFuture }
  ↓ passed to IosBarChart({ daily, accent })
IosBarChart → HStack[7 VStack columns]
  each column: Spacer + RoundedRectangle(height proportional) + Text(day label)
```

### Key Constants (ios/HourglassWidget.tsx)

```typescript
const MAX_BAR_HEIGHT = 100;  // points

const URGENCY_TINTS: Record<string, string> = {
  none:   '#0D0C1433',  // near-transparent tint
  low:    '#00FF8820',  // green tint at ~12% opacity
  medium: '#F5C84220',  // gold tint at ~12%
  high:   '#FF453A20',  // red tint at ~12%
};

const CARD_BG     = '#1F1E2C';
const CARD_BORDER = '#2F2E41';

const BAR_PAST  = '#4A4A6A';
const BAR_MUTED = '#2F2E41';  // zero hours or future
```

### `buildDailyEntries` Changes (bridge.ts)

```typescript
// Accept optional now for testability
export function buildDailyEntries(
  daily: DailyEntry[],
  now: Date = new Date()
): WidgetDailyEntry[]

// Helper
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// For real entries:
isFuture: startOfDay(new Date(entry.date)) > startOfDay(now)

// For gap-filled entries:
const weekMonday = getWeekMonday(now);
const reconstructedDate = new Date(weekMonday);
reconstructedDate.setDate(weekMonday.getDate() + dayIndex);
isFuture: startOfDay(reconstructedDate) > startOfDay(now)
```

### `IosGlassCard` Render Helper

```
ZStack
  RoundedRectangle(fill='#1F1E2C', cornerRadius=12, stroke='#2F2E41', strokeWidth=1)
  VStack(padding=10)
    {children}
```

### `IosBarChart` Render Helper

```
HStack(spacing=4)
  for each entry in daily[7]:
    barHeight = maxHours > 0 ? (entry.hours / maxHours) * MAX_BAR_HEIGHT : 0
    barColor  = entry.isToday ? accent
              : (entry.isFuture || entry.hours === 0) ? '#2F2E41'
              : '#4A4A6A'
    VStack(spacing=2)
      Spacer()
      RoundedRectangle(fill=barColor, cornerRadius=3, height=barHeight)
      Text(entry.day, fontSize=10, color='#777777')
```

### Gradient Background Wrapper

```
// Replaces: <VStack background={URGENCY_COLORS[urgency]} ...>
ZStack
  Rectangle(fill='#0D0C14')
  Rectangle(fill=URGENCY_TINTS[urgency] ?? URGENCY_TINTS.none)
  VStack(padding=N)
    {existing content}
```

### Edge Cases

| Case | Handling |
|------|----------|
| `maxHours === 0` (no hours logged all week) | All bar heights = 0; no division by zero |
| `daily.length < 7` | `buildDailyEntries` always returns 7; `IosBarChart` handles any length defensively |
| Future day with `hours > 0` (theoretically impossible) | `isFuture: true` wins — bar renders muted |
| `now` at midnight exactly | `startOfDay(now) === todayStart`; today is not future |
| Unknown urgency key | `URGENCY_TINTS[urgency] ?? URGENCY_TINTS.none` fallback |

### Test File Location

`src/__tests__/widgets/widgetVisualIos.test.ts`

Tests cover:
- FR1: `buildDailyEntries` `isFuture` population (happy path + edge cases, injecting `now`)
- FR2: `IosGlassCard` structure (ZStack + RoundedRectangle present)
- FR3: Gradient background structure (outer ZStack, two Rectangle layers per widget size)
- FR4: `IosBarChart` bar count, colours, heights, labels, edge cases

Existing test: `src/__tests__/widgets/bridge.test.ts` must still pass after FR1 changes.
