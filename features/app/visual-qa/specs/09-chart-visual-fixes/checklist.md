# Checklist: 09-chart-visual-fixes

## Phase 9.0 — Tests (Red Phase)

### FR1 — TrendSparkline right-edge clipping
- [ ] `test(FR1)`: Create `hourglassws/src/components/__tests__/TrendSparkline.test.tsx`
- [ ] Test: `data = [100, 90, 85, 0]` → `safeData = [100, 90, 85]`, `lastIdx = 2`
- [ ] Test: `data = [0]` → `safeData = [0]` (single zero preserved, no empty array)
- [ ] Test: `data = [10, 20, 30]` → `safeData = [10, 20, 30]` (no trailing zeros, unchanged)
- [ ] Test: `data = [0, 0, 0]` → `safeData = [0]` (collapses all but first)
- [ ] Test: `CartesianChart` rendered with `domainPadding` prop containing `right: 10`

### FR2 — WeeklyBarChart collapsed bars
- [ ] `test(FR2)`: Extend `hourglassws/src/components/__tests__/WeeklyBarChart.test.tsx`
- [ ] Test: `CartesianChart` receives `domainPadding` with `top: 0` and `bottom: 0`
- [ ] Test: `domainPadding` x values are proportional to `cellW * 0.35`
- [ ] Test: Bar with `hours=1.8, maxHours=8` produces a `barH` value that is not sub-pixel

### FR3 — Semantic color routing (Home mesh)
- [ ] `test(FR3)`: Add tests for `earningsPaceSignal` derivation logic
- [ ] Test: `panelState='critical'` → `earningsPaceSignal = 1.0`
- [ ] Test: `panelState='behind'` → `earningsPaceSignal = 0.5`
- [ ] Test: `panelState='onTrack'` → `earningsPaceSignal = 0.0`
- [ ] Test: `AmbientBackground` no longer rendered in `index.tsx`
- [ ] Test: `AnimatedMeshBackground` is rendered with correct `earningsPace` prop

### FR4 — DailyAIRow horizontal padding
- [ ] `test(FR4)`: Create `hourglassws/src/components/__tests__/DailyAIRow.test.tsx`
- [ ] Test: Inner content `View` has `px-4` in its className (not `px-1`)

### FR5 — AIArcHero SweepGradient angles
- [ ] `test(FR5)`: Create `hourglassws/src/components/__tests__/AIArcHero.test.tsx`
- [ ] Test: `SweepGradient` has `start={135}`
- [ ] Test: `SweepGradient` has `end={405}`
- [ ] Test: `c` prop is `{ x: size/2, y: size/2 }`

### FR6 — ProgressBar flex fill
- [ ] `test(FR6)`: Create `hourglassws/src/components/__tests__/ProgressBar.test.tsx`
- [ ] Test: Container has `flexDirection: 'row'`
- [ ] Test: Fill child uses animated `flex` value
- [ ] Test: Spacer child uses complementary animated `flex` value
- [ ] Test: Fill child has violet color

### Red Phase Gate
- [ ] Run `cd hourglassws && npx jest --testPathPattern="TrendSparkline|WeeklyBarChart|DailyAIRow|AIArcHero|ProgressBar" --no-coverage` — all new tests RED (failing, not erroring)

---

## Phase 9.1 — Implementation

### FR1 — TrendSparkline
- [ ] `feat(FR1)`: Implement `safeData` trailing-zero strip in `TrendSparkline.tsx`
- [ ] Add `domainPadding={{ left: 0, right: 10 }}` to `CartesianChart`
- [ ] Verify `safeData` used in domain calc, `toLineData`, `lastIdx`
- [ ] Run FR1 tests GREEN

### FR2 — WeeklyBarChart
- [ ] `feat(FR2)`: Compute `cellW` from `containerWidth / data.length` in `WeeklyBarChart.tsx`
- [ ] Add `domainPadding={{ left: cellW * 0.35, right: cellW * 0.35, top: 0, bottom: 0 }}` to `CartesianChart`
- [ ] Guard `cellW` against zero `containerWidth`
- [ ] Run FR2 tests GREEN

### FR3 — Semantic color routing
- [ ] `feat(FR3)`: Remove `AmbientBackground` import from `app/(tabs)/index.tsx`
- [ ] Add `AnimatedMeshBackground` import
- [ ] Derive `earningsPaceSignal` from `panelState`
- [ ] Replace `<AmbientBackground ...>` with `<AnimatedMeshBackground earningsPace={earningsPaceSignal} />`
- [ ] Run FR3 tests GREEN

### FR4 — DailyAIRow padding
- [ ] `feat(FR4)`: Change `px-1` → `px-4` on inner content View in `DailyAIRow.tsx`
- [ ] Run FR4 tests GREEN

### FR5 — AIArcHero SweepGradient
- [ ] `feat(FR5)`: Read current `AIArcHero.tsx` — verify `start={135}` and `end={405}` are present
- [ ] If missing: apply `start={135}` `end={405}` to `SweepGradient`
- [ ] Verify `c={{ x: cx, y: cy }}` where `cx = cy = size/2`
- [ ] Run FR5 tests GREEN

### FR6 — ProgressBar flex fill
- [ ] `feat(FR6)`: Read current `ProgressBar.tsx` — verify flex two-child approach is in place
- [ ] If `bg-violet` fails on `Animated.View`: use `backgroundColor: colors.violet` inline style on `View`
- [ ] Verify `fillFlex + spaceFlex = 1.0` invariant
- [ ] Run FR6 tests GREEN

### Integration Gate
- [ ] Run `cd hourglassws && npx jest --no-coverage` — full test suite GREEN
- [ ] TypeScript: `cd hourglassws && npx tsc --noEmit` — no new type errors

---

## Phase 9.2 — Review

### Alignment Check
- [ ] Run spec-implementation-alignment: verify all 6 FR success criteria are met by implementation

### PR Review
- [ ] Run `pr-review-toolkit:review-pr` on the branch
- [ ] Address any HIGH or CRITICAL feedback items

### Fix Pass (if needed)
- [ ] `fix(09-chart-visual-fixes)`: address review feedback

### Test Optimization
- [ ] Run test-optimiser: review tests for redundancy and missing coverage

---

## Session Notes

_To be filled in after execution._
