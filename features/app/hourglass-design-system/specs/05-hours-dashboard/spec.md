# 05-hours-dashboard

**Status:** Ready for Implementation
**Created:** 2026-03-14
**Last Updated:** 2026-03-14
**Owner:** @hourglass

---

## Overview

**What is being built:**
A full rebuild of `app/(tabs)/index.tsx` — the primary screen of the Hourglass app.
The current screen uses `StyleSheet.create()` with hardcoded hex values and a View-based
bar chart. This spec replaces it with the full design system stack: `PanelGradient`,
`MetricValue`, `WeeklyBarChart`, `TrendSparkline`, `SectionLabel`, `Card`,
`SkeletonLoader`, and the updated `UrgencyBanner`.

**Why:**
This is the first screen a contractor sees. It must answer "where does my week stand?"
in under 3 seconds. The current screen has no state-aware gradient, no animated numbers,
and no Skia charts. The new screen uses the 5-state panel system and animated data
visualisation built in specs 02–04.

**How it is structured (3-zone layout):**

Zone 1 — Hero Panel (full-width `PanelGradient`):
- `MetricValue`: total hours this week (count-up animation)
- Subtitle: "of {weeklyLimit}h goal"
- State badge: "ON TRACK" / "BEHIND" / "CRITICAL" / "CRUSHED IT" / "GETTING STARTED"
- Sub-metrics row: today's hours | daily average | hours remaining

Zone 2 — Weekly Chart (`Card`):
- `SectionLabel`: "THIS WEEK"
- `WeeklyBarChart` (Mon–Sun bars, animated stagger)
- Day labels below each bar

Zone 3 — Earnings (`Card`):
- `SectionLabel`: "EARNINGS"
- `MetricValue`: weekly earnings (gold, `$` prefix)
- Sub-label: today's earnings
- `TrendSparkline`: 4-week earnings trend

Footer: `UrgencyBanner` (shown only when `urgencyLevel >= LOW`)

**New utilities added:**
- `computeDaysElapsed(now?)` in `src/lib/panelState.ts` — work days elapsed Mon–Fri
- `getWeeklyEarningsTrend(payments, numWeeks?)` in `src/lib/payments.ts` — aggregates
  payment records (raw API array) into weekly totals

**Old code removed:**
- `DailyBarChart.tsx` — superseded by `WeeklyBarChart`
- `StatCard.tsx` — superseded by `Card` + `MetricValue` + `SectionLabel`

---

## Out of Scope

1. **AI tab rebuild** — The `app/(tabs)/ai.tsx` screen is not touched in this spec.
   **Deferred to 06-ai-tab.**

2. **Approvals tab rebuild** — `app/(tabs)/approvals.tsx` is not touched.
   **Deferred to 07-approvals-tab.**

3. **Auth screens rebuild** — Auth flow screens are not changed.
   **Deferred to 08-auth-screens.**

4. **Full historical payments backfill** — The Crossover payments API supports arbitrary
   date ranges. This spec adds the `getWeeklyEarningsTrend` utility and `usePaymentHistory`
   hook; sparkline data is sourced from `usePaymentHistory(4)`. Accuracy of multi-week
   historical data is a follow-up optimization.
   **Descoped:** Full historical data accuracy guarantees.

5. **Overtime display** — The current screen shows `overtimeText` when `overtimeHours > 0`.
   The new screen shows `hoursRemaining` (which is 0 when overtime). Overtime is visible
   implicitly (total > weeklyLimit). A dedicated overtime badge is not part of this rebuild.
   **Descoped:** Explicit overtime label in hero panel.

6. **Custom pull-to-refresh animation** — Pull-to-refresh preserved as pass-through to
   `refetch()`. No redesign of the refresh UI.
   **Descoped:** Custom refresh indicator or animation.

7. **QA badge redesign** — QA badge preserved as-is with NativeWind classes. No new design.
   **Descoped:** Redesigned QA badge component.

