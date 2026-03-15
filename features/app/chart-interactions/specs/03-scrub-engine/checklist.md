# Implementation Checklist

Spec: `03-scrub-engine`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: `useScrubGesture` Hook — initial state
- [x] Write test: `scrubIndex.value` initialises to `-1`
- [x] Write test: `isScrubbing.value` initialises to `false`
- [x] Write test: hook returns `{ scrubIndex, isScrubbing, gesture }` with correct shape
- [x] Write test: `enabled = false` → gesture is disabled (verify `gesture.enabled` false)
- [x] Write test: `pixelXs = []` → no crash, scrubIndex stays -1

### FR2: `nearestIndex` Worklet
- [x] Write test: `nearestIndex(0, [0, 100, 200])` → `0`
- [x] Write test: `nearestIndex(90, [0, 100, 200])` → `1`
- [x] Write test: `nearestIndex(200, [0, 100, 200])` → `2`
- [x] Write test: `nearestIndex(300, [0, 100, 200])` → `2` (clamps to last)
- [x] Write test: `nearestIndex(50, [0, 100])` → `0` or `1` (equidistant — either acceptable)
- [x] Write test: `nearestIndex(99, [50])` → `0` (single element)

### FR3: `buildScrubCursor` Utility
- [x] Write test: returns `linePath`, `dotX`, `dotY`, `dotRadius`
- [x] Write test: `dotX === scrubX`, `dotY === scrubY`, `dotRadius === 4`
- [x] Write test: `scrubX = 0` → no crash
- [x] Write test: `scrubX = 300` (right edge) → no crash
- [x] Write test: line path is non-null / not empty

### FR4: `ScrubChangeCallback` Type Export
- [x] Write test: `ScrubChangeCallback` is exported from `useScrubGesture.ts` (import succeeds)

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: `useScrubGesture` Hook
- [x] Create `hourglassws/src/hooks/useScrubGesture.ts`
- [x] Implement hook with `useSharedValue(-1)` for `scrubIndex`
- [x] Implement hook with `useSharedValue(false)` for `isScrubbing`
- [x] Implement `Gesture.Pan().minDistance(5).enabled(enabled)` configuration
- [x] Implement `onBegin` worklet: set `isScrubbing.value = true`
- [x] Implement `onUpdate` worklet: call `nearestIndex`, set `scrubIndex.value`
- [x] Implement `onFinalize` worklet: reset `scrubIndex.value = -1`, `isScrubbing.value = false`
- [x] Guard `pixelXs.length === 0` in `onUpdate` (return early)

### FR2: `nearestIndex` Worklet
- [x] Implement `nearestIndex` function in `useScrubGesture.ts`
- [x] Mark with `'worklet'` directive
- [x] Handle empty array (return -1)
- [x] Export from file for unit testing

### FR3: `buildScrubCursor` Utility
- [x] Create `hourglassws/src/components/ScrubCursor.ts`
- [x] Implement `ScrubCursorResult` interface
- [x] Implement `buildScrubCursor` using `Skia.Path.Make()`, `moveTo`, `lineTo`
- [x] Return fixed `dotRadius: 4`
- [x] Export both interface and function

### FR4: `ScrubChangeCallback` Type Export
- [x] Export `ScrubChangeCallback` type from `useScrubGesture.ts`
- [x] Add bridge pattern as JSDoc comment or inline example in the file

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (6-dimension manual review)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (none found)
- [x] Fix MEDIUM severity issues: added worklet directive static assertion
- [x] Re-run tests after fixes — 40 tests pass
- [x] Commit fix: `fix(03-scrub-engine): add worklet directive assertion to nearestIndex tests`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests
- [x] All tests verified strong — exact value assertions, no pageantry
- [x] No further changes needed

### Final Verification
- [x] All tests passing (40 tests)
- [x] No regressions in existing tests (pre-existing failures confirmed)
- [x] Code follows existing patterns (SharedValue, Gesture.Pan, Skia.Path)

---

## Session Notes

**2026-03-15**: Spec created. FR1-FR4 identified. No open questions. Ready for implementation.

**2026-03-15**: Implementation complete.
- Phase 1.0: 1 test commit — 40 tests (39 initial + 1 added in review fix)
- Phase 1.1: 1 implementation commit — useScrubGesture.ts, ScrubCursor.ts, Skia mock update
- Phase 1.2: Review passed. 1 fix commit (worklet directive assertion). Test optimizer: no changes needed.
- All 40 tests passing. No regressions.
