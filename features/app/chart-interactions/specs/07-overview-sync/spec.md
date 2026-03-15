# 07-overview-sync

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What Is Being Built

07-overview-sync transforms the static Overview tab into a fully interactive, synchronized multi-chart dashboard. The screen currently displays 4 independent trend cards (earnings, hours, AI%, BrainLift) with no touch interaction and no time-range control.

After this spec, the Overview tab will:

1. **Have a 4W/12W toggle** — a segmented control in the header row that slices all 4 data arrays to the last 4 or 12 weeks.
2. **Support synchronized scrubbing** — touching any of the 4 sparklines activates a scrub cursor that appears simultaneously on all 4 charts at the same week index. The user can drag back through history and watch all metrics update together.
3. **Show a live week snapshot panel** — while scrubbing, a compact panel slides in below the toggle displaying all 4 metric values for the selected week. This panel animates out when the finger lifts.
4. **Use real historical data** — from `useWeeklyHistory` (built in 06) combined with live current-week values from `useHoursData` and `useAIData`.

### How It Works

The key architectural insight is that all 4 charts share the same data array length. A single `scrubWeekIndex: number | null` lives at the overview screen level. When any chart calls its `onScrubChange(i)` callback, the screen sets `scrubWeekIndex = i` and passes `externalCursorIndex={scrubWeekIndex}` to all 4 `TrendSparkline` instances.

`TrendSparkline` is extended with a new `externalCursorIndex?: number | null` prop. When this prop is non-null, the cursor renders at that index regardless of the chart's own internal gesture state. This allows the chart being touched to set the index for all other charts.

Data composition follows Decision 5 from the research: `useWeeklyHistory` provides persisted historical snapshots (up to 12 prior weeks), and the current in-progress week is appended as the last entry using live data from `useHoursData` and `useAIData`. All arrays are sliced to the last `window` entries (4 or 12) before rendering.

The snapshot panel uses `react-native-reanimated` shared values with `withSpring` for opacity and translateY, providing a smooth slide-in/slide-out as `scrubWeekIndex` transitions between null and non-null.

---

## Out of Scope

1. **Scrub gestures on the AI cone chart or weekly bar chart** — **Deferred to [04-ai-scrub](../04-ai-scrub/spec.md) and [05-earnings-scrub](../05-earnings-scrub/spec.md):** Those specs handle scrubbing on the AIConeChart and TrendSparkline from the home tab and AI tab perspectives respectively. This spec wires up overview-level sync using the same `onScrubChange` prop that 05 defines.

2. **Watermark overlays (faint guide labels, cap labels on sparklines)** — **Deferred to [02-watermarks](../02-watermarks/spec.md):** The cap label and guide visual system is defined there. This spec does not add cap labels to the overview sparklines.

3. **Editing or annotating past week data via scrub** — **Descoped:** The scrub interaction is read-only. There is no mechanism to edit historical snapshots.

4. **Push notifications for hitting targets in historical weeks** — **Descoped:** Not part of this feature.

5. **Overview tab scroll position persistence** — **Descoped:** The scroll position is not saved across navigation. This is acceptable given the short content length.

6. **Per-chart independent scrubbing** — **Descoped:** All 4 charts always share the same active index. There is no mode where charts scrub independently.

7. **Earnings history from the weekly snapshot store** — **Descoped:** `useWeeklyHistory` stores hours, AI%, and BrainLift. Earnings history continues to come from `useEarningsHistory` (payments API). The `hours[]` array in this spec uses `useWeeklyHistory` snapshots rather than deriving from earnings, which is more accurate.

---

## Functional Requirements

### FR1: `externalCursorIndex` prop on TrendSparkline

**What:** Add an `externalCursorIndex?: number | null` prop to `TrendSparkline`. When this prop is provided and non-null, the component renders a scrub cursor at that array index, using the same `buildScrubCursor` geometry as the internal gesture cursor. When null (or not provided), cursor is hidden unless the component's own gesture is active.

