# Implementation Checklist

Spec: `01-widget-activation`
Feature: `widget-wiring`

---

## Phase 1.0: Test Foundation

### FR1: Package Installation + app.json Plugin Config
- [ ] No unit tests — verified by `expo config --type introspect` and `node_modules` directory existence

### FR2: `fetchFreshData()`
File: `hourglassws/src/__tests__/lib/crossoverData.test.ts`

**Happy path:**
- [ ] Returns `CrossoverSnapshot` with `hoursData`, `aiData`, `pendingCount`, `config` on happy path
- [ ] Calls `getAuthToken` with credentials from `loadCredentials()`
- [ ] Fetches timesheet and payments in parallel (both in `Promise.all`)
- [ ] Calls `calculateHours` with timesheet + payments results
- [ ] Reads `ai_cache` from AsyncStorage, merges with today's fresh work diary slots
- [ ] Calls `aggregateAICache` with merged cache and today's date
- [ ] Manager: calls `fetchPendingManual` + `fetchPendingOvertime`, returns sum as `pendingCount`
- [ ] Non-manager (`config.isManager = false`): skips approval fetch, `pendingCount = 0`

**Edge cases:**
- [ ] `loadConfig()` returns null → throws with a known error message
- [ ] `loadCredentials()` returns null → throws with a known error message
- [ ] `fetchTimesheet` throws → `calculateHours` called with `null` timesheet (no total throw)
- [ ] `fetchPayments` throws → `calculateHours` called with `null` payments (no total throw)
- [ ] `fetchWorkDiary` throws → `aiData` is `null` in snapshot (non-fatal)
- [ ] `AsyncStorage.getItem('ai_cache')` returns null → empty cache; aggregates today's fresh data only
- [ ] `fetchPendingManual` throws (manager) → `pendingCount = 0`, no throw from `fetchFreshData`

### FR3: `widgetBridge.ts` Stub Replacement
File: `hourglassws/src/__tests__/lib/widgetBridge.test.ts`

- [ ] Calls `widgets/bridge.updateWidgetData` with `data.hoursData`, `data.aiData`, `data.pendingCount`, `data.config`
- [ ] Awaits and resolves when real bridge resolves
- [ ] Rejects when real bridge rejects (propagates error)

### FR4: `handler.ts` Adapter Update
- [ ] No dedicated unit tests — verified by TypeScript compilation passing

### FR5: `useWidgetSync` Hook
File: `hourglassws/src/__tests__/hooks/useWidgetSync.test.ts`

- [ ] Calls `updateWidgetData` on first render when `hoursData` and `config` are non-null
- [ ] Does NOT call `updateWidgetData` when `hoursData` is null
- [ ] Does NOT call `updateWidgetData` when `config` is null
- [ ] Calls `updateWidgetData` again when `hoursData` changes (new reference)
- [ ] Calls `updateWidgetData` again when `pendingCount` changes
- [ ] Passes `aiData = null` to `updateWidgetData` when `aiData` is null (not blocked)
- [ ] Does not throw when `updateWidgetData` rejects (error is swallowed)

### FR6: Wire `useWidgetSync` into `(tabs)/_layout.tsx`
- [ ] No unit tests — verified by smoke test in Expo Go

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Package Installation + app.json Plugin Config
- [ ] Run `npm install expo-widgets react-native-android-widget` in `hourglassws/`
- [ ] Add `expo-widgets` plugin entry to `app.json` (verify exact options against package docs)
- [ ] Add `react-native-android-widget` plugin entry to `app.json` (with `widgetTaskHandler` path)
- [ ] Run `npx expo config --type introspect` and verify both plugins listed without errors

### FR2: `fetchFreshData()` in `src/lib/crossoverData.ts`
- [ ] Define new `CrossoverSnapshot` interface: `{ hoursData: HoursData, aiData: AIWeekData | null, pendingCount: number, config: CrossoverConfig }`
- [ ] Remove old `ApprovalItem` interface and old `CrossoverSnapshot` stub type
- [ ] Implement `fetchFreshData()`: load config + credentials (throw on null)
- [ ] Implement `getAuthToken` call + `getWeekStartDate(true)` for UTC week
- [ ] Implement parallel `fetchTimesheet` + `fetchPayments` with per-call try/catch → null
- [ ] Implement `calculateHours(timesheetData, paymentsData, config.hourlyRate, config.weeklyLimit)`
- [ ] Implement `AsyncStorage.getItem('ai_cache')` read + safe JSON parse (empty `{}` on fail)
- [ ] Implement `fetchWorkDiary(config.assignmentId, today, credentials, config.useQA)` with catch → null
- [ ] Implement `countDiaryTags(slots)` merge + `aggregateAICache(mergedCache, today)` → `aiData`
- [ ] Implement manager approval path: parallel `fetchPendingManual` + `fetchPendingOvertime` with catch; parse and sum
- [ ] Return `{ hoursData, aiData, pendingCount, config }`
- [ ] Run tests — all should pass

### FR3: `widgetBridge.ts` Stub Replacement
- [ ] Replace stub body: import `updateWidgetData as _updateWidgetData` from `'../widgets/bridge'`
- [ ] Re-export `updateWidgetData(data: CrossoverSnapshot)` that calls `_updateWidgetData(data.hoursData, data.aiData, data.pendingCount, data.config)`
- [ ] Run tests — all should pass

### FR4: `handler.ts` Adapter Update
- [ ] Update `freshData.isManager` → `freshData.config.isManager` in `handler.ts`
- [ ] Update `freshData.pendingApprovals.length` → `freshData.pendingCount` in `handler.ts`
- [ ] Run `tsc --noEmit` and verify no TypeScript errors

### FR5: `useWidgetSync` Hook
- [ ] Create `hourglassws/src/hooks/useWidgetSync.ts`
- [ ] Import `HoursData`, `AIWeekData`, `CrossoverConfig`, `updateWidgetData` from `'../widgets/bridge'`
- [ ] Implement `useWidgetSync(hoursData, aiData, pendingCount, config)` with `useEffect`
- [ ] Add guard: early return if `hoursData === null || config === null`
- [ ] Call `updateWidgetData(hoursData, aiData, pendingCount, config).catch(err => console.error('[useWidgetSync]', err))`
- [ ] Deps array: `[hoursData, pendingCount, config]`
- [ ] Run tests — all should pass

### FR6: Wire `useWidgetSync` into `(tabs)/_layout.tsx`
- [ ] Add imports: `useHoursData`, `useAIData`, `useApprovalItems`, `useConfig`, `useWidgetSync`
- [ ] Call all 4 data hooks inside `TabLayout()`
- [ ] Call `useWidgetSync(hoursData, aiData, items.length, config)`
- [ ] Verify app builds without errors in Expo Go

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(01-widget-activation): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-widget-activation): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] TypeScript compilation clean (`tsc --noEmit`)
- [ ] Code follows existing patterns (compare with `useHistoryBackfill` hook style)

---

## Session Notes

**2026-03-17**: Spec created. Research complete — all API functions exist and are pure async (no React). Two stubs block the background push path; no foreground path exists. FR4 (handler.ts adapter) added after discovering `handler.ts` uses old stub fields that will break compilation after FR2 replaces `CrossoverSnapshot`.
