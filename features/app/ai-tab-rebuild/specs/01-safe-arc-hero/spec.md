# Safe Arc Hero

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

### What Is Being Built

`AIArcHero` is a React Native component that renders a 270° SVG arc gauge displaying an AI usage percentage, a week-over-week delta badge, and a BrainLift secondary metric row. The current implementation crashes the AI tab on navigation due to per-frame string allocation in a Reanimated worklet.

This spec replaces the unsafe `useAnimatedProps` path-string approach with a `strokeDashoffset` animation strategy. The full arc path is computed once at render time; only a single number (`dashOffset`) is animated per frame. The visual result is identical — the arc fills from empty to `aiPct` percent — but GC pressure on the Hermes worklet heap drops from ~120 string allocations to zero.

### How It Is Built

**Current (unsafe):**
- `fillEndAngle` SharedValue drives `arcPath()` inside a worklet callback
- `arcPath()` generates a new `"M x y A r r 0 flag 1 x2 y2"` string (~45 chars) on every animation frame
- `withSpring(springPremium)` settles over ~2 seconds at 60fps = ~120 string allocations

**New (safe):**
- `fullArcPath` is computed once in JS render scope via `arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP)`
- `arcLength = r * (SWEEP * Math.PI / 180)` computed once
- `dashOffset` SharedValue starts at `arcLength` (fully hidden arc)
- `useEffect([aiPct])` calls `withTiming(arcLength * (1 - aiPct / 100), timingChartFill)`
- `useAnimatedProps` returns only `{ strokeDashoffset: dashOffset.value }` — one number per frame
- `strokeDasharray={[arcLength, arcLength]}` on the fill `AnimatedPath` enables the dash technique

The `AnimatedPath` component, `arcPath()` export, props interface, and all visual output remain unchanged. Only the internal animation wiring changes.

### Scope

- Modifies `AIArcHero.tsx` only
- Creates `AIArcHero.test.tsx`
- No changes to callers, data layer, or other components

---

## Out of Scope

1. **AIConeChart scrub reaction gating** — Descoped: handled in `02-safe-cone-scrub`.

2. **useHistoryBackfill relocation** — Descoped: handled in `03-backfill-relocation`.

3. **ai.tsx data-gated rendering and stagger removal** — Descoped: handled in `04-ai-tab-screen`.

4. **Visual redesign of AIArcHero** — Descoped: same layout, same colors, same typography. This spec is a crash fix only.

5. **Skia canvas alternative for arc rendering** — Descoped: `strokeDashoffset` approach was chosen over Skia canvas (Decision 1 in spec-research.md). Revisit only if SVG animation proves insufficient on older devices.

6. **arcPath() behavior changes** — Descoped: `arcPath()` is a pure function with stable behavior and existing test coverage. Its signature and output are unchanged.

7. **Animation duration tuning** — Descoped: `timingChartFill` (1800ms Expo ease-out) is used as-is, consistent with WeeklyBarChart and TrendSparkline. Duration changes are a design system concern, not a crash fix concern.

8. **ProgressBar and Card changes** — Descoped: these components are used as-is. No changes.

---

## Functional Requirements

### FR1: Replace useAnimatedProps path-string with strokeDashoffset

**Description:** Remove the per-frame `arcPath()` call from the `useAnimatedProps` worklet. Replace with a `strokeDashoffset` approach where `arcPath()` is called once in render scope and only a single number is animated.

**Implementation:**
- Remove `fillEndAngle` SharedValue and its associated `useAnimatedProps` that returns `{ d: arcPath(...) }`
- Remove `withSpring` / `springPremium` imports
- Add `dashOffset` SharedValue initialized to `arcLength` (arc starts hidden)
- Compute `fullArcPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP)` once in render scope
- Compute `arcLength = r * (SWEEP * Math.PI / 180)` once in render scope
- `useEffect([aiPct])`: set `dashOffset.value = withTiming(arcLength * (1 - aiPct / 100), timingChartFill)`
- `useAnimatedProps` returns `{ strokeDashoffset: dashOffset.value }` — number only
- Set `d={fullArcPath}` and `strokeDasharray={[arcLength, arcLength]}` as static props on `AnimatedPath`
- Add `withTiming` and `timingChartFill` imports; remove `withSpring` and `springPremium` imports

**Success Criteria:**
- `useAnimatedProps` callback body does NOT call `arcPath()` or any string-generating function
- `useAnimatedProps` returns an object containing only `{ strokeDashoffset: number }`
- `arcPath()` is called at component render scope (outside any worklet callback)
- `withTiming` is used (not `withSpring`) for the dashOffset animation
- `strokeDasharray` prop is present on the fill `AnimatedPath`
- `springPremium` is not imported in the final file

### FR2: All geometry derived from size prop

**Description:** `cx`, `cy`, `r`, `arcLength`, and `fullArcPath` must all derive from the `size` prop (default 180). No hardcoded geometry values.

**Success Criteria:**
- `cx = size / 2`, `cy = size / 2`, `r = size / 2 - STROKE_WIDTH / 2 - 2`
- `arcLength = r * (SWEEP * Math.PI / 180)`
- `fullArcPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP)`
- Changing `size` prop (e.g. to 240) produces correct geometry without code changes

### FR3: Props interface and visual output unchanged

**Description:** The `AIArcHero` component's external API (props) and visual structure must remain identical to the current implementation. Callers (`ai.tsx`) require no changes.