**Behaviour:**
- `externalCursorIndex` takes priority over internal gesture state for cursor rendering.
- The chart still handles its own `useScrubGesture` internally for `onScrubChange` callbacks.
- When `externalCursorIndex` is 0, the cursor renders at the leftmost data point.
- When `externalCursorIndex` equals `data.length - 1`, the cursor renders at the rightmost point.
- Cursor geometry reuses `buildScrubCursor(scrubX, scrubY, h, topPadding)` from `ScrubCursor.ts`.
- The existing internal gesture `onScrubChange` callback still fires when the user touches this chart.
- If `externalCursorIndex` is out of range, clamp to `[0, data.length - 1]`.

**Success Criteria:**
- `TrendSparkline` with `externalCursorIndex={2}` and no touch gesture renders cursor at index 2.
- `TrendSparkline` with `externalCursorIndex={null}` renders no cursor (same as before).
- `TrendSparkline` with `externalCursorIndex={0}` renders cursor at the first data point.
- Existing `TrendSparkline` usage without the prop is unaffected (no regression).

---

### FR2: `getWeekLabels` utility function

**What:** Add a pure function `getWeekLabels(window: number): string[]` to `src/lib/hours.ts`. Returns an array of `window` formatted week-start labels, oldest first, ending with the current week.

**Format:** `"Mar 3"` — month abbreviated (3 chars), day without leading zero.

**Behaviour:**
- `getWeekLabels(4)` returns the 4 most recent Monday dates as formatted strings, oldest first.
- `getWeekLabels(12)` returns the 12 most recent Monday dates.
- The last entry is always the Monday of the current local week.
- Uses local timezone (same as existing date math in `hours.ts`).

**Success Criteria:**
- `getWeekLabels(4)` returns array of length 4.
- `getWeekLabels(12)` returns array of length 12.
- Last entry matches `getMondayOfWeek(today)` formatted as "Mon D".
- All entries are valid Monday dates in chronological order (oldest → newest).

---

### FR3: Overview data composition hook (`useOverviewData`)

**What:** A new hook `useOverviewData(window: 4 | 12)` in `src/hooks/useOverviewData.ts` that composes all 4 metric arrays from `useWeeklyHistory`, `useEarningsHistory`, `useHoursData`, and `useAIData`.

**Data shape:**
```typescript
interface OverviewData {
  earnings: number[];       // length = window (or less if history shorter)
  hours: number[];          // length = window
  aiPct: number[];          // length = window
  brainliftHours: number[]; // length = window
  weekLabels: string[];     // aligned to data array length
}

interface UseOverviewDataResult {
  data: OverviewData;
  isLoading: boolean;
}
```

**Behaviour:**
- Calls `useWeeklyHistory()` for historical hours, AI%, and BrainLift snapshots.
- Calls `useEarningsHistory()` for historical earnings (independent source).
- Calls `useHoursData()` for current week hours (`.data.total`) and current week earnings (`.data.weeklyEarnings`).
- Calls `useAIData()` for current week AI% (midpoint: `Math.round((aiPctLow + aiPctHigh) / 2)`) and BrainLift (`brainliftHours`).
- Appends current week values as the last entry in each array.
- Slices all arrays to `window` entries (last N) using `.slice(-window)`.
- `weekLabels` = `getWeekLabels(window).slice(-data.earnings.length)` to match actual data array length.
- Returns `isLoading: true` until all dependent hooks have data.
- Edge case: if history is shorter than `window - 1`, uses all available history + current week (no padding).
- Edge case: if current week data is null/loading, uses `0` as placeholder for the current week entry.

**Success Criteria:**
- `window=4` → all arrays length min(history+1, 4).
- `window=12` → all arrays length min(history+1, 12).
- Current week is always the last entry in each array.
- Empty history → all arrays length 1 containing only current week values.
- `isLoading` is true while any dependent hook is loading.
- `weekLabels` length equals `earnings` length.

---

### FR4: Window toggle and scrub state in OverviewScreen

**What:** Rewrite `app/(tabs)/overview.tsx` to replace the static `TrendCard` components with interactive chart sections. Add a `4W / 12W` segmented control and the synchronized scrub state machine.

**Screen-level state:**
```typescript
const [window, setWindow] = useState<4 | 12>(4);
const [scrubWeekIndex, setScrubWeekIndex] = useState<number | null>(null);
```

