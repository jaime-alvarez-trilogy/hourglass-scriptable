# 05-earnings-scrub

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

**05-earnings-scrub** adds interactive scrubbing to the TrendSparkline component on the home tab, allowing users to drag a finger across the earnings sparkline to inspect individual weekly earnings values. The hero earnings number and its sub-label update live during the gesture.

### What Is Being Built

1. **`getWeekLabels(count)` utility** — pure date math function in `src/lib/hours.ts` that returns an array of human-readable week-start labels (e.g. `"Mar 3"`) for the last `count` weeks, oldest first.

2. **TrendSparkline scrub props** — two new optional props on the existing `TrendSparklineProps` interface:
   - `onScrubChange?: (index: number | null) => void` — callback bridged via `useAnimatedReaction → runOnJS`
   - `weekLabels?: string[]` — accepted as a prop (forwarded for display) but not rendered inside the canvas

3. **TrendSparkline gesture layer** — wraps the existing `<Canvas>` in a `<GestureDetector>` using `useScrubGesture` from `03-scrub-engine`. A `ScrubCursor` (vertical line + dot) is rendered inside the canvas when `isScrubbing`.

4. **Home tab hero update** — `app/(tabs)/index.tsx` holds `scrubEarningsIndex: number | null` state. When non-null, the earnings hero displays `trend[scrubEarningsIndex]` and the sub-label shows the corresponding week label. When null (finger lifted), it returns to live `hoursData.weeklyEarnings` / `"this week"`.

### How It Works

```
User drags finger across TrendSparkline
  ↓
GestureDetector (PanGestureHandler, activeOffsetX: [-5, 5])
  ↓
useScrubGesture: scrubIndex SharedValue updates (UI thread worklet)
  ↓
useAnimatedReaction → runOnJS(onScrubChange)(index | null)
  ↓
Home tab: setScrubEarningsIndex(index | null)
  ↓
Hero MetricValue shows trend[scrubEarningsIndex] with weekLabels sub-label
  (or live weeklyEarnings when null)
```

The gesture uses `activeOffsetX: [-5, 5]` to distinguish horizontal scrub from vertical scroll — critical since the sparkline lives inside a `ScrollView`.

### Pattern Alignment

This spec follows the same scrub pattern established in `04-ai-scrub` for the AI trajectory chart:
- Same `useScrubGesture` hook (03-scrub-engine)
- Same `ScrubCursor` geometry builder
- Same `useAnimatedReaction → runOnJS` bridge pattern
- Same `onScrubChange` callback signature (`ScrubChangeCallback` from `useScrubGesture.ts`)

---

## Out of Scope

1. **Week label rendering inside the Skia canvas** — No tooltip bubble or text label is drawn on the sparkline canvas itself. The week label is displayed as the hero sub-label in the parent component (`index.tsx`). Rationale: the sparkline is only 60px tall; canvas-rendered text would be cramped and hard to read.
   - **Descoped:** Not part of this feature (no action needed)

2. **Overview tab sparkline scrub** — The `TrendSparkline` on the overview screen will use the same `onScrubChange` prop but requires synchronized multi-chart scrubbing. That coordination logic is deferred.
   - **Deferred to 07-overview-sync:** The overview screen wires up `TrendSparkline.onScrubChange` alongside the other three metric charts in the synchronized overview.

3. **BrainLift / Hours / AI% sparkline scrub on home** — Only the earnings sparkline on the home tab is made interactive in this spec.
   - **Descoped:** Not part of this feature (no action needed)

4. **`useEarningsHistory` returning week labels** — Labels are computed purely from `trend.length` and current date; the hook is not changed.
   - **Descoped:** Not part of this feature (no action needed)

5. **Editing past earnings via scrub** — The scrub gesture is read-only.
   - **Descoped:** Excluded at feature level (see FEATURE.md Out of Scope)

6. **Scrubbing the WeeklyBarChart** — Excluded at the feature level.
   - **Descoped:** Excluded at feature level (see FEATURE.md Out of Scope)

7. **Haptic feedback on index change** — No haptic is fired as the scrub index changes.
   - **Descoped:** Not part of this feature (no action needed)

---

## Functional Requirements

---

### FR1: `getWeekLabels` utility

Add a pure function `getWeekLabels(count: number): string[]` to `src/lib/hours.ts`.

**Behaviour:**
- Returns `count` human-readable week-start labels, oldest first.
- Each label is the Monday of that week formatted as abbreviated month + day with no year (e.g. `"Mar 3"`, `"Feb 10"`).
- Uses local timezone (same as `getWeekStartDate(false)`).
- Label at index `i` corresponds to `count - 1 - i` weeks ago (index 0 = oldest, index `count - 1` = current week).

