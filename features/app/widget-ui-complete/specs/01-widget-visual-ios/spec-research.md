# Spec Research: 01-widget-visual-ios

## Problem Context

The iOS widget has three visual gaps against the original UI guidance:

1. **No glass cards** — Medium and Large show hours/earnings as plain text floating on a solid background. The guidance says "top two cards (Hours & Earned) side-by-side" — visually boxed glassmorphic elements.
2. **Flat solid background** — All sizes use `URGENCY_COLORS[urgency]` (e.g. `#1A1A2E`) as a flat fill. The guidance says "subtle top-to-bottom gradient."
3. **No bar chart on Large** — The Large widget shows only text rows. The guidance says "only the Large widget should show the daily bar charts (Mon/Tue/Wed… Mon–Sun)."

Additionally, `WidgetDailyEntry` lacks an `isFuture` flag, which is needed to mute future-day bars in the chart. This data change is scoped to this spec since both platforms need it.

---

## Exploration Findings

### Available iOS primitives (`@expo/ui/swift-ui`)

Confirmed available (from `node_modules/@expo/ui/build/swift-ui/index.d.ts`):
- Layout: `VStack`, `HStack`, `ZStack`, `Spacer`, `Group`
- Text: `Text`
- Shapes: `Rectangle`, `RoundedRectangle`, `Ellipse`, `Capsule`, `Circle`
- Visual: `GlassEffectContainer`, `AccessoryWidgetBackground`
- Data viz: `Chart` (iOS 16+), `Gauge`, `ProgressView`
- Images: `Image` (SF Symbols / local file URI — no SVG string rendering)

**Key insight:** `RoundedRectangle` with a `fill` colour is sufficient for glass cards (ZStack background layer). `Chart` is available for native bar charts on iOS 16+, but stacked `RoundedRectangle` shapes in an `HStack` are simpler and support iOS 14+.

### Current iOS widget structure (`src/widgets/ios/HourglassWidget.tsx`)

**SmallWidget (lines 59–105):**
- ZStack > VStack (background=solidColour, padding=12)
- Renders: hoursDisplay (28pt) + Spacer + paceBadge label + stale + manager badge
- Background: `URGENCY_COLORS[urgency]` — flat solid

**MediumWidget (lines 110–174):**
- ZStack > VStack (background=solidColour, padding=12)
- Top: HStack with two text VStacks (hours left, earnings right) + Spacer between
- Bottom: today row, hoursRemaining text, stale, manager badge
- No card boxing — just text on a flat background

**LargeWidget (lines 179–253):**
- Same flat structure as Medium
- Extra row for AI usage + BrainLift text
- `padding={16}` (updated in widget-layout-polish)
- No bar chart

### WidgetDailyEntry and buildDailyEntries (`src/widgets/types.ts`, `src/widgets/bridge.ts`)

Current type (lines 10–17 of types.ts):
```typescript
export interface WidgetDailyEntry {
  day: string;      // "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  hours: number;    // 0–24, rounded to 1 decimal
  isToday: boolean;
}
```

`buildDailyEntries()` (bridge.ts lines 71–90):
- Takes `DailyEntry[]` from HoursData (each entry has a `.date` string YYYY-MM-DD)
- Returns exactly 7 entries in Mon[0]–Sun[6] order; missing days filled with `hours: 0, isToday: false`
- Does NOT compute `isFuture` — future days appear as `hours: 0, isToday: false` (same as past days with no hours worked)

Fix: add `isFuture: boolean` to `WidgetDailyEntry`; populate it in `buildDailyEntries()` as:
```typescript
isFuture: new Date(entry.date) > startOfToday()
// startOfToday() = new Date(new Date().toDateString()) — midnight local time
```

For gap-filled (missing) entries: compare the reconstructed date (derived from the Monday of the current week + dayIndex) to today.

---

## Key Decisions

### Decision 1: Bar chart implementation — native Chart vs stacked shapes
Using stacked `RoundedRectangle` shapes inside an `HStack` (one column per day, with proportional heights via `Spacer` fill above the bar). This approach:
- Works on iOS 14+ (Chart requires iOS 16+)
- Uses primitives already proven to work in expo-widgets
- No risk of Chart API incompatibility with the expo-widgets JSX compiler

**Rationale:** The `Chart` component is listed in the type definitions but its integration with expo-widgets' SwiftUI JSX compiler is unconfirmed. Stacked shapes are guaranteed to work.

### Decision 2: Glass card simulation
`ZStack` with a `RoundedRectangle` background layer (fill: card colour, cornerRadius: 12) + `VStack` content on top. This matches the Android `GlassPanel` pattern conceptually.

Card colours:
- Outer (border): `#2F2E41` — matches Android
- Inner content area: `#1F1E2C` (slightly higher contrast than current `#16151F`)

**Rationale:** Pure SwiftUI — no external libraries needed. `GlassEffectContainer` is also available but is designed for blur/transparency effects that may not render well on all iOS wallpapers.

### Decision 3: Gradient background
`ZStack` with:
1. `Rectangle` fill base colour (`#0D0C14`)
2. `Rectangle` fill with urgency tint colour at low opacity (use the 8-char hex for alpha: e.g. `#00FF8820` for 12% opacity green)

Both top and bottom of the gradient are approximately the base colour; the tint adds depth at 40% height. This simulates a linear gradient without needing a `LinearGradient` component.

**Rationale:** If `LinearGradient` is not available as a JSX primitive in expo-widgets, the two-rectangle ZStack is the reliable fallback. If it IS available, it's a simple upgrade.

