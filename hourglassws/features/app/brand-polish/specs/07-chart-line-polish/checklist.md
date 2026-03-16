# Checklist: 07-chart-line-polish

**Spec:** [spec.md](spec.md)
**Feature:** brand-polish
**Created:** 2026-03-16

---

## Phase 7.0 — Tests (Red Phase)

Write tests before any implementation. All tests must FAIL (red) after writing.

### FR1: TrendSparkline line glow tests

- [ ] `test(FR1)`: BlurMaskFilter is imported from @shopify/react-native-skia
- [ ] `test(FR1)`: Data line Path has strokeWidth 2.5
- [ ] `test(FR1)`: Data line Path renders a child Paint with BlurMaskFilter child
- [ ] `test(FR1)`: Glow Paint BlurMaskFilter blur value is >= 6
- [ ] `test(FR1)`: Glow Paint strokeWidth is greater than line strokeWidth
- [ ] `test(FR1)`: Glow Paint color is lineColor prop value + '40' alpha suffix
- [ ] `test(FR1)`: Guide line Path (showGuide=true) has no BlurMaskFilter child
- [ ] `test(FR1)`: Component renders without crash when data is empty
- [ ] `test(FR1)`: Component renders without crash when width=0
- [ ] `test(FR1)`: All existing TrendSparkline tests still pass (run full suite)

### FR2: WeeklyBarChart today-bar glow tests

- [ ] `test(FR2)`: BlurMaskFilter is imported from @shopify/react-native-skia
- [ ] `test(FR2)`: isToday bar Rect renders child Paint with BlurMaskFilter
- [ ] `test(FR2)`: BlurMaskFilter blur value is >= 8
- [ ] `test(FR2)`: Glow Paint uses style="fill" and BlurMaskFilter style="normal"
- [ ] `test(FR2)`: Glow Paint color is barColor + '30' alpha suffix
- [ ] `test(FR2)`: Non-today bar Rect elements have no BlurMaskFilter child
- [ ] `test(FR2)`: Chart renders without crash when no bar has isToday=true
- [ ] `test(FR2)`: Overflow bar (isToday) renders glow correctly
- [ ] `test(FR2)`: All existing WeeklyBarChart tests still pass (run full suite)

### Red Phase Validation

- [ ] Run `npx jest TrendSparkline` — new FR1 tests fail, existing pass
- [ ] Run `npx jest WeeklyBarChart` — new FR2 tests fail, existing pass

---

## Phase 7.1 — Implementation (Green Phase)

Implement minimum code to make tests pass.

### FR1: TrendSparkline line glow

- [ ] `feat(FR1)`: Add BlurMaskFilter to imports in TrendSparkline.tsx
- [ ] `feat(FR1)`: Change data line Path strokeWidth from 2 to 2.5
- [ ] `feat(FR1)`: Add child Paint with BlurMaskFilter (blur=8, style="solid") to data line Path
- [ ] `feat(FR1)`: Glow Paint color = lineColor + '40', strokeWidth=10, strokeCap="round"
- [ ] `feat(FR1)`: Verify guide line Path is NOT modified
- [ ] Run `npx jest TrendSparkline` — all tests pass (green)

### FR2: WeeklyBarChart today-bar glow

- [ ] `feat(FR2)`: Add BlurMaskFilter to imports in WeeklyBarChart.tsx
- [ ] `feat(FR2)`: Add child Paint inside isToday bar Rect: color=barColor+'30', style="fill"
- [ ] `feat(FR2)`: BlurMaskFilter blur=12, style="normal" inside that Paint
- [ ] `feat(FR2)`: Confirm non-today bars have no Paint child
- [ ] Run `npx jest WeeklyBarChart` — all tests pass (green)

### Integration Verification

- [ ] Run `npx jest --testPathPattern="TrendSparkline|WeeklyBarChart"` — all pass
- [ ] Run full test suite: `npx jest` — no regressions

---

## Phase 7.2 — Review

Sequential gates — do not skip or reorder.

### Step 0: Alignment

- [ ] Run spec-implementation-alignment agent on spec.md vs implementation
- [ ] All FR success criteria SC1.1–SC1.10 and SC2.1–SC2.10 verified in code
- [ ] No unimplemented success criteria remain

### Step 1: PR Review

- [ ] Run pr-review-toolkit:review-pr
- [ ] Address any feedback from PR review

### Step 2: Fix Pass (if needed)

- [ ] Address any issues from alignment or PR review
- [ ] Re-run test suite to confirm fixes don't break tests

### Step 3: Test Optimization

- [ ] Run test-optimiser on TrendSparkline.test.tsx and WeeklyBarChart.test.tsx
- [ ] Apply any suggested improvements (deduplication, clarity)

---

## Done Criteria

- [ ] All Phase 7.0 tasks complete — red tests committed
- [ ] All Phase 7.1 tasks complete — green tests committed
- [ ] All Phase 7.2 tasks complete — review passed
- [ ] Full test suite passes with no regressions
- [ ] FEATURE.md changelog updated
