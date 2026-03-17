# 04-ai-tab-screen: Data-Gated AI Tab Rebuild

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

### What is Being Built

`04-ai-tab-screen` rebuilds `ai.tsx` — the AI & BrainLift tab screen — to eliminate mount-time animation burst by gating all animated components behind `data !== null`.

### Current Problem

`ai.tsx` currently fires approximately 15 Reanimated animations simultaneously at mount time:
- `useStaggeredEntry({ count: 5 })` allocates 10 shared values + springs (opacity + translateY per card) at mount regardless of data state
- `FadeInScreen` fires 2 animations (opacity + translateY)
- `AmbientBackground` fires 1 spring
- `AIArcHero` fires its arc animation

All of these fire at `t=0`, before any API response arrives, during the highest-memory window (API connections in-flight, Hermes allocating JS promise chains). This is the final crash source after specs 01–03 addressed the individual component animations.

### Solution

Two changes to `ai.tsx`:

1. **Data-gated loading**: Replace the skeleton-per-section loading pattern with a single loading gate. While `data === null && isLoading === true`, render a plain `ActivityIndicator` (zero Reanimated). Once `data !== null`, render the full content — `FadeInScreen` handles the screen entry animation (opacity + translateY). No animated components mount until data is ready.

2. **Remove `useStaggeredEntry`**: The 10-spring stagger decoration is removed. Cards fade in together with `FadeInScreen`. This eliminates 10 shared values and spring drivers from the mount event.

### After This Spec

When complete, navigating to the AI tab:
1. Shows an `ActivityIndicator` spinner (pure React Native, zero Reanimated) while data loads
2. Once `useAIData` returns `data !== null`, the full content fades in via `FadeInScreen` (2 animations only)
3. AIArcHero, AIConeChart, TrendSparkline, and all cards render together — no per-card stagger

In the common revisit case (`useAIData` returns cached data immediately), the loading screen is never shown: `data !== null` on the first render and content renders directly.

### Dependencies

This spec depends on:
- **01-safe-arc-hero**: AIArcHero rebuilt with strokeDashoffset (safe number-only animation) — COMPLETE
- **02-safe-cone-scrub**: AIConeChart scrub gated behind animation-complete state — COMPLETE
- **03-backfill-relocation**: `useHistoryBackfill` removed from `ai.tsx` (already relocated to `_layout.tsx`) — COMPLETE

---

## Out of Scope

1. **Visual redesign of the AI tab** — Descoped: Same layout, same sections, same cards. This spec only changes loading strategy and removes stagger animation. No UI changes.

2. **Data layer changes** (`useAIData`, `useWeeklyHistory`, API client) — Descoped: Data fetching logic is not touched. The spec only changes how `ai.tsx` reacts to the loading state those hooks expose.

3. **Changes to other tabs** (Overview, Home, Approvals) — Descoped: Each tab manages its own loading strategy. This spec is scoped to `ai.tsx` only.

4. **Per-card stagger animation as a future enhancement** — Deferred to a future animation-polish spec (no spec exists yet, and this is not a crash-fix requirement). If stagger is desired later, it can be added as a non-spring approach (e.g., `withDelay(withTiming(...))` on a single shared value).

5. **SkeletonLoader per section** — Descoped: The skeleton-per-section pattern is replaced entirely with a single `ActivityIndicator`. Skeleton components for AIArcHero, Prime Radiant, and daily breakdown are removed from this screen.

6. **`useHistoryBackfill` removal** — Deferred to [03-backfill-relocation](../03-backfill-relocation/spec.md): Already handled in spec 03. This spec assumes `ai.tsx` has no `useHistoryBackfill` call (that was removed by spec 03).

7. **Error state UI redesign** — Descoped: Auth error and network error views are unchanged. This spec does not modify error handling.

8. **Performance optimization beyond crash elimination** — Descoped: Reducing animation count to eliminate the crash is the goal. General performance profiling and further optimization are out of scope.

---

## Functional Requirements

### FR1 — Data-Gated Loading Screen

**Description:** While `data === null && isLoading === true`, render a minimal loading screen with `ActivityIndicator`. No Reanimated components mount during this window.

**Success Criteria:**
- SC1.1: When `useAIData` returns `{ data: null, isLoading: true }`, the screen renders an `ActivityIndicator` (not skeleton loaders, not full content)
- SC1.2: The `ActivityIndicator` uses `colors.success` as its `color` prop
- SC1.3: The loading screen is centered (`flex: 1, alignItems: 'center', justifyContent: 'center'`)
- SC1.4: No `Animated.View` or `useStaggeredEntry`-derived `getEntryStyle()` wrappers mount while data is null
- SC1.5: No `SkeletonLoader` components render during the loading state
- SC1.6: `ActivityIndicator` is imported from `react-native` (not a custom component)

