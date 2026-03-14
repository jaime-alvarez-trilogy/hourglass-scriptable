# Spec Research: 02-panel-state

## Problem Context

The design system defines 5 panel states (onTrack, behind, critical, crushedIt, idle) but
there is **no utility function** to compute which state applies given a contractor's current
week data. The `PanelGradient` component (spec 03) and the Hours Dashboard (spec 05) both
need this logic.

This is pure business logic with no UI dependency — it can be built and tested independently
before any NativeWind migration is started.

## Exploration Findings

**PanelState type (already defined in reanimated-presets.ts):**
```typescript
export type PanelState = "onTrack" | "behind" | "critical" | "crushedIt" | "idle";
```

**Existing hours logic (src/lib/hours.ts):**
- `calculateHours()` — returns hoursWorked, dailyAverage, hoursRemaining, etc.
- `UrgencyLevel` enum: `NONE | LOW | MEDIUM | HIGH | CRITICAL`
- `getSundayMidnightGMT()` — week boundary calculation
- Hours/day tracking logic already exists

**What panel state depends on (from BRAND_GUIDELINES.md):**
- `onTrack` — pacing to hit 40h by Friday midnight; on or ahead of expected hours
- `behind` — below expected hours but still recoverable (< 2 days behind)
- `critical` — severely behind; won't hit 40h without working long hours
- `crushedIt` — already at or above 40h before Friday midnight
- `idle` — no hours logged yet this week (Monday morning empty state)

**Pacing formula (implied by guidelines):**
- `expectedHours = (daysElapsed / 5) * weeklyLimit`
  - daysElapsed: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat/Sun=5 (week is Mon–Fri for work)
- `pacingRatio = hoursWorked / expectedHours`
- Thresholds:
  - `crushedIt`: hoursWorked >= weeklyLimit
  - `idle`: hoursWorked === 0
  - `onTrack`: pacingRatio >= 0.85 (within 15% of pace)
  - `behind`: pacingRatio >= 0.60 (recoverable, 40-85% of pace)
  - `critical`: pacingRatio < 0.60 (severely behind)

**Note on "daysElapsed"**: The week is Mon–Fri for work pacing purposes. Saturday and Sunday
count as Friday (week is "done" at end of Friday for pacing). daysElapsed should be clamped
to [0, 5].

**Existing UrgencyLevel vs PanelState:**
- These serve different purposes:
  - `UrgencyLevel` drives the deadline countdown banner styling
  - `PanelState` drives the hero panel gradient color
- They are correlated but not the same. PanelState is about current week pace;
  UrgencyLevel is about deadline proximity.
- Keep them as separate concepts.

## Key Decisions

1. **Location**: `src/lib/panelState.ts` — extends the existing `src/lib/` pure logic pattern.
2. **Function signature**: `computePanelState(hoursWorked: number, weeklyLimit: number, daysElapsed: number): PanelState`
3. **Re-export PanelState type** from this file (alongside the import from reanimated-presets)
   to keep domain logic colocated.
4. **Thresholds as named constants**: `PACING_ON_TRACK_THRESHOLD = 0.85`, `PACING_BEHIND_THRESHOLD = 0.60`
   — makes them easy to tune without changing logic.
5. **Edge cases**:
   - `daysElapsed = 0` (Monday before work) → `idle`
   - `weeklyLimit = 0` → `idle` (protect against division by zero)
   - `daysElapsed > 5` → clamp to 5

## Interface Contracts

```typescript
// src/lib/panelState.ts

import type { PanelState } from './reanimated-presets';
export type { PanelState };

/** Fraction of expected pace considered "on track" (within 15% of pace) */
export const PACING_ON_TRACK_THRESHOLD = 0.85;
/** Fraction of expected pace considered "recoverable behind" */
export const PACING_BEHIND_THRESHOLD = 0.60;

/**
 * Computes which of the 5 Hourglass panel states applies to the current week.
 *
 * @param hoursWorked  - Hours logged so far this week (e.g. 28.5)
 * @param weeklyLimit  - Contractual weekly hour target (e.g. 40)
 * @param daysElapsed  - Work days elapsed Mon–Fri (0=Monday morning, 5=Friday EOD+)
 *
 * @returns PanelState — one of onTrack | behind | critical | crushedIt | idle
 */
export function computePanelState(
  hoursWorked: number,
  weeklyLimit: number,
  daysElapsed: number
): PanelState
```

**Sources:**
- `hoursWorked` ← `calculateHours().total` from `src/lib/hours.ts`
- `weeklyLimit` ← `config.weeklyHours` from config store (default 40)
- `daysElapsed` ← computed from current date (Mon=1 … Fri+=5, clamped)

## Test Plan

### computePanelState

**Happy Path:**
- [ ] Mon morning, 0h worked → `idle`
- [ ] Wed mid-week, 20h worked (= exact pace for 40h week) → `onTrack`
- [ ] Thu, 30h worked (40h × 3/5 = 24h expected, 30 > 24) → `onTrack`
- [ ] Fri EOD, 40h worked → `crushedIt`
- [ ] Fri, 42h worked (over limit) → `crushedIt`
- [ ] Wed, 10h worked (40h × 2/5 = 16h expected, 10/16 = 62.5%) → `behind`
- [ ] Wed, 5h worked (40h × 2/5 = 16h expected, 5/16 = 31%) → `critical`

**Edge Cases:**
- [ ] `weeklyLimit = 0` → `idle` (no division by zero)
- [ ] `daysElapsed = 0, hoursWorked = 0` → `idle`
- [ ] `daysElapsed = 0, hoursWorked > 0` → `onTrack` (early work counts)
- [ ] `daysElapsed > 5` → treated as 5 (clamp)
- [ ] `hoursWorked < 0` → treated as 0 (guard)

**Threshold boundary cases:**
- [ ] `pacingRatio = 0.85` → `onTrack` (inclusive)
- [ ] `pacingRatio = 0.84` → `behind`
- [ ] `pacingRatio = 0.60` → `behind` (inclusive)
- [ ] `pacingRatio = 0.59` → `critical`

**Mocks Needed:** None — pure function, no external dependencies.

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/hours.ts` — existing hours logic pattern to follow
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/reanimated-presets.ts` — PanelState type (line 170)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/BRAND_GUIDELINES.md` — panel state descriptions
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/useHoursData.ts` — how hoursWorked is obtained

## Complexity

**S** — One new file, pure function, ~50 lines of logic + tests.

## FRs

1. Implement `computePanelState(hoursWorked, weeklyLimit, daysElapsed)` with 5 state outputs
2. Export `PACING_ON_TRACK_THRESHOLD` and `PACING_BEHIND_THRESHOLD` constants
3. Handle edge cases: zero limit, zero days, over-limit hours, daysElapsed > 5
4. Unit tests covering all 5 states + boundary + edge cases
