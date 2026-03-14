# Checklist: 04-skia-charts

## Phase 4.0 — Tests (Red Phase)

### FR1: colors.ts
- [ ] `test(FR1)`: Write `__tests__/components/colors.test.ts`
  - [ ] All tokens present: `background`, `surface`, `surfaceElevated`, `border`, `gold`, `cyan`, `violet`, `success`, `warning`, `critical`, `destructive`, `textPrimary`, `textSecondary`, `textMuted`
  - [ ] Values match `tailwind.config.js` hex strings exactly (static file comparison)
  - [ ] File has no external imports (source does not contain `import` or `require`)
  - [ ] File contains sync warning comment (source contains `tailwind.config.js`)

### FR2: WeeklyBarChart
- [ ] `test(FR2)`: Write `__tests__/components/WeeklyBarChart.test.tsx`
  - [ ] Renders Canvas without crash (act + create)
  - [ ] Source imports from `@/src/lib/colors` (not hardcoded hex)
  - [ ] Source imports `timingChartFill` from reanimated-presets
  - [ ] Source uses `withDelay` (stagger present)
  - [ ] Source uses `withTiming` (not `withSpring`)
  - [ ] Source does not contain hardcoded hex strings (`/#[0-9A-Fa-f]{6}/` not matched)
  - [ ] `data=[]` does not crash
  - [ ] Props `width` and `height` are accepted (TypeScript interface check via import)

### FR3: TrendSparkline
- [ ] `test(FR3)`: Write `__tests__/components/TrendSparkline.test.tsx`
  - [ ] Renders Canvas without crash
  - [ ] Single data point renders without crash
  - [ ] Empty `data=[]` renders without crash
  - [ ] Source imports from `@/src/lib/colors`
  - [ ] Source imports `timingChartFill`
  - [ ] Source uses `withTiming` (not `withSpring`)
  - [ ] Source does not contain hardcoded hex strings

### FR4: AIRingChart
- [ ] `test(FR4)`: Write `__tests__/components/AIRingChart.test.tsx`
  - [ ] Renders Canvas without crash with `aiPercent=75, size=120`
  - [ ] `aiPercent=0` renders without crash
  - [ ] `aiPercent=100` renders without crash
  - [ ] `brainliftPercent` provided renders without crash
  - [ ] `brainliftPercent` omitted renders without crash
  - [ ] Source imports from `@/src/lib/colors`
  - [ ] Source imports `timingChartFill`
  - [ ] Source uses `withTiming` (not `withSpring`)
  - [ ] Source does not contain hardcoded hex strings

### FR5: ProgressBar
- [ ] `test(FR5)`: Write `__tests__/components/ProgressBar.test.tsx`
  - [ ] Renders without crash
  - [ ] `progress=0` renders without crash
  - [ ] `progress=1` renders without crash
  - [ ] `progress=0.5` renders without crash
  - [ ] Source imports `timingChartFill`
  - [ ] Source uses `withTiming` (not `withSpring`)
  - [ ] Source does not import from `@shopify/react-native-skia` (NativeWind only)
  - [ ] `colorClass` prop defaults to `'bg-success'` (source contains `bg-success`)

### Infrastructure
- [ ] `test(infra)`: Create `__mocks__/@shopify/react-native-skia.ts` with Canvas/Rect/Path/Circle stubs
- [ ] Update `jest.config.js` to add `@shopify/react-native-skia` to `transformIgnorePatterns`
- [ ] Run `npx jest --testPathPattern="colors|WeeklyBarChart|TrendSparkline|AIRingChart|ProgressBar"` — all tests RED (fail because source files don't exist yet)

---

## Phase 4.1 — Implementation

### FR1: colors.ts
- [ ] `feat(FR1)`: Create `src/lib/colors.ts`
  - [ ] All 14 tokens exported with exact hex values from `tailwind.config.js`
  - [ ] `as const` assertion on the object
  - [ ] Sync warning comment included
  - [ ] Run FR1 tests — GREEN

### FR2: WeeklyBarChart
- [ ] `feat(FR2)`: Create `src/components/WeeklyBarChart.tsx`
  - [ ] Uses `@shopify/react-native-skia` Canvas + Rect
  - [ ] Imports colors from `@/src/lib/colors`
  - [ ] Imports `timingChartFill` from `@/src/lib/reanimated-presets`
  - [ ] 7 bars with staggered `withDelay(Math.min(index * 50, 300), withTiming(...))`
  - [ ] Today → `colors.gold`, future → `colors.textMuted`, past → `colors.success`
  - [ ] `maxHours` defaults to `Math.max(8, Math.max(...data.map(d => d.hours)))`
  - [ ] Empty data guard: no crash on `data=[]`
  - [ ] Run FR2 tests — GREEN

### FR3: TrendSparkline
- [ ] `feat(FR3)`: Create `src/components/TrendSparkline.tsx`
  - [ ] Uses `@shopify/react-native-skia` Canvas + Path (+ Circle for single point)
  - [ ] Imports colors from `@/src/lib/colors`
  - [ ] Imports `timingChartFill`
  - [ ] Bezier smooth curve through data points
  - [ ] Y-axis auto-scaled with padding (e.g. 10% top/bottom margin)
  - [ ] Single point → Circle, not Path
  - [ ] Empty data guard
  - [ ] Line draw animation left-to-right via clip or trim
  - [ ] Run FR3 tests — GREEN

### FR4: AIRingChart
- [ ] `feat(FR4)`: Create `src/components/AIRingChart.tsx`
  - [ ] Uses `@shopify/react-native-skia` Canvas + Path
  - [ ] Imports colors from `@/src/lib/colors`
  - [ ] Imports `timingChartFill`
  - [ ] Outer track ring: `colors.border`, full circle
  - [ ] Outer fill arc: `colors.cyan`, sweep = `(aiPercent/100) * 360°`
  - [ ] Inner track + fill rendered when `brainliftPercent` provided
  - [ ] Inner fill arc: `colors.violet`
  - [ ] Both rings animate with `withTiming(..., timingChartFill)` on mount
  - [ ] `aiPercent` clamped to [0, 100]
  - [ ] Component wrapped in `View` with `position: 'relative'`
  - [ ] Run FR4 tests — GREEN

### FR5: ProgressBar
- [ ] `feat(FR5)`: Create `src/components/ProgressBar.tsx`
  - [ ] NativeWind View-based (no Skia)
  - [ ] Outer container: `bg-border rounded-full` track, respects `height` prop
  - [ ] Inner fill: Reanimated `Animated.View`, `colorClass` className, animated width
  - [ ] `useSharedValue(0)` → `withTiming(progress, timingChartFill)` on prop change
  - [ ] `progress` clamped to [0, 1]
  - [ ] `colorClass` defaults to `'bg-success'`
  - [ ] `height` defaults to `4`
  - [ ] Run FR5 tests — GREEN

### Integration
- [ ] Run full test suite: `npx jest` — all tests GREEN, no regressions
- [ ] Fix any integration failures

---

## Phase 4.2 — Review

- [ ] Run spec-implementation-alignment agent
  - [ ] All FR success criteria verified as implemented
  - [ ] Address any gaps found
- [ ] Run `pr-review-toolkit:review-pr` skill
  - [ ] Address feedback from PR review
- [ ] Run test-optimiser agent
  - [ ] Remove redundant tests, improve assertions if suggested
- [ ] Commit any review fixes: `fix(04-skia-charts): address review feedback`

---

## Session Notes

_(To be filled in after execution)_
