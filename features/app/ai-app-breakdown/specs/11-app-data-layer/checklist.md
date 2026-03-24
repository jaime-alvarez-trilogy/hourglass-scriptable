# Implementation Checklist

Spec: `11-app-data-layer`
Feature: `ai-app-breakdown`

---

## Phase 1.0: Test Foundation

### FR1: Extend WorkDiarySlot Type
- [x] Verify `WorkDiaryEvent` interface compiles with correct field types (`processName: string`, `idle: boolean`, `activity: string`)
- [x] Verify `WorkDiarySlot.events?: WorkDiaryEvent[]` is optional and does not break existing consumers

### FR2: extractAppBreakdown
- [x] Test: slots with `ai_usage` tag → apps go into `aiSlots`, not `nonAiSlots`
- [x] Test: slots with `second_brain` tag → apps go into both `aiSlots` and `brainliftSlots`
- [x] Test: slots with no AI tag → apps go into `nonAiSlots` only
- [x] Test: multiple unique apps in one slot → each app gets +1 independently (no double-count)
- [x] Test: same app in AI and non-AI slots → `aiSlots` and `nonAiSlots` accumulate correctly
- [x] Test: output sorted by `(aiSlots + nonAiSlots)` descending
- [x] Test: empty slots array → returns `[]`
- [x] Test: slot with no `events` field → skipped
- [x] Test: slot with empty `events` array → skipped
- [x] Test: event with empty/falsy `processName` → filtered out
- [x] Test: all slots have no events → returns `[]`

### FR3: mergeAppBreakdown
- [x] Test: matching `appName` entries → `aiSlots`, `brainliftSlots`, `nonAiSlots` all summed
- [x] Test: new apps in `additions` not in `existing` → appended
- [x] Test: output sorted by total slots descending
- [x] Test: empty `existing` + non-empty `additions` → returns `additions` sorted
- [x] Test: non-empty `existing` + empty `additions` → returns `existing` sorted
- [x] Test: both empty → returns `[]`
- [x] Test: input arrays not mutated

### FR4: loadAppHistory / saveAppHistory
- [x] Test: `loadAppHistory` — missing key → returns `{}`
- [x] Test: `loadAppHistory` — valid JSON → returns parsed object
- [x] Test: `loadAppHistory` — invalid JSON → returns `{}`
- [x] Test: `loadAppHistory` — AsyncStorage error → returns `{}`
- [x] Test: `saveAppHistory` — writes JSON to `APP_HISTORY_KEY`
- [x] Test: `saveAppHistory` — propagates AsyncStorage write errors

### FR5: useAIData Integration
- [x] Test: after fetch, `AsyncStorage.setItem` called with `ai_app_history` key containing current week breakdown
- [x] Test: existing week data is merged (not replaced) when key already present

### FR6: useHistoryBackfill Integration
- [x] Test: after backfill, `ai_app_history[weekMonday]` is populated for each past week processed
- [x] Test: write failure does not affect `weekly_history_v2` backfill result

### FR7: useAppBreakdown Hook
- [x] Test: `isReady` is `false` before AsyncStorage resolves
- [x] Test: `isReady` is `true` after load completes (cache populated)
- [x] Test: `isReady` is `true` after load completes (cache empty)
- [x] Test: `currentWeek` returns `cache[currentMonday]` when present
- [x] Test: `currentWeek` returns `[]` when key absent
- [x] Test: `aggregated12w` merges all weeks in cache
- [x] Test: `aggregated12w` returns `[]` on empty cache
- [x] Test: AsyncStorage load error → `isReady: true`, both arrays empty

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts (slot with events array, processName strings)
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Extend WorkDiarySlot Type
- [x] Add `WorkDiaryEvent` interface to `hourglassws/src/types/api.ts`
- [x] Add `events?: WorkDiaryEvent[]` to `WorkDiarySlot` interface

### FR2: extractAppBreakdown
- [x] Create `hourglassws/src/lib/aiAppBreakdown.ts`
- [x] Define `AppBreakdownEntry` interface
- [x] Implement `extractAppBreakdown(slots)` — unique-app-per-slot logic, sorted output
- [x] Export function and interface

### FR3: mergeAppBreakdown
- [x] Implement `mergeAppBreakdown(existing, additions)` in `aiAppBreakdown.ts`
- [x] Map-based merge by `appName`, sum all three fields, sorted output
- [x] No mutation of input arrays

### FR4: AsyncStorage Helpers
- [x] Export `APP_HISTORY_KEY = 'ai_app_history'`
- [x] Export `AppHistoryCache` type
- [x] Implement `loadAppHistory()` — never throws, returns `{}` on all error paths
- [x] Implement `saveAppHistory(cache)` — propagates errors

### FR5: useAIData Integration
- [x] Extend `Promise.all` result shape to include raw `slots` alongside `tagData`
- [x] After the merge loop, compute weekly breakdown via `extractAppBreakdown` + `mergeAppBreakdown`
- [x] Fire-and-forget: load, merge, save `ai_app_history[currentMonday]`
- [x] Verify write failure path is silently caught

### FR6: useHistoryBackfill Integration
- [x] Add parallel `slotsData: Record<string, WorkDiarySlot[]>` in the weekly loop
- [x] Populate `slotsData[dates[i]]` for fulfilled results
- [x] After `saveWeeklyHistory`, fire-and-forget app breakdown write for that week
- [x] Verify write failure path is silently caught

### FR7: useAppBreakdown Hook
- [x] Create `hourglassws/src/hooks/useAppBreakdown.ts`
- [x] Define `AppBreakdownResult` interface
- [x] Implement `useAppBreakdown()` — load on mount, derive `currentWeek` and `aggregated12w`
- [x] Graceful degradation: load error → empty arrays, `isReady: true`
- [x] Compute `currentMonday` in local timezone using `getMondayOfWeek`

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation (`AppBreakdownEntry`, `AppHistoryCache`, `AppBreakdownResult`)
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (manual review performed — skill unavailable)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (none found)
- [x] Fix MEDIUM severity issues (none found)
- [x] Re-run tests after fixes
- [x] Commit fixes: N/A

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests (manual review performed)
- [x] Apply suggested improvements that strengthen confidence
- [x] Re-run tests to confirm passing
- [x] Commit if changes made: N/A

### Final Verification
- [x] All tests passing (68/68)
- [x] No regressions in existing tests
- [x] TypeScript compilation clean (no new errors)
- [x] Code follows existing patterns (`countDiaryTags` style for pure fn, `loadWeeklyHistory` style for helpers)

---

## Session Notes

**2026-03-23**: Implementation complete.
- Phase 1.0: 1 commit — test(FR1-FR7): 68 tests across 4 test files + 1 fix commit for static import constraint
- Phase 1.1: 5 commits — feat(FR1), feat(FR2-FR4), feat(FR5), feat(FR6), feat(FR7)
- Phase 1.2: Review passed, 0 fix commits needed
- All 68 tests passing, no regressions in existing passing tests
- Pre-existing failures in useAIData.test.ts SC4.5 and useWeeklyHistory.test.ts SC4.3 confirmed pre-existing (not caused by this spec)
