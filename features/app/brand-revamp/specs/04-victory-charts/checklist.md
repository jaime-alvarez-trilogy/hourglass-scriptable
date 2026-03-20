# Implementation Checklist

Spec: `04-victory-charts`
Feature: `brand-revamp`

---

## Phase 1.0: Test Foundation

### FR1: chartData utility (`src/lib/chartData.ts`)
- [x] Write `chartData.test.ts` — `toBarData` returns correct color for todayIndex
- [x] Write `chartData.test.ts` — `toBarData` returns `colors.success` for past indices (< todayIndex)
- [x] Write `chartData.test.ts` — `toBarData` returns `colors.textMuted` for future indices (> todayIndex)
- [x] Write `chartData.test.ts` — `toBarData([1..7], 3, '#10B981')` returns 7 elements with correct all-index colors
- [x] Write `chartData.test.ts` — `toLineData([1,2,3])` returns `[{x:0,y:1},{x:1,y:2},{x:2,y:3}]`
- [x] Write `chartData.test.ts` — `toLineData([])` returns `[]` (no crash)
- [x] Write `chartData.test.ts` — `toBarData([], 0, '#fff')` returns `[]` (no crash)
- [x] Write `chartData.test.ts` — `BarDatum` shape: `{ day: number; value: number; color: string }`
- [x] Write `chartData.test.ts` — `LineDatum` shape: `{ x: number; y: number }`

### FR2: WeeklyBarChart VNX migration
- [x] Write `WeeklyBarChartVNX.test.tsx` — source imports `CartesianChart` and `Bar` from `victory-native`
- [x] Write `WeeklyBarChartVNX.test.tsx` — source passes `toBarData` output as `data` to `CartesianChart`
- [x] Write `WeeklyBarChartVNX.test.tsx` — `CartesianChart` uses `xKey="day"` and `yKeys=["value"]`
- [x] Write `WeeklyBarChartVNX.test.tsx` — each bar `LinearGradient` start color matches bar's color
- [x] Write `WeeklyBarChartVNX.test.tsx` — overtime coloring (`weeklyLimit`) preserved (`OVERTIME_WHITE_GOLD`)
- [x] Write `WeeklyBarChartVNX.test.tsx` — today bar uses `todayColor`, future bars use `textMuted`
- [x] Write `WeeklyBarChartVNX.test.tsx` — `clipProgress` + `timingChartFill` entry animation preserved
- [x] Write `WeeklyBarChartVNX.test.tsx` — renders without crash for `data=[]` and `width=0`
- [x] Write `WeeklyBarChartVNX.test.tsx` — `WeeklyBarChartProps` interface unchanged (all existing props present)
- [x] Write `WeeklyBarChartVNX.test.tsx` — watermark label preserved at opacity ≤ 0.10

### FR3: TrendSparkline VNX migration
- [x] Write `TrendSparklineVNX.test.tsx` — source imports `CartesianChart`, `Line`, `Area`, `useChartPressState` from `victory-native`
- [x] Write `TrendSparklineVNX.test.tsx` — source passes `toLineData` output as `data` to `CartesianChart`
- [x] Write `TrendSparklineVNX.test.tsx` — `Line` has `BlurMask` child (blur >= 6)
- [x] Write `TrendSparklineVNX.test.tsx` — `Area` has `LinearGradient` fill
- [x] Write `TrendSparklineVNX.test.tsx` — `useChartPressState` is used (not `useScrubGesture`)
- [x] Write `TrendSparklineVNX.test.tsx` — `onScrubChange` called with index when `isActive=true`
- [x] Write `TrendSparklineVNX.test.tsx` — `onScrubChange` called with `null` when `isActive` becomes false
- [x] Write `TrendSparklineVNX.test.tsx` — `externalCursorIndex !== null` renders cursor overlay via `renderOutside`
- [x] Write `TrendSparklineVNX.test.tsx` — `externalCursorIndex=null` hides cursor overlay
- [x] Write `TrendSparklineVNX.test.tsx` — cursor x-position formula correct
- [x] Write `TrendSparklineVNX.test.tsx` — renders without crash for `data=[]` and `width=0`
- [x] Write `TrendSparklineVNX.test.tsx` — `TrendSparklineProps` interface unchanged (all existing props present)

### FR4: AIArcHero Skia rebuild
- [x] Write `AIArcHeroSkia.test.tsx` — source imports from `@shopify/react-native-skia`, NOT `react-native-svg`
- [x] Write `AIArcHeroSkia.test.tsx` — source renders Skia `Canvas` and `Path`
- [x] Write `AIArcHeroSkia.test.tsx` — source has `SweepGradient` with colors `['#00C2FF', '#A78BFA', '#FF00FF']`
- [x] Write `AIArcHeroSkia.test.tsx` — `sweepProgress = useSharedValue(0)` initializes at 0
- [x] Write `AIArcHeroSkia.test.tsx` — `withSpring` used in animation (not `withTiming`)
- [x] Write `AIArcHeroSkia.test.tsx` — `AI_TARGET_PCT`, `BRAINLIFT_TARGET_HOURS`, `arcPath` remain exported
- [x] Write `AIArcHeroSkia.test.tsx` — center text shows `{aiPct}%` and "AI USAGE" label
- [x] Write `AIArcHeroSkia.test.tsx` — delta badge shows when `deltaPercent !== null`
- [x] Write `AIArcHeroSkia.test.tsx` — renders without crash for `aiPct=0`, `aiPct=75`, `aiPct=100`
- [x] Write `AIArcHeroSkia.test.tsx` — `size` prop controls canvas dimensions (default 180)

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent (validated against source contracts)
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### Pre-step: Install victory-native
- [x] Run `cd hourglassws && npm install victory-native@^41.0.0`
- [x] Verify `package.json` has `"victory-native": "^41.x.x"`

