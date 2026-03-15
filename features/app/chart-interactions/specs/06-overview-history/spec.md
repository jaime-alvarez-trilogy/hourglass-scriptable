# 06-overview-history

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What Is Being Built

`06-overview-history` builds the **data persistence layer** that gives the overview tab's 4 trend charts their historical data. Without this spec, AI%, BrainLift hours, and weekly hours have no multi-week memory — only earnings has a 12-week history today.

This spec creates:

1. **`src/lib/weeklyHistory.ts`** — Pure functions for reading, writing, and merging the `weekly_history_v2` AsyncStorage store.
2. **`src/hooks/useWeeklyHistory.ts`** — Read-only hook that loads persisted snapshots on mount.
3. **Extensions to `useEarningsHistory`** — On every successful payment fetch, write `{ weekStart, earnings, hours }` into `weekly_history_v2`.
4. **Extension to `useAIData`** — On Monday new-week detection (before pruning the old AI cache), flush `{ weekStart, aiPct, brainliftHours }` into `weekly_history_v2`.

### How It Works

The store is a single AsyncStorage key (`weekly_history_v2`) holding a `WeeklySnapshot[]` array of up to 12 entries sorted oldest-first. Two hooks write to it independently via a shared `mergeWeeklySnapshot` helper that merges partial updates by `weekStart`. A third hook reads it.

```
useEarningsHistory ──write──┐
                             ├──► weekly_history_v2 (AsyncStorage)
useAIData ──write────────────┘         │
                                        ▼
                               useWeeklyHistory (read-only)
                                        │
                                        ▼
                               07-overview-sync (consumer)
```

The current (in-progress) week is **not** stored in this key — it is derived live from `useAIData` and `useHoursData` by the consumer (spec 07). This spec only manages the persisted historical weeks.

### Scope

This spec is **data-layer only**. No UI, no charts, no overview screen layout. Those belong to spec `07-overview-sync`.

---

## Out of Scope

1. **Overview screen UI and chart rendering** — Deferred to `07-overview-sync`. This spec only builds the data layer; the charts that consume `useWeeklyHistory` are spec 07's responsibility.

2. **4W/12W time-range toggle** — Deferred to `07-overview-sync`. The toggle controls how many entries the overview charts display; `useWeeklyHistory` returns all persisted entries and the consumer slices as needed.

3. **Synchronized cross-chart scrubbing** — Deferred to `07-overview-sync`. Scrub gesture coordination between the 4 trend cards is a UI concern, not a storage concern.

4. **Current week live data** — Descoped. The in-progress week is intentionally excluded from `weekly_history_v2`. Consumers combine persisted history with live data from `useAIData` / `useHoursData` at render time.

5. **Backfilling AI% for weeks before this spec ships** — Descoped. There is no API to retroactively fetch per-week AI tag data (only work diary by day/assignment, not by historical week). Charts will start with 0 for unavailable weeks and fill in over time.

6. **Manual time (logbook) hours** — Descoped. `paidHours` from the payments API already includes all paid hours for the week. Manual time that was approved is included in payment records. No separate manual time accumulation is needed.

7. **Earnings field in `WeeklySnapshot`** — Descoped from `useWeeklyHistory` reads. The FEATURE.md `WeeklySnapshot` type in `Key Types` does not include an `earnings` field. The earnings trend for the overview is already provided by `useEarningsHistory` (existing hook). This spec stores earnings in `weekly_history_v2` as a bonus write (via `useEarningsHistory` extension) but the earnings chart in spec 07 will continue reading from `useEarningsHistory`, not `useWeeklyHistory`.

   **Note:** The `WeeklySnapshot` interface in this spec *does* include `earnings` to keep the store self-contained and future-proof, but spec 07 is not required to consume it from `useWeeklyHistory`.

---

## Functional Requirements

### FR1: `WeeklySnapshot` type and `weeklyHistory.ts` pure functions

**What:** Define the `WeeklySnapshot` interface and implement three pure functions: `mergeWeeklySnapshot`, `loadWeeklyHistory`, `saveWeeklyHistory`.

**Success Criteria:**

- `WeeklySnapshot` has fields: `weekStart: string` (YYYY-MM-DD Monday), `hours: number`, `earnings: number`, `aiPct: number`, `brainliftHours: number`.
- `WEEKLY_HISTORY_KEY = 'weekly_history_v2'` and `WEEKLY_HISTORY_MAX = 12` are exported constants.
- `mergeWeeklySnapshot(history, partial)`:
  - Finds existing entry by `weekStart`; if found, merges only the fields present in `partial` (other fields unchanged).
  - If no entry exists for `weekStart`, appends a new entry with missing fields defaulting to `0`.
  - After merge/append, sorts the array ascending by `weekStart`.
  - Trims to `WEEKLY_HISTORY_MAX` entries by removing the oldest (lowest `weekStart`) entries.
  - Returns the new array (does not mutate input).
