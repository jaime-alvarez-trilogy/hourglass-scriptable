# Spec Research: 11-app-data-layer

## Problem Context

WorkSmart automatically classifies each 10-minute slot as AI or non-AI based on text patterns and app heuristics. The raw `events[]` array inside each `WorkDiarySlot` contains `processName` (the app), but the current codebase discards it immediately after `countDiaryTags()` extracts the tag counts. This spec captures that data before discard and stores it in a new `ai_app_history` AsyncStorage cache covering the current week and up to 11 past weeks.

## Exploration Findings

### WorkDiarySlot (src/types/api.ts)
Current type is missing `events[]`:
```typescript
export interface WorkDiarySlot {
  tags: string[];
  autoTracker: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  memo: string;
  actions: Array<{...}>;
  // events[] is present in API response but not typed
}
```
The test script `tools/test-ai-tag-analysis.js` confirms:
```js
slot.events.forEach(ev => appsInSlot.add(ev.processName || 'unknown'));
```
Each event has: `processName: string`, `idle: boolean`, `activity: string` (e.g. "AI", "PURE_AI", "OTHER").

### countDiaryTags (src/lib/ai.ts:81)
Pure function: `(slots: WorkDiarySlot[]) → TagData`. Iterates slots, counts tag occurrences, **discards all other fields**. Called by:
- `useAIData.ts:213` (current week, per day)
- `useHistoryBackfill.ts:138` (past 11 weeks, per day)

### useAIData (src/hooks/useAIData.ts)
- Loads `ai_cache` from AsyncStorage (per-day `TagData` keyed by date)
- Fetches only stale/missing days via `fetchWorkDiary`
- Calls `countDiaryTags(slots)` and discards `slots`
- Saves updated `TagData` map to `ai_cache`
- Insert point: lines 212–219 — between `fetchWorkDiary` and `countDiaryTags` discard

### useHistoryBackfill (src/hooks/useHistoryBackfill.ts)
- Processes up to 11 past weeks sequentially (300ms pause between weeks)
- Each week: 7 days in parallel via `Promise.allSettled`
- Same pattern: `countDiaryTags(result.value)` then discards raw slots
- Insert point: lines 133–138 — after `Promise.allSettled`, before `computeWeekAI`

### AsyncStorage keys (existing)
- `ai_cache`: `Record<date, TagData>` — current week tag counts
- `weekly_history_v2`: `WeeklySnapshot[]` — 12-week rollup (hours, earnings, aiPct, brainliftHours)

### Storage design decision
Do NOT add `appBreakdown` to `WeeklySnapshot` — that type is shared across earnings history, AI backfill, and overview. A separate key `ai_app_history` keeps concerns isolated and avoids migration risk.

## Key Decisions

1. **New function `extractAppBreakdown(slots)`** — pure, separate from `countDiaryTags`. Takes same `WorkDiarySlot[]`, returns `AppBreakdownEntry[]`. Callers run both functions on the same slots.

2. **Weekly granularity** — App breakdown is stored per-week (keyed by Monday), not per-day. Per-day would 7x the storage and add UI complexity with no clear benefit.

3. **Slot-level attribution** — For each slot, get the **unique set** of app names from `events[]`, then increment either `aiSlots` or `nonAiSlots` for each app. This avoids double-counting within a slot while still crediting all apps present.

4. **Merge by accumulation** — `extractAppBreakdown` returns entries for one batch of slots. `mergeAppBreakdown(existing, additions)` accumulates across multiple days to build the week total.

5. **Zero API calls added** — `useAIData` and `useHistoryBackfill` already fetch the data; no schedule or TTL needed. App data freshness matches AI% freshness naturally.

## Interface Contracts

### WorkDiaryEvent (NEW — src/types/api.ts)
```typescript
export interface WorkDiaryEvent {
  processName: string;  // ← slot.events[n].processName (app name)
  idle: boolean;        // ← slot.events[n].idle
  activity: string;     // ← slot.events[n].activity ("AI" | "PURE_AI" | "OTHER")
}
```
Source: `GET /api/timetracking/workdiaries` → `slot.events[]`

### WorkDiarySlot (EXTENDED — src/types/api.ts)
```typescript
export interface WorkDiarySlot {
  tags: string[];
  autoTracker: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  memo: string;
  actions: Array<{...}>;
  events?: WorkDiaryEvent[];  // ← NEW: optional (manual slots may omit)
}
```

### AppBreakdownEntry (NEW — src/lib/aiAppBreakdown.ts)
```typescript
export interface AppBreakdownEntry {
  appName: string;        // ← slot.events[n].processName
  aiSlots: number;        // ← slots with (ai_usage|second_brain) tag containing this app
  brainliftSlots: number; // ← slots with second_brain tag (subset of aiSlots)
  nonAiSlots: number;     // ← slots without any AI tag containing this app
}
```
Note: `brainliftSlots` is a strict subset of `aiSlots`. A slot tagged `second_brain` is counted in both.

### extractAppBreakdown (NEW — src/lib/aiAppBreakdown.ts)
```typescript
export function extractAppBreakdown(slots: WorkDiarySlot[]): AppBreakdownEntry[]
```
- For each slot: if `events` is absent or empty → skip
- Collect unique `processName` values from `slot.events[]` (filter falsy)
- Check AI tag: `hasAi = slot.tags.includes('ai_usage') || slot.tags.includes('second_brain')`
- Check BrainLift tag: `hasSb = slot.tags.includes('second_brain')`
- Increment `aiSlots` (if hasAi) and/or `brainliftSlots` (if hasSb) and/or `nonAiSlots` (if !hasAi) for each unique app
- Return array sorted by `(aiSlots + nonAiSlots)` descending
- Pure function, no side effects

