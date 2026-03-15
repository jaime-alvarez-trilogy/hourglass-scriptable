# Implementation Checklist

Spec: `05-earnings-scrub`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: getWeekLabels utility

- [ ] Test `getWeekLabels(0)` returns `[]`
- [ ] Test `getWeekLabels(1)` returns array of length 1 with current Monday label
- [ ] Test `getWeekLabels(4)` returns 4 labels, oldest first, each 7 days apart
- [ ] Test label format is abbreviated month + day, no year (e.g. `"Mar 3"`)
- [ ] Test `getWeekLabels(12)` returns 12 labels with no crash
- [ ] Test all labels are Mondays (verify day-of-week calculation)

### FR2: TrendSparkline scrub props + gesture layer

- [ ] Test `onScrubChange` and `weekLabels` props accepted without TypeScript error
- [ ] Test that `onScrubChange` is not required (component renders without it)
- [ ] Test that `weekLabels` is not required (component renders without it)
- [ ] Test `data = []`: component renders without crash, `onScrubChange` never called
- [ ] Test `data.length = 1`: gesture snaps to index 0 only
- [ ] Test `onScrubChange(null)` invoked on gesture end
- [ ] Test `onScrubChange(index)` invoked with correct nearest index during pan

### FR3: Home tab earnings hero scrub sync

- [ ] Test hero shows `earningsTrend[scrubEarningsIndex]` when `scrubEarningsIndex !== null`
- [ ] Test hero shows `data.weeklyEarnings` when `scrubEarningsIndex === null`
- [ ] Test sub-label shows week label string during scrub
- [ ] Test sub-label shows `"this week"` when not scrubbing
- [ ] Test `scrubEarningsIndex = 0` shows first (oldest) trend value
- [ ] Test empty `earningsTrend`: hero shows 0, no crash when scrub fires

---

## Test Design Validation (MANDATORY)

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: getWeekLabels utility

- [ ] Add `getWeekLabels(count: number): string[]` export to `src/lib/hours.ts`
- [ ] Implement local-timezone Monday walk-back for `count` weeks
- [ ] Use abbreviated month names array (no `Intl.DateTimeFormat` dependency)
- [ ] Verify `getWeekLabels(0)` returns `[]` (guard at top of function)

### FR2: TrendSparkline scrub props + gesture layer

- [ ] Add `onScrubChange?: ScrubChangeCallback` and `weekLabels?: string[]` to `TrendSparklineProps`
- [ ] Import `GestureDetector` from `react-native-gesture-handler`
- [ ] Import `useAnimatedReaction`, `runOnJS` from `react-native-reanimated`
- [ ] Import `useScrubGesture`, `ScrubChangeCallback` from `@/src/hooks/useScrubGesture`
- [ ] Import `buildScrubCursor` from `@/src/components/ScrubCursor`
- [ ] Compute `pixelXs` matching `buildPath` x-coordinate spacing
- [ ] Call `useScrubGesture({ pixelXs, enabled: data.length > 0 })`
- [ ] Apply `.activeOffsetX([-5, 5])` on returned gesture
- [ ] Wrap `<Canvas>` in `<GestureDetector gesture={gesture}>`
- [ ] Add `useAnimatedReaction` to bridge `scrubIndex → onScrubChange`
- [ ] Add `useState` for `cursorPos` (updated via second `runOnJS` bridge)
- [ ] Render `ScrubCursor` paths inside `<Canvas>` when `cursorPos !== null`
- [ ] Verify existing path animation, cap label, guide line unchanged

### FR3: Home tab earnings hero scrub sync

- [ ] Import `getWeekLabels` from `@/src/lib/hours` in `app/(tabs)/index.tsx`
- [ ] Add `scrubEarningsIndex` state (`useState<number | null>(null)`)
- [ ] Add `weekLabels` memo (`useMemo(() => getWeekLabels(earningsTrend.length), [earningsTrend.length])`)
- [ ] Compute `displayEarnings` (live vs scrub value with nullish coalescing)
- [ ] Compute `earningsSubLabel` (`weekLabels[idx]` vs `"this week"`)
- [ ] Pass `onScrubChange={setScrubEarningsIndex}` to `<TrendSparkline>`
- [ ] Pass `weekLabels={weekLabels}` to `<TrendSparkline>`
- [ ] Replace `data?.weeklyEarnings` with `displayEarnings` in hero `<MetricValue>`
- [ ] Replace `"this week"` sub-label text with `{earningsSubLabel}`

---

## Phase 1.2: Review (MANDATORY)

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
- [ ] Commit fixes: `fix(05-earnings-scrub): {description}`

### Step 3: Test Quality Optimization

- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(05-earnings-scrub): strengthen test assertions`

### Final Verification

- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns (matches 04-ai-scrub pattern)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec created. Research complete. Dependencies: `useScrubGesture` and `ScrubCursor` from 03-scrub-engine confirmed available. All interface contracts traced from source files.
