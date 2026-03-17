# Feature: AI Tab Rebuild

## Feature ID

`ai-tab-rebuild`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | AI Tab Rebuild — Crash Elimination |
| **Contributors** | @trilogy |

## Files Touched

### Screens
- `hourglassws/app/(tabs)/ai.tsx` (modify — data-gated animation strategy)
- `hourglassws/app/(tabs)/_layout.tsx` (modify — relocate useHistoryBackfill)

### Components
- `hourglassws/src/components/AIArcHero.tsx` (modify — safe animation approach)
- `hourglassws/src/components/AIConeChart.tsx` (modify — gate scrub reaction)

### Hooks
- `hourglassws/src/hooks/useHistoryBackfill.ts` (modify — fire-and-forget, no return value)
- `hourglassws/src/hooks/useOverviewData.ts` (modify — remove backfillSnapshots dependency)

### Screens (additional)
- `hourglassws/app/(tabs)/overview.tsx` (modify — remove useHistoryBackfill call and backfillSnapshots wiring)

### Tests
- `hourglassws/src/components/__tests__/AIArcHero.test.tsx` (create/modify)
- `hourglassws/src/components/__tests__/AIConeChart.test.tsx` (modify)
- `hourglassws/src/components/__tests__/AITabConeIntegration.test.tsx` (modify)

## Table of Contents