**Reference implementation:**
```typescript
export function getWeekLabels(count: number): string[] {
  if (count === 0) return [];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result: string[] = [];
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysToMonday - i * 7);
    result.push(`${MONTHS[d.getMonth()]} ${d.getDate()}`);
  }
  return result;
}
```

**Success Criteria:**
- `getWeekLabels(0)` returns `[]`
- `getWeekLabels(1)` returns an array of length 1 containing the current week's Monday label
- `getWeekLabels(4)` returns 4 labels, oldest first, each 7 days apart
- Labels use abbreviated month name + day number, no year (e.g. `"Mar 3"`, `"Feb 10"`)
- `getWeekLabels(12)` returns 12 labels with no crash

---

### FR2: TrendSparkline scrub props + gesture layer

Add scrub interaction to `src/components/TrendSparkline.tsx`.

**New props added to `TrendSparklineProps`:**
```typescript
onScrubChange?: ScrubChangeCallback;  // imported from useScrubGesture
weekLabels?: string[];                 // length must match data.length if provided
```

**Gesture integration:**
- Compute `pixelXs: number[]` — the X pixel position of each data point, matching `buildPath` spacing:
  - N > 1: `pixelXs[i] = i * (width / (N - 1))`
  - N === 1: `pixelXs = [width / 2]`
  - N === 0: `pixelXs = []`
- Call `useScrubGesture({ pixelXs, enabled: data.length > 0 })`.
- Apply `.activeOffsetX([-5, 5])` on the returned gesture to guard against vertical scroll conflicts.
- Wrap `<Canvas>` in `<GestureDetector gesture={gesture}>`.
- Bridge via `useAnimatedReaction`:
  ```typescript
  useAnimatedReaction(
    () => scrubIndex.value,
    (index) => {
      runOnJS(safeOnScrubChange)(index === -1 ? null : index);
    },
  );
  ```

**Scrub cursor rendering:**
- Hold `cursorPos: { index: number; x: number; y: number } | null` in React state, updated via `runOnJS` from a second `useAnimatedReaction` on `isScrubbing` / `scrubIndex`.
- When `cursorPos !== null`, render inside `<Canvas>`:
  - Call `buildScrubCursor(cursorPos.x, cursorPos.y, h, h * PADDING_FRACTION)`.
  - `<Path path={cursor.linePath} color={colors.textMuted} opacity={0.5} strokeWidth={1} style="stroke" />`
  - `<Circle cx={cursor.dotX} cy={cursor.dotY} r={cursor.dotRadius} color={color} />`

**Success Criteria:**
- `onScrubChange` is called with nearest index (0 to N-1) during pan
- `onScrubChange(null)` is called when gesture ends
- `weekLabels` prop accepted without crash; does not affect canvas rendering
- `data = []`: no crash, no scrub events
- `data.length === 1`: scrub always reports index 0
- `onScrubChange` not provided: component works without crash
- Scrub cursor appears during pan, disappears on gesture end
- Existing rendering (path animation, cap label, guide line) unchanged when not scrubbing

---

### FR3: Home tab earnings hero scrub sync

Update `app/(tabs)/index.tsx` to wire up earnings hero to sparkline scrub.

**New state and memo:**
```typescript
const [scrubEarningsIndex, setScrubEarningsIndex] = useState<number | null>(null);
const weekLabels = useMemo(() => getWeekLabels(earningsTrend.length), [earningsTrend.length]);
```

**Derived display values:**
```typescript
const displayEarnings =
  scrubEarningsIndex !== null
    ? (earningsTrend[scrubEarningsIndex] ?? 0)
    : (data?.weeklyEarnings ?? 0);

const earningsSubLabel =
  scrubEarningsIndex !== null
    ? (weekLabels[scrubEarningsIndex] ?? 'past week')
    : 'this week';
```

**Updated TrendSparkline usage:**
```tsx
<TrendSparkline
  ...existing props...
  onScrubChange={setScrubEarningsIndex}
  weekLabels={weekLabels}
/>
```

**Updated hero display** (replace hardcoded `data?.weeklyEarnings` and `"this week"`):
```tsx
<MetricValue value={displayEarnings} ... />
<Text ...>{earningsSubLabel}</Text>
```