### mergeAppBreakdown (NEW — src/lib/aiAppBreakdown.ts)
```typescript
export function mergeAppBreakdown(
  existing: AppBreakdownEntry[],
  additions: AppBreakdownEntry[],
): AppBreakdownEntry[]
```
- Merges two app breakdown arrays by summing slot counts for matching `appName`
- Appends new apps not present in `existing`
- Returns sorted by `(aiSlots + nonAiSlots)` descending

### loadAppHistory / saveAppHistory (NEW — src/lib/aiAppBreakdown.ts)
```typescript
export const APP_HISTORY_KEY = 'ai_app_history';
export type AppHistoryCache = Record<string, AppBreakdownEntry[]>;
// key = weekStart (Monday YYYY-MM-DD)

export async function loadAppHistory(): Promise<AppHistoryCache>
// Returns {} on missing key, invalid JSON, or any error. Never throws.

export async function saveAppHistory(cache: AppHistoryCache): Promise<void>
// Writes to AsyncStorage. Propagates errors.
```

### useAppBreakdown (NEW — src/hooks/useAppBreakdown.ts)
```typescript
export interface AppBreakdownResult {
  currentWeek: AppBreakdownEntry[];      // ← ai_app_history[currentMonday]
  aggregated12w: AppBreakdownEntry[];    // ← sum across all 12 weeks (aiSlots, brainliftSlots, nonAiSlots)
  isReady: boolean;                      // ← false until AsyncStorage load completes
}
export function useAppBreakdown(): AppBreakdownResult
```
- Reads `ai_app_history` from AsyncStorage on mount
- Subscribes to updates (listens for `ai_app_history` changes via event emitter or re-read)
- Derives `aggregated12w` by merging all weeks in the cache
- No API calls

### Changes to useAIData
In the `Promise.all` result loop (lines 217–219):
- Also call `extractAppBreakdown(slots)` for each day
- After the loop, merge per-day entries into a weekly total
- Load existing `ai_app_history`, update current week entry, save back

### Changes to useHistoryBackfill
In the per-week `Promise.allSettled` result loop (lines 135–138):
- Also call `extractAppBreakdown(result.value)` for each fulfilled day
- Merge into weekly total
- Load existing `ai_app_history`, update that week's entry, save back

## Test Plan

### extractAppBreakdown
**Signature:** `(slots: WorkDiarySlot[]) → AppBreakdownEntry[]`

**Happy Path:**
- [ ] Slots with ai_usage tag: apps go into aiSlots
- [ ] Slots without AI tags: apps go into nonAiSlots
- [ ] Slot with second_brain tag: apps go into aiSlots (same bucket)
- [ ] Multiple apps in one slot: each app gets +1 in same bucket (no double-count within slot)
- [ ] Returns sorted by total slots descending

**Edge Cases:**
- [ ] Empty slots array → returns `[]`
- [ ] Slot with no events field → slot is skipped (no app data)
- [ ] Slot with empty events array → slot is skipped
- [ ] Event with empty processName → filtered out
- [ ] Same app in AI and non-AI slots → separate aiSlots and nonAiSlots (not merged)
- [ ] All slots have no events → returns `[]`

**Mocks Needed:**
- None (pure function, no I/O)

### mergeAppBreakdown
**Signature:** `(existing, additions) → AppBreakdownEntry[]`

**Happy Path:**
- [ ] Merges matching appName entries by summing aiSlots and nonAiSlots
- [ ] Appends new apps not in existing
- [ ] Returns sorted by total desc

**Edge Cases:**
- [ ] Empty existing + non-empty additions → returns additions sorted
- [ ] Non-empty existing + empty additions → returns existing sorted
- [ ] Both empty → returns `[]`
- [ ] Does not mutate input arrays

### loadAppHistory
- [ ] Missing AsyncStorage key → returns `{}`
- [ ] Valid JSON → returns parsed object
- [ ] Invalid JSON → returns `{}`
- [ ] AsyncStorage error → returns `{}`

### saveAppHistory
- [ ] Writes JSON string to AsyncStorage under `ai_app_history`
- [ ] Propagates AsyncStorage write errors

### useAIData integration
- [ ] After fetching work diary, saves app breakdown for current week to `ai_app_history`
- [ ] App breakdown is merged (not replaced) if week already has partial data

### useHistoryBackfill integration
- [ ] After backfilling each past week, saves app breakdown to `ai_app_history`
- [ ] Does not add extra API calls (uses already-fetched slots)

## Files to Reference

- `hourglassws/src/types/api.ts` — WorkDiarySlot type to extend
- `hourglassws/src/lib/ai.ts` — countDiaryTags pattern to follow for extractAppBreakdown
- `hourglassws/src/hooks/useAIData.ts:204–219` — insert point for current-week app extraction
- `hourglassws/src/hooks/useHistoryBackfill.ts:124–149` — insert point for backfill app extraction
- `hourglassws/src/lib/weeklyHistory.ts` — pattern for AsyncStorage helpers (load/save/merge)
- `tools/test-ai-tag-analysis.js:72–83` — confirms events[].processName field shape