- `loadWeeklyHistory()`:
  - Reads `weekly_history_v2` from AsyncStorage.
  - Returns `WeeklySnapshot[]` on success.
  - Returns `[]` if the key is missing or the stored value is not valid JSON.
  - Catches all AsyncStorage and parse errors; never throws.
- `saveWeeklyHistory(snapshots)`:
  - Writes the array to `weekly_history_v2` as JSON.
  - Returns a resolved `Promise<void>` on success.
  - Propagates AsyncStorage errors (caller decides how to handle).

---

### FR2: `useWeeklyHistory` hook

**What:** Read-only React hook that loads persisted weekly snapshots from AsyncStorage on mount.

**Success Criteria:**

- Returns `{ snapshots: WeeklySnapshot[], isLoading: boolean }`.
- `isLoading` is `true` synchronously on first render; becomes `false` after the AsyncStorage read resolves.
- `snapshots` is `[]` on first render (before AsyncStorage resolves).
- After mount, `snapshots` holds the persisted array (may be empty on first-ever launch).
- If AsyncStorage throws, `snapshots` remains `[]` and `isLoading` becomes `false` (silent failure).
- Does **not** include the current in-progress week (pure reader of persisted history).
- Does **not** accept a refresh callback in this spec — invalidation is out of scope (spec 07 can extend if needed).

---

### FR3: Extend `useEarningsHistory` to write `weekly_history_v2`

**What:** After a successful payment fetch, write `{ weekStart, earnings, hours }` for each week into `weekly_history_v2` via `mergeWeeklySnapshot`.

**Success Criteria:**

- After `useEarningsHistory` merges fetched `Payment[]` into its existing earnings cache, it also iterates each `Payment` and extracts `paidHours` alongside `amount`.
- For each `periodStartDate` week found in the payment response, calls `mergeWeeklySnapshot` with `{ weekStart: periodStartDate.slice(0,10), earnings: summedAmount, hours: summedPaidHours }`.
- Saves the updated history via `saveWeeklyHistory`.
- Failure to write `weekly_history_v2` is **silent** (does not affect the existing earnings trend returned by the hook).
- The existing `earnings_history_v1` write and `trend` return value are **unchanged** — this is an additive write only.
- The `Payment` type's `paidHours` field is used as-is (already defined in `src/lib/payments.ts` or equivalent).

---

### FR4: Extend `useAIData` to flush AI snapshot on new-week detection

**What:** On Monday, before pruning the previous week's AI cache, compute `aiPct` (midpoint) and `brainliftHours` from the outgoing cache and write them to `weekly_history_v2`.

**Success Criteria:**

- The flush happens inside `fetchData` in `useAIData`, at the same point the existing `PREV_WEEK_KEY` write occurs (Monday + `taggedSlots > 0` guard).
- Computes `prevWeekStart = getMondayOfWeek(lastCachedDate)` where `lastCachedDate` is a date from the previous week's cache entries (i.e. the week being pruned). This correctly identifies the Monday of the week that just ended.
- Calls `mergeWeeklySnapshot` with `{ weekStart: prevWeekStart, aiPct: midpoint, brainliftHours: freshData.brainliftHours }`.
- Saves via `saveWeeklyHistory`.
- Failure is **silent** (caught internally; does not affect AI data return value or existing `PREV_WEEK_KEY` write).
- Guard condition is unchanged: only flushes when `isMonday && freshData.taggedSlots > 0`, so an empty Monday morning fetch doesn't corrupt the history.

---

## Technical Design

### Files to Reference

| File | Why |
|------|-----|
| `src/hooks/useEarningsHistory.ts` | Pattern for AsyncStorage merge-write + `Payment[]` processing |
| `src/hooks/useAIData.ts` | Weekly flush detection (`isMonday` + `taggedSlots > 0`), `pruneToCurrentWeek`, `PREV_WEEK_KEY` write |
| `src/lib/ai.ts` | `aggregateAICache`, `getMondayOfWeek`, `AIWeekData`, `TagData` |
| `src/lib/hours.ts` | `getWeekStartDate` (cross-reference only; not used directly) |

### Files to Create

```
hourglassws/src/lib/weeklyHistory.ts        — WeeklySnapshot type + mergeWeeklySnapshot + load/save
hourglassws/src/hooks/useWeeklyHistory.ts   — Read-only hook
```

### Files to Modify