### Decision 4: Bar chart sizing in Large widget
Large widget is ~338×354pt. After hero row (~80pt) + padding (32pt) the bar chart gets ~220pt height. Bar chart itself: 7 columns, max bar height ~120pt, day labels below.

Columns: `VStack(spacing: 2)` with `Spacer()` above and `RoundedRectangle` below. The Spacer fills remaining height so taller bars push the rectangle down and shorter bars have more spacer.

---

## Interface Contracts

### Updated `WidgetDailyEntry` (types.ts)

```typescript
export interface WidgetDailyEntry {
  day: string;      // "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  hours: number;    // 0–24, rounded to 1 decimal
  isToday: boolean;
  isFuture: boolean; // true if this calendar day is strictly after today (local time)
}
```

Sources:
- `day` ← existing, from `dateToDayIndex()` in bridge.ts
- `hours` ← existing, from `DailyEntry.hours`
- `isToday` ← existing
- `isFuture` ← **new**, computed: `new Date(entry.date) > startOfToday()`; for gap-filled days: `reconstructedDate > startOfToday()`

### `buildDailyEntries` updated contract (bridge.ts)

```typescript
export function buildDailyEntries(daily: DailyEntry[]): WidgetDailyEntry[]
// Returns 7 entries Mon[0]–Sun[6]
// isFuture is true when the entry's calendar date is after midnight of today (local)
// Gap-filled entries: isFuture derived from week-start + dayIndex vs today
```

### `buildIosBarChart` (new helper in ios/HourglassWidget.tsx, NOT exported)

This is a render function, not a pure function — it returns JSX. Its contract:

```typescript
function IosBarChart({ daily, accent }: {
  daily: WidgetDailyEntry[];   // 7 entries Mon–Sun
  accent: string;              // urgency accent colour for today bar
}): JSX.Element
// Returns HStack of 7 columns, each a VStack(Spacer + RoundedRectangle + Text)
// Bar heights are proportional: hours / maxHours * MAX_BAR_HEIGHT (constant: 100)
// Colours: accent (isToday), '#4A4A6A' (past, has hours), '#2F2E41' (zero/future muted)
// Day labels: 10pt, '#777777', truncated to 3 chars ("Mon", "Tue", etc.)
```

---

## Test Plan

### FR1: `isFuture` in WidgetDailyEntry

**Contract:** `buildDailyEntries()` populates `isFuture` correctly.

Happy path:
- [ ] Entry with date = yesterday → `isFuture: false`
- [ ] Entry with date = today → `isFuture: false`
- [ ] Entry with date = tomorrow → `isFuture: true`
- [ ] Entry with date = next Sunday → `isFuture: true`

Edge cases:
- [ ] Gap-filled entries for future days → `isFuture: true`
- [ ] Gap-filled entries for past days → `isFuture: false`
- [ ] All 7 entries on the same week as today: only days after today are `isFuture: true`

Mocks: `Date.now()` override (or inject `now` parameter to `buildDailyEntries`)

### FR2: iOS glass card layout

**Contract:** MediumWidget renders two distinct card ZStacks side by side.

- [ ] MediumWidget snapshot contains two `ZStack` elements with `RoundedRectangle` background fills
- [ ] First card contains hoursDisplay text
- [ ] Second card contains earnings text
- [ ] Both cards have cornerRadius ≥ 10

### FR3: iOS gradient background

**Contract:** All widget sizes use ZStack with Rectangle layers rather than solid VStack background.

- [ ] SmallWidget: outer ZStack contains at least 2 Rectangle elements
- [ ] MediumWidget: same
- [ ] LargeWidget: same
- [ ] Base Rectangle fill = `#0D0C14`
- [ ] Second Rectangle fill includes urgency tint colour

### FR4: iOS Large bar chart

**Contract:** LargeWidget renders 7 bar columns.

Happy path:
- [ ] IosBarChart renders 7 child columns (one per day)
- [ ] Today column uses accent colour (not `#4A4A6A`)
- [ ] Future columns use muted colour (`#2F2E41`)
- [ ] Column with highest hours has bar height ≈ MAX_BAR_HEIGHT (within 5%)
- [ ] Zero-hours column has bar height = 0 (Spacer fills entirely)
- [ ] Day labels render as 3-char strings ("Mon", "Tue", etc.)

Edge cases:
- [ ] All hours = 0 (first day of week): no division by zero; bars all 0 height
- [ ] Single day with hours (today only): today bar at 100%, others at 0%
- [ ] daily[] has fewer than 7 entries: chart renders empty bars for missing days (bridge always returns 7, but belt-and-suspenders)

---

## Files to Reference

### Primary
- `src/widgets/ios/HourglassWidget.tsx` — full file (276 lines)
- `src/widgets/types.ts` — WidgetDailyEntry type (lines 10–17)
- `src/widgets/bridge.ts` — `buildDailyEntries()` (lines 60–90), `dateToDayIndex()` (lines 60–63)

### Patterns
- `src/widgets/android/HourglassWidget.tsx` — `GlassPanel` (lines 144–172) for card pattern reference; `blProgressBar` for SVG bar pattern
- `src/components/WeeklyBarChart.tsx` — colour logic for today/future/past bars (lines 100–116)

### Tests
- `src/__tests__/widgets/bridge.test.ts` — `buildDailyEntries` test patterns
- `src/__tests__/widgets/__tests__/widgetPolish.test.ts` — SVG string assertion patterns

### Design system
- `src/lib/colors.ts` — `colors.surface` (`#16151F`), `colors.border` (`#2F2E41`), accent tokens