**Behaviour:**
- The header row contains a `4W` / `12W` segmented control (two `TouchableOpacity` pills with active/inactive styling).
- On window change: reset `scrubWeekIndex` to null (avoids stale index after array shrinks).
- Each of the 4 chart sections receives `onScrubChange={setScrubWeekIndex}` and `externalCursorIndex={scrubWeekIndex}`.
- Each chart section displays: section label, live metric value when `scrubWeekIndex === null`, or the scrub-period value when `scrubWeekIndex !== null`.
- Chart color scheme: earnings=`colors.gold`, hours=`colors.success`, AI%=`colors.cyan`, BrainLift=`colors.violet`.
- `maxValue` and `showGuide` props passed through to `TrendSparkline` as before (earnings: maxEarnings, hours: weeklyLimit).

**Success Criteria:**
- Toggling 4W → 12W: data arrays extend, `scrubWeekIndex` resets to null.
- Toggling 12W → 4W: data arrays shrink, `scrubWeekIndex` resets to null.
- `onScrubChange` from any chart calls `setScrubWeekIndex`.
- All 4 charts receive the same `externalCursorIndex` value.
- Hero metric value updates when `scrubWeekIndex` changes.
- Active toggle button visually distinguished from inactive.

---

### FR5: Week snapshot panel

**What:** A compact animated panel that slides in while any chart is being scrubbed, displaying all 4 metric values for the selected week.

**Content layout:**
```
Week of Mar 3
Earnings $1,840   Hours 38.5h   AI% 72   BrainLift 4.2h
```

**Animation:**
- Uses `useSharedValue` + `useAnimatedStyle` with `withSpring` using `springPremium` preset.
- Opacity: 0 → 1 when `scrubWeekIndex !== null`, 0 when null.
- TranslateY: 8 → 0 when appears, 0 → 8 when disappears.
- Panel is always rendered (not conditionally unmounted) to allow smooth animation.

**Data:**
- Label: `weekLabels[scrubWeekIndex]` prefixed with `"Week of "`.
- Values: from `overviewData` arrays at `scrubWeekIndex` for all 4 metrics.
- Formatted: earnings as `$X,XXX`, hours as `XX.Xh`, AI% as `XX%`, BrainLift as `X.Xh`.

**Success Criteria:**
- Panel renders (with opacity > 0) when `scrubWeekIndex !== null`.
- Panel is hidden (opacity = 0) when `scrubWeekIndex === null`.
- Label shows correct week prefix + `weekLabels[scrubWeekIndex]`.
- Values match `overviewData` at `scrubWeekIndex` for all 4 metrics.
- Animation uses spring (not instant snap).

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/TrendSparkline.tsx` | Add `externalCursorIndex` prop (FR1) |
| `hourglassws/src/components/ScrubCursor.ts` | `buildScrubCursor` geometry used by FR1 |
| `hourglassws/src/hooks/useScrubGesture.ts` | `ScrubChangeCallback` type, `useScrubGesture` hook |
| `hourglassws/src/hooks/useWeeklyHistory.ts` | Historical snapshots (hours, AI%, BrainLift) |
| `hourglassws/src/hooks/useEarningsHistory.ts` | Historical earnings trend array |
| `hourglassws/src/hooks/useHoursData.ts` | Current week `total` hours and `weeklyEarnings` |
| `hourglassws/src/hooks/useAIData.ts` | Current week `aiPctLow`, `aiPctHigh`, `brainliftHours` |
| `hourglassws/src/lib/reanimated-presets.ts` | `springPremium` for snapshot panel animation |
| `hourglassws/src/lib/colors.ts` | `colors.gold`, `colors.success`, `colors.cyan`, `colors.violet` |
| `hourglassws/app/(tabs)/overview.tsx` | Full rewrite target |

### Files to Create

| File | Purpose |
|------|---------|
| `hourglassws/src/hooks/useOverviewData.ts` | New hook composing all 4 metric arrays (FR3) |

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/components/TrendSparkline.tsx` | Add `externalCursorIndex` prop + cursor rendering (FR1) |
| `hourglassws/src/lib/hours.ts` | Add `getWeekLabels(window)` utility function (FR2) |
| `hourglassws/app/(tabs)/overview.tsx` | Full rewrite with toggle, sync, snapshot panel (FR4, FR5) |

