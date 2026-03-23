# 08-dark-glass-polish

**Status:** Draft
**Created:** 2026-03-23
**Last Updated:** 2026-03-23
**Owner:** @trilogy

---

## Overview

### What Is Being Built

Four targeted in-place visual fixes to fully align the Hourglass app with the Dark Liquid Glass design paradigm. Every change is a surgical edit to an existing component — no new files are created.

### The Four Fixes

**FR1 — Bento Grid Layout (overview.tsx)**
The Overview tab currently renders four `ChartSection` cards stacked vertically at equal width. This gives no visual hierarchy to metrics of different importance. The fix wraps Hours and AI% into a `flex-row` container so they appear side-by-side at half width, while Earnings (top) and BrainLift (bottom) remain full-width. The stagger animation count drops from 4 to 3 (the paired row shares one stagger index).

**FR2 — Progress Ring Gradient (AIArcHero.tsx)**
The AI arc progress ring currently renders as a flat grey track with no visible fill. Root cause: the fill `<Path>` sets `color="transparent"`, which sets paint alpha to 0. In Skia, a shader child (SweepGradient) still multiplies against the paint alpha, so `0 × gradient_rgba = invisible`. The fix is one character change: `color="transparent"` → `color="white"` (alpha=1.0). The SweepGradient then renders cyan→violet→magenta at full opacity.

**FR3 — DailyAIRow Elevation (DailyAIRow.tsx)**
Daily slot rows inside the AI breakdown card are flat text with no spatial separation. The fix wraps each row in a semi-transparent `View` (`rgba(255,255,255,0.05)` background, `rgba(255,255,255,0.10)` 1px border, 8px radius, 2px vertical margin). A Skia `Canvas` with `absoluteFill` renders a `LinearGradient` inner shadow (dark at top, transparent by 12px) to give the row a "floating secondary z-layer" feel. No `BackdropFilter` is used — the parent `GlassCard` already handles backdrop blur, and nesting BackdropFilter causes GPU SIGKILL on mobile.

**FR4 — Mesh Signal Wiring + Opacity (AnimatedMeshBackground.tsx + screens)**
The `AmbientBackground` wrapper component silently discards its `color` prop (`_color` prefix = intentionally unused), so `AnimatedMeshBackground`'s Node C (the status-driven glow) never activates. The fix replaces `<AmbientBackground color={...} />` in both `overview.tsx` and `ai.tsx` with direct `<AnimatedMeshBackground>` calls, passing the appropriate signal props (`earningsPace` and `aiPct` respectively). Node inner opacities are also bumped 0.15 → 0.22 so the mesh is more visible behind glass cards.

### How They Fit Together

These four fixes are independent of each other — no FR depends on another. All changes land in existing files. The combined result is a more visually differentiated, spatially layered, and dynamically responsive UI.

---

## Out of Scope

1. **Index (home) tab layout changes** — **Descoped:** The home tab has its own design evolution path. This spec targets only the Overview and AI tabs.

2. **New component files** — **Descoped:** All four fixes are in-place edits to existing files. No new components, hooks, or utilities are introduced.

3. **BackdropFilter in DailyAIRow** — **Descoped:** Nesting `BackdropFilter` inside a `GlassCard` (which already uses BackdropFilter) causes GPU overload and SIGKILL on mobile. The semi-transparent solid + Skia inner shadow approach achieves the same visual intent without the cost.

4. **AmbientBackground component removal** — **Descoped:** `AmbientBackground` is kept in the codebase because `getAmbientColor` from that file is still used by both screens to compute the `ambientColor` value passed to `AIArcHero`. Only the `<AmbientBackground>` JSX element is replaced in the affected screens.

5. **Manager approvals tab mesh wiring** — **Descoped:** The manager approvals tab is out of scope for this polish pass. Only `overview.tsx` and `ai.tsx` are wired.

6. **Animation or transition changes** — **Descoped:** The stagger animation in `overview.tsx` is adjusted only in count (4 → 3) as a direct consequence of the bento layout change. No new animations are introduced.

---

## Functional Requirements

### FR1: Bento Grid Layout

**Description:** Restructure the Overview tab's four-card vertical stack into a bento grid where Earnings is full-width, Hours + AI% share a half-width row, and BrainLift is full-width.

**Changes in `hourglassws/app/(tabs)/overview.tsx`:**