8. **Settings modal rebuild** — Settings icon navigates to `/modal`. Modal itself not rebuilt.
   **Deferred to 08-auth-screens.**

9. **`MetricValue` prefix prop** — The "$" before earnings is rendered as a sibling `Text`
   element in a flex row. Adding a `prefix` prop to `MetricValue` belongs in 03-base-components.
   **Descoped:** `prefix` prop on `MetricValue`.

---

## Functional Requirements

---

### FR1: `computeDaysElapsed()` — work days elapsed utility

**File:** `src/lib/panelState.ts` (add to existing file)

**Signature:**
```typescript
export function computeDaysElapsed(now?: Date): number
```

**Behaviour:**
- Takes an optional `Date` (defaults to `new Date()` if not provided)
- Uses **local timezone** (not UTC) to determine the day of week
- Returns:
  - `0` — Monday at exactly 00:00:00 (start of week, no work day started yet)
  - `1` — Monday: any time after midnight through 23:59:59
  - `2` — Tuesday
  - `3` — Wednesday
  - `4` — Thursday
  - `5` — Friday, Saturday, or Sunday (weekend clamps to 5)

**Logic (local timezone):**
```
dayOfWeek = now.getDay()  // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat

if dayOfWeek === 0 (Sunday):  return 5
if dayOfWeek === 6 (Saturday): return 5
if dayOfWeek === 1 (Monday):
  if now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0:
    return 0   // Monday midnight edge
  else:
    return 1
else:  // Tue=2, Wed=3, Thu=4, Fri=5
  return dayOfWeek - 1  // Tue→1? No. dayOfWeek-1: Tue(2)→1...
```

Correct day mapping (Mon–Sun to 0–5 elapsed):
- Mon=1 (getDay) → 1 elapsed (except midnight edge → 0)
- Tue=2 → 2 elapsed
- Wed=3 → 3 elapsed
- Thu=4 → 4 elapsed
- Fri=5 → 5 elapsed
- Sat=6 → 5 elapsed (clamped)
- Sun=0 → 5 elapsed (clamped)

So the formula is: `Math.min(5, dayOfWeek === 0 ? 5 : dayOfWeek)` with the Monday midnight
edge case handled separately.

**Success Criteria:**
- `computeDaysElapsed(new Date('2026-03-09T08:00:00'))` → `1` (Monday 08:00)
- `computeDaysElapsed(new Date('2026-03-09T00:00:00'))` → `0` (Monday midnight)
- `computeDaysElapsed(new Date('2026-03-13T23:59:00'))` → `5` (Friday 23:59)
- `computeDaysElapsed(new Date('2026-03-14T10:00:00'))` → `5` (Saturday)
- `computeDaysElapsed(new Date('2026-03-15T10:00:00'))` → `5` (Sunday)
- `computeDaysElapsed(new Date('2026-03-11T12:00:00'))` → `3` (Wednesday)
- `computeDaysElapsed()` — called with no argument: no crash, returns a valid 0–5 value

---

### FR2: `getWeeklyEarningsTrend()` — earnings aggregation utility

**File:** `src/lib/payments.ts` (new file)

**Type definitions:**
```typescript
export interface Payment {
  amount: number;    // Total payment amount for the period
  from: string;      // YYYY-MM-DD start of period (UTC Monday)
  to: string;        // YYYY-MM-DD end of period (UTC Sunday)
}
```

**Signature:**
```typescript
export function getWeeklyEarningsTrend(
  payments: Payment[],
  numWeeks?: number  // default: 4
): number[]
```

**Behaviour:**
- Takes an array of `Payment` objects (raw Crossover API response items)
- Groups payments by week using `from` date as the week key
- Sums all payment amounts within the same week
- Returns an array of exactly `numWeeks` numbers in **chronological order** (oldest → newest)
- If fewer than `numWeeks` distinct weeks have data, **pads with zeros at the start**
- If more weeks than `numWeeks`, takes only the most recent `numWeeks`

