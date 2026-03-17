# Implementation Checklist

Spec: `01-safe-arc-hero`
Feature: `ai-tab-rebuild`

---

## Phase 1.0: Test Foundation

### FR1: Replace useAnimatedProps path-string with strokeDashoffset
- [ ] Write source-level test: `useAnimatedProps` does NOT call `arcPath()` inside the worklet callback
- [ ] Write source-level test: `withSpring` is NOT present in source
- [ ] Write source-level test: `springPremium` is NOT imported in source
- [ ] Write source-level test: `withTiming` IS present in source
- [ ] Write source-level test: `strokeDashoffset` string IS present in source
- [ ] Write source-level test: `strokeDasharray` string IS present in source
- [ ] Write render test: component renders without crash with aiPct=0
- [ ] Write render test: component renders without crash with aiPct=65, brainliftHours=3.5, deltaPercent=8.2
- [ ] Write render test: component renders without crash with aiPct=100 (full arc)

### FR2: All geometry derived from size prop
- [ ] Write render test: custom size prop (e.g. 240) renders without crash

### FR3: Props interface and visual output unchanged
- [ ] Write render test: delta badge shown when deltaPercent !== null
- [ ] Write render test: delta badge hidden when deltaPercent === null
- [ ] Write render test: center text shows `{aiPct}%`
- [ ] Write render test: "AI USAGE" label present
- [ ] Write render test: brainliftHours=0 renders ProgressBar at 0% (no crash)
- [ ] Write render test: brainliftHours > BRAINLIFT_TARGET_HOURS (e.g. 7) — clamps to 100%, no crash

### FR4: arcPath pure function
- [ ] Write unit test: `arcPath(90, 90, 87, 135, 405)` returns string starting with "M " and containing " A "
- [ ] Write unit test: `arcPath(cx, cy, r, x, x)` where start === end returns "M x y" (degenerate, no crash)
- [ ] Write unit test: sweep > 180 → largeArcFlag = 1 in result string
- [ ] Write unit test: sweep <= 180 → largeArcFlag = 0 in result string

---

## Test Design Validation (MANDATORY)

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Replace useAnimatedProps path-string with strokeDashoffset
- [ ] Remove `fillEndAngle` SharedValue
- [ ] Remove `useAnimatedProps` callback that calls `arcPath()` (the crashing worklet)
- [ ] Remove `withSpring` from Reanimated imports
- [ ] Remove `springPremium` import from reanimated-presets
- [ ] Add `dashOffset = useSharedValue(arcLength)` SharedValue
- [ ] Add `useEffect([aiPct])` with `dashOffset.value = withTiming(arcLength * (1 - aiPct / 100), timingChartFill)`
- [ ] Add `fillProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }))`
- [ ] Add `withTiming` to Reanimated imports
- [ ] Add `timingChartFill` import from reanimated-presets

### FR2: All geometry derived from size prop
- [ ] Compute `arcLength = r * (SWEEP * Math.PI / 180)` in render scope (after `r` is derived from `size`)
- [ ] Compute `fullArcPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP)` in render scope
- [ ] Verify `cx`, `cy`, `r` all derive from `size` (already true in existing code — verify unchanged)

### FR3: Props interface and visual output unchanged
- [ ] Set `d={fullArcPath}` on `AnimatedPath` (was `animatedProps` driving `d`)
- [ ] Set `strokeDasharray={[arcLength, arcLength]}` on `AnimatedPath`
- [ ] Set `animatedProps={fillProps}` on `AnimatedPath`
- [ ] Verify `arcPath()` export is preserved
- [ ] Verify `AI_TARGET_PCT` and `BRAINLIFT_TARGET_HOURS` exports are preserved
- [ ] Verify props interface `AIArcHeroProps` is unchanged
- [ ] Run all tests; confirm AIArcHero tests pass

### FR4: Animation re-triggers on aiPct change
- [ ] Verify `useEffect` dependency array includes `aiPct`
- [ ] Manual check: aiPct=0 → dashOffset initialized to arcLength

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
- [ ] Commit fixes: `fix(01-safe-arc-hero): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-safe-arc-hero): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests (AIConeChart, AITabConeIntegration)
- [ ] Code follows existing patterns (consistent with WeeklyBarChart, TrendSparkline)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-16**: Spec created. Research complete, no open questions. strokeDashoffset approach chosen (Decision 1). timingChartFill replaces springPremium (Decision 2). arcPath() export preserved (Decision 3).
