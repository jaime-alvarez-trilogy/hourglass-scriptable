# Implementation Checklist

Spec: `04-ai-brainlift`
Feature: `hourglass-expo`

---

## Phase 4.0: Tests

### FR1: WorkDiarySlot Type
- [x] Write test: `WorkDiarySlot` is exported from `src/types/api.ts` (compile-time, verified via tsc)
- [x] Write test: `tags` is `string[]` — slot with non-string tag causes type error
- [x] Write test: `status` union rejects `'UNKNOWN'` at compile time

### FR3: countDiaryTags
- [x] Write test: given 4 mixed slots (ai_usage, second_brain, empty, both) → `total=4, aiUsage=3, secondBrain=2, noTags=1`
- [x] Write test: slot with only `ai_usage` → `aiUsage=1, secondBrain=0`
- [x] Write test: slot with only `second_brain` → `aiUsage=1, secondBrain=1`
- [x] Write test: slot with BOTH `ai_usage` AND `second_brain` → counted once in `aiUsage`
- [x] Write test: slot with `tags: ['not_second_brain']` → `aiUsage=0, secondBrain=0, noTags=0`
- [x] Write test: slot with `tags: ['AI_USAGE']` (uppercase) → `aiUsage=0` (case-sensitive)
- [x] Write test: slot with `tags: []` → `noTags=1`
- [x] Write test: empty slots array → all fields zero

### FR4: aggregateAICache
- [x] Write test: only processes Mon–today; pre-Monday date excluded from aggregation
- [x] Write test: future date (tomorrow) excluded from aggregation
- [x] Write test: `taggedSlots = totalSlots - totalNoTags` (not totalSlots)
- [x] Write test: `brainliftHours` for 30 second_brain slots = `5.0`
- [x] Write test: `aiPctLow` clamped at 0 when raw value would be negative
- [x] Write test: `aiPctHigh` clamped at 100 when raw value would exceed 100
- [x] Write test: empty cache → `{ aiPctLow:0, aiPctHigh:0, brainliftHours:0, totalSlots:0, taggedSlots:0, workdaysElapsed:0, dailyBreakdown:[] }`
- [x] Write test: `taggedSlots === 0` → no division by zero (aiPct = 0)
- [x] Write test: `workdaysElapsed` counts only days with `total > 0`
- [x] Write test: `isToday` is `true` only for today's `DailyTagData` entry
- [x] Write test: AI% formula: 24 aiUsage / 27 taggedSlots ≈ 88.9% → `aiPctLow=87, aiPctHigh=91`

### FR5: shouldRefetchDay
- [x] Write test: returns `true` when `cached === undefined`
- [x] Write test: returns `true` when `cached.total === 0`
- [x] Write test: returns `true` when `isToday === true`, regardless of cached value
- [x] Write test: returns `false` when `isToday === false` and `cached.total > 0`
- [x] Write test: does not throw on `undefined` cached argument

### FR6: fetchWorkDiary
- [x] Write test: calls `getAuthToken` then `apiGet` with correct path `/api/timetracking/workdiaries`
- [x] Write test: passes `assignmentId` param (NOT userId)
- [x] Write test: passes `date` as-is (YYYY-MM-DD format)
- [x] Write test: returns typed `WorkDiarySlot[]` from mock response
- [x] Write test: `AuthError` from `getAuthToken` propagates to caller
- [x] Write test: `AuthError` from `apiGet` propagates to caller

### FR7: AI Cache — AsyncStorage
- [x] Write test: cache key is exactly `'ai_cache'`
- [x] Write test: `_lastFetchedAt` is updated after successful fetch batch
- [x] Write test: entries outside Mon–Sun window are pruned on load
- [x] Write test: entries inside Mon–Sun window are preserved on prune
- [x] Write test: cache survives serialize/deserialize round-trip (deep equal)

### FR8: useAIData Hook
- [x] Write test: returns `{ data: null }` when config is null
- [x] Write test: `data` is populated from AsyncStorage cache before API calls complete
- [x] Write test: `error` is `'auth'` when `fetchWorkDiary` throws `AuthError`
- [x] Write test: `error` is `'network'` when `fetchWorkDiary` throws `NetworkError`
- [x] Write test: `refetch()` triggers a fresh data load
- [x] Write test: `lastFetchedAt` reflects `cache._lastFetchedAt`

---

## Test Design Validation (MANDATORY)

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 4.1: Implementation

### FR1: WorkDiarySlot Type
- [x] Add `WorkDiarySlot` interface to `src/types/api.ts`
- [x] Remove the empty `export {}` stub
- [x] Verify `tsc --noEmit` passes after addition

### FR2: TagData and AI Types
- [x] Add `TagData`, `AIWeekData`, `DailyTagData` interfaces to `src/lib/ai.ts`
- [x] Verify TypeScript rejects `string` assigned to `TagData.total`

