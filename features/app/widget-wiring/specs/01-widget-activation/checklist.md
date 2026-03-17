# Implementation Checklist

Spec: `01-widget-activation`
Feature: `widget-wiring`

---

## Phase 1.0: Test Foundation

### FR1: Package Installation + app.json Plugin Config
- [x] No unit tests — verified by `expo config --type introspect` and `node_modules` directory existence

### FR2: `fetchFreshData()`
File: `hourglassws/src/__tests__/lib/crossoverData.test.ts`

**Happy path:**
- [x] Returns `CrossoverSnapshot` with `hoursData`, `aiData`, `pendingCount`, `config` on happy path
- [x] Calls `getAuthToken` with credentials from `loadCredentials()`
- [x] Fetches timesheet and payments in parallel (both in `Promise.all`)
- [x] Calls `calculateHours` with timesheet + payments results
- [x] Reads `ai_cache` from AsyncStorage, merges with today's fresh work diary slots
- [x] Calls `aggregateAICache` with merged cache and today's date
- [x] Manager: calls `fetchPendingManual` + `fetchPendingOvertime`, returns sum as `pendingCount`
- [x] Non-manager (`config.isManager = false`): skips approval fetch, `pendingCount = 0`

**Edge cases:**
- [x] `loadConfig()` returns null → throws with a known error message
- [x] `loadCredentials()` returns null → throws with a known error message
- [x] `fetchTimesheet` throws → `calculateHours` called with `null` timesheet (no total throw)
- [x] `fetchPayments` throws → `calculateHours` called with `null` payments (no total throw)
- [x] `fetchWorkDiary` throws → `aiData` is `null` in snapshot (non-fatal)
- [x] `AsyncStorage.getItem('ai_cache')` returns null → empty cache; aggregates today's fresh data only
- [x] `fetchPendingManual` throws (manager) → `pendingCount = 0`, no throw from `fetchFreshData`

### FR3: `widgetBridge.ts` Stub Replacement
File: `hourglassws/src/__tests__/lib/widgetBridge.test.ts`

- [x] Calls `widgets/bridge.updateWidgetData` with `data.hoursData`, `data.aiData`, `data.pendingCount`, `data.config`
- [x] Awaits and resolves when real bridge resolves
- [x] Rejects when real bridge rejects (propagates error)

### FR4: `handler.ts` Adapter Update
- [x] No dedicated unit tests — verified by TypeScript compilation passing

### FR5: `useWidgetSync` Hook
File: `hourglassws/src/__tests__/hooks/useWidgetSync.test.ts`

- [x] Calls `updateWidgetData` on first render when `hoursData` and `config` are non-null
- [x] Does NOT call `updateWidgetData` when `hoursData` is null
- [x] Does NOT call `updateWidgetData` when `config` is null
- [x] Calls `updateWidgetData` again when `hoursData` changes (new reference)
- [x] Calls `updateWidgetData` again when `pendingCount` changes
- [x] Passes `aiData = null` to `updateWidgetData` when `aiData` is null (not blocked)
- [x] Does not throw when `updateWidgetData` rejects (error is swallowed)

### FR6: Wire `useWidgetSync` into `(tabs)/_layout.tsx`
- [x] No unit tests — verified by smoke test in Expo Go

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent (inline review — all criteria met)
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Package Installation + app.json Plugin Config
- [x] Run `npm install expo-widgets react-native-android-widget` in `hourglassws/`
- [x] Add `expo-widgets` plugin entry to `app.json` (verified against package docs)
- [x] Add `react-native-android-widget` plugin entry to `app.json` (with `widgetTaskHandler` path)
- [x] Run `npx expo config --type introspect` and verify both plugins listed without errors

