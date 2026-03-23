# Spec Research: 09-chart-visual-fixes

## Problem Context

Six visual bugs across three screens, identified from live device testing. All are independent rendering or wiring issues with no blocking dependencies between them.

---

## Exploration Findings

### FR1 — TrendSparkline right-edge clipping

**File:** `src/components/TrendSparkline.tsx`

**Root cause (confirmed):**
- `CartesianChart` has no `domainPadding` prop → the Skia `<Group clip={chartBounds}>` that VNX applies internally is flush with the canvas edge. The `BlurMask blur={8}` on the Line extends 8px beyond the data point, clipping hard at the right edge.
- When the current week isn't complete, `overviewData.hours[last]`, `overviewData.aiPct[last]`, or `overviewData.brainliftHours[last]` may be 0 (bucket not yet accumulated). `toLineData` passes this through unchanged. VNX draws a `monotoneX` line that dives toward y=0 at that index, creating a sharp vertical plunge at the right edge.

**Fix approach:**
1. Add `domainPadding={{ left: 0, right: 10 }}` to `CartesianChart`. This pushes the rightmost data point 10px inward from the canvas edge, giving the BlurMask room.
2. In `TrendSparkline`, strip trailing zeros before passing to `toLineData`:
   ```ts
   const safeData = (() => {
     let end = data.length;
     while (end > 1 && data[end - 1] === 0) end--;
     return data.slice(0, end);
   })();
   ```
   Using `safeData` throughout (domain calc, `toLineData`, index lookups). Preserves a single leading zero (won't strip if only 1 element).

**Data flow:**
```
overviewData.hours[]  →  TrendSparkline data prop
                      →  toLineData(safeData) → CartesianChart
                      →  domain calc uses safeData
                      →  renderOutside lastIdx uses safeData.length - 1
```

---

### FR2 — WeeklyBarChart collapsed bars

**File:** `src/components/WeeklyBarChart.tsx`, `app/(tabs)/index.tsx`

**Root cause (suspected):**
VNX's `CartesianChart` applies internal axis domain padding even when axes are not shown. This shrinks `chartBounds` inward from the canvas edge. With a 120px canvas and a low-value bar (e.g. Monday = 1.8h, max = 8h), VNX's internal shrink leaves the bar at sub-visible height.

Specific evidence:
- `domain={{ y: [0, resolvedMax] }}` is set but VNX may still apply a default margin on top/bottom of the data range.
- No `domainPadding` prop is passed → VNX uses its own heuristic.
- The chart container has explicit 120px height — layout is NOT the issue.

**Fix approach:**
Add explicit `domainPadding={{ top: 0, bottom: 0 }}` to suppress VNX's internal vertical squash. Also add a small x padding to prevent bar edges clipping:
```tsx
<CartesianChart
  ...
  domain={{ y: [0, resolvedMax] }}
  domainPadding={{ left: cellW * 0.35, right: cellW * 0.35, top: 0, bottom: 0 }}
>
```
The x padding ensures first/last bars aren't half-clipped at canvas edges (matches the 65% bar width + 35% gap design).

**Note:** `resolvedMax` already uses `maxHours ?? 8` as a floor, so the Y ceiling is correct. The issue is vertical compression from VNX, not domain calculation.

---

### FR3 — Semantic color routing (Home mesh)

**File:** `app/(tabs)/index.tsx`

**Root cause (confirmed via grep):**
Line 195: `<AmbientBackground color={getAmbientColor({ type: 'panelState', state: panelState })} />`

`AmbientBackground` was identified in `08-dark-glass-polish` as discarding its `color` prop — only Nodes A (violet) and B (cyan) are active; Node C (status-driven) never fires because the prop is ignored by the AmbientBackground wrapper.

`overview.tsx` and `ai.tsx` were fixed to use `AnimatedMeshBackground` directly. `index.tsx` was not.

**Fix approach:**
Replace `AmbientBackground` import + usage in `index.tsx` with direct `AnimatedMeshBackground`:
```tsx
import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground';
...
// earningsPace: 0.0 = on track, 0.5 = behind, 1.0 = critical
// Derived from same panelState used everywhere else on the screen
const earningsPaceSignal = panelState === 'critical' ? 1.0
  : panelState === 'behind' ? 0.5
  : panelState === 'overtime' || panelState === 'crushedIt' ? 0.0
  : 0.0;

<AnimatedMeshBackground earningsPace={earningsPaceSignal} />
```

**Color token consistency check:**
`TODAY_BAR_COLORS` in `index.tsx` maps `critical` state to the `colors.critical` token. `AnimatedMeshBackground` Node C with `earningsPace=1.0` activates the critical color path. Both should use the same semantic red (`#F43F5E`). Verify during implementation that there's no local hardcode in `AnimatedMeshBackground`.

---

### FR4 — DailyAIRow horizontal padding

**File:** `src/components/DailyAIRow.tsx`

**Root cause:** Line 88 has `px-1` (4px per side) on the inner content View. Identified visually: text sits too close to the glass border.

**Fix:**
```tsx
// Before:
className={`flex-row items-center py-2.5 px-1${...}`}
// After:
className={`flex-row items-center py-2.5 px-4${...}`}
```

`px-4` = 16px per side, matching the spacious padding standard on `GlassCard` and other card components.

---

### FR5 — AIArcHero SweepGradient angles

**File:** `src/components/AIArcHero.tsx`

**Current state:** Previous spec added `start={START_ANGLE}` and `end={START_ANGLE + SWEEP}` (i.e. `start={135}` `end={405}`). Type definitions in `@shopify/react-native-skia@2.4.18` confirm `start`/`end` are valid `SweepGradientProps`.

**Expected visual outcome:**
- At 135° (arc start, 7 o'clock): cyan
- At 270° (arc midpoint, 12 o'clock): violet
- At 405° (arc end, 2 o'clock): magenta
- At 91% fill (end = 380.7°): deep violet-magenta (~82% between violet and magenta). No cyan.

**Verification steps during implementation:**
1. Read current `AIArcHero.tsx` to confirm `start`/`end` are present.
2. If already present, the issue is stale Expo bundle — force reload and confirm visual.
3. If NOT present (rolled back), re-apply.
4. Alternative if `start`/`end` still doesn't produce smooth results: switch to a `positions` prop mapped to the arc's angular range: `positions={[0, 0.5, 1]}` (default, but explicit) + verify `c` is exactly `vec(size/2, size/2)`.

**Interface:**
```tsx
<SweepGradient
  c={{ x: cx, y: cy }}        // cx = cy = size/2 = 90 for default size=180
  colors={[...GRADIENT_COLORS]} // ['#00C2FF', '#A78BFA', '#FF00FF']
  start={START_ANGLE}          // 135
  end={START_ANGLE + SWEEP}    // 405
/>
```

---

### FR6 — ProgressBar flex fill

**File:** `src/components/ProgressBar.tsx`

**Current state:** Previous spec replaced the broken `width: "${pct}%"` string (silently ignored by Reanimated's JSI UI thread) with a two-child flex layout:
- Fill child: `flex: fillFlex.value` (animates 0 → clamped)
- Spacer child: `flex: spaceFlex.value` (animates 1 → 1-clamped)
- Container: `flexDirection: 'row'`

**Why this is correct:** Two flex siblings share the total space proportionally. With `fillFlex + spaceFlex = 1.0` always, the fill takes exactly `clamped * 100%` of the width. No `onLayout` needed.

**Verification steps during implementation:**
1. Read current `ProgressBar.tsx` to confirm the flex approach is in place.
2. Verify `bg-violet` NativeWind class resolves on the `Animated.View` (it appears as a literal string in `AIArcHero.tsx` which is in the NativeWind content scan path — should be included).
3. If fill is invisible, check whether Reanimated's `Animated.View` needs `cssInterop` registration for NativeWind v4. If so, use a regular `View` for the fill (color applied via inline style using `colors.violet`) and a separate `Animated.View` for the width.

**Fallback if flex approach has issues:**
Use `onLayout` to capture container width into a SharedValue, then animate pixel width. Ensure animation is triggered from `onLayout` (not `useEffect`) to avoid the race condition where `containerWidth = 0` when `fillFraction` animation fires.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Strip trailing zeros in TrendSparkline | Yes, internally | Keeps all callers safe; single source of truth |
| domainPadding for TrendSparkline | `right: 10` only | Left edge has natural data start; right edge is where glow clips |
| domainPadding for WeeklyBarChart | `top: 0, bottom: 0` + x padding from cellW | Suppresses VNX squash while accounting for bar width |
| Home mesh wiring | Replace AmbientBackground with AnimatedMeshBackground directly | Consistent with overview.tsx and ai.tsx pattern |
| DailyAIRow padding | px-4 (16px) | Matches card-level breathing room standard |

---

## Interface Contracts

### TrendSparkline (modified)
```ts
// Internal: safeData strips trailing zeros before chart render
// External prop API UNCHANGED
interface TrendSparklineProps {
  data: number[];          // ← passed from parent (overviewData.hours etc.)
  // ... unchanged
}
// Internal: safeData = data with trailing 0s stripped (min length 1)
// domainPadding={{ left: 0, right: 10 }} added to CartesianChart
```

### WeeklyBarChart (modified)
```ts
// External prop API UNCHANGED
// Internal: domainPadding added to CartesianChart
// domainPadding={{ left: cellW * 0.35, right: cellW * 0.35, top: 0, bottom: 0 }}
// cellW computed before CartesianChart render (from width / data.length)
```

### index.tsx (modified)
```ts
// earningsPaceSignal: number (0.0 | 0.5 | 1.0)
// Derived from panelState — passed as earningsPace prop to AnimatedMeshBackground
// AmbientBackground import removed
```

### DailyAIRow (modified)
```ts
// className change only: px-1 → px-4 on inner content View
// No prop or type changes
```

---

## Test Plan

### FR1 — TrendSparkline
**Contracts:** `safeData` strips trailing zeros; `domainPadding` is set.

- [ ] `data = [100, 90, 85, 0]` → safeData = `[100, 90, 85]`, lastIdx = 2
- [ ] `data = [0]` → safeData = `[0]` (single zero preserved — no empty array)
- [ ] `data = [10, 20, 30]` (no trailing zeros) → safeData unchanged
- [ ] `data = [0, 0, 0]` → safeData = `[0]` (collapses all but first zero)
- [ ] `CartesianChart` receives `domainPadding={{ left: 0, right: 10 }}`

### FR2 — WeeklyBarChart
**Contracts:** `domainPadding` suppresses VNX vertical squash.

- [ ] `CartesianChart` has `domainPadding` with `top: 0, bottom: 0`
- [ ] Bar with `hours=1.8, maxHours=8` renders at ~22% of canvas height (not sub-pixel)
- [ ] Future bars (isFuture=true) render at 0 height → filtered by `barH === 0` check

### FR3 — Semantic color routing
**Contracts:** `AnimatedMeshBackground` receives `earningsPace` derived from `panelState`.

- [ ] `panelState='critical'` → `earningsPace=1.0`
- [ ] `panelState='behind'` → `earningsPace=0.5`
- [ ] `panelState='onTrack'` → `earningsPace=0.0`
- [ ] `AmbientBackground` no longer imported or used in `index.tsx`

### FR4 — DailyAIRow padding
- [ ] Inner content View className contains `px-4` (not `px-1`)

### FR5 — SweepGradient
- [ ] `SweepGradient` has `start={135}` and `end={405}`
- [ ] `c={{ x: cx, y: cy }}` where `cx = cy = size/2`

### FR6 — ProgressBar
- [ ] Fill child uses `flex` animated value (not `width` percentage string)
- [ ] Spacer child with complementary flex ensures proportional fill
- [ ] Container has `flexDirection: 'row'`

---

## Files to Reference

- `src/components/TrendSparkline.tsx` — primary fix file
- `src/components/WeeklyBarChart.tsx` — primary fix file
- `app/(tabs)/index.tsx` — AmbientBackground → AnimatedMeshBackground swap
- `app/(tabs)/overview.tsx` — reference for correct AnimatedMeshBackground usage pattern
- `app/(tabs)/ai.tsx` — reference for correct AnimatedMeshBackground usage pattern
- `src/components/DailyAIRow.tsx` — px-1 → px-4
- `src/components/AIArcHero.tsx` — verify SweepGradient
- `src/components/ProgressBar.tsx` — verify flex approach
- `src/components/AnimatedMeshBackground.tsx` — earningsPace prop API
- `src/lib/chartData.ts` — toLineData / toBarData shapes