- [Feature Overview](#feature-overview)
- [Crash Diagnosis](#crash-diagnosis)
- [Intended State](#intended-state)
- [System Architecture](#system-architecture)
- [Changelog of Feature Specs](#changelog-of-feature-specs)

## Feature Overview

### Summary

The AI tab crashes immediately on navigation with no Apple crash report (Jetsam SIGKILL — iOS killed the process before the crash reporter could write). This feature eliminates all identified crash sources through targeted, surgical changes to animation architecture, component lifecycle, and background work scheduling.

### Problem Statement

Three crashes in sequence (reports #9, #10, #11) show a pattern: the AI tab causes a Jetsam SIGKILL (no `.ips` file) the moment it is navigated to. Previous fixes (removing BlurView from Card, reducing BACKFILL_MAX, increasing backfill delay) each addressed individual symptoms but the tab still crashes immediately.

Root cause analysis across the full codebase identifies **AIArcHero** as the primary crash source:

`AIArcHero` uses `useAnimatedProps` with `arcPath()` — a function that generates a new SVG path string (`"M x y A r r 0 flag 1 x2 y2"`) **on every animation frame** in the Reanimated worklet runtime. With `withSpring(springPremium)` driving the fill arc:

- Spring settles over ~2 seconds at 60fps = **~120 string allocations per animation**
- Each string is ~45 characters, allocated on the **Hermes worklet heap** (separate from the main Hermes heap)
- Simultaneously, `useStaggeredEntry({ count: 5 })` fires **10 springs** (opacity + translateY per card)
- Combined: the worklet heap spikes at mount, kernel cannot service `mach_vm_allocate` for the Hermes GC compaction buffer → Jetsam kills the process

Secondary risks (addressed defensively):
- `AIConeChart`: Two `useAnimatedReaction + runOnJS` scrub callbacks could fire speculatively during initial mount if gesture runtime initializes scrubIndex
- `useHistoryBackfill`: Running from tab-level lifecycle (now at 25s delay, but still tied to AI tab mount event) — risk of interference during any tab re-mount

### Goals

- AI tab navigates successfully and displays data without crashing
- AIArcHero arc animation preserved visually (same look, safe implementation)
- AIConeChart (Prime Radiant) preserved with scrub gesture
- 12-week trajectory sparkline preserved
- useHistoryBackfill continues to run — relocated to app root (fires once per session, not per-tab)
- All existing tests pass; new tests cover the animation contracts

### Non-Goals

- Visual redesign of the AI tab — same layout, same sections
- Changes to the data layer (useAIData, weeklyHistory, api/client) — not touched
- Changes to other tabs (Overview, Home, Approvals) — not touched unless directly required
- Performance optimization beyond crash elimination — defer to future spec

## Crash Diagnosis

### Root Cause: AIArcHero `useAnimatedProps` Per-Frame Path String

```typescript
// CURRENT (crashes): arcPath() called on worklet thread every spring frame
const animatedFillProps = useAnimatedProps(() => ({
  d: arcPath(cx, cy, r, START_ANGLE, fillEndAngle.value), // ← string alloc per frame
}));
fillEndAngle.value = withSpring(targetAngle, springPremium); // ~120 frames to settle
```

```typescript
// FIXED (spec 01): static path, only strokeDashoffset animates (single number per frame)
const fullArcPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP); // ← computed once
const arcLength = r * (SWEEP * Math.PI / 180);
const dashOffset = useSharedValue(arcLength); // starts "empty"
dashOffset.value = withTiming(arcLength * (1 - aiPct / 100), timingChartFill); // number only
const fillProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));
```

**Why strokeDashoffset is safe:**
- `strokeDashoffset` is a single `number` — one double-precision float per frame
- No string generation, no GC pressure on the worklet heap
- `withTiming` (1800ms) vs `withSpring` (2000ms+) — deterministic, shorter, less accumulation
- The arc path is pre-computed once in JS render scope, not per-frame in the worklet

### Secondary: AIConeChart Scrub Reaction During Mount

```typescript
// Risk: useAnimatedReaction subscribes unconditionally at mount
useAnimatedReaction(() => scrubIndex.value, handleScrubIndex);
```

`scrubIndex` starts at -1 and only changes on pan gesture activation. However, gesture handler initialization _may_ produce a transient value change at mount. Gate scrub reactions behind animation completion (after 2800ms clip animation).

### Tertiary: useHistoryBackfill Tab Lifecycle Coupling

`useHistoryBackfill` is called from `overview.tsx` (tab-level). With the 25s delay, it starts after the AI tab has been open 25s — but if the user navigates away and back, the `hasRun` ref only prevents re-runs within the SAME component mount. If `overview.tsx` unmounts (user visits AI tab, never visits Overview), backfill never runs. Relocating to `_layout.tsx` ensures exactly-once-per-session semantics, independent of which tab is visited.

## Intended State

When complete, navigating to the AI tab:

1. Shows a loading indicator (no animations yet)
2. Once `useAIData` returns `data !== null`, content fades in (FadeInScreen handles screen entry — no additional stagger animation needed)
3. AIArcHero renders with `strokeDashoffset` arc fill animation (safe, number-only)
4. AIConeChart renders when `coneData` is available; scrub gesture activates after 2800ms animation completes
5. 12-week sparkline renders from `useWeeklyHistory` (unchanged)
6. Backfill has already been running silently from `_layout.tsx` since app launch — no tab-level coupling

### Key Behaviors

1. **No crash on navigation**: Tab navigates to AI screen without Jetsam kill under all test conditions
2. **Arc animation preserved**: The 270° arc gauge fills from 0 to `aiPct` with a smooth 1800ms ease-out (visually equivalent to previous spring animation)
3. **Scrub gesture preserved**: Prime Radiant responds to pan gestures; `useAnimatedReaction + runOnJS` only active after clip animation completes
4. **Backfill isolated**: `useHistoryBackfill` runs once per app session from `_layout.tsx`; no coupling to tab navigation events
5. **Data-gated rendering**: No animated components mount until `data !== null` — eliminates worklet pressure during API fetch window

## System Architecture

### Component Structure

```
app/(tabs)/_layout.tsx
  └── useHistoryBackfill()  ← MOVED HERE (spec 03) — once per session
  └── <Tabs>
        └── ai.tsx
              ├── useAIData()          — fetches current week AI%
              ├── useWeeklyHistory()   — reads AsyncStorage for trajectory
              ├── FadeInScreen         — screen entry fade (existing, no change)
              ├── [loading state]      — spinner while data === null (spec 04)
              └── [content, gated on data !== null]
                    ├── AIArcHero      — arc gauge (rebuilt, spec 01)
                    ├── Card: AIConeChart  — prime radiant (scrub fixed, spec 02)
                    ├── Card: DailyAIRow list
                    ├── Card: TrendSparkline trajectory
                    └── Card: Legend
```

### Animation Budget (Rebuilt)

| Component | Animated Values | Type | Frames/s | Duration |
|-----------|-----------------|------|----------|----------|
| FadeInScreen | 2 (opacity, translateY) | timing + spring | 60 | 400ms |
| AmbientBackground | 1 (opacity) | spring | 60 | ~500ms |
| AIArcHero | 1 (dashOffset — number) | timing | 60 | 1800ms |
| AIConeChart | 1 (clipProgress — number) | timing | 60 | 2800ms |
| TrendSparkline | 1 (clipProgress — number) | timing | 60 | 1800ms |
| SkeletonLoader | 1 (opacity — pulse loop) | repeat | 60 | ongoing |

**Key property:** No animated value generates strings. All worklet computations produce numbers. No `useAnimatedReaction + runOnJS` fires during animation windows (only on user gesture).

### Data Flow

```
useAIData (fetches current week)
    │
    ├── data: null → show loading indicator (no animations)
    │
    └── data: AIWeekData → render content + start animations
          ├── AIArcHero: dashOffset = arcLength * (1 - aiPct/100)
          ├── AIConeChart: coneData = computeAICone(data.dailyBreakdown, weeklyLimit)
          └── aiPctSeries: useWeeklyHistory() + current week midpoint

useHistoryBackfill (in _layout.tsx, t+25s, once per session)
    └── writes weekly_history_v2 to AsyncStorage
          └── useWeeklyHistory (in ai.tsx) picks up on next render
```

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-16 | [01-safe-arc-hero](specs/01-safe-arc-hero/spec.md) | Replace AIArcHero useAnimatedProps path-string animation with strokeDashoffset (number-only) — **COMPLETE** |
| 2026-03-16 | [02-safe-cone-scrub](specs/02-safe-cone-scrub/spec.md) | Gate AIConeChart scrub useAnimatedReaction behind animation-complete state — COMPLETE |
| 2026-03-16 | [03-backfill-relocation](specs/03-backfill-relocation/spec.md) | Move useHistoryBackfill to _layout.tsx; remove from tab-level screens |
| 2026-03-16 | [04-ai-tab-screen](specs/04-ai-tab-screen/spec.md) | Rebuild ai.tsx with data-gated rendering; remove useStaggeredEntry |
