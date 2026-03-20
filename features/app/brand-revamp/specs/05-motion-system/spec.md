# 05-motion-system

**Status:** Draft
**Created:** 2026-03-19
**Last Updated:** 2026-03-19
**Owner:** @hourglass

---

## Overview

The motion system spec adds physics-based animation choreography across the Hourglass app. It consists of one core hook and its application to all tab screens:

1. **`useStaggeredEntry`** — A hook that returns `getEntryStyle(index)` for wrapping screen-level cards in staggered spring entry animations. Cards float up (translateY 16→0) and fade in (opacity 0→1) with a 50ms per-card delay, using `springBouncy` preset. The hook re-fires on tab focus using `useIsFocused`. This hook already exists at `src/hooks/useStaggeredEntry.ts` and is already applied to index.tsx, overview.tsx, and approvals.tsx.

2. **Screen integration** — Apply `useStaggeredEntry` to `ai.tsx` (count: 6, indices 0–5 covering all cards). The test suite defines the exact card wrapping contract.

### How It Works

- `useStaggeredEntry` pre-allocates shared values and animated styles at hook level (Rules of Hooks compliant via `Array.from`).
- `useIsFocused` drives a `useEffect` that resets values to initial state then fires staggered springs.
- `useReducedMotion` is checked: if true, values jump directly to resting state (accessibility).
- `maxStaggerIndex` caps the animated count to prevent excessive shared value allocation on long lists.
- The `springBouncy` preset (damping=14, stiffness=200) creates a natural, slightly overshooting entry feel.
- GlassCard (spec 03) provides PressIn feedback via its `pressable` prop — this spec verifies it is applied to navigable cards.

---

## Out of Scope

1. **Moti dependency** — **Descoped.** Reanimated 4.2.1 provides all required primitives directly. Adding Moti would be a dependency for no measurable benefit.

2. **Shared Element Transitions** — **Deferred to [07-shared-transitions](../../07-shared-transitions/spec.md).** Card-to-detail screen transitions are a separate concern.

3. **NativeTabs platform animation** — **Deferred to [06-native-tabs](../../06-native-tabs/spec.md).** Platform-native tab bar animations are owned by that spec.

4. **AIConeChart / AIArcHero internal animations** — **Descoped.** These components have their own animation logic. This spec only wraps their container cards in staggered entry.

5. **`useListCascade` hook** — **Descoped.** The existing test suite only tests `useStaggeredEntry`. List cascade is deferred to a future polish spec.

6. **`springCardEntry` / `springListItem` constants** — **Descoped.** The existing `reanimated-presets.ts` has `springBouncy` and `springSnappy` which cover the same use cases.

---

## Functional Requirements

### FR1: useStaggeredEntry hook — complete and correct

The hook at `src/hooks/useStaggeredEntry.ts` must satisfy the following contract (already implemented — this FR verifies it passes tests):

**Success Criteria:**
- Exports `useStaggeredEntry` function, `StaggeredEntryOptions` interface, `UseStaggeredEntryReturn` interface
- `StaggeredEntryOptions` has `count: number` and optional `maxStaggerIndex?: number` (default 6)
- `UseStaggeredEntryReturn` has `getEntryStyle: (index: number) => StyleProp<ViewStyle>` and `isReady: boolean`
- Initial translateY = 16 (`TRANSLATE_Y_START`), initial opacity = 0
- Out-of-range indices return resting state: `{ opacity: 1, transform: [{ translateY: 0 }] }`
- Uses `springBouncy` from `@/src/lib/reanimated-presets` for spring animation
- Uses `withDelay` for staggered timing with 50ms multiplier (`STAGGER_MS = 50`)
- Caps delay at `maxStaggerIndex` using `Math.min`
- Imports and calls `useIsFocused()` from `@react-navigation/native`
- `useEffect` with `isFocused` dependency resets values then fires staggered springs on focus
- `useReducedMotion()` branch: instantly sets values to resting state (accessibility)
- Pre-creates `animatedStyles` array at hook level (not inside `getEntryStyle`)
- Uses `Math.min(count, maxStaggerIndex + 1)` for `animatedCount`

### FR2: Home screen (index.tsx) — useStaggeredEntry applied

`app/(tabs)/index.tsx` must wrap the 4 main card zones with `useStaggeredEntry({ count: 4 })`.

**Success Criteria:**
- Imports `useStaggeredEntry` from `@/src/hooks/useStaggeredEntry`
- Imports `Animated` from `react-native-reanimated`
- Calls `useStaggeredEntry({ count: 4 })`
- Wraps hero PanelGradient zone in `<Animated.View style={getEntryStyle(0)}>`
- Wraps weekly chart Card zone in `<Animated.View style={getEntryStyle(1)}>`
- Wraps AI Trajectory card zone in `<Animated.View style={getEntryStyle(2)}>`
- Wraps Earnings card zone in `<Animated.View style={getEntryStyle(3)}>`
- UrgencyBanner is NOT wrapped with `getEntryStyle` (exactly 4 calls total)

### FR3: AI screen (ai.tsx) — useStaggeredEntry applied

`app/(tabs)/ai.tsx` must wrap 6 card zones with `useStaggeredEntry({ count: 6 })`.