### FR2 — Remove `useStaggeredEntry`

**Description:** Remove `useStaggeredEntry` from `ai.tsx` entirely. All card content renders as plain `View` children (or direct JSX children) within `FadeInScreen`. `FadeInScreen` handles the screen entry animation.

**Success Criteria:**
- SC2.1: Source does NOT import `useStaggeredEntry` from `@/src/hooks/useStaggeredEntry`
- SC2.2: Source does NOT call `useStaggeredEntry({ count: 5 })` or any variant
- SC2.3: Source does NOT use `getEntryStyle(N)` on any element
- SC2.4: No `Animated.View` wrappers around individual content cards (AIArcHero card, Prime Radiant card, Daily Breakdown card, Trajectory card, Legend card)
- SC2.5: `FadeInScreen` remains as the screen-level entry wrapper (unchanged)

### FR3 — Remove `useHistoryBackfill` Call (Verification)

**Description:** Verify that `ai.tsx` does not call `useHistoryBackfill` (this was the responsibility of spec 03, but this spec verifies and finalizes the state).

**Success Criteria:**
- SC3.1: Source does NOT import `useHistoryBackfill`
- SC3.2: Source does NOT call `useHistoryBackfill()`

### FR4 — Remove `SkeletonLoader` from Main Content

**Description:** Remove `SkeletonLoader` usage from `ai.tsx`. The loading state is now handled entirely by FR1's `ActivityIndicator`. Skeleton components that were used for AIArcHero, Prime Radiant, and daily breakdown during `showSkeleton` are removed.

**Success Criteria:**
- SC4.1: Source does NOT import `SkeletonLoader`
- SC4.2: No `SkeletonLoader` renders in the component output at any time
- SC4.3: `showSkeleton` variable is removed (it served only to trigger skeleton rendering)

### FR5 — Content Renders Correctly After Data Arrives

**Description:** When `data !== null`, all existing content sections render correctly — same data wiring, same structure — just without `Animated.View` stagger wrappers.

**Success Criteria:**
- SC5.1: `AIArcHero` renders with `aiPct={Math.round(heroAIPct)}` and `brainliftHours={brainliftHours}`
- SC5.2: `AIConeChart` renders within the Prime Radiant card when `coneData !== null`
- SC5.3: Daily breakdown card (`testID="daily-breakdown"`) renders when `data.dailyBreakdown.length > 0`
- SC5.4: Trajectory card renders when `hasTrajectory === true` (nonZeroCompleted.length >= 2)
- SC5.5: Legend card renders with "How it's calculated" content
- SC5.6: `onScrubChange={setScrubPoint}` prop is still passed to `AIConeChart`
- SC5.7: `AmbientBackground` still renders (unchanged)
- SC5.8: `FadeInScreen` still wraps the content (unchanged)

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/app/(tabs)/ai.tsx` | Target file — modify |
| `hourglassws/src/components/__tests__/AITabConeIntegration.test.tsx` | Test file — modify |
| `hourglassws/src/hooks/useAIData.ts` | Data hook — read for interface (not modified) |
| `hourglassws/src/components/FadeInScreen.tsx` | Screen entry wrapper — not modified |
| `hourglassws/src/components/AmbientBackground.tsx` | Ambient layer — not modified |
| `hourglassws/src/components/AIArcHero.tsx` | Rebuilt in spec 01 — not modified here |
| `hourglassws/src/components/AIConeChart.tsx` | Fixed in spec 02 — not modified here |
| `hourglassws/src/hooks/useStaggeredEntry.ts` | Hook being removed from ai.tsx |

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `hourglassws/app/(tabs)/ai.tsx` | modify | Data-gated loading; remove useStaggeredEntry; remove SkeletonLoader; remove showSkeleton |
| `hourglassws/src/components/__tests__/AITabConeIntegration.test.tsx` | modify | Update loading tests: replace skeleton assertions with ActivityIndicator assertions; add source-level checks for removed imports |

### Data Flow

```
useAIData() returns { data, isLoading, error, refetch, previousWeekPercent }
  │
  ├─ error === 'auth'    → render AuthErrorView (unchanged)
  ├─ error === 'network' → render NetworkErrorView (unchanged)
  │
  ├─ !data && isLoading  → render LoadingScreen (NEW):
  │     <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
  │       <ActivityIndicator color={colors.success} />
  │     </View>
  │
  ├─ !data && !isLoading → render EmptyStateView (unchanged)
  │
  └─ data !== null       → render full content (MODIFIED: no Animated.View wrappers):
        <View style={{ flex: 1 }}>
          <AmbientBackground color={ambientColor} />
          <FadeInScreen>
            <ScrollView>
              <AIArcHero ... />
              <Card>PRIME RADIANT: <AIConeChart ... /></Card>
              {data.dailyBreakdown.length > 0 && <Card testID="daily-breakdown">...</Card>}
              {hasTrajectory && <Card>TRAJECTORY: <TrendSparkline ... /></Card>}
              <Card>Legend</Card>
            </ScrollView>
          </FadeInScreen>
        </View>