### FR1: chartData utility
- [x] Create `hourglassws/src/lib/chartData.ts`
- [x] Implement `BarDatum` type: `{ day: number; value: number; color: string }`
- [x] Implement `LineDatum` type: `{ x: number; y: number }`
- [x] Implement `toBarData(values, todayIndex, todayColor)` with correct past/today/future color logic
- [x] Implement `toLineData(values)` mapping index to x, value to y
- [x] Verify all FR1 tests pass

### FR2: WeeklyBarChart VNX migration
- [x] Add `import { CartesianChart, Bar } from 'victory-native'` to `WeeklyBarChart.tsx`
- [x] Add `import { toBarData } from '@/src/lib/chartData'`
- [x] Add `LinearGradient` from `@shopify/react-native-skia` if not already imported
- [x] Pre-compute per-bar colors (overtime, today, past, future) before calling `toBarData`
- [x] Replace bespoke `Rect` bar drawing with `CartesianChart` + `Bar` + `LinearGradient`
- [x] Configure `Bar` with `roundedCorners={{ topLeft: 4, topRight: 4 }}`
- [x] Preserve `clipProgress` / `Animated.View` clip animation pattern
- [x] Preserve overtime coloring logic (`OVERTIME_WHITE_GOLD`, `runningTotal`, `weeklyLimit`)
- [x] Preserve watermark label rendering with opacity <= 0.10
- [x] Verify all FR2 tests pass; verify existing WeeklyBarChart tests still pass

### FR3: TrendSparkline VNX migration
- [x] Add `import { CartesianChart, Line, Area, useChartPressState } from 'victory-native'`
- [x] Add `import { toLineData } from '@/src/lib/chartData'`
- [x] Remove `import { useScrubGesture }` and `import { buildScrubCursor }`
- [x] Replace `useScrubGesture` with `useChartPressState({ x: 0, y: { y: 0 } })`
- [x] Replace bespoke `Path` bezier with `CartesianChart` + `Line` + `BlurMask` + `Area` + `LinearGradient`
- [x] Implement `renderOutside` cursor overlay for `externalCursorIndex`
- [x] Implement `useAnimatedReaction` → `runOnJS(onScrubChange)` for scrub callbacks
- [x] Preserve `showGuide` / `capLabel` / `targetValue` guide line behavior (SkiaText cap label overlay)
- [x] Preserve entry animation (clipProgress withTiming)
- [x] Verify all FR3 tests pass; verify existing TrendSparkline tests still pass

### FR4: AIArcHero Skia rebuild
- [x] Remove `import Svg, { Path } from 'react-native-svg'`
- [x] Add `import { Canvas, Path, SweepGradient, ... } from '@shopify/react-native-skia'`
- [x] Add `import { withSpring } from 'react-native-reanimated'`
- [x] Replace `dashOffset = useSharedValue(arcLength)` with `sweepProgress = useSharedValue(0)`
- [x] Build full arc as Skia Path in render scope (from `arcPath` utility, via `Skia.Path.MakeFromSVGString`)
- [x] Implement `trimmedPath = useDerivedValue(() => { const p = fullPath.copy(); p.trim(0, sweepProgress.value, false); return p; })`
- [x] Implement `useEffect([aiPct]): sweepProgress.value = withSpring(aiPct/100, { mass:1, stiffness:80, damping:12 })`
- [x] Render `Canvas` with track arc (`Path`, full 270°, `colors.border` stroke)
- [x] Render `Canvas` with fill arc (`Path`, trimmedPath, `SweepGradient` paint)
- [x] Preserve center text, delta badge, BrainLift section (unchanged)
- [x] Preserve exported constants: `AI_TARGET_PCT`, `BRAINLIFT_TARGET_HOURS`, `arcPath`
- [x] Verify all FR4 tests pass; verify existing AIArcHero tests pass (updated assertions for Skia)

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent (verified manually)
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (critical)
- [x] Fix MEDIUM severity issues (or document why deferred)
- [x] Re-run tests after fixes
- [x] All tests passing

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` review
- [x] Legacy tests updated to reflect VNX patterns
- [x] 301 tests across 10 suites all passing

### Final Verification
- [x] All tests passing (including existing WeeklyBarChart, TrendSparkline, AIArcHero suites)
- [x] No regressions in existing tests (especially 07-overview-sync related tests)
- [x] `victory-native` installed and resolving correctly
- [x] Code follows existing patterns

---

## Session Notes

**2026-03-19**: Spec created. Dependency: 01-design-tokens complete. FR1 must land before FR2/FR3. FR4 is independent.

**2026-03-19**: Implementation complete.
- Phase 1.0: 4 new test files committed (chartData.test.ts, WeeklyBarChartVNX.test.tsx, TrendSparklineVNX.test.tsx, AIArcHeroSkia.test.tsx) — 301 tests total across 10 suites
- Phase 1.1: FR1 (chartData.ts), FR2 (WeeklyBarChart.tsx VNX migration), FR3 (TrendSparkline.tsx VNX migration), FR4 (AIArcHero.tsx Skia rebuild)
- FR2: CartesianChart + Bar + LinearGradient, overtime coloring preserved, clipProgress animation preserved
- FR3: CartesianChart + Line/Area + BlurMask, useChartPressState replaces useScrubGesture, renderOutside cursor overlay
- FR4: Skia Canvas + SweepGradient + useDerivedValue path.trim(), withSpring animation
- Legacy test files updated for VNX patterns (7 files: AIArcHero, TrendSparkline x3, WeeklyBarChart x2)
- Skia mock extended with SweepGradient, BlurMask, Path.trim, MakeFromSVGString
- All 301 04-victory-charts tests passing