### FR3: countDiaryTags
- [x] Create `src/lib/ai.ts`
- [x] Implement `countDiaryTags(slots: WorkDiarySlot[]): TagData`
- [x] Use `tags.includes('second_brain')` (NOT substring match)
- [x] Union logic: `tags.includes('ai_usage') || tags.includes('second_brain')` for aiUsage
- [x] Run FR3 tests → all pass

### FR4: aggregateAICache
- [x] Implement `getMondayOfWeek(today: string): string` helper (local timezone, not UTC)
- [x] Implement `aggregateAICache(cache: Record<string, TagData>, today: string): AIWeekData`
- [x] Apply AI% formula with `Math.max(0, ...)` and `Math.min(100, ...)` clamping
- [x] Build `dailyBreakdown` array with `isToday` computed
- [x] Run FR4 tests → all pass

### FR5: shouldRefetchDay
- [x] Implement `shouldRefetchDay(date: string, cached: TagData | undefined, isToday: boolean): boolean`
- [x] Run FR5 tests → all pass

### FR6: fetchWorkDiary
- [x] Create `src/api/workDiary.ts`
- [x] Import `getAuthToken`, `apiGet` from `../api/client`
- [x] Import `Credentials` from `../types/config`
- [x] Import `WorkDiarySlot` from `../types/api`
- [x] Implement `fetchWorkDiary` — no try/catch (errors propagate)
- [x] Run FR6 tests → all pass

### FR7 + FR8: useAIData Hook
- [x] Create `src/hooks/useAIData.ts`
- [x] Implement `pruneToCurrentWeek(raw, today)` helper
- [x] Load cache from AsyncStorage on mount
- [x] Immediate `aggregateAICache` call for instant display
- [x] `shouldRefetchDay` evaluation for each Mon–today
- [x] `Promise.all` parallel fetches for stale days
- [x] Merge and save updated cache
- [x] Error handling: `AuthError` → `error='auth'`, `NetworkError` → `error='network'`
- [x] `refetch()` implementation
- [x] Guard: return safe default when `config === null`
- [x] Run FR7+FR8 tests → all pass

### FR9: AI Screen
- [x] Create `src/components/AIProgressBar.tsx` — progress bar with optional target line
- [x] Create `src/components/DailyAIRow.tsx` — daily breakdown row component
- [x] Create `app/(tabs)/ai.tsx`
- [x] AI% card with `{aiPctLow}%–{aiPctHigh}%` and progress bar
- [x] BrainLift card with `{brainliftHours.toFixed(1)}h / 5h` and progress bar
- [x] Daily breakdown ScrollView with Mon–today rows
- [x] Legend section
- [x] Pull-to-refresh (`RefreshControl` calling `refetch()`)
- [x] Empty state when `data === null`
- [x] Auth error state with re-login prompt
- [x] Network error state with retry message

### FR10: Tab Registration
- [x] Modify `app/(tabs)/_layout.tsx` — add AI tab with `sparkles` icon and "AI" label
- [x] Verify existing tabs (index, explore) still render correctly
- [x] Verify no TypeScript errors in `_layout.tsx`

### Integration Verification
- [x] Run full test suite: 53 new tests pass, no regressions
- [x] Run `tsc --noEmit` — zero new TypeScript errors (pre-existing server/ errors unchanged)

---

## Phase 4.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No HIGH issues found

### Step 1: Comprehensive PR Review
- [x] Manual review performed (pr-review-toolkit skill not available)
- [x] Security: no hardcoded credentials, SecureStore usage correct
- [x] Correctness: exact tag match, no division-by-zero, local timezone
- [x] TypeScript: all types clean, no casts to `any` in production code

### Step 2: Address Feedback
- [x] No HIGH severity issues to fix
- [x] Minor: React act() warning in hook tests (cosmetic, non-blocking)

### Step 3: Test Quality Optimization
- [x] 53 tests across 3 files, all passing
- [x] Critical cases covered: not_second_brain exact match, AI% clamp, div/0 guard

### Step 4: Simulator Smoke Test
- [ ] Run `npx expo start` and launch on iOS Simulator (pending user execution)
- [ ] Navigate to AI tab — renders without crash
- [ ] Pull-to-refresh triggers data load

### Final Verification
- [x] All 53 new tests passing
- [x] `tsc --noEmit` passes with zero new errors
- [x] No regressions in existing passing tests

---

## Session Notes

**2026-03-08**: Spec execution complete.
- Phase 4.0: 1 test commit (test(FR3-FR8)) — 53 tests, all red initially
- Phase 4.1: 1 implementation commit (feat(FR1-FR10)) — all 53 green
- Phase 4.2: Alignment check PASS, no issues to fix
- Test fix: removed fake timers from hook tests (incompatible with setTimeout-based flushAsync)
- Implementation note: `aiPctLow/High` clamped to 0 when taggedSlots===0 (not 0%±2%)
- Pre-existing failures: 9 test suites fail from other specs (not regressions)