Replace the existing four `Animated.View` + `ChartSection` blocks (approximately lines 306–341) with:

```tsx
{/* Earnings — full width */}
<Animated.View style={getEntryStyle(0)}>
  <ChartSection label="WEEKLY EARNINGS" ... />
</Animated.View>

{/* Hours + AI% — side-by-side row */}
<Animated.View style={[getEntryStyle(1), { flexDirection: 'row', gap: 8 }]}>
  <View style={{ flex: 1 }}>
    <ChartSection label="WEEKLY HOURS" ... />
  </View>
  <View style={{ flex: 1 }}>
    <ChartSection label="AI USAGE %" ... />
  </View>
</Animated.View>

{/* BrainLift — full width */}
<Animated.View style={getEntryStyle(2)}>
  <ChartSection label="BRAINLIFT HOURS" ... />
</Animated.View>
```

Update `useStaggeredEntry({ count: 4 })` → `useStaggeredEntry({ count: 3 })`.

**Success Criteria:**
- [ ] Overview tab renders Earnings as a full-width card
- [ ] Hours and AI% cards appear side-by-side, each occupying approximately 50% of screen width
- [ ] BrainLift renders as a full-width card below the pair
- [ ] Stagger animation plays correctly for 3 entries (no missing or extra animations)
- [ ] `ChartSection` `onLayout` correctly measures narrowed width for the sparkline in paired cards
- [ ] No layout overflow or clipping on iPhone SE (375pt) screen width

---

### FR2: Progress Ring Gradient

**Description:** Fix the invisible progress ring fill by correcting the paint alpha on the fill `<Path>`.

**Change in `hourglassws/src/components/AIArcHero.tsx` (line ~173):**

```diff
- color="transparent"
+ color="white"
```

**Success Criteria:**
- [ ] The AI arc progress ring fill renders as a visible SweepGradient (cyan → violet → magenta)
- [ ] At `aiPct=0` the fill arc is not visible (arc length is zero)
- [ ] At `aiPct=50` the fill arc covers half the ring and the gradient is visible
- [ ] At `aiPct=100` the fill arc covers the full ring
- [ ] The track (grey background arc) still renders unchanged
- [ ] No TypeScript or runtime errors introduced

---

### FR3: DailyAIRow Elevation

**Description:** Wrap each `DailyAIRow` in a styled container that gives it a "floating secondary z-layer" appearance using semi-transparent fill and a Skia inner shadow gradient.

**Changes in `hourglassws/src/components/DailyAIRow.tsx`:**

Add constants:
```tsx
const ROW_BG = 'rgba(255,255,255,0.05)';
const ROW_BORDER = 'rgba(255,255,255,0.10)';
const ROW_SHADOW_TOP = 'rgba(0,0,0,0.40)';
const ROW_RADIUS = 8;
```

Add `onLayout` handler and `dims` state to measure the rendered row dimensions for the Canvas.

Wrap existing row content:
```tsx
<View
  onLayout={e => setDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
  style={{
    backgroundColor: ROW_BG,
    borderRadius: ROW_RADIUS,
    borderWidth: 1,
    borderColor: ROW_BORDER,
    marginVertical: 2,
    overflow: 'hidden',
  }}
>
  {dims.w > 0 && (
    <Canvas style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <RoundedRect x={0} y={0} width={dims.w} height={dims.h} r={ROW_RADIUS}>
        <SkiaLinearGradient
          start={vec(0, 0)}
          end={vec(0, 12)}
          colors={[ROW_SHADOW_TOP, 'transparent']}
        />
      </RoundedRect>
    </Canvas>
  )}
  {/* existing row content */}
</View>
```

Import additions: `Canvas`, `RoundedRect`, `LinearGradient as SkiaLinearGradient`, `vec` from `@shopify/react-native-skia`; `StyleSheet` from `react-native`.

**Success Criteria:**
- [ ] Each daily row has a visible semi-transparent background lift
- [ ] Each row has a 1px subtle white border
- [ ] The Skia inner shadow gradient renders at the top edge of each row
- [ ] The `onLayout` handler correctly captures row dimensions for the Canvas
- [ ] Canvas renders only after dims are measured (no zero-size Canvas)
- [ ] Existing row content (date label, AI%, BrainLift columns) renders correctly inside the new wrapper
- [ ] `isToday` styling (if present) still applies correctly
- [ ] No `BackdropFilter` is used in the row wrapper
- [ ] No TypeScript errors