```

### Import Changes

**Remove from imports:**
```typescript
import Animated from 'react-native-reanimated';          // no longer used
import { useStaggeredEntry } from '@/src/hooks/useStaggeredEntry';
import SkeletonLoader from '@/src/components/SkeletonLoader';
```

**Add to existing `react-native` import:**
```typescript
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
```

### Loading Gate Position

After error checks, before the main `useMemo` computations that require `data`:

```typescript
if (error === 'auth') { return <AuthErrorView />; }
if (error === 'network') { return <NetworkErrorView />; }

// NEW: Loading gate
if (!data && isLoading) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.success} />
    </View>
  );
}

if (!data && !isLoading) { return <EmptyStateView />; }

// data !== null guaranteed below
```

### Animated.View Removal Pattern

All `<Animated.View style={getEntryStyle(N)}>` wrappers stripped. Children become direct content:

```tsx
// BEFORE
<Animated.View style={getEntryStyle(0)}>
  <AIArcHero ... />
</Animated.View>

// AFTER
<AIArcHero ... />
```

This pattern applies to all 5 staggered wrappers (indices 0–4).

### Skeleton Removal Pattern

```tsx
// BEFORE (showSkeleton ? skeleton : content)
{showSkeleton ? (
  <SkeletonLoader width={180} height={180} rounded />
) : (
  <AIArcHero ... />
)}

// AFTER (data guaranteed non-null here)
<AIArcHero ... />
```

### Test File Changes (`AITabConeIntegration.test.tsx`)

**Tests to remove:**
- `SC1.11` — "uses SkeletonLoader with height={240}": REMOVE (SkeletonLoader no longer in source)
- `SC1.20` — "renders SkeletonLoader for Prime Radiant when loading": REMOVE

**Tests to update:**
- Loading state suite: update to assert `ActivityIndicator` renders (not skeletons) when `data=null, isLoading=true`

**Tests to add:**
- Source check: does NOT import `useStaggeredEntry`
- Source check: does NOT import `SkeletonLoader`
- Source check: does NOT call `useHistoryBackfill`
- Source check: imports `ActivityIndicator` from `react-native`
- Render: `ActivityIndicator` renders when `data=null, isLoading=true`
- Render: `ActivityIndicator` does NOT render when `data !== null`

**Tests to retain unchanged:**
- All FR1 source checks for AIConeChart wiring (SC1.1–SC1.10)
- All FR1 render tests for happy path (SC1.12–SC1.18)
- SC1.19 — does not crash when `data=null, isLoading=true`
- SC1.22 — no cone chart when `data=null, isLoading=false`
- SC1.23 — weeklyLimit from useConfig
- SC1.24, SC1.25 — chartKey wiring
- SC1.26 — BRAINLIFT before PRIME RADIANT
- All SC12.I* integration tests (02-safe-cone-scrub gate)

### Edge Cases

1. **Cache hit on revisit**: `data !== null` on first render → loading screen never shown → content renders immediately with FadeInScreen fade. This is the common path.

2. **Pull-to-refresh**: `isLoading=true` AND `data !== null` → loading gate condition `!data && isLoading` is FALSE → loading screen NOT shown → ScrollView RefreshControl spinner shows instead.

3. **Error then retry**: `error='network'` → network error view → user retries → `isLoading=true, data=null` briefly → loading gate shown → data arrives → content shown.

4. **`data !== null` but empty breakdown**: `dailyBreakdown=[]` → daily-breakdown card not rendered (unchanged guard). Content renders, daily card absent.

5. **`hasTrajectory === false`**: Trajectory card hidden (unchanged guard). Content renders without trajectory card.
