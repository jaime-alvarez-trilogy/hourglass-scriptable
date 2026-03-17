# Spec Research: 01-baseline-start

## Spec

`features/app/cone-baseline/specs/01-baseline-start`

## Problem

`computeHourlyPoints()` in `aiCone.ts` initializes the trajectory with `[{ hoursX: 0, pctY: 0 }]`. The trajectory always starts at zero AI% regardless of where last week ended. `useAIData().previousWeekPercent` already holds last week's final AI% but is never passed into cone math.

## Exploration Findings

### Key Files

| File | Role |
|------|------|
| `hourglassws/src/lib/aiCone.ts` | `computeAICone()` + `computeHourlyPoints()` — only math file to change |
| `hourglassws/src/hooks/useAIData.ts` | Returns `previousWeekPercent?: number` from AsyncStorage |
| `hourglassws/app/(tabs)/index.tsx` | Home screen — calls `computeAICone(dailyBreakdown, weeklyLimit)` |
| `hourglassws/app/(tabs)/ai.tsx` | AI tab — also calls `computeAICone(dailyBreakdown, weeklyLimit)` |
| `hourglassws/src/lib/__tests__/aiCone.test.ts` | Existing cone math tests — needs new baseline cases |

### Current first-point initialization

```typescript
// aiCone.ts — computeHourlyPoints(), line 149
const points: ConePoint[] = [{ hoursX: 0, pctY: 0 }];
```

### Where `previousWeekPercent` comes from

`useAIData` reads `previousWeekAIPercent` from AsyncStorage on mount:

```typescript
// useAIData.ts — lines 107-115
const prev = await AsyncStorage.getItem('previousWeekAIPercent');
if (prev !== null) {
  setPreviousWeekPercent(parseFloat(prev));
}
```

Written by `useAIData` on Monday as `(aiPctLow + aiPctHigh) / 2` — a midpoint of the just-completed week's AI% range, not an exact final snapshot. Close enough to "last week's AI%" for display purposes.

### Call sites for `computeAICone`

**index.tsx** (Home):
```typescript
// Current (line 157, 159)
const { data: aiData } = useAIData();  // previousWeekPercent not yet destructured
const coneData = useMemo(
  () => (aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit) : null),
  [aiData, weeklyLimit]
);

// After fix: add previousWeekPercent to destructure + pass as 3rd arg
const { data: aiData, previousWeekPercent } = useAIData();
const coneData = useMemo(
  () => (aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit, previousWeekPercent) : null),
  [aiData, weeklyLimit, previousWeekPercent]
);
```

**ai.tsx** (AI tab):
```typescript
// Current (line 69, 168) — previousWeekPercent ALREADY destructured
const { data, ..., previousWeekPercent } = useAIData();
const coneData = computeAICone(safeData.dailyBreakdown, weeklyLimit);  // direct call, no useMemo

// After fix: pass previousWeekPercent as 3rd arg
const coneData = computeAICone(safeData.dailyBreakdown, weeklyLimit, previousWeekPercent);
```

Note: `ai.tsx` already destructures `previousWeekPercent` (used for the delta badge). Only the `computeAICone` call needs updating there.

### TrendSparkline — already correct

The 12-week sparkline on the AI tab plots `[...pastSnaps.map(s => s.aiPct), currentAiPct]` — it already starts from past weeks' completed values. No change needed there.

## Key Decisions

### 1. `baselinePct` is optional, defaults to 0

```typescript
export function computeAICone(
  dailyBreakdown: DailyTagData[],
  weeklyLimit: number,
  baselinePct: number = 0,  // ← new optional param
): ConeData
```

- First week of use (no history) → `previousWeekPercent` is `undefined` → passes 0 → same behavior as before
- Subsequent weeks → passes last week's midpoint AI% (stored as `(aiPctLow + aiPctHigh) / 2` on Monday)

### 2. Only the first point changes

The `pctY: 0` of the origin point becomes `pctY: baselinePct`. All interpolation logic after that point is unchanged — the running AI% for the current week's data still accumulates correctly from the actual tagged slots.

The first point `{ hoursX: 0, pctY: baselinePct }` represents "where you stood at the start of this week". As the week progresses, the trajectory reflects the actual current-week AI%.

### 3. Threading at call sites