**Success Criteria:**
- `getWeeklyEarningsTrend([])` → `[0, 0, 0, 0]` (4 zeros, default numWeeks=4)
- 4 payments with distinct `from` dates → `[w1, w2, w3, w4]` in chronological order
- 2 payments (2 distinct weeks) → `[0, 0, w1, w2]` (padded at start)
- `getWeeklyEarningsTrend(payments, 6)` with 4 weeks data → `[0, 0, w1, w2, w3, w4]`
- 2 payments sharing the same `from` date → summed into 1 week value

---

### FR3: Hero zone — PanelGradient + state badge + MetricValue + sub-metrics

**File:** `app/(tabs)/index.tsx`

**Structure:**
```
<PanelGradient state={panelState} className="rounded-2xl mb-4">
  <View className="p-6">
    <SectionLabel className="mb-1">THIS WEEK</SectionLabel>
    <MetricValue value={data.total} unit="h" sizeClass="text-5xl" colorClass="text-textPrimary" />
    <Text className="text-textSecondary text-sm font-sans mb-4">
      of {config.weeklyLimit ?? 40}h goal
    </Text>
    <StateBadge state={panelState} />
    {/* Sub-metrics row */}
    <View className="flex-row mt-4 gap-4">
      <SubMetric label="Today" value={data.today} unit="h" />
      <SubMetric label="Avg/day" value={data.average} unit="h" />
      <SubMetric label="Remaining" value={data.hoursRemaining} unit="h" />
    </View>
  </View>
</PanelGradient>
```

**`panelState` computation:**
```typescript
const daysElapsed = computeDaysElapsed();
const panelState = computePanelState(
  data?.total ?? 0,
  config?.weeklyLimit ?? 40,
  daysElapsed
);
```

**`StateBadge` inline component** (defined in `index.tsx`, not a separate file):

| PanelState | Text | Color |
|---|---|---|
| `onTrack` | `ON TRACK` | `text-success` |
| `behind` | `BEHIND` | `text-warning` |
| `critical` | `CRITICAL` | `text-critical` |
| `crushedIt` | `CRUSHED IT` | `text-gold` |
| `idle` | `GETTING STARTED` | `text-textSecondary` |

**Screen header** (above the 3 zones):
- Left: app name "Hourglass" (`text-textPrimary font-display-bold text-2xl`) + optional QA badge
- Right: settings `TouchableOpacity` with `testID="settings-button"` → `router.push('/modal')`

**Success Criteria:**
- `PanelGradient` receives `state` derived from `computePanelState`
- `MetricValue` renders with `value={data.total}` and `unit="h"`
- State badge has `testID="state-badge"` and correct text for each panel state
- Sub-metrics row shows today, average, and hoursRemaining values
- Header "Hourglass" title visible
- Settings button with `testID="settings-button"` navigates to `/modal` on press
- QA badge with `testID="qa-badge"` visible only when `config.useQA === true`
- No `StyleSheet.create` in `index.tsx`
- No hardcoded hex color strings in `index.tsx`

---

### FR4: Weekly chart zone — WeeklyBarChart in Card

**File:** `app/(tabs)/index.tsx`

**Structure:**
```
<Card className="mb-4">
  <SectionLabel className="mb-3">THIS WEEK</SectionLabel>
  <View style={{ height: 120 }} onLayout={e => setChartDims(e.nativeEvent.layout)}>
    <WeeklyBarChart
      data={dailyChartData}
      width={chartDims.width}
      height={chartDims.height}
      maxHours={Math.max(8, (config?.weeklyLimit ?? 40) / 5)}
    />
  </View>
  {/* Day labels */}
  <View className="flex-row mt-2">
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
      <Text key={day} className="flex-1 text-center text-textMuted text-xs font-sans">
        {day}
      </Text>
    ))}
  </View>
</Card>
```

