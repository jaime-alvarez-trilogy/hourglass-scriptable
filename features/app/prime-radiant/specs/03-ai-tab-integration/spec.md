# AI Tab Integration — Prime Radiant + Compact Cone

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What Is Being Built

This spec wires the `AIConeChart` component (from 02-cone-chart) into two tab screens:

1. **AI Tab** (`app/(tabs)/ai.tsx`) — A full-size "PRIME RADIANT" card added between the BrainLift card and the daily breakdown table. The chart uses `size="full"` at 240px height, re-animates when the tab is re-focused, and shows a skeleton during the initial load.

2. **Home Tab** (`app/(tabs)/index.tsx`) — A compact "AI TRAJECTORY" card inserted between the "THIS WEEK" bar chart (Zone 2) and the "EARNINGS" card (Zone 3). The chart uses `size="compact"` at 100px height. Tapping is disabled (view-only). The chart re-animates using the existing `chartKey` from `useFocusKey()` already present in `index.tsx`.

### How It Works

Both screens call `computeAICone(dailyBreakdown, weeklyLimit)` via `useMemo` to produce a `ConeData` object. The AI tab already has `useAIData()` imported; the home tab adds a new `useAIData()` call. Both read `useConfig().config.weeklyLimit` (`index.tsx` already has this; `ai.tsx` needs a new `useConfig()` call).

Layout dimensions are measured via `onLayout` with a `useState` dimension pair (`coneDims` / `compactConeDims`). The chart renders `null` until `width > 0` (guarded inside `AIConeChart`), preventing any empty-canvas flash.

The cone card only renders when `coneData !== null`. Since `computeAICone` always returns a valid `ConeData` (never null), the null-guard is on the upstream data: if `data` (from `useAIData`) is null (loading), the AI tab shows a `SkeletonLoader`; the home tab skips rendering the card entirely until `aiData` is available.

---

## Out of Scope

1. **AIConeChart component itself** — **Descoped:** Implemented in 02-cone-chart. This spec only wires existing components.

2. **computeAICone math** — **Descoped:** Implemented in 01-cone-math. This spec only calls the function.

3. **useFocusKey hook changes** — **Descoped:** The hook is already implemented and sufficient. No changes needed.

4. **Tap navigation from compact cone card** — **Descoped:** The home tab compact card is intentionally view-only (no tap). Navigation to the AI tab from the card is not part of this spec.

5. **Skeleton for compact cone card on home tab** — **Descoped:** The home tab renders the compact card only when `aiData` is available. No skeleton is shown for the compact card — it simply doesn't appear until data is ready, avoiding any layout shift.

6. **Historical week-over-week cone comparison** — **Descoped:** No multi-week trajectory is shown. The cone always represents the current week only. Future analytics feature.

7. **AI% notifications when trajectory drops below 75%** — **Descoped:** A separate notifications feature. Not part of this spec.

8. **BrainLift-specific cone variant** — **Descoped:** The cone represents total AI%, not BrainLift specifically. No BrainLift-only cone is shown.

---

## Functional Requirements

### FR1: AI Tab — Prime Radiant Card

Add a "PRIME RADIANT" card to `app/(tabs)/ai.tsx` between the BrainLift card and the daily breakdown table.

**Implementation:**
- Import `AIConeChart` from `@/src/components/AIConeChart`
- Import `computeAICone` from `@/src/lib/aiCone`
- Import `useMemo` and `useState` from `react`
- Import `useFocusKey` from `@/src/hooks/useFocusKey`
- Import `useConfig` from `@/src/hooks/useConfig`
- Add `const { config } = useConfig()` call
- Add `const weeklyLimit = config?.weeklyLimit ?? 40`
- Add `const chartKey = useFocusKey()`
- Add `useState<{ width: number; height: number }>` for `coneDims` (initial: `{ width: 0, height: 240 }`)
- Compute `coneData` via `useMemo(() => data ? computeAICone(data.dailyBreakdown, weeklyLimit) : null, [data, weeklyLimit])`
- Render card after the BrainLift card with `<SectionLabel>PRIME RADIANT</SectionLabel>`
- If `showSkeleton` (isLoading && !data): show `<SkeletonLoader height={240} />`
- If `coneData` is non-null: render `<View style={{ height: 240 }} onLayout={e => setConeDims({ width: e.nativeEvent.layout.width, height: 240 })}>` with `<AIConeChart key={chartKey} data={coneData} width={coneDims.width} height={240} size="full" />`

**Success Criteria:**
- Prime Radiant card renders below BrainLift card and above daily breakdown table
- Chart animates on initial mount with full-size variant (axis labels visible)
- Chart re-animates each time the AI tab is re-focused (chartKey increments)
- Skeleton (`height={240}`) shown during initial load (`isLoading && !data`)
- No chart rendered while `data` is null and not loading
- `coneDims.width` correctly reflects container width after `onLayout` fires
- Chart is not rendered until `width > 0` (AIConeChart internal guard)
- `weeklyLimit` sourced from `config?.weeklyLimit ?? 40` via new `useConfig()` call

---

### FR2: Home Tab — Compact AI Trajectory Card

Add a compact "AI TRAJECTORY" card to `app/(tabs)/index.tsx` between Zone 2 (weekly bar chart) and Zone 3 (earnings card).

