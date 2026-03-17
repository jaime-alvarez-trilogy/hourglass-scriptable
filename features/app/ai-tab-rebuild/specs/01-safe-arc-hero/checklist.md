# Implementation Checklist

Spec: `01-safe-arc-hero`
Feature: `ai-tab-rebuild`

---

## Phase 1.0: Test Foundation

### FR1: Replace useAnimatedProps path-string with strokeDashoffset
- [x] Write source-level test: `useAnimatedProps` does NOT call `arcPath()` inside the worklet callback
- [x] Write source-level test: `withSpring` is NOT present in source
- [x] Write source-level test: `springPremium` is NOT imported in source
- [x] Write source-level test: `withTiming` IS present in source
- [x] Write source-level test: `strokeDashoffset` string IS present in source
- [x] Write source-level test: `strokeDasharray` string IS present in source
- [x] Write render test: component renders without crash with aiPct=0
- [x] Write render test: component renders without crash with aiPct=65, brainliftHours=3.5, deltaPercent=8.2
- [x] Write render test: component renders without crash with aiPct=100 (full arc)

### FR2: All geometry derived from size prop
- [x] Write render test: custom size prop (e.g. 240) renders without crash

### FR3: Props interface and visual output unchanged
- [x] Write render test: delta badge shown when deltaPercent !== null
- [x] Write render test: delta badge hidden when deltaPercent === null
- [x] Write render test: center text shows `{aiPct}%`
- [x] Write render test: "AI USAGE" label present
- [x] Write render test: brainliftHours=0 renders ProgressBar at 0% (no crash)
- [x] Write render test: brainliftHours > BRAINLIFT_TARGET_HOURS (e.g. 7) — clamps to 100%, no crash

### FR4: arcPath pure function
- [x] Write unit test: `arcPath(90, 90, 87, 135, 405)` returns string starting with "M " and containing " A "
- [x] Write unit test: `arcPath(cx, cy, r, x, x)` where start === end returns "M x y" (degenerate, no crash)
- [x] Write unit test: sweep > 180 → largeArcFlag = 1 in result string
- [x] Write unit test: sweep <= 180 → largeArcFlag = 0 in result string

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Replace useAnimatedProps path-string with strokeDashoffset
- [x] Remove `fillEndAngle` SharedValue
- [x] Remove `useAnimatedProps` callback that calls `arcPath()` (the crashing worklet)
- [x] Remove `withSpring` from Reanimated imports
- [x] Remove `springPremium` import from reanimated-presets
- [x] Add `dashOffset = useSharedValue(arcLength)` SharedValue
- [x] Add `useEffect([aiPct])` with `dashOffset.value = withTiming(arcLength * (1 - aiPct / 100), timingChartFill)`
- [x] Add `fillProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }))`
- [x] Add `withTiming` to Reanimated imports
- [x] Add `timingChartFill` import from reanimated-presets

### FR2: All geometry derived from size prop
- [x] Compute `arcLength = r * (SWEEP * Math.PI / 180)` in render scope (after `r` is derived from `size`)
- [x] Compute `fullArcPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP)` in render scope
- [x] Verify `cx`, `cy`, `r` all derive from `size` (already true in existing code — verify unchanged)

### FR3: Props interface and visual output unchanged
- [x] Set `d={fullArcPath}` on `AnimatedPath` (was `animatedProps` driving `d`)
- [x] Set `strokeDasharray={[arcLength, arcLength]}` on `AnimatedPath`
- [x] Set `animatedProps={fillProps}` on `AnimatedPath`
- [x] Verify `arcPath()` export is preserved
- [x] Verify `AI_TARGET_PCT` and `BRAINLIFT_TARGET_HOURS` exports are preserved
- [x] Verify props interface `AIArcHeroProps` is unchanged
- [x] Run all tests; confirm AIArcHero tests pass

### FR4: Animation re-triggers on aiPct change
- [x] Verify `useEffect` dependency array includes `aiPct`
- [x] Manual check: aiPct=0 → dashOffset initialized to arcLength

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (critical)
- [x] Fix MEDIUM severity issues (or document why deferred)
- [x] Re-run tests after fixes
- [x] Commit fixes: `fix(01-safe-arc-hero): remove duplicate arcPath call`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests
- [x] Apply suggested improvements that strengthen confidence
- [x] Re-run tests to confirm passing
- [x] Commit if changes made: `fix(01-safe-arc-hero): strengthen test assertions`

### Final Verification
- [x] All tests passing
- [x] No regressions in existing tests (AIConeChart, AITabConeIntegration)
- [x] Code follows existing patterns (consistent with WeeklyBarChart, TrendSparkline)

---

## Session Notes

**2026-03-16**: Spec created. Research complete, no open questions. strokeDashoffset approach chosen (Decision 1). timingChartFill replaces springPremium (Decision 2). arcPath() export preserved (Decision 3).

**2026-03-16**: Implementation complete.
- Phase 1.0: 1 test commit (test(FR1-FR4)) — 46 tests, 9 failing (red phase verified)
- Phase 1.1: 1 implementation commit (feat(FR1-FR4)) — all 46 tests passing
- Phase 1.2: Review passed, 1 fix commit (duplicate trackPath/fullArcPath removed)
- All tests passing. AIConeChart, AITabConeIntegration: 209 tests passing.