**`DailyEntry[]` → `DailyHours[]` mapping:**
```typescript
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Mon=index 0 → getDay()=1, ..., Sun=index 6 → getDay()=0
const dailyChartData: DailyHours[] = DAYS.map((day, index) => {
  const entry = (data?.daily ?? []).find(e => {
    const d = new Date(e.date + 'T12:00:00');
    const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const normalised = dow === 0 ? 6 : dow - 1; // Mon=0, ..., Sun=6
    return normalised === index;
  });
  return {
    day,
    hours: entry?.hours ?? 0,
    isToday: entry?.isToday ?? false,
    isFuture: !entry || (!entry.isToday && entry.hours === 0),
  };
});
```

**Loading fallback:** `SkeletonLoader height={120}` when `isLoading && !data`

**Success Criteria:**
- `WeeklyBarChart` receives `data` as `DailyHours[]` with exactly 7 entries (Mon–Sun)
- Days without data appear as entries with `hours=0, isFuture=true`
- Chart container has `style={{ height: 120 }}`
- Day labels Mon–Sun rendered below chart
- `SkeletonLoader` shown when `isLoading=true` and `data` is null

---

### FR5: Earnings zone — MetricValue + TrendSparkline

**File:** `app/(tabs)/index.tsx`

**Structure:**
```
<Card className="mb-4">
  <SectionLabel className="mb-2">EARNINGS</SectionLabel>
  {/* Earnings hero row: "$" + animated number */}
  <View className="flex-row items-baseline gap-1">
    <Text className="text-gold font-display-bold text-3xl">$</Text>
    <MetricValue
      value={data?.weeklyEarnings ?? 0}
      unit=""
      precision={0}
      sizeClass="text-3xl"
      colorClass="text-gold"
    />
  </View>
  <Text className="text-textSecondary text-sm font-sans mt-1">
    Today: ${Math.round(data?.todayEarnings ?? 0).toLocaleString()}
  </Text>
  <View style={{ height: 60 }} onLayout={e => setSparklineDims(e.nativeEvent.layout)} className="mt-3">
    <TrendSparkline
      data={earningsTrend}
      width={sparklineDims.width}
      height={sparklineDims.height}
      color={colors.gold}
    />
  </View>
</Card>
```

**Earnings trend source:**
```typescript
const { data: paymentHistory } = usePaymentHistory(4);
const earningsTrend = getWeeklyEarningsTrend(paymentHistory ?? []);
```

**Loading fallback:**
- `SkeletonLoader height={40} className="mb-2"` — earnings amount
- `SkeletonLoader height={60}` — sparkline

**Success Criteria:**
- `MetricValue` renders with `value={data.weeklyEarnings}`, `colorClass="text-gold"`, `precision={0}`
- `"$"` prefix rendered as sibling `Text` in flex row
- Today's earnings displayed as secondary text
- `TrendSparkline` receives 4-element `number[]` from `getWeeklyEarningsTrend`
- `TrendSparkline` uses `color={colors.gold}`
- `SkeletonLoader` items shown when `isLoading=true` and data is null
- Source file does not contain hardcoded `#E8C97A` (uses `colors.gold`)

---

### FR6: Loading and error states

**File:** `app/(tabs)/index.tsx`

**Loading state** (initial: `isLoading=true && !data`):
- Hero zone: `SkeletonLoader` stack (height 80, then height 24 at 60% width, then height 40)
- Chart zone: `SkeletonLoader height={120}`
- Earnings zone: `SkeletonLoader height={40}` + `SkeletonLoader height={60}`
- No full-screen `ActivityIndicator` spinner

**Error state** (`error !== null && !data`):
```
<View className="bg-critical/20 rounded-2xl p-4 mb-4" testID="error-banner">
  <Text className="text-critical font-sans-semibold text-sm">
    Failed to load hours data
  </Text>
  <Text className="text-textSecondary text-xs mt-1">{error}</Text>
  <TouchableOpacity onPress={refetch} className="mt-2" testID="retry-button">
    <Text className="text-textPrimary font-sans-semibold text-sm">Retry</Text>
  </TouchableOpacity>
</View>
```
Chart and earnings zones still render (with zero/empty data).