```typescript
// index.tsx — add previousWeekPercent to existing destructure; pass as 3rd arg
const { data: aiData, previousWeekPercent } = useAIData();
const coneData = useMemo(
  () => (aiData ? computeAICone(aiData.dailyBreakdown, weeklyLimit, previousWeekPercent) : null),
  [aiData, weeklyLimit, previousWeekPercent]
);

// ai.tsx — previousWeekPercent already destructured (line 69); just add 3rd arg to direct call
const coneData = computeAICone(safeData.dailyBreakdown, weeklyLimit, previousWeekPercent);
```

### 4. Cone bounds and target line unaffected

The upper/lower cone bounds and target line are computed independently of `baselinePct`. They represent what's achievable from the current position forward — they should not be shifted by the baseline. Only the historical trajectory line changes.

## Interface Contracts

### `computeAICone(dailyBreakdown, weeklyLimit, baselinePct?): ConeData`

| Parameter | Type | Source | Notes |
|-----------|------|--------|-------|
| `dailyBreakdown` | `DailyTagData[]` | `useAIData().data.dailyBreakdown` | Unchanged |
| `weeklyLimit` | `number` | `config.weeklyLimit` | Unchanged |
| `baselinePct` | `number` (optional, default 0) | `useAIData().previousWeekPercent` | **New** |

**Return type:** `ConeData` — unchanged struct, only `hourlyPoints[0].pctY` differs.

### `computeHourlyPoints(dailyBreakdown, weeklyLimit, baselinePct?): { points, snapshots }`

Internal function — same change:

| Parameter | Type | Source | Notes |
|-----------|------|--------|-------|
| `baselinePct` | `number` (default 0) | Threaded from `computeAICone`'s `baselinePct` param | Used only for first point initialization |

**Change:**
```typescript
// Before
const points: ConePoint[] = [{ hoursX: 0, pctY: 0 }];

// After
const points: ConePoint[] = [{ hoursX: 0, pctY: baselinePct }];
```

## Test Plan

### FR1: `computeHourlyPoints` respects `baselinePct`

**Happy path:**
- [ ] `baselinePct=0` (default) → first point is `{ hoursX: 0, pctY: 0 }` (no regression)
- [ ] `baselinePct=81` → first point is `{ hoursX: 0, pctY: 81 }`
- [ ] `baselinePct=75` → first point is `{ hoursX: 0, pctY: 75 }`

**Edge cases:**
- [ ] `baselinePct` omitted → behaves same as `baselinePct=0`
- [ ] `baselinePct=0` with data → subsequent points still reflect actual AI% (baseline only affects origin)
- [ ] `baselinePct=100` → first point is `{ hoursX: 0, pctY: 100 }`, subsequent points track actual

### FR2: `computeAICone` threads `baselinePct` through

**Happy path:**
- [ ] `computeAICone(breakdown, 40, 81)` → `coneData.hourlyPoints[0].pctY === 81`
- [ ] `computeAICone(breakdown, 40)` → `coneData.hourlyPoints[0].pctY === 0` (default)
- [ ] `computeAICone(breakdown, 40, 0)` → `coneData.hourlyPoints[0].pctY === 0`

**No regression:**
- [ ] `coneData.currentAIPct` is unchanged regardless of `baselinePct`
- [ ] `coneData.upperBound` is unchanged
- [ ] `coneData.lowerBound` is unchanged
- [ ] `coneData.targetPct` is unchanged (always 75)

### FR3: Call site threading (source-level tests)

- [ ] `index.tsx` passes `previousWeekPercent` as third arg to `computeAICone`
- [ ] `ai.tsx` passes `previousWeekPercent` as third arg to `computeAICone`
- [ ] `previousWeekPercent` is included in `useMemo` deps array at both call sites

## Files to Reference

- `hourglassws/src/lib/aiCone.ts` — `computeAICone`, `computeHourlyPoints`
- `hourglassws/src/lib/__tests__/aiCone.test.ts` — existing test patterns
- `hourglassws/src/hooks/useAIData.ts` — `previousWeekPercent` return field
- `hourglassws/app/(tabs)/index.tsx` — Home screen cone call site
- `hourglassws/app/(tabs)/ai.tsx` — AI tab cone call site

## Out of Scope

- TrendSparkline (already correct)
- Cone bounds / target line logic
- How `previousWeekPercent` is computed or stored
- Any visual changes to the chart itself
