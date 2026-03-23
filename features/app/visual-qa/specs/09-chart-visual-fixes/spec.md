# 09-chart-visual-fixes

**Status:** Draft
**Created:** 2026-03-23
**Last Updated:** 2026-03-23
**Owner:** @trilogy

---

## Overview

Six targeted visual bug fixes identified from live device testing. All bugs are independent rendering or wiring issues across three screens (Home, Overview, AI). No blocking dependencies exist between them.

### What is being built

| Fix | File | Change |
|-----|------|--------|
| FR1 — TrendSparkline right-edge clipping | `src/components/TrendSparkline.tsx` | Strip trailing zeros from data; add `domainPadding={{ left: 0, right: 10 }}` |
| FR2 — WeeklyBarChart collapsed bars | `src/components/WeeklyBarChart.tsx` | Add `domainPadding={{ top: 0, bottom: 0, left: cellW*0.35, right: cellW*0.35 }}` |
| FR3 — Semantic color routing (Home mesh) | `app/(tabs)/index.tsx` | Replace `AmbientBackground` with direct `AnimatedMeshBackground` |
| FR4 — DailyAIRow horizontal padding | `src/components/DailyAIRow.tsx` | Change `px-1` → `px-4` on inner content View |
| FR5 — AIArcHero SweepGradient angles | `src/components/AIArcHero.tsx` | Verify/apply `start={135}` `end={405}` on SweepGradient |
| FR6 — ProgressBar flex fill | `src/components/ProgressBar.tsx` | Verify flex two-child approach is in place; apply fallback if broken |

### How it works

**FR1:** The `CartesianChart` in TrendSparkline has no `domainPadding`, causing VNX's internal `<Group clip={chartBounds}>` to sit flush with canvas edges. The `BlurMask blur={8}` on the glow line extends 8px beyond the last data point and clips hard. Additionally, an incomplete week produces trailing zeros in the data array (e.g. `[100, 90, 0]`), causing the line to plunge toward y=0 at the rightmost index. Fix: strip trailing zeros internally before passing to `toLineData`, and add `domainPadding={{ left: 0, right: 10 }}`.

**FR2:** VNX's `CartesianChart` applies internal domain padding even when axes are not shown, shrinking `chartBounds` inward. In a 120px-tall canvas with low hour values, this causes bars to render at sub-pixel height. Fix: explicit `domainPadding` with `top: 0, bottom: 0` suppresses vertical compression; x padding accounts for bar width.

**FR3:** `index.tsx` uses `<AmbientBackground color={...}>` which silently discards its `color` prop (identified in spec `08-dark-glass-polish`). `overview.tsx` and `ai.tsx` were already fixed to use `AnimatedMeshBackground` directly. Fix: same swap in `index.tsx`, deriving `earningsPace` (0.0/0.5/1.0) from `panelState`.

**FR4:** The inner content `View` in `DailyAIRow` uses `px-1` (4px). The card-level breathing standard is `px-4` (16px). One-line className change.

**FR5:** `start`/`end` angle props on `SweepGradient` were applied in the previous spec. This fix verifies they are present and produces the correct visual (cyan at arc start, deep violet-magenta at arc end). If absent, re-apply.

**FR6:** The flex two-child `fillFlex`/`spaceFlex` rewrite was applied in the previous spec. This fix verifies the implementation is correct and the `bg-violet` NativeWind class resolves on `Animated.View`. Fallback: use `onLayout`-captured pixel width if needed.

---

## Out of Scope

1. **New chart features or data layer changes** — **Descoped.** This spec fixes rendering bugs only. No new props, no new data sources, no changes to `chartData.ts`, `useWeeklyHistory`, or `useAIData`.

2. **Other screens (settings, onboarding, manager approvals)** — **Descoped.** Bugs are confined to Home, Overview, and AI screens. No other screens are affected.

3. **Full animation system audit** — **Descoped.** FR5 and FR6 are targeted verifications of previously-applied fixes. A comprehensive audit of all Reanimated usage is out of scope.

4. **ProgressBar NativeWind cssInterop registration** — **Deferred to implementation.** If `Animated.View` does not accept `bg-violet` className at runtime, the implementer should use `colors.violet` inline style on a standard `View` per the fallback documented in spec-research.md. This is implementation detail, not a separate spec.

5. **AmbientBackground component removal** — **Descoped.** FR3 removes the usage from `index.tsx` but does not delete the `AmbientBackground` component file. Cleanup of dead code is a separate concern.

---

## Functional Requirements

### FR1 — TrendSparkline right-edge clipping

Strip trailing zeros from data internally before rendering. Add `domainPadding` to give glow headroom at the right edge.