```
hourglassws/src/hooks/useEarningsHistory.ts — Add weekly_history_v2 write (FR3)
hourglassws/src/hooks/useAIData.ts          — Add weekly_history_v2 flush on Monday (FR4)
```

### Files to Create (Tests)

```
hourglassws/src/lib/__tests__/weeklyHistory.test.ts       — Unit tests for FR1 pure functions
hourglassws/src/hooks/__tests__/useWeeklyHistory.test.ts  — Hook tests for FR2
```

---

### Data Flow

#### FR3: Earnings + hours write path

```
useEarningsHistory
  └── payments = await fetchPayments()
        │
        ├── (existing) build weeks map { [periodStartDate]: amount }
        │   → merge into earnings_history_v1 → save → setPersistedTrend
        │
        └── (new) build hoursMap { [periodStartDate]: paidHours }
              → load weekly_history_v2
              → for each week: mergeWeeklySnapshot(history, { weekStart, earnings, hours })
              → saveWeeklyHistory(merged)
```

#### FR4: AI flush path (Monday)

```
useAIData.fetchData()
  └── isMonday && freshData.taggedSlots > 0
        │
        ├── (existing) PREV_WEEK_KEY write
        │
        └── (new) prevWeekStart = currentMonday minus 7 days
              midpoint = (freshData.aiPctLow + freshData.aiPctHigh) / 2
              → load weekly_history_v2
              → mergeWeeklySnapshot(history, { weekStart: prevWeekStart, aiPct: midpoint, brainliftHours })
              → saveWeeklyHistory(merged)
```

**Deriving `prevWeekStart` in FR4:**
The prior week's Monday is the Monday 7 days before the current Monday:

```typescript
const today = todayLocal(); // Monday
const currentMonday = getMondayOfWeek(today);
const d = new Date(currentMonday + 'T00:00:00');
d.setDate(d.getDate() - 7);
// Format d as YYYY-MM-DD → prevWeekStart
```

This is simpler and more reliable than trying to find a date key from the raw cache.

---

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `loadWeeklyHistory` reads a non-array JSON value | Return `[]` |
| `loadWeeklyHistory` reads corrupted JSON | catch → return `[]` |
| `mergeWeeklySnapshot` called with only `aiPct` for a week that has no entry yet | Create new entry: `{ weekStart, hours: 0, earnings: 0, aiPct, brainliftHours: 0 }` |
| 13 weeks in store after merge | Trim oldest 1 entry → return 12 entries |
| Same weekStart written twice (e.g. earnings hook runs twice) | Second write wins for written fields; other fields preserved |
| Monday fetch with zero tagged slots | Guard prevents AI flush; no write occurs |
| `saveWeeklyHistory` throws (e.g. storage full) | Propagates to caller. FR3/FR4 callers catch silently. |
| Payment has null `periodStartDate` | Skip that payment (same guard already in `useEarningsHistory`) |

---

### `mergeWeeklySnapshot` Algorithm

```typescript
function mergeWeeklySnapshot(
  history: WeeklySnapshot[],
  partial: Partial<WeeklySnapshot> & { weekStart: string },
): WeeklySnapshot[] {
  const idx = history.findIndex(s => s.weekStart === partial.weekStart);
  let updated: WeeklySnapshot[];

  if (idx >= 0) {
    // Merge: only overwrite fields present in partial
    updated = history.map((s, i) =>
      i === idx ? { ...s, ...partial } : s
    );
  } else {
    // Append new entry with defaults for missing fields
    const entry: WeeklySnapshot = {
      weekStart: partial.weekStart,
      hours: partial.hours ?? 0,
      earnings: partial.earnings ?? 0,
      aiPct: partial.aiPct ?? 0,
      brainliftHours: partial.brainliftHours ?? 0,
    };
    updated = [...history, entry];
  }

  // Sort ascending, trim to max
  return updated
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-WEEKLY_HISTORY_MAX);
}
```

---

### Type: `Payment.paidHours`

The existing `Payment` type (in `src/lib/payments.ts` or `src/types/`) needs to confirm it has a `paidHours` field. Based on the API exploration notes in MEMORY.md (`paidHours` from `/api/v3/users/current/payments`), this field exists in the API response. If the TypeScript type is missing `paidHours`, FR3 implementation must add it.

---

### AsyncStorage Key Summary

| Key | Owner | Shape |
|-----|-------|-------|
| `earnings_history_v1` | `useEarningsHistory` | `Record<string, number>` (existing, unchanged) |
| `ai_cache` | `useAIData` | `Record<string, TagData \| string>` (existing, unchanged) |
| `previousWeekAIPercent` | `useAIData` | `string` (number serialized, existing, unchanged) |
| `weekly_history_v2` | `weeklyHistory.ts` | `WeeklySnapshot[]` (new) |
