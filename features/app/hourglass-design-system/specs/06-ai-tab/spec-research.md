# Spec Research: 06-ai-tab

## Problem Context

`app/(tabs)/ai.tsx` displays AI usage percentage and BrainLift hours. It currently uses
`StyleSheet.create()` + hardcoded hex and a View-based `AIProgressBar`. The rebuild needs:
- `AIRingChart` (Oura-style circular ring for AI%)
- BrainLift hours with distinct violet styling
- `TrendSparkline` for week-over-week comparison
- `MetricValue` count-up for all numbers
- `Card` + `SectionLabel` layout
- Clear semantic color separation: cyan = AI usage, violet = BrainLift

## Exploration Findings

**Current ai.tsx structure:**
- Header: "AI & BrainLift" title
- AI% ring (custom View-based arc using `AIProgressBar`)
- AI% number (large static text)
- BrainLift hours (medium text)
- Daily breakdown (FlatList of `DailyAIRow` items)
- All StyleSheet-based

**Data from `useAIData()`:**
```typescript
interface AIData {
  aiPercent: number;        // 0–100, union of ai_usage | second_brain tags
  brainliftHours: number;   // second_brain slots × 10min / 60
  dailyBreakdown: {
    date: string;
    day: string;
    aiPercent: number;
    brainliftMinutes: number;
    totalSlots: number;
    taggedSlots: number;
  }[];
  weeklyHistory?: number[]; // Last N weeks AI% (if available)
}
```

**Color semantics (from BRAND_GUIDELINES.md + tailwind.config.js):**
- `cyan` (#00D4FF) = AI usage percentage — primary metric
- `violet` (#A78BFA) = BrainLift hours — distinct from AI
- These must NEVER be swapped or mixed

**Design layout (from guidelines + audit):**
- Large AIRingChart (150–180dp diameter) with AI% in center (MetricValue cyan)
- BrainLift section below: MetricValue in violet, target label "/ 5h target"
- Trend: small TrendSparkline showing last 4–8 weeks AI% history
- Daily breakdown: scrollable list of DailyAIRow items (keep existing component, update styling)
- Week comparison: current week vs last week AI%

**BrainLift target**: 5 hours/week = 30 slots. Progress shown as `brainliftHours / 5`.
ProgressBar with violet color showing BrainLift weekly progress.

**Week-over-week comparison:**
`useAIData()` currently returns only current week. Historical AI% across weeks requires
aggregating work diary data from prior weeks — expensive. Simpler approach: store last
week's AI% in AsyncStorage (updated at week boundary). Add `usePreviousWeekAI()` hook
or just show "vs last week" if cached value is available (hide if not).

**Decision on history**: For this spec, week-over-week is a "delta badge" (e.g. "+3.2%")
derived from a cached `previousWeekAIPercent` stored in AsyncStorage. If not available,
hide the badge. Do NOT do multi-week API calls in this spec.

## Key Decisions

1. **Two-ring AIRingChart**: Use both rings — outer ring = AI% (cyan track), inner ring =
   BrainLift% of target (violet track). The `brainliftPercent` prop = `brainliftHours / 5 * 100`.

2. **DailyAIRow update**: Keep the existing `DailyAIRow` component but update it to use
   `className` instead of StyleSheet. This is a light refactor, not a full rebuild.

3. **Previous week cache**: Add `previousWeekAIPercent` to the config/AsyncStorage after
   each successful AI% fetch at week boundary. `useAIData()` reads this and exposes
   `previousWeekPercent?: number`. Delta badge shown only if available.

4. **AI% formula reminder**: `(slots with ai_usage OR second_brain) / (total - untagged slots)`
   — already implemented in `src/lib/ai.ts`. This spec does NOT change the formula.

5. **Trend sparkline data**: AI% trend requires historical data. For now, show TrendSparkline
   only if `weeklyHistory` is available in useAIData (leave as optional). Skip if not yet
   implemented. This spec adds a placeholder comment for future implementation.

## Interface Contracts

```typescript
// app/(tabs)/ai.tsx — rebuilt screen (no exported interface)

// useAIData() — extend to include previousWeekPercent
interface AIData {
  aiPercent: number;
  brainliftHours: number;
  dailyBreakdown: DailyAIBreakdown[];
  previousWeekPercent?: number;  // NEW: cached from AsyncStorage
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// DailyAIRow props (light refactor):
interface DailyAIRowProps {
  date: string;
  day: string;
  aiPercent: number;
  brainliftMinutes: number;
}
// Sources: all from useAIData().dailyBreakdown items
```

**New utility in `src/hooks/useAIData.ts`:**
- On successful fetch: if it's a new week (Monday), save current `aiPercent` to
  `AsyncStorage` as `previousWeekAIPercent`
- On load: read `previousWeekAIPercent` from AsyncStorage, expose as `previousWeekPercent`

## Test Plan

### useAIData (extended)
- [ ] `previousWeekPercent` is undefined when no AsyncStorage value set
- [ ] `previousWeekPercent` returns stored value when AsyncStorage has it
- [ ] On Monday morning with fresh data: stores current aiPercent as previous week

### AI Tab (render)
- [ ] Renders without crash
- [ ] AIRingChart shows aiPercent arc in cyan
- [ ] AIRingChart inner ring shows BrainLift% in violet (when brainliftHours > 0)
- [ ] MetricValue shows aiPercent with cyan color, count-up animation
- [ ] MetricValue shows brainliftHours with violet color, count-up animation
- [ ] BrainLift ProgressBar shows `brainliftHours / 5` fill in violet
- [ ] Delta badge (+x.x%) shown when previousWeekPercent is available
- [ ] Delta badge hidden when previousWeekPercent is undefined
- [ ] DailyAIRow list renders one row per day
- [ ] SkeletonLoaders shown when isLoading=true

**Mocks Needed:**
- `useAIData` → mock hook with aiPercent, brainliftHours, dailyBreakdown
- `@shopify/react-native-skia` → existing mock
- `@react-native-async-storage/async-storage` → mock (already mocked in test setup)

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/app/(tabs)/ai.tsx` — existing screen
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/useAIData.ts` — AI data hook
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/ai.ts` — AI% calculation
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/components/DailyAIRow.tsx` — daily row (to update)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/components/AIProgressBar.tsx` — to replace with AIRingChart
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tailwind.config.js` — cyan + violet token values

## Complexity

**M** — Screen rebuild, extend useAIData hook, update DailyAIRow, AsyncStorage caching.

## FRs

1. `AIRingChart` integration — two-ring display (outer AI% cyan, inner BrainLift% violet)
2. Hero metric section — MetricValue ai% + MetricValue brainlift hours, color-coded
3. BrainLift progress — ProgressBar showing brainliftHours / 5h target in violet
4. Delta badge — week-over-week comparison with AsyncStorage caching in useAIData
5. Daily breakdown list — DailyAIRow updated to className styling
6. Loading/skeleton states — SkeletonLoaders for all sections