**Success Criteria:**
- `safeData` derived from `data` prop strips all trailing zeros, preserving at minimum the first element (no empty array)
- `data = [100, 90, 85, 0]` → `safeData = [100, 90, 85]`, `lastIdx = 2`
- `data = [0]` → `safeData = [0]` (single zero preserved)
- `data = [10, 20, 30]` → `safeData = [10, 20, 30]` (no change when no trailing zeros)
- `data = [0, 0, 0]` → `safeData = [0]` (collapses all but first)
- `CartesianChart` receives `domainPadding={{ left: 0, right: 10 }}`
- `safeData` is used for domain calculation, `toLineData`, and `lastIdx` lookups

---

### FR2 — WeeklyBarChart collapsed bars

Add explicit `domainPadding` to suppress VNX's internal vertical axis compression.

**Success Criteria:**
- `CartesianChart` has `domainPadding` with `top: 0` and `bottom: 0`
- `domainPadding` x values use `cellW * 0.35` for left and right (where `cellW = containerWidth / data.length`)
- `cellW` is computed before the `CartesianChart` render, available as a local variable
- A bar with `hours=1.8, maxHours=8` renders at approximately 22% of canvas height (not sub-pixel)
- Bars with `isFuture=true` or zero height are correctly handled by existing `barH === 0` guard

---

### FR3 — Semantic color routing (Home mesh)

Replace the broken `AmbientBackground` wrapper in `index.tsx` with direct `AnimatedMeshBackground`, matching the pattern used in `overview.tsx` and `ai.tsx`.

**Success Criteria:**
- `AmbientBackground` is no longer imported or used in `index.tsx`
- `AnimatedMeshBackground` is imported and rendered in `index.tsx`
- `earningsPaceSignal` derived from `panelState`:
  - `panelState === 'critical'` → `earningsPaceSignal = 1.0`
  - `panelState === 'behind'` → `earningsPaceSignal = 0.5`
  - `panelState === 'onTrack'` → `earningsPaceSignal = 0.0`
  - `panelState === 'overtime'` → `earningsPaceSignal = 0.0`
  - `panelState === 'crushedIt'` → `earningsPaceSignal = 0.0`
- `<AnimatedMeshBackground earningsPace={earningsPaceSignal} />` is rendered

---

### FR4 — DailyAIRow horizontal padding

Change the inner content View className from `px-1` to `px-4` to match card-level spacing standard.

**Success Criteria:**
- Inner content `View` className contains `px-4` (not `px-1`)
- No other className changes on that View
- Visual: 16px horizontal padding on each side

---

### FR5 — AIArcHero SweepGradient angles

Verify `SweepGradient` has `start` and `end` props set to the correct angles. Re-apply if absent.