### Data Flow

```
useWeeklyHistory()
  .snapshots[]          ─────────────────────────────────────────────────┐
                                                                          ▼
useEarningsHistory()                                              useOverviewData(window)
  .trend[]              ─────────────────────────────────────────────────┤
                                                                          │
useHoursData()                                                            │ slices arrays
  .data.total                                                             │ to last N
  .data.weeklyEarnings  ─── append as currentWeek ──────────────────────┤ entries
                                                                          │
useAIData()                                                               │
  .data.aiPctLow/High                                                     │
  .data.brainliftHours  ─── append as currentWeek ──────────────────────┘
                                                         │
                                                         ▼
                                                  OverviewData
                                                         │
                                                         ▼
                                                 OverviewScreen
                                                  scrubWeekIndex: number | null
                                                  window: 4 | 12
```

### TrendSparkline Extension (FR1) — Implementation Notes

The extension adds:
1. `externalCursorIndex?: number | null` to `TrendSparklineProps`.
2. Compute `cursorActiveIndex: number | null` = `externalCursorIndex ?? (isScrubbing ? internalScrubIndex : null)`.
3. When `cursorActiveIndex !== null`: compute `scrubX = pixelXs[clampedIndex]`, `scrubY = toY(data[clampedIndex], ...)`, call `buildScrubCursor(scrubX, scrubY, h, topPadding)` and render result inside canvas.
4. Since TrendSparkline does not yet have gesture support, FR1 also adds:
   - `useScrubGesture({ pixelXs, enabled: !!onScrubChange })` internally.
   - `useAnimatedReaction` bridging `scrubIndex → runOnJS(onScrubChange)`.
   - `GestureDetector` wrapping the Canvas.
   - `onScrubChange?: ScrubChangeCallback` prop.

### useOverviewData (FR3) — Earnings Array Note

`useEarningsHistory().trend` already includes the current week as its last entry (it is a rolling 12-week array from the payments API). Therefore earnings is sliced directly: `earningsTrend.slice(-window)`. No separate current-week append is needed for earnings. All other metrics (hours, aiPct, brainliftHours) use `snapshots.slice(-window + 1)` + `[currentWeekValue]`.

### getWeekLabels (FR2) — Format

Uses `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })` for locale-consistent output. Computes `window` Mondays by starting from the current week's Monday and subtracting 7 days `(window - 1)` times.

### SnapshotPanel Animation (FR5)

```typescript
const panelOpacity = useSharedValue(0);
const panelTranslateY = useSharedValue(8);

useEffect(() => {
  if (scrubWeekIndex !== null) {
    panelOpacity.value = withSpring(1, springPremium);
    panelTranslateY.value = withSpring(0, springPremium);
  } else {
    panelOpacity.value = withSpring(0, springPremium);
    panelTranslateY.value = withSpring(8, springPremium);
  }
}, [scrubWeekIndex]);
```

### Edge Cases

| Case | Handling |
|------|---------|
| `externalCursorIndex` out of range | Clamp to `[0, data.length - 1]` in TrendSparkline |
| `window=4` but history has 0 past weeks | Arrays length 1 (current week only); single data point renders as circle |
| `useHoursData` returns null | Current week hours = 0, earnings falls back to earningsTrend last entry |
| `useAIData` returns null | Current week aiPct = 0, brainlift = 0 |
| Window change while scrubbing | `scrubWeekIndex` resets to null, snapshot panel hides |

### Test File Locations

| File | Tests for |
|------|---------|
| `hourglassws/src/components/__tests__/TrendSparkline.test.tsx` | FR1 |
| `hourglassws/src/lib/__tests__/hours.test.ts` | FR2 (extend existing) |
| `hourglassws/src/hooks/__tests__/useOverviewData.test.ts` | FR3 (new) |
| `hourglassws/app/(tabs)/__tests__/overview.test.tsx` | FR4, FR5 |