**Implementation:**
- Import `useAIData` from `@/src/hooks/useAIData`
- Import `AIConeChart` from `@/src/components/AIConeChart`
- Import `computeAICone` from `@/src/lib/aiCone`
- Add `const { data: aiData } = useAIData()` call
- Add `useState<{ width: number; height: number }>` for `compactConeDims` (initial: `{ width: 0, height: 100 }`)
- Compute `coneData` via `useMemo(() => aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit) : null, [aiData, weeklyLimit])`
- Render card conditionally (`{coneData && (...)}`) between Zone 2 close tag and Zone 3 open tag
- Card label: `<SectionLabel className="mb-2">AI TRAJECTORY</SectionLabel>`
- Chart: `<AIConeChart key={chartKey} data={coneData} width={compactConeDims.width} height={100} size="compact" />`
- No tap handler — card is view-only

**Success Criteria:**
- Card appears between "THIS WEEK" bar chart and "EARNINGS" card
- Card is not rendered when `aiData` is null (no layout shift during load)
- `size="compact"` — no axis labels, just line + cone + 75% reference line
- Chart re-animates using the existing `chartKey` from `useFocusKey()` already in `index.tsx`
- `compactConeDims.width` correctly reflects container width after `onLayout` fires
- Chart height is 100px
- Card has no tap handler
- `weeklyLimit` reuses the existing `weeklyLimit` constant already computed in `index.tsx`

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `src/lib/aiCone.ts` | `computeAICone(dailyBreakdown, weeklyLimit)` → `ConeData` |
| `src/components/AIConeChart.tsx` | `AIConeChart` component, `AIConeChartProps` interface |
| `src/hooks/useAIData.ts` | `useAIData()` → `{ data: AIWeekData \| null, isLoading, ... }` |
| `src/hooks/useConfig.ts` | `useConfig()` → `{ config }` |
| `src/hooks/useFocusKey.ts` | `useFocusKey()` → increments on tab re-focus |
| `src/lib/ai.ts` | `DailyTagData`, `AIWeekData` types |
| `src/components/Card.tsx` | Card wrapper |
| `src/components/SectionLabel.tsx` | Section label |
| `src/components/SkeletonLoader.tsx` | Skeleton placeholder |

### Files to Modify

| File | Change |
|------|--------|
| `app/(tabs)/ai.tsx` | Add imports, `useConfig`, `coneDims` state, `chartKey`, `coneData` memo, Prime Radiant card between BrainLift and daily breakdown |
| `app/(tabs)/index.tsx` | Add imports for `useAIData`, `AIConeChart`, `computeAICone`; add `compactConeDims` state, `coneData` memo, compact card between Zone 2 and Zone 3 |

### Data Flow

```
AI Tab (ai.tsx):
  useAIData() → data.dailyBreakdown (already present)
  useConfig() → config.weeklyLimit (NEW addition)
  useFocusKey() → chartKey (NEW addition)
  useMemo → computeAICone(data.dailyBreakdown, weeklyLimit) → ConeData
  AIConeChart(data=coneData, width=coneDims.width, height=240, size="full", key=chartKey)

Home Tab (index.tsx):
  useAIData() → aiData.dailyBreakdown (NEW addition)
  useConfig() → config.weeklyLimit (already present)
  useFocusKey() → chartKey (already present)
  useMemo → computeAICone(aiData.dailyBreakdown, weeklyLimit) → ConeData
  AIConeChart(data=coneData, width=compactConeDims.width, height=100, size="compact", key=chartKey)
```

### Edge Cases

1. **`data === null` on AI tab** — `coneData` is `null` (memo guards it). Card shows `SkeletonLoader` when `showSkeleton`, renders nothing when `!data && !isLoading`.

2. **`aiData === null` on home tab** — `coneData` is `null`. The entire compact card JSX block is wrapped in `{coneData && (...)}` — card is absent during load.

3. **`width === 0` on first render** — `AIConeChart` returns `null` when `width === 0` (internal guard). No visual artifact.

4. **`weeklyLimit === 0`** — `computeAICone` returns valid `ConeData` with empty cone arrays. `AIConeChart` renders the actual line only. Card still shown.

5. **Tab re-focus re-animation** — `useFocusKey()` increments `chartKey` on each re-focus after initial mount. `key={chartKey}` forces full remount → fresh animation.

6. **`useAIData` called twice** — Home and AI tabs have separate hook instances. Both read from the same AsyncStorage cache. Fetch deduplication is per-hook-instance.

7. **`useConfig` not yet in ai.tsx** — Must be added. `ai.tsx` currently does not call `useConfig()`. The `weeklyLimit` constant must be derived: `const weeklyLimit = config?.weeklyLimit ?? 40`.

### Layout Insertion Points

**AI Tab** — after BrainLift `</Card>`, before daily breakdown conditional:

```
BrainLift Card
[NEW] Prime Radiant Card (FR1)
Daily Breakdown Card
```

**Home Tab** — after Zone 2 `</Card>`, before Zone 3 `<Card>`:

```
Zone 2: THIS WEEK bar chart Card
[NEW] AI TRAJECTORY compact card (FR2)
Zone 3: EARNINGS Card
```