**Stale cache state** (`isStale=true && cachedAt !== null`):
```
<Text className="text-warning text-xs text-center mt-2">
  Cached: {formatCachedAt(cachedAt)}
</Text>
```

**Pull-to-refresh:**
```
<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.success} />
```

**Success Criteria:**
- `SkeletonLoader` items present in all 3 zones when `isLoading=true && data === null`
- Error banner with `testID="error-banner"` visible when `error !== null && data === null`
- Retry button with `testID="retry-button"` calls `refetch()`
- Stale indicator visible when `isStale=true`
- `RefreshControl` present on the `ScrollView`
- No full-screen spinner (no `ActivityIndicator` rendering instead of the 3-zone layout)

---

### FR7: UrgencyBanner — updated to use design tokens

**File:** `src/components/UrgencyBanner.tsx`

**Current:** Uses `StyleSheet.create` with hardcoded hex colors.

**Updated:** Replace with NativeWind `className` using design tokens:

| Level | New className |
|---|---|
| `low` | `bg-warning` |
| `high` | `bg-warning` |
| `critical` | `bg-critical` |
| `expired` | `bg-critical` |

```typescript
const URGENCY_CLASSES: Record<Exclude<UrgencyLevel, 'none'>, string> = {
  low: 'bg-warning',
  high: 'bg-warning',
  critical: 'bg-critical',
  expired: 'bg-critical',
};

// Remove StyleSheet entirely. Use:
<View
  className={`${URGENCY_CLASSES[level]} py-2.5 px-4 rounded-xl items-center`}
  testID="urgency-banner"
>
  <Text className="text-background font-sans-semibold text-sm">
    {level === 'expired' ? 'Expired' : `Deadline in ${label}`}
  </Text>
</View>
```

**Success Criteria:**
- `UrgencyBanner.tsx` contains no `StyleSheet` import or `StyleSheet.create` call
- `UrgencyBanner.tsx` contains no hardcoded hex strings (`/#[0-9A-Fa-f]{3,8}/`)
- `testID="urgency-banner"` preserved on outer `View`
- Component uses `className` for all styling
- `UrgencyBanner` returns `null` when `level === 'none'` (behaviour unchanged)
- All existing `UrgencyBanner` tests continue to pass

---

## Technical Design

---

### Files to Reference

| File | Purpose |
|---|---|
| `hourglassws/app/(tabs)/index.tsx` | Current screen — full replace |
| `hourglassws/src/lib/panelState.ts` | Add `computeDaysElapsed()` here |
| `hourglassws/src/lib/hours.ts` | `HoursData`, `UrgencyLevel`, `getUrgencyLevel` types |
| `hourglassws/src/components/PanelGradient.tsx` | Hero panel component |
| `hourglassws/src/components/MetricValue.tsx` | Animated count-up number |
| `hourglassws/src/components/WeeklyBarChart.tsx` | Skia bar chart, `DailyHours` interface |
| `hourglassws/src/components/TrendSparkline.tsx` | Skia line chart |
| `hourglassws/src/components/Card.tsx` | Surface container |
| `hourglassws/src/components/SectionLabel.tsx` | Section header |
| `hourglassws/src/components/SkeletonLoader.tsx` | Loading placeholder |
| `hourglassws/src/components/UrgencyBanner.tsx` | Update: replace StyleSheet with className |
| `hourglassws/src/hooks/useHoursData.ts` | Hours + earnings data hook |
| `hourglassws/src/hooks/usePayments.ts` | Reference for new `usePaymentHistory` hook |
| `hourglassws/src/hooks/useConfig.ts` | Config hook |
| `hourglassws/src/lib/colors.ts` | Color tokens (for TrendSparkline gold) |
| `hourglassws/tailwind.config.js` | Design token reference |
| `hourglassws/BRAND_GUIDELINES.md` | Visual identity rules |