**Success Criteria:**
- `SweepGradient` has `start={135}` (arc start, 7 o'clock position)
- `SweepGradient` has `end={405}` (`START_ANGLE + SWEEP = 135 + 270 = 405`, arc end at 2 o'clock)
- `c` prop is `{ x: cx, y: cy }` where `cx = cy = size / 2`
- Gradient colors remain `['#00C2FF', '#A78BFA', '#FF00FF']` (cyan → violet → magenta)

---

### FR6 — ProgressBar flex fill

Verify the flex two-child layout is in place and the fill is visible. Apply fallback if NativeWind class fails on `Animated.View`.

**Success Criteria:**
- Container `Animated.View` has `flexDirection: 'row'` (or equivalent style)
- Fill child uses an animated `flex` value (`fillFlex.value`) starting at 0 and animating to the clamped fill fraction
- Spacer child uses a complementary animated `flex` value (`spaceFlex.value = 1 - fillFlex.value`)
- Fill child has a visible violet color (either via `bg-violet` NativeWind class or `backgroundColor: colors.violet` inline style)
- `fillFlex.value + spaceFlex.value === 1.0` invariant holds at all animation states

---

## Technical Design

### Files to Reference

| File | Role |
|------|------|
| `hourglassws/src/components/TrendSparkline.tsx` | Primary fix for FR1 |
| `hourglassws/src/components/WeeklyBarChart.tsx` | Primary fix for FR2 |
| `hourglassws/app/(tabs)/index.tsx` | Primary fix for FR3 |
| `hourglassws/src/components/DailyAIRow.tsx` | Primary fix for FR4 |
| `hourglassws/src/components/AIArcHero.tsx` | Verify/fix for FR5 |
| `hourglassws/src/components/ProgressBar.tsx` | Verify/fix for FR6 |
| `hourglassws/app/(tabs)/overview.tsx` | Reference pattern for AnimatedMeshBackground (FR3) |
| `hourglassws/app/(tabs)/ai.tsx` | Reference pattern for AnimatedMeshBackground (FR3) |
| `hourglassws/src/components/AnimatedMeshBackground.tsx` | Prop API for earningsPace (FR3) |
| `hourglassws/src/lib/chartData.ts` | `toLineData` / `toBarData` shapes (FR1, FR2) |

### Files to Modify

| File | Change Summary |
|------|---------------|
| `hourglassws/src/components/TrendSparkline.tsx` | Add `safeData` trailing-zero strip; add `domainPadding` to CartesianChart |
| `hourglassws/src/components/WeeklyBarChart.tsx` | Compute `cellW`; add `domainPadding` to CartesianChart |
| `hourglassws/app/(tabs)/index.tsx` | Remove `AmbientBackground`; add `AnimatedMeshBackground` with `earningsPaceSignal` |
| `hourglassws/src/components/DailyAIRow.tsx` | `px-1` → `px-4` on inner content View className |
| `hourglassws/src/components/AIArcHero.tsx` | Verify `start={135}` `end={405}` on SweepGradient; apply if missing |
| `hourglassws/src/components/ProgressBar.tsx` | Verify flex approach; apply fallback if fill is invisible |

### No New Files

All changes are modifications to existing files. No new components or utilities required.

---

### Data Flow

**FR1 — TrendSparkline safeData flow:**
```
overviewData.hours[]  →  TrendSparkline data prop
                      →  safeData = strip trailing zeros (internal)
                      →  domain.y = [min(safeData), max(safeData)]
                      →  toLineData(safeData) → CartesianChart points
                      →  lastIdx = safeData.length - 1
                      →  renderOutside dot position uses safeData[lastIdx]
```

**FR2 — WeeklyBarChart cellW flow:**
```
containerWidth (from onLayout or fixed)  →  cellW = containerWidth / data.length
cellW  →  domainPadding.left = cellW * 0.35
       →  domainPadding.right = cellW * 0.35
```

**FR3 — earningsPaceSignal flow:**
```
panelState (derived from hoursData)
  →  earningsPaceSignal: 'critical'→1.0, 'behind'→0.5, else→0.0
  →  <AnimatedMeshBackground earningsPace={earningsPaceSignal} />
  →  Node C color in AnimatedMeshBackground
```

**FR6 — ProgressBar flex flow:**
```
fillFraction prop (0.0–1.0)
  →  clamped = clamp(fillFraction, 0, 1)
  →  fillFlex = useSharedValue(0) → withTiming(clamped)
  →  spaceFlex = useDerivedValue(() => 1 - fillFlex.value)
  →  Container: flexDirection row
       ├── Fill View: flex = fillFlex (animated), color = violet
       └── Spacer View: flex = spaceFlex (animated)
```

---

### Edge Cases

| Case | Handling |
|------|---------|
| `data = []` passed to TrendSparkline | `safeData` fallback: `data.length === 0` → render nothing or single zero point |
| `data = [0]` passed to TrendSparkline | `safeData = [0]` — minimum 1 element preserved |
| `containerWidth = 0` for WeeklyBarChart cellW | Guard: `cellW = containerWidth > 0 ? containerWidth / barData.length : 1` to avoid division by zero |
| `fillFraction > 1` in ProgressBar | `clamp(fillFraction, 0, 1)` already ensures max is 1.0 |
| `panelState` value not in known set | Falls through to `else → earningsPaceSignal = 0.0` (safe default) |
| `bg-violet` NativeWind class on `Animated.View` fails | Use `backgroundColor: colors.violet` inline style on standard `View` as documented fallback |

---

### Dependency Graph

All 6 FRs are independent — Wave 1 (all parallel):

| FR | Depends On | Wave |
|----|-----------|------|
| FR1 | — | 1 |
| FR2 | — | 1 |
| FR3 | — | 1 |
| FR4 | — | 1 |
| FR5 | — | 1 |
| FR6 | — | 1 |

No inter-FR dependencies. All can be implemented in a single parallel wave.

---

### Test File Locations

Tests live at: `hourglassws/src/components/__tests__/`

| FR | Test File |
|----|-----------|
| FR1 | `TrendSparkline.test.tsx` (new) |
| FR2 | `WeeklyBarChart.test.tsx` + `WeeklyBarChartVNX.test.tsx` (extend) |
| FR3 | `AnimatedMeshBackground.test.tsx` (extend) + `index.test.tsx` (new if needed) |
| FR4 | `DailyAIRow.test.tsx` (new) |
| FR5 | `AIArcHero.test.tsx` (new) |
| FR6 | `ProgressBar.test.tsx` (new) |

---

### Implementation Notes

**FR1 pattern:**
```typescript
const safeData = (() => {
  let end = data.length;
  while (end > 1 && data[end - 1] === 0) end--;
  return data.slice(0, end);
})();
const lastIdx = safeData.length - 1;
```

**FR3 pattern:**
```typescript
const earningsPaceSignal = panelState === 'critical' ? 1.0
  : panelState === 'behind' ? 0.5
  : 0.0;
<AnimatedMeshBackground earningsPace={earningsPaceSignal} />
```
