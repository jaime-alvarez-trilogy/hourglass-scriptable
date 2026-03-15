# Implementation Checklist

Spec: `07-overview-sync`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: `externalCursorIndex` prop on TrendSparkline
- [ ] Write test: `TrendSparkline` with `externalCursorIndex={2}` renders cursor at index 2 (no gesture)
- [ ] Write test: `TrendSparkline` with `externalCursorIndex={null}` renders no cursor
- [ ] Write test: `TrendSparkline` with `externalCursorIndex={0}` renders cursor at leftmost point
- [ ] Write test: `TrendSparkline` without `externalCursorIndex` prop behaves as before (no regression)
- [ ] Write test: `externalCursorIndex` out of range is clamped to `[0, data.length - 1]`
- [ ] Write test: `onScrubChange` callback fires when user touches the chart

### FR2: `getWeekLabels` utility
- [ ] Write test: `getWeekLabels(4)` returns array of length 4
- [ ] Write test: `getWeekLabels(12)` returns array of length 12
- [ ] Write test: last entry of `getWeekLabels(4)` is Monday of current week formatted as "Mon D"
- [ ] Write test: all entries are in chronological order (oldest first)
- [ ] Write test: consecutive entries are exactly 7 days apart

### FR3: `useOverviewData` hook
- [ ] Write test: `window=4`, 3 past weeks in history → arrays length 4
- [ ] Write test: `window=12`, 11 past weeks in history → arrays length 12
- [ ] Write test: empty history → all arrays length 1 (current week only)
- [ ] Write test: history shorter than window → arrays = available + 1 (no padding)
- [ ] Write test: current week is always the last entry in each array
- [ ] Write test: `isLoading` is true when any dependent hook is loading
- [ ] Write test: `weekLabels` length equals `earnings` length
- [ ] Write test: null `useHoursData` → current week hours = 0
- [ ] Write test: null `useAIData` → current week aiPct = 0, brainliftHours = 0

### FR4: Window toggle and scrub state (OverviewScreen)
- [ ] Write test: toggle 4W → 12W resets `scrubWeekIndex` to null
- [ ] Write test: toggle 12W → 4W resets `scrubWeekIndex` to null
- [ ] Write test: `onScrubChange` from any chart updates screen-level `scrubWeekIndex`
- [ ] Write test: all 4 charts receive same `externalCursorIndex` value
- [ ] Write test: hero metric value shows scrub-period value when `scrubWeekIndex !== null`
- [ ] Write test: hero metric value shows live value when `scrubWeekIndex === null`

### FR5: Week snapshot panel
- [ ] Write test: panel is visible when `scrubWeekIndex !== null`
- [ ] Write test: panel is hidden when `scrubWeekIndex === null`
- [ ] Write test: label shows "Week of {weekLabels[scrubWeekIndex]}"
- [ ] Write test: earnings value matches `overviewData.earnings[scrubWeekIndex]`
- [ ] Write test: hours value matches `overviewData.hours[scrubWeekIndex]`
- [ ] Write test: aiPct value matches `overviewData.aiPct[scrubWeekIndex]`
- [ ] Write test: brainliftHours value matches `overviewData.brainliftHours[scrubWeekIndex]`

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: `externalCursorIndex` prop on TrendSparkline
- [ ] Add `externalCursorIndex?: number | null` to `TrendSparklineProps` interface
- [ ] Add `onScrubChange?: ScrubChangeCallback` to `TrendSparklineProps`
- [ ] Add `useScrubGesture` internally (compute `pixelXs` from data length + width)
- [ ] Add `useAnimatedReaction` bridging `scrubIndex → runOnJS(onScrubChange)`
- [ ] Wrap Canvas with `GestureDetector`
- [ ] Compute `cursorActiveIndex` = `externalCursorIndex ?? (isScrubbing ? internalIndex : null)`
- [ ] Clamp `cursorActiveIndex` to `[0, data.length - 1]`
- [ ] Call `buildScrubCursor` and render `Path` + `Circle` inside Canvas when active
- [ ] Verify existing usages without new props are unaffected

### FR2: `getWeekLabels` utility
- [ ] Add `getWeekLabels(window: number): string[]` to `src/lib/hours.ts`
- [ ] Compute current week's Monday using existing date math patterns
- [ ] Build array of `window` Mondays (oldest → newest) by subtracting 7 days
- [ ] Format each date with `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })`
- [ ] Export the function

### FR3: `useOverviewData` hook
- [ ] Create `src/hooks/useOverviewData.ts`
- [ ] Call `useWeeklyHistory()`, `useEarningsHistory()`, `useHoursData()`, `useAIData()`
- [ ] Build earnings array: `earningsTrend.slice(-window)` (already includes current week)
- [ ] Build hours array: `snapshots.slice(-window + 1).map(s => s.hours)` + `[currentHours]`
- [ ] Build aiPct array: `snapshots.slice(-window + 1).map(s => s.aiPct)` + `[currentAiPct]`
- [ ] Build brainlift array: `snapshots.slice(-window + 1).map(s => s.brainliftHours)` + `[currentBrainlift]`
- [ ] Build `weekLabels`: `getWeekLabels(window).slice(-earnings.length)`
- [ ] Return `{ data: OverviewData, isLoading: boolean }`
- [ ] Handle null data from any hook (use 0 for current week values)

### FR4: Window toggle and scrub state (OverviewScreen)
- [ ] Rewrite `app/(tabs)/overview.tsx`
- [ ] Add `useState<4 | 12>(4)` for `window`
- [ ] Add `useState<number | null>(null)` for `scrubWeekIndex`
- [ ] Call `useOverviewData(window)`
- [ ] Add 4W/12W segmented control to header row with active/inactive styling
- [ ] Reset `scrubWeekIndex` to null on window change
- [ ] Replace 4 `TrendCard` components with 4 interactive chart sections
- [ ] Each section: label, dynamic metric value (live or scrub), TrendSparkline with `onScrubChange` + `externalCursorIndex`
- [ ] Apply correct colors: gold/success/cyan/violet

### FR5: Week snapshot panel
- [ ] Add `useSharedValue(0)` for `panelOpacity`
- [ ] Add `useSharedValue(8)` for `panelTranslateY`
- [ ] Add `useEffect` reacting to `scrubWeekIndex` — spring to visible/hidden
- [ ] Build `useAnimatedStyle` combining opacity + translateY
- [ ] Render `Animated.View` panel with 4 metric chips
- [ ] Panel always rendered (not conditionally mounted)
- [ ] Format values: earnings `$X,XXX`, hours `XX.Xh`, aiPct `XX%`, brainlift `X.Xh`
- [ ] Label: `"Week of " + weekLabels[scrubWeekIndex]`

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(07-overview-sync): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(07-overview-sync): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing TrendSparkline tests
- [ ] No regressions in existing hours.ts tests
- [ ] Code follows existing patterns (Skia canvas, reanimated-presets, hooks pattern)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec created. Dependencies confirmed complete: useScrubGesture (03), ScrubCursor (03), useWeeklyHistory (06), weeklyHistory lib (06).