---

### Files to Create

| File | Purpose |
|---|---|
| `hourglassws/src/lib/payments.ts` | `Payment` interface + `getWeeklyEarningsTrend()` |
| `hourglassws/src/hooks/usePaymentHistory.ts` | Fetches last N weeks of payment records |

---

### Files to Modify

| File | Change |
|---|---|
| `hourglassws/app/(tabs)/index.tsx` | Full rebuild — 3-zone layout using design system |
| `hourglassws/src/lib/panelState.ts` | Add `computeDaysElapsed()` export |
| `hourglassws/src/components/UrgencyBanner.tsx` | Replace StyleSheet with NativeWind className |

---

### Files to Delete

| File | Reason |
|---|---|
| `hourglassws/src/components/DailyBarChart.tsx` | Superseded by `WeeklyBarChart` (Skia) |
| `hourglassws/src/components/StatCard.tsx` | Superseded by `Card` + `MetricValue` + `SectionLabel` |

**Before deleting:** Verify neither file is imported anywhere except `index.tsx`:
```bash
grep -r "DailyBarChart\|StatCard" hourglassws/src hourglassws/app
```

---

### Data Flow

```
useConfig()
    └── config.weeklyLimit, config.useQA
                │
                ▼
useHoursData()
    ├── data.total, data.average, data.today
    ├── data.daily (DailyEntry[])
    ├── data.weeklyEarnings, data.todayEarnings
    ├── data.hoursRemaining
    ├── data.timeRemaining (ms) → getUrgencyLevel() → UrgencyBanner
    ├── isLoading, isStale, cachedAt, error
    └── refetch

usePaymentHistory(4)
    └── Payment[] → getWeeklyEarningsTrend() → number[4]

computeDaysElapsed()
    └── number (0–5)

computePanelState(data.total, config.weeklyLimit, daysElapsed)
    └── PanelState → PanelGradient + StateBadge

data.daily (DailyEntry[])
    └── mapDailyToChartData() → DailyHours[7] → WeeklyBarChart
```

---

### `usePaymentHistory` hook design

```typescript
// src/hooks/usePaymentHistory.ts
export function usePaymentHistory(numWeeks?: number): {
  data: Payment[] | null;
  isLoading: boolean;
}
```

Fetches payments for the last `numWeeks` weeks using a wider date range:
- `from`: Monday of (current week − numWeeks + 1)
- `to`: Sunday of current week

Uses the same Crossover payments API as `usePayments`. Unlike `usePayments`, this hook
returns the raw `Payment[]` array (not a single aggregated `PaymentsResponse`).

The screen calls `getWeeklyEarningsTrend(data ?? [])` to aggregate into a `number[]`.

---

### `DailyEntry[]` to `DailyHours[]` mapping

`HoursData.daily` contains entries only for days with data. `WeeklyBarChart` expects 7 slots.
The mapping creates all 7 entries and matches by day-of-week:

```typescript
function mapDailyToChartData(daily: DailyEntry[]): DailyHours[] {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return DAYS.map((day, index) => {
    // index 0=Mon, 1=Tue, ..., 6=Sun
    const entry = daily.find(e => {
      const d = new Date(e.date + 'T12:00:00'); // noon avoids DST edge
      const dow = d.getDay();
      const normalised = dow === 0 ? 6 : dow - 1; // Sun=6, Mon=0
      return normalised === index;
    });
    return {
      day,
      hours: entry?.hours ?? 0,
      isToday: entry?.isToday ?? false,
      isFuture: !entry || (!entry.isToday && entry.hours === 0),
    };
  });
}
```

---

### `StateBadge` inline component

Defined inside `index.tsx` (not a separate file):

