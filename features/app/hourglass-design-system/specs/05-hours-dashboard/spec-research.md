# Spec Research: 05-hours-dashboard

## Problem Context

`app/(tabs)/index.tsx` is the primary screen of the app — the first thing a contractor sees.
It currently uses `StyleSheet.create()` with hardcoded hex values and a View-based bar chart.
It needs a **full rebuild** using:
- `PanelGradient` component (5-state hero background)
- `MetricValue` (count-up hero numbers)
- `WeeklyBarChart` (Skia animated bars)
- `UrgencyBanner` (updated to use design tokens)
- `SectionLabel` + `Card` for structure
- `SkeletonLoader` while data fetches

The rebuilt screen should answer "where does my week stand?" in <3 seconds.

## Exploration Findings

**Current index.tsx structure:**
- SafeAreaView with dark background
- Header: app name + settings button
- Hero section: total hours (large text) + weekly target
- Progress bar: visual hours progress (View-based)
- Stats row: today's hours, daily average, earnings
- Bar chart: `DailyBarChart` component (View-based)
- Urgency banner: `UrgencyBanner` component
- All colors: hardcoded (#000000, #0A0A0F, #00FF88, #FF9500, etc.)
- Data: `useHoursData()` hook

**Data available from `useHoursData()`:**
```typescript
interface HoursData {
  total: number;           // Hours worked this week
  today: number;           // Hours today
  dailyAverage: number;    // Average hours/day this week
  hoursRemaining: number;  // Hours left to reach weekly target
  weeklyEarnings: number;  // Earnings this week ($)
  todayEarnings: number;   // Today's earnings ($)
  weeklyHours: number;     // Weekly target (from config)
  timeRemaining: string;   // Human-readable time remaining
  deadline: string;        // Deadline label ("Mon midnight GMT")
  urgencyLevel: UrgencyLevel;
}
```

**Target layout (3-zone design):**

Zone 1 — Hero Panel (full-width, PanelGradient state-aware):
- Large MetricValue: total hours this week (count-up from 0)
- Subtitle: "of {weeklyHours}h goal"
- PanelState badge: "ON TRACK" / "BEHIND" / "CRITICAL" / "CRUSHED IT" / "GETTING STARTED"
- SubMetric row: today's hours | daily average | hours remaining

Zone 2 — Weekly Chart (Card):
- SectionLabel: "THIS WEEK"
- WeeklyBarChart (Mon–Sun bars, animated stagger)
- Day labels below each bar

Zone 3 — Earnings (Card):
- SectionLabel: "EARNINGS"
- MetricValue: weekly earnings ($)
- MetricValue small: today's earnings
- TrendSparkline: 4-week trend

Footer: UrgencyBanner (shown only when urgencyLevel >= LOW)

**Skeleton loading:** All three zones show SkeletonLoader rows while data is `isLoading`.

**Navigation:**
- Settings icon (top right) → navigate to `/modal`
- Tab bar at bottom (managed by tabs layout, not this screen)

## Key Decisions

1. **PanelState computed on the fly**: `computePanelState(data.total, data.weeklyHours, daysElapsed)`
   called in the screen, passed to `PanelGradient`.

2. **daysElapsed computation**: Utility function in `src/lib/panelState.ts` that takes current
   Date and returns 0–5 (Mon–Fri clamped). Use local timezone.

3. **Earnings TrendSparkline**: Requires historical weekly earnings. `usePayments()` hook
   returns payment records — need to aggregate last 4 weeks. Add a `useWeeklyEarningsTrend`
   helper or expand `usePayments` to return grouped weekly totals.
   **Decision**: Add `getWeeklyEarningsTrend(payments, numWeeks)` to `src/lib/payments.ts`.

4. **Remove `DailyBarChart`**: The old View-based chart component is superseded by
   `WeeklyBarChart` (Skia). After migration, the old file can be deleted.

5. **Remove `StatCard`**: Superseded by `Card` + `MetricValue` + `SectionLabel`. Delete after.

6. **Layout strategy**: `ScrollView` wrapping all zones (not FlatList — content is fixed).
   `SafeAreaView` from `react-native-safe-area-context` (needs `cssInterop` for NativeWind).

## Interface Contracts

```typescript
// app/(tabs)/index.tsx — rebuilt screen (no exported interface, it's a page)

// New utility needed:
// src/lib/panelState.ts (extending spec 02)
export function computeDaysElapsed(now?: Date): number
// → Returns 0 (Monday 00:00) through 5 (Friday EOD+)
// Sources: now ← new Date() (current time)

// New utility needed:
// src/lib/payments.ts — add to existing file
export function getWeeklyEarningsTrend(
  payments: Payment[],  // from usePayments()
  numWeeks?: number     // default: 4
): number[]
// Sources: payments ← usePayments() API response
```

**Screen props**: none (Expo Router page component)

**Hooks consumed:**
- `useHoursData()` — hours + earnings
- `usePayments()` — for trend sparkline
- `useConfig()` — weeklyHours target

## Test Plan

### computeDaysElapsed
- [ ] Monday 08:00 → 1
- [ ] Monday 00:00 → 0 (edge: very start of week)
- [ ] Friday 23:59 → 5
- [ ] Saturday 10:00 → 5 (weekend clamps to 5)
- [ ] Sunday 10:00 → 5 (weekend clamps to 5)
- [ ] Wednesday 12:00 → 3

### getWeeklyEarningsTrend
- [ ] Empty payments → returns array of zeros (numWeeks length)
- [ ] 4 weeks of data → returns 4 amounts in chronological order
- [ ] Partial week data → last week included as partial amount
- [ ] numWeeks=6 with 4 weeks data → pads with zeros at start

### Hours Dashboard (integration/render)
- [ ] Renders without crash when data loading
- [ ] SkeletonLoaders shown when `isLoading=true`
- [ ] PanelGradient receives correct state from computePanelState
- [ ] MetricValue animates from 0 to total hours on mount
- [ ] WeeklyBarChart renders with correct data shape
- [ ] UrgencyBanner hidden when urgencyLevel === NONE
- [ ] UrgencyBanner shown when urgencyLevel >= LOW
- [ ] Settings button navigates to /modal

**Mocks Needed:**
- `useHoursData` → mock hook returning test data + isLoading state
- `usePayments` → mock hook returning payment records
- `useConfig` → mock hook returning weeklyHours
- `@shopify/react-native-skia` → existing mock from spec 04
- `expo-router` → `useRouter` mock for navigation

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(tabs)/index.tsx` — existing screen (to rebuild)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/useHoursData.ts` — data hook
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/usePayments.ts` — payments hook
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/hours.ts` — calculateHours, UrgencyLevel
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/panelState.ts` — computePanelState (from spec 02)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/components/UrgencyBanner.tsx` — urgency component (update, don't delete)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/BRAND_GUIDELINES.md` — layout principles

## Complexity

**L** — Full screen rebuild, 3-zone layout, all 5 new components used, new utility functions,
sparkline data aggregation, complex conditional rendering (loading/error/data states).

## FRs

1. `computeDaysElapsed()` utility — returns work days elapsed in current week (0–5)
2. `getWeeklyEarningsTrend()` utility — aggregates payment records into weekly totals array
3. Hero zone — PanelGradient with state badge, MetricValue hero hours, sub-metrics row
4. Weekly chart zone — WeeklyBarChart in Card with SectionLabel, SkeletonLoader fallback
5. Earnings zone — MetricValue weekly earnings, TrendSparkline 4-week trend, in Card
6. Loading/error states — SkeletonLoaders for all zones, error banner for network failure
7. UrgencyBanner — updated to use design tokens (className), shown per urgencyLevel threshold