---

### FR4: Mesh Signal Wiring + Opacity

**Description:** Wire `AnimatedMeshBackground` directly in `overview.tsx` and `ai.tsx` with signal props, and bump inner node opacities from 0.15 to 0.22.

**Changes in `hourglassws/src/components/AnimatedMeshBackground.tsx`:**

```diff
- const NODE_A_INNER = 'rgba(167,139,250,0.15)';
+ const NODE_A_INNER = 'rgba(167,139,250,0.22)';

- const NODE_B_INNER = 'rgba(0,194,255,0.15)';
+ const NODE_B_INNER = 'rgba(0,194,255,0.22)';
```

For Node C dynamic color:
```diff
- const nodeCColors: [string, string] = [hexToRgba(nodeCHex, 0.15), 'transparent'];
+ const nodeCColors: [string, string] = [hexToRgba(nodeCHex, 0.22), 'transparent'];
```

**Changes in `hourglassws/app/(tabs)/overview.tsx`:**

Add import:
```tsx
import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground';
```

Replace:
```diff
- <AmbientBackground color={ambientColor} />
+ <AnimatedMeshBackground earningsPace={earningsPace} />
```

(`AmbientBackground` import is kept for `getAmbientColor`.)

**Changes in `hourglassws/app/(tabs)/ai.tsx`:**

Add import:
```tsx
import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground';
```

Replace:
```diff
- <AmbientBackground color={ambientColor} />
+ <AnimatedMeshBackground aiPct={Math.round(heroAIPct)} />
```

(`AmbientBackground` import is kept for `getAmbientColor`.)

**Success Criteria:**
- [ ] `AnimatedMeshBackground` in `overview.tsx` receives `earningsPace` and activates Node C color (gold ≥0.85, warning 0.60–0.84, critical <0.60)
- [ ] `AnimatedMeshBackground` in `ai.tsx` receives `aiPct` and activates Node C color (violet ≥75, cyan 60–74, warning <60)
- [ ] Node A inner opacity is 0.22 (was 0.15)
- [ ] Node B inner opacity is 0.22 (was 0.15)
- [ ] Node C inner opacity is 0.22 (was 0.15)
- [ ] Both screens still compile without TypeScript errors
- [ ] `getAmbientColor` is still called and `ambientColor` is still passed to `AIArcHero` in both screens
- [ ] `AmbientBackground` import is kept (not removed) in both screens

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/app/(tabs)/overview.tsx` | FR1 bento layout restructure + FR4 mesh wiring |
| `hourglassws/app/(tabs)/ai.tsx` | FR4 mesh signal wiring |
| `hourglassws/src/components/AIArcHero.tsx` | FR2 fill path color fix |
| `hourglassws/src/components/DailyAIRow.tsx` | FR3 row elevation wrapper |
| `hourglassws/src/components/AnimatedMeshBackground.tsx` | FR4 opacity bump |

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/GlassCard.tsx` | Reference pattern for Skia inner shadow + onLayout |
| `hourglassws/src/components/__tests__/AnimatedMeshBackground.test.tsx` | Existing tests to validate/update |
| `hourglassws/src/components/__tests__/WeeklyBarChart.test.tsx` | Reference for component test structure |

### Files to Create

None. All changes are in-place edits.

---

### Data Flow

#### FR1: Bento Grid

```
useStaggeredEntry({ count: 3 })
  → getEntryStyle(0) → Earnings AnimatedView (full width)
  → getEntryStyle(1) → Row AnimatedView (flexDirection: row)
      → flex:1 View → ChartSection (WEEKLY HOURS)
                         → onLayout measures ~(screenWidth/2 - gap)
                         → TrendSparkline uses measured width
      → flex:1 View → ChartSection (AI USAGE %)
                         → onLayout measures ~(screenWidth/2 - gap)
                         → TrendSparkline uses measured width
  → getEntryStyle(2) → BrainLift AnimatedView (full width)
```

#### FR2: Progress Ring

```
AIArcHero receives aiPct prop
  → trimmedPath computed from aiPct angle
  → <Path path={trimmedPath} style="stroke" color="white">
      → <SweepGradient colors={GRADIENT_COLORS} />
      → Paint alpha = 1.0 (white) → gradient renders at full opacity
```

