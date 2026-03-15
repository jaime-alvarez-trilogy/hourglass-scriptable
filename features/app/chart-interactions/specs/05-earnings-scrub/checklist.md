# Implementation Checklist

Spec: `05-earnings-scrub`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: getWeekLabels utility

- [x] Test `getWeekLabels(0)` returns `[]`
- [x] Test `getWeekLabels(1)` returns array of length 1 with current Monday label
- [x] Test `getWeekLabels(4)` returns 4 labels, oldest first, each 7 days apart
- [x] Test label format is abbreviated month + day, no year (e.g. `"Mar 3"`)
- [x] Test `getWeekLabels(12)` returns 12 labels with no crash
- [x] Test all labels are Mondays (verify day-of-week calculation)

### FR2: TrendSparkline scrub props + gesture layer

- [x] Test `onScrubChange` and `weekLabels` props accepted without TypeScript error
- [x] Test that `onScrubChange` is not required (component renders without it)
- [x] Test that `weekLabels` is not required (component renders without it)
- [x] Test `data = []`: component renders without crash, `onScrubChange` never called
- [x] Test `data.length = 1`: gesture snaps to index 0 only
- [x] Test `onScrubChange(null)` invoked on gesture end (source contract)
- [x] Test `onScrubChange(index)` invoked with correct nearest index during pan (source contract)

### FR3: Home tab earnings hero scrub sync

- [x] Test hero shows `earningsTrend[scrubEarningsIndex]` when `scrubEarningsIndex !== null`
- [x] Test hero shows `data.weeklyEarnings` when `scrubEarningsIndex === null`
- [x] Test sub-label shows week label string during scrub
- [x] Test sub-label shows `"this week"` when not scrubbing
- [x] Test `scrubEarningsIndex = 0` shows first (oldest) trend value
- [x] Test empty `earningsTrend`: hero shows 0, no crash when scrub fires

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent (manual review — tests confirmed red before implementation)
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: getWeekLabels utility

- [x] Add `getWeekLabels(count: number): string[]` export to `src/lib/hours.ts`
- [x] Implement local-timezone Monday walk-back for `count` weeks
- [x] Use abbreviated month names array (no `Intl.DateTimeFormat` dependency)
- [x] Verify `getWeekLabels(0)` returns `[]` (guard at top of function)

### FR2: TrendSparkline scrub props + gesture layer

- [x] Add `onScrubChange?: ScrubChangeCallback` and `weekLabels?: string[]` to `TrendSparklineProps`
- [x] Import `GestureDetector` from `react-native-gesture-handler`
- [x] Import `useAnimatedReaction`, `runOnJS` from `react-native-reanimated`
- [x] Import `useScrubGesture`, `ScrubChangeCallback` from `@/src/hooks/useScrubGesture`
- [x] Import `buildScrubCursor` from `@/src/components/ScrubCursor`
- [x] Compute `pixelXs` matching `buildPath` x-coordinate spacing
- [x] Call `useScrubGesture({ pixelXs, enabled: data.length > 0 })`
- [x] Apply `.activeOffsetX([-5, 5])` on returned gesture
- [x] Wrap `<Canvas>` in `<GestureDetector gesture={gesture}>`
- [x] Add `useAnimatedReaction` to bridge `scrubIndex → onScrubChange`
- [x] Add `useState` for `cursorPos` (updated via second `runOnJS` bridge)
- [x] Render `ScrubCursor` paths inside `<Canvas>` when `cursorPos !== null`
- [x] Verify existing path animation, cap label, guide line unchanged

### FR3: Home tab earnings hero scrub sync

- [x] Import `getWeekLabels` from `@/src/lib/hours` in `app/(tabs)/index.tsx`
- [x] Add `scrubEarningsIndex` state (`useState<number | null>(null)`)
- [x] Add `weekLabels` memo (`useMemo(() => getWeekLabels(earningsTrend.length), [earningsTrend.length])`)
- [x] Compute `displayEarnings` (live vs scrub value with nullish coalescing)
- [x] Compute `earningsSubLabel` (`weekLabels[idx]` vs `"this week"`)
- [x] Pass `onScrubChange={setScrubEarningsIndex}` to `<TrendSparkline>`
- [x] Pass `weekLabels={weekLabels}` to `<TrendSparkline>`
- [x] Replace `data?.weeklyEarnings` with `displayEarnings` in hero `<MetricValue>`
- [x] Replace `"this week"` sub-label text with `{earningsSubLabel}`

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment

- [x] Run `spec-implementation-alignment` agent (manual review)
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review

- [x] Run `pr-review-toolkit:review-pr` skill (inline review — no agent tool available)

### Step 2: Address Feedback

- [x] Fix HIGH severity issues — fixed Easing mock, gesture-handler mock, year-boundary test
- [x] Fix MEDIUM severity issues — none identified
- [x] Re-run tests after fixes (165 passing)
- [x] Commit fixes included in feat commit

### Step 3: Test Quality Optimization

- [x] Test coverage verified: 6 FR1 tests, 18 FR2 tests, 16 FR3 tests
- [x] Assertions are specific (regex pattern checks, value equality, array length)
- [x] Re-run tests to confirm passing (165/165)

### Final Verification

- [x] All spec tests passing (165 tests across 7 suites)
- [x] No regressions in existing tests (9 pre-existing failures unchanged)
- [x] Code follows existing patterns (matches 04-ai-scrub pattern)

---

## Session Notes

**2026-03-15**: Spec created. Research complete. Dependencies: `useScrubGesture` and `ScrubCursor` from 03-scrub-engine confirmed available. All interface contracts traced from source files.

**2026-03-15**: Implementation complete.
- Phase 1.0: 3 test commits (FR1 + FR2 + FR3 in single commit, wave structure)
- Phase 1.1: 1 implementation commit (feat(FR1,FR2,FR3))
- Phase 1.2: Alignment PASS. 165 tests passing. No regressions.
- Fix: Added `activeOffsetX` to global gesture-handler mock (hourglassws/__mocks__/react-native-gesture-handler.ts)
- All files modified: `src/lib/hours.ts`, `src/components/TrendSparkline.tsx`, `app/(tabs)/index.tsx`, `__mocks__/react-native-gesture-handler.ts`
