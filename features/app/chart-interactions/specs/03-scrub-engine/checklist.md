# Implementation Checklist

Spec: `03-scrub-engine`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: `useScrubGesture` Hook — initial state
- [ ] Write test: `scrubIndex.value` initialises to `-1`
- [ ] Write test: `isScrubbing.value` initialises to `false`
- [ ] Write test: hook returns `{ scrubIndex, isScrubbing, gesture }` with correct shape
- [ ] Write test: `enabled = false` → gesture is disabled (verify `gesture.enabled` false)
- [ ] Write test: `pixelXs = []` → no crash, scrubIndex stays -1

### FR2: `nearestIndex` Worklet
- [ ] Write test: `nearestIndex(0, [0, 100, 200])` → `0`
- [ ] Write test: `nearestIndex(90, [0, 100, 200])` → `1`
- [ ] Write test: `nearestIndex(200, [0, 100, 200])` → `2`
- [ ] Write test: `nearestIndex(300, [0, 100, 200])` → `2` (clamps to last)
- [ ] Write test: `nearestIndex(50, [0, 100])` → `0` or `1` (equidistant — either acceptable)
- [ ] Write test: `nearestIndex(99, [50])` → `0` (single element)

### FR3: `buildScrubCursor` Utility
- [ ] Write test: returns `linePath`, `dotX`, `dotY`, `dotRadius`
- [ ] Write test: `dotX === scrubX`, `dotY === scrubY`, `dotRadius === 4`
- [ ] Write test: `scrubX = 0` → no crash
- [ ] Write test: `scrubX = 300` (right edge) → no crash
- [ ] Write test: line path is non-null / not empty

### FR4: `ScrubChangeCallback` Type Export
- [ ] Write test: `ScrubChangeCallback` is exported from `useScrubGesture.ts` (import succeeds)

---

## Test Design Validation (MANDATORY)

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: `useScrubGesture` Hook
- [ ] Create `hourglassws/src/hooks/useScrubGesture.ts`
- [ ] Implement hook with `useSharedValue(-1)` for `scrubIndex`
- [ ] Implement hook with `useSharedValue(false)` for `isScrubbing`
- [ ] Implement `Gesture.Pan().minDistance(5).enabled(enabled)` configuration
- [ ] Implement `onBegin` worklet: set `isScrubbing.value = true`
- [ ] Implement `onUpdate` worklet: call `nearestIndex`, set `scrubIndex.value`
- [ ] Implement `onFinalize` worklet: reset `scrubIndex.value = -1`, `isScrubbing.value = false`
- [ ] Guard `pixelXs.length === 0` in `onUpdate` (return early)

### FR2: `nearestIndex` Worklet
- [ ] Implement `nearestIndex` function in `useScrubGesture.ts`
- [ ] Mark with `'worklet'` directive
- [ ] Handle empty array (return -1)
- [ ] Export from file for unit testing

### FR3: `buildScrubCursor` Utility
- [ ] Create `hourglassws/src/components/ScrubCursor.ts`
- [ ] Implement `ScrubCursorResult` interface
- [ ] Implement `buildScrubCursor` using `Skia.Path.Make()`, `moveTo`, `lineTo`
- [ ] Return fixed `dotRadius: 4`
- [ ] Export both interface and function

### FR4: `ScrubChangeCallback` Type Export
- [ ] Export `ScrubChangeCallback` type from `useScrubGesture.ts`
- [ ] Add bridge pattern as JSDoc comment or inline example in the file

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
- [ ] Commit fixes: `fix(03-scrub-engine): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(03-scrub-engine): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns (SharedValue, Gesture.Pan, Skia.Path)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec created. FR1-FR4 identified. No open questions. Ready for implementation.