#### FR3: DailyAIRow Elevation

```
DailyAIRow renders
  → outer View (bg, border, radius, overflow:hidden)
      → onLayout → setDims({ w, h })
      → Canvas (absoluteFill, pointerEvents:none) [rendered only when dims.w > 0]
          → RoundedRect (full w×h, r=8)
              → LinearGradient (dark top → transparent at 12px)
      → existing content View (padding 8 horizontal)
          → date label, AI% column, BrainLift column
```

#### FR4: Mesh Signal Wiring

```
overview.tsx:
  earningsPace (already computed) → <AnimatedMeshBackground earningsPace={earningsPace} />
    → AnimatedMeshBackground resolveNodeCColor(earningsPace, null) → gold/warning/critical hex
    → hexToRgba(nodeCHex, 0.22) → Node C renders with status color at 0.22 opacity

ai.tsx:
  heroAIPct (already computed) → <AnimatedMeshBackground aiPct={Math.round(heroAIPct)} />
    → AnimatedMeshBackground resolveNodeCColor(null, aiPct) → violet/cyan/warning hex
    → hexToRgba(nodeCHex, 0.22) → Node C renders with status color at 0.22 opacity
```

---

### Edge Cases

#### FR1
- **iPhone SE (375pt)**: With `gap: 8` between paired cards, each gets `(375 - 16 padding - 8 gap) / 2 ≈ 175pt`. TrendSparkline must handle this narrower width. The `ChartSection` `onLayout` already measures actual width, so no manual calculation needed.
- **Missing data**: If `weeklySummary` is null/loading, ChartSection already handles it — no change needed.

#### FR2
- **aiPct=0**: The trimmed arc has zero length, so nothing is visible regardless of color. Correct behavior.
- **aiPct=100**: Full arc renders with gradient. No edge case.

#### FR3
- **Initial render (dims not measured)**: The Canvas is gated on `dims.w > 0` to prevent a zero-size Canvas render. On first frame, only the border+bg wrapper and content are visible. Canvas appears on next layout pass.
- **Dynamic content height**: Rows may vary in height if content wraps. The `onLayout` handler fires on every layout change, keeping the Canvas in sync.
- **isToday row**: The existing `isToday` conditional background must still apply. It should be applied as an additional style on the outer wrapper or as an inline style override — check existing implementation before modifying.

#### FR4
- **earningsPace null/undefined**: `resolveNodeCColor` in AnimatedMeshBackground already handles null props gracefully (Node C stays idle). The `earningsPace` value in overview.tsx is computed from weeklyData and may be null during loading — safe.
- **heroAIPct before data loads**: Same — `aiPct` may be 0 or undefined before data arrives. The null-safe check in `resolveNodeCColor` covers this.
- **AmbientBackground import**: Do NOT remove the `AmbientBackground` import from either screen. `getAmbientColor` is still used.

---

### Test Strategy

All 4 FRs have existing test infrastructure in `hourglassws/src/components/__tests__/`.

#### FR1 — No automated test
`overview.tsx` has no snapshot test. Manual verification only (side-by-side cards visible on device/simulator).

#### FR2 — AIArcHero tests
Check `__tests__/` for `AIArcHero.test.tsx`. If it exists:
- Update any snapshot that expects `color="transparent"` → `color="white"`
- Verify render test still passes

#### FR3 — DailyAIRow tests
Check `__tests__/` for `DailyAIRow.test.tsx`. If it exists:
- Update snapshot to reflect new wrapper View structure
- Add test: Canvas renders after onLayout delivers non-zero dims
- Verify row content still renders (date, AI%, BrainLift)

#### FR4 — AnimatedMeshBackground tests
`AnimatedMeshBackground.test.tsx` exists. Tests to add/update:
- `resolveNodeCColor(earningsPace=0.9, null)` → returns gold hex
- `resolveNodeCColor(null, aiPct=80)` → returns violet hex
- Node opacity constants are 0.22 (snapshot update)
- `hexToRgba(hex, 0.22)` produces correct rgba string

---

### Dependencies

All 4 FRs are independent of each other. Implementation order can be any. Recommended order for minimal cognitive load:

1. FR2 (one-line change, verifiable immediately)
2. FR4 (opacity + screen wiring)
3. FR1 (layout restructure)
4. FR3 (most code addition)