**Success Criteria:**
- Imports `useStaggeredEntry` from `@/src/hooks/useStaggeredEntry`
- Imports `Animated` from `react-native-reanimated` (already present)
- Calls `useStaggeredEntry({ count: 6 })`
- Wraps AIArcHero with `getEntryStyle(0)`
- Wraps Prime Radiant (cone) Card with `getEntryStyle(1)`
- Wraps Daily Breakdown Card with `getEntryStyle(2)`
- Wraps 12-Week Trajectory Card with `getEntryStyle(3)`
- Wraps Legend ("How it's calculated") Card with `getEntryStyle(4)`
- Wraps last-fetched timestamp / footer region with `getEntryStyle(5)`
- Exactly 6 `getEntryStyle(\d+)` calls in the file

### FR4: Approvals screen (approvals.tsx) — useStaggeredEntry applied

`app/(tabs)/approvals.tsx` must wrap section containers with `useStaggeredEntry({ count: 2 })`.

**Success Criteria:**
- Imports `useStaggeredEntry` from `@/src/hooks/useStaggeredEntry`
- Imports `Animated` from `react-native-reanimated`
- Calls `useStaggeredEntry({ count: 2 })`
- Wraps Team Requests section with `getEntryStyle(0)` (literal index)
- Wraps My Requests section with `getEntryStyle(isManager ? 1 : 0)` (dynamic expression)
- `renderApprovalItem` function exists and does NOT call `getEntryStyle`
- Exactly 2 `getEntryStyle` call sites total

### FR5: Overview screen (overview.tsx) — useStaggeredEntry applied

`app/(tabs)/overview.tsx` must wrap the 4 ChartSection cards with `useStaggeredEntry({ count: 4 })`.

**Success Criteria:**
- Imports `useStaggeredEntry` from `@/src/hooks/useStaggeredEntry`
- Calls `useStaggeredEntry({ count: 4 })`
- Wraps Earnings ChartSection with `getEntryStyle(0)`
- Wraps Hours ChartSection with `getEntryStyle(1)`
- Wraps AI Usage ChartSection with `getEntryStyle(2)`
- Wraps BrainLift ChartSection with `getEntryStyle(3)`
- Exactly 4 `getEntryStyle(\d+)` calls
- Scrub snapshot panel continues to use `panelStyle` (not replaced)
- 4W/12W toggle header is NOT wrapped with `getEntryStyle`

---

## Technical Design

### Files to Reference

- `hourglassws/src/hooks/useStaggeredEntry.ts` — existing hook (complete)
- `hourglassws/src/hooks/__tests__/useStaggeredEntry.test.ts` — authoritative test contract
- `hourglassws/src/lib/reanimated-presets.ts` — spring/timing presets
- `hourglassws/app/(tabs)/index.tsx` — home screen (FR2, already integrated)
- `hourglassws/app/(tabs)/overview.tsx` — overview screen (FR5, already integrated)
- `hourglassws/app/(tabs)/approvals.tsx` — approvals screen (FR4, already integrated)
- `hourglassws/app/(tabs)/ai.tsx` — AI tab screen (FR3, needs integration)

### Files to Create

None — `useStaggeredEntry.ts` already exists.

### Files to Modify

- `hourglassws/app/(tabs)/ai.tsx` — add `useStaggeredEntry` import, call with count:6, wrap 6 card zones with `getEntryStyle(0)` through `getEntryStyle(5)`

### Data Flow

```
Tab focus event
  → useIsFocused() returns true
  → useEffect fires
  → Reset all shared values: opacity=0, translateY=16
  → For each card i=0..animatedCount-1:
      translateY.value = withDelay(i*50, withSpring(0, springBouncy))
      opacity.value    = withDelay(i*50, withSpring(1, springBouncy))
  → useAnimatedStyle reads values → Animated.View receives style prop
```

### ai.tsx Card Index Mapping

| Index | Content |
|-------|---------|
| 0 | AIArcHero |
| 1 | Prime Radiant (AIConeChart) Card |
| 2 | Daily Breakdown Card (conditional) |
| 3 | 12-Week Trajectory Card (conditional) |
| 4 | Legend ("How it's calculated") Card |
| 5 | Last-fetched timestamp / footer |

### Edge Cases

1. **Conditional cards in ai.tsx** — `Daily Breakdown` and `12-Week Trajectory` are conditionally rendered. The `Animated.View` wrapper must be inside the conditional, not outside it.

2. **`useStaggeredEntry` count must be stable** — Count passed to the hook cannot vary at runtime (Rules of Hooks). Use maximum possible count (6 for ai.tsx).

3. **Indices beyond `animatedCount`** — `getEntryStyle` returns resting style for out-of-range indices, so conditional cards cause no layout issues when not rendered.

4. **FlatList items in approvals.tsx** — Individual `ApprovalCard` items inside FlatList `renderItem` must NOT use `getEntryStyle`. Only section-level containers.

### Spring Configuration

Hook uses `springBouncy` from `reanimated-presets.ts`:
```typescript
springBouncy = { damping: 14, stiffness: 200, mass: 1 }
```

With `STAGGER_MS = 50`: 4 cards animate at 0ms, 50ms, 100ms, 150ms delays.

### Test Strategy

All tests use static file analysis (`fs.readFileSync`) — no React rendering required. This is the established codebase pattern. Tests check import statements, hook call signatures, and `getEntryStyle(\d+)` call counts via regex.