```typescript
const STATE_LABELS: Record<PanelState, string> = {
  onTrack: 'ON TRACK',
  behind: 'BEHIND',
  critical: 'CRITICAL',
  crushedIt: 'CRUSHED IT',
  idle: 'GETTING STARTED',
};

const STATE_COLORS: Record<PanelState, string> = {
  onTrack: 'text-success',
  behind: 'text-warning',
  critical: 'text-critical',
  crushedIt: 'text-gold',
  idle: 'text-textSecondary',
};

function StateBadge({ state }: { state: PanelState }) {
  return (
    <Text
      className={`font-sans-semibold text-xs tracking-widest ${STATE_COLORS[state]}`}
      testID="state-badge"
    >
      {STATE_LABELS[state]}
    </Text>
  );
}
```

---

### Edge Cases

| Case | Handling |
|---|---|
| `config` is null | Show skeletons; all `config?.x ?? default` guards |
| `data` is null + `isLoading` | Show `SkeletonLoader` in all zones |
| `data` is null + `error` | Show error banner; chart/earnings render with zero data |
| `data.daily` is empty | `WeeklyBarChart` receives 7 entries with `hours=0, isFuture=true` |
| `data.weeklyEarnings === 0` | MetricValue shows "0", TrendSparkline shows flat line |
| Weekend | `computeDaysElapsed()` → 5; `computePanelState` returns `crushedIt` or `idle` |
| `paymentHistory` is null | `getWeeklyEarningsTrend([])` → `[0,0,0,0]` → flat sparkline |
| `config.weeklyLimit === 0` | `computePanelState` returns `'idle'`; goal text "of 0h goal" |

---

### Test File Locations

| Test | File |
|---|---|
| `computeDaysElapsed` | `src/lib/__tests__/panelState.test.ts` (extend existing) |
| `getWeeklyEarningsTrend` | `src/lib/__tests__/payments.test.ts` (new) |
| `HoursDashboard` render | `app/(tabs)/__tests__/index.test.tsx` (new) |
| `UrgencyBanner` updated | `src/components/__tests__/UrgencyBanner.test.tsx` (add assertions) |

---

### Mock Strategy for Screen Tests

```typescript
jest.mock('@/src/hooks/useHoursData');
jest.mock('@/src/hooks/usePaymentHistory');
jest.mock('@/src/hooks/useConfig');
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
// @shopify/react-native-skia already mocked in __mocks__/
```

**NativeWind className testing** (from 01-nativewind-verify findings):
- Do NOT assert on rendered `className` props — they are hashed in Jest
- Use **source-file static analysis**:
  ```typescript
  const source = fs.readFileSync(path.resolve(__dirname, '../index.tsx'), 'utf-8');
  expect(source).toContain('text-gold');
  expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  ```

---

### Import Map for `index.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useConfig } from '@/src/hooks/useConfig';
import { useHoursData } from '@/src/hooks/useHoursData';
import { usePaymentHistory } from '@/src/hooks/usePaymentHistory';
import { computePanelState, computeDaysElapsed } from '@/src/lib/panelState';
import { getUrgencyLevel } from '@/src/lib/hours';
import { getWeeklyEarningsTrend } from '@/src/lib/payments';
import { colors } from '@/src/lib/colors';
import PanelGradient from '@/src/components/PanelGradient';
import MetricValue from '@/src/components/MetricValue';
import WeeklyBarChart from '@/src/components/WeeklyBarChart';
import TrendSparkline from '@/src/components/TrendSparkline';
import Card from '@/src/components/Card';
import SectionLabel from '@/src/components/SectionLabel';
import SkeletonLoader from '@/src/components/SkeletonLoader';
import { UrgencyBanner } from '@/src/components/UrgencyBanner';
import type { PanelState } from '@/src/lib/panelState';
import type { DailyHours } from '@/src/components/WeeklyBarChart';
```

No `StyleSheet` import. No hardcoded hex color values.