**Success Criteria:**
- Props interface: `{ aiPct, brainliftHours, deltaPercent, ambientColor, size? }` — unchanged
- Delta badge renders when `deltaPercent !== null`; hidden when `deltaPercent === null`
- Center text shows `{aiPct}%` and "AI USAGE" label
- BrainLift row shows hours, target, and ProgressBar
- `ambientColor` applied as `stroke` on fill `AnimatedPath`
- `arcPath()` export preserved (function signature and behavior unchanged)
- `AI_TARGET_PCT` and `BRAINLIFT_TARGET_HOURS` constants exported unchanged

### FR4: Animation re-triggers on aiPct change

**Description:** When `aiPct` changes after mount (e.g. data arrives mid-animation), `withTiming` re-targets to the new offset. The previous animation is cancelled automatically by Reanimated.

**Success Criteria:**
- `useEffect` dependency array includes `aiPct`
- New `withTiming` call overwrites in-flight animation correctly (Reanimated default behavior)
- aiPct=0 results in dashOffset = arcLength (no fill visible)
- aiPct=100 results in dashOffset = 0 (full arc visible)

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `src/components/AIArcHero.tsx` | File being modified — current crash source |
| `src/lib/reanimated-presets.ts` | `timingChartFill` preset (replaces `springPremium`) |
| `src/components/TrendSparkline.tsx` | Reference: number-only `clipProgress` animation pattern |
| `src/components/WeeklyBarChart.tsx` | Reference: number-only `clipProgress` animation pattern |

### Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `hourglassws/src/components/AIArcHero.tsx` | Modify | Replace `withSpring`/path-string approach with `strokeDashoffset`/`withTiming` |
| `hourglassws/src/components/__tests__/AIArcHero.test.tsx` | Create | Tests for new animation contract + `arcPath` pure function |

### Data Flow

```
aiPct prop arrives (from ai.tsx)
    │
    ▼
render scope (JS thread — safe):
    cx = size / 2
    cy = size / 2
    r  = size / 2 - STROKE_WIDTH / 2 - 2
    arcLength   = r * (SWEEP * Math.PI / 180)   ← computed once
    fullArcPath = arcPath(cx, cy, r, 135, 405)  ← arcPath called once, not per-frame

    dashOffset = useSharedValue(arcLength)       ← starts hidden

    useEffect([aiPct]):
        dashOffset.value = withTiming(
            arcLength * (1 - aiPct / 100),       ← target offset for this aiPct
            timingChartFill                       ← 1800ms Expo ease-out
        )

    fillProps = useAnimatedProps(() => ({
        strokeDashoffset: dashOffset.value        ← ONE number per frame, no string alloc
    }))
    │
    ▼
SVG render:
    <Path d={trackPath} ... />                   ← static full 270° track
    <AnimatedPath
        d={fullArcPath}                          ← static full arc path
        strokeDasharray={[arcLength, arcLength]} ← dash = full arc length
        animatedProps={fillProps}                ← only strokeDashoffset animates
        stroke={ambientColor}
        ...
    />
```

### strokeDashoffset Mechanics

```
strokeDasharray = [arcLength, arcLength]
    → The "dash" is exactly as long as the full arc.
    → The "gap" after it is also arcLength (ensures no wrap-around).

strokeDashoffset = arcLength       → dash shifted past start → arc invisible (0%)
strokeDashoffset = 0               → dash at start position → full arc visible (100%)
strokeDashoffset = arcLength * (1 - p/100) → p% of arc visible
```

This is the standard CSS/SVG stroke-dashoffset fill animation technique. It is safe in Reanimated because `strokeDashoffset` is a numeric SVG attribute — no string generation in the worklet.

### Edge Cases

| Case | Handling |
|------|---------|
| `aiPct = 0` | `dashOffset = arcLength` — arc invisible; track arc still shows as background |
| `aiPct = 100` | `dashOffset = 0` — full arc visible; no overdraw |
| `aiPct` changes while animating | `withTiming` call overwrites in-flight value; Reanimated cancels prior animation automatically |
| `size` prop ≠ 180 | All geometry derived from `size`; correct at any size |
| `ambientColor` changes | `stroke={ambientColor}` is a regular React prop — color updates on re-render, no animation needed |
| `deltaPercent = null` | Delta badge not rendered (conditional render — unchanged) |
| `brainliftHours > 5` | `brainliftProgress = Math.min(1, brainliftHours / BRAINLIFT_TARGET_HOURS)` clamps to 1 |

### Import Changes

**Remove:**
```typescript
import { withSpring } from 'react-native-reanimated';
import { springPremium } from '@/src/lib/reanimated-presets';
```

**Add:**
```typescript
import { withTiming } from 'react-native-reanimated';
import { timingChartFill } from '@/src/lib/reanimated-presets';
```

### Test Architecture

**Test file:** `src/components/__tests__/AIArcHero.test.tsx`

**Mocks required:**
- `react-native-svg`: mock `Svg`, `Path` as `View`; `AnimatedPath` mock must accept and ignore `strokeDasharray`, `strokeDashoffset`, `animatedProps`
- `react-native-reanimated`: use jest preset (configured in jest setup)
- `@/src/components/Card`: passthrough `({ children }) => <>{children}</>`
- `@/src/components/ProgressBar`: passthrough `() => null`

**Source-level animation contract tests (read source as string and assert):**
- Does NOT match `/arcPath[^)]*\)\s*[,}]/` inside `useAnimatedProps` callback
- Does match `strokeDashoffset` string
- Does match `withTiming` string
- Does NOT match `withSpring` string
- Does match `strokeDasharray` string

These source-level checks catch regressions that render tests may miss.