**Success Criteria:**
- `scrubEarningsIndex !== null`: hero shows `earningsTrend[scrubEarningsIndex]`
- `scrubEarningsIndex === null`: hero shows `data?.weeklyEarnings ?? 0`
- Sub-label shows week label string during scrub, `"this week"` at rest
- `scrubEarningsIndex = 0`: hero shows oldest trend value
- Empty `earningsTrend`: no crash, hero shows 0
- `getWeekLabels` import from `@/src/lib/hours` (not an inline copy)

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/TrendSparkline.tsx` | Target component — adds gesture + cursor |
| `hourglassws/src/hooks/useScrubGesture.ts` | Scrub engine from 03; provides hook + `ScrubChangeCallback` type |
| `hourglassws/src/components/ScrubCursor.ts` | Cursor geometry builder (`buildScrubCursor`) |
| `hourglassws/src/lib/hours.ts` | Target for `getWeekLabels` — already has `getWeekStartDate` |
| `hourglassws/app/(tabs)/index.tsx` | Home tab — hero display + sparkline usage |
| `hourglassws/src/hooks/useEarningsHistory.ts` | Shape of `trend: number[]` (12 weeks, oldest first) |
| `hourglassws/src/lib/colors.ts` | `colors.gold`, `colors.textMuted` for cursor |

### Files to Create

None. All changes are additions to existing files.

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/lib/hours.ts` | Add `getWeekLabels(count: number): string[]` export |
| `hourglassws/src/components/TrendSparkline.tsx` | Add `onScrubChange`, `weekLabels` props + gesture + cursor |
| `hourglassws/app/(tabs)/index.tsx` | Add `scrubEarningsIndex` state, `weekLabels` memo, wire hero display |

### Data Flow

```
useEarningsHistory().trend: number[]   (12 weeks, oldest first)
         │
         ▼
getWeekLabels(trend.length): string[]  (pure date math, useMemo)
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
TrendSparkline                               Home tab (index.tsx)
  data={earningsTrend}                         scrubEarningsIndex state
  weekLabels={weekLabels}    ──onScrubChange──▶ setScrubEarningsIndex
  onScrubChange={setScrubEarningsIndex}
         │
         ▼
  GestureDetector (PanGesture, activeOffsetX: [-5,5])
  useScrubGesture({ pixelXs })
         │ scrubIndex SharedValue
         ▼
  useAnimatedReaction → runOnJS(onScrubChange)(index | null)
         │
         ▼
  Skia Canvas: ScrubCursor rendered at (scrubX, scrubY)

Home tab:
  displayEarnings = scrubEarningsIndex !== null
    ? earningsTrend[scrubEarningsIndex]
    : data?.weeklyEarnings
  earningsSubLabel = scrubEarningsIndex !== null
    ? weekLabels[scrubEarningsIndex]
    : "this week"
```

### Coordinate Mapping

`buildPath` uses `xStep = width / (data.length - 1)` and `points[i].x = i * xStep`.

`pixelXs` for the gesture must match:
```typescript
const xStep = data.length > 1 ? width / (data.length - 1) : 0;
const pixelXs = data.map((_, i) => (data.length === 1 ? width / 2 : i * xStep));
```

`scrubY` reuses the existing `toY` function in `TrendSparkline.tsx`:
```typescript
const scrubY = toY(data[cursorIndex], min, max, h);
```

### Threading Model

- `useScrubGesture` runs entirely on the UI thread (Reanimated worklets).
- `useAnimatedReaction` fires on UI thread; `runOnJS` bridges to JS thread.
- Cursor pixel position is held in React state updated via `runOnJS` — same pattern as `AIConeChart`.
- `GestureDetector` wraps `<Canvas>` — gesture recognizer is native, canvas is Skia.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `data = []` | `pixelXs = []`; `enabled: false`; no cursor; `onScrubChange` never called |
| `data.length = 1` | `pixelXs = [width / 2]`; scrub always snaps to index 0 |
| `width = 0` | Component returns `null` early (existing guard) |
| `scrubEarningsIndex` out of range | `earningsTrend[idx] ?? 0` — nullish coalescing |
| `earningsTrend = []` | `getWeekLabels(0) = []`; sparkline disabled; hero shows `weeklyEarnings` |
| `onScrubChange` not provided | `safeOnScrubChange = onScrubChange ?? (() => {})` — noop |
| App backgrounded during scrub | `onFinalize` fires; `scrubIndex → -1`; `onScrubChange(null)`; hero resets |

### Test File Locations

| FR | Test file |
|----|-----------|
| FR1 (`getWeekLabels`) | `hourglassws/src/lib/__tests__/hours.test.ts` (add to existing) |
| FR2 (TrendSparkline) | `hourglassws/src/components/__tests__/TrendSparkline.test.tsx` (new file) |
| FR3 (home tab) | `hourglassws/app/__tests__/index-earnings-scrub.test.tsx` (new file) |

### Import Changes

**`TrendSparkline.tsx` new imports:**
```typescript
import { GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useScrubGesture, ScrubChangeCallback } from '@/src/hooks/useScrubGesture';
import { buildScrubCursor } from '@/src/components/ScrubCursor';
```
(Circle and Path already imported from `@shopify/react-native-skia`.)

**`app/(tabs)/index.tsx` new imports:**
```typescript
import { getWeekLabels } from '@/src/lib/hours';
```
(`useState` and `useMemo` already imported.)