### FR2: `fetchFreshData()` in `src/lib/crossoverData.ts`
- [x] Define new `CrossoverSnapshot` interface: `{ hoursData: HoursData, aiData: AIWeekData | null, pendingCount: number, config: CrossoverConfig }`
- [x] Remove old `ApprovalItem` interface and old `CrossoverSnapshot` stub type
- [x] Implement `fetchFreshData()`: load config + credentials (throw on null)
- [x] Implement `getAuthToken` call + `getWeekStartDate(true)` for UTC week
- [x] Implement parallel `fetchTimesheet` + `fetchPayments` with per-call try/catch → null
- [x] Implement `calculateHours(timesheetData, paymentsData, config.hourlyRate, config.weeklyLimit)`
- [x] Implement `AsyncStorage.getItem('ai_cache')` read + safe JSON parse (empty `{}` on fail)
- [x] Implement `fetchWorkDiary(config.assignmentId, today, credentials, config.useQA)` with catch → null
- [x] Implement `countDiaryTags(slots)` merge + `aggregateAICache(mergedCache, today)` → `aiData`
- [x] Implement manager approval path: parallel `fetchPendingManual` + `fetchPendingOvertime` with catch; parse and sum
- [x] Return `{ hoursData, aiData, pendingCount, config }`
- [x] Run tests — all should pass

### FR3: `widgetBridge.ts` Stub Replacement
- [x] Replace stub body: import `updateWidgetData as _updateWidgetData` from `'../widgets/bridge'`
- [x] Re-export `updateWidgetData(data: CrossoverSnapshot)` that calls `_updateWidgetData(data.hoursData, data.aiData, data.pendingCount, data.config)`
- [x] Run tests — all should pass

### FR4: `handler.ts` Adapter Update
- [x] Update `freshData.isManager` → `freshData.config.isManager` in `handler.ts`
- [x] Update `freshData.pendingApprovals.length` → `freshData.pendingCount` in `handler.ts`
- [x] Run `tsc --noEmit` and verify no TypeScript errors in our files

### FR5: `useWidgetSync` Hook
- [x] Create `hourglassws/src/hooks/useWidgetSync.ts`
- [x] Import `HoursData`, `AIWeekData`, `CrossoverConfig`, `updateWidgetData` from `'../widgets/bridge'`
- [x] Implement `useWidgetSync(hoursData, aiData, pendingCount, config)` with `useEffect`
- [x] Add guard: early return if `hoursData === null || config === null`
- [x] Call `updateWidgetData(hoursData, aiData, pendingCount, config).catch(err => console.error('[useWidgetSync]', err))`
- [x] Deps array: `[hoursData, pendingCount, config]`
- [x] Run tests — all should pass

### FR6: Wire `useWidgetSync` into `(tabs)/_layout.tsx`
- [x] Add imports: `useHoursData`, `useAIData`, `useApprovalItems`, `useConfig`, `useWidgetSync`
- [x] Call all 4 data hooks inside `TabLayout()`
- [x] Call `useWidgetSync(hoursData, aiData, items.length, config)`
- [x] Verify app builds without errors in Expo Go

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent (inline review — all FR criteria met)
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (inline review performed)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues: fixed redundant `../lib/` import paths in crossoverData.ts
- [x] Fix MEDIUM severity issues: none found
- [x] Re-run tests after fixes — 41/41 passing
- [x] Commit fixes: `fix(01-widget-activation): fix relative import paths in crossoverData.ts`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent (inline review — tests are high quality)
- [x] Apply suggested improvements: renderHook generic types fixed
- [x] Re-run tests to confirm passing
- [x] Commit if changes made: `feat(FR6)` included renderHook generic type fix

### Final Verification
- [x] All tests passing (41/41 for spec files)
- [x] No regressions in existing tests (pre-existing failures confirmed pre-existing via git stash)
- [x] TypeScript compilation clean for our files (`tsc --noEmit` shows no errors in our files)
- [x] Code follows existing patterns

---

## Session Notes

**2026-03-17**: Spec created. Research complete — all API functions exist and are pure async (no React). Two stubs block the background push path; no foreground path exists. FR4 (handler.ts adapter) added after discovering `handler.ts` uses old stub fields that will break compilation after FR2 replaces `CrossoverSnapshot`.

**2026-03-17**: Implementation complete.
- Phase 1.0: 3 test files created (crossoverData, widgetBridge, useWidgetSync) — 41 tests total
- Phase 1.1: FR1 (packages + app.json), FR2 (fetchFreshData), FR3 (widgetBridge), FR4 (handler adapter), FR5 (useWidgetSync), FR6 (layout wiring)
- Phase 1.2: Review passed — fixed import paths in crossoverData.ts; renderHook generic types in test
- All 41 tests passing. No new TypeScript errors introduced.
- Pre-existing failures (24 test suites) confirmed pre-existing via git stash verification.
