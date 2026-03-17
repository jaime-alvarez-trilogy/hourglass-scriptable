# 01-widget-activation

**Status:** Draft
**Created:** 2026-03-17
**Last Updated:** 2026-03-17
**Owner:** @trilogy

---

## Overview

Widget activation wires the existing-but-inert widget code to live Crossover data. All widget UI (`src/widgets/bridge.ts`, iOS/Android widgets, task handler) was implemented in spec 06-widgets but never receives data because two stubs throw, the npm packages are not installed, and no foreground update path exists.

This spec activates widgets end-to-end by:

1. **Installing packages** (`expo-widgets`, `react-native-android-widget`) and restoring `app.json` plugin config, so widget components can compile and build
2. **Implementing `fetchFreshData()`** in `src/lib/crossoverData.ts` — a pure async function (no React) that authenticates from SecureStore, fetches timesheet + payments + work diary + approvals in parallel, and returns a `CrossoverSnapshot`
3. **Fixing `widgetBridge.ts`** — replacing the throwing stub with a thin wrapper that delegates to `widgets/bridge.updateWidgetData(hoursData, aiData, pendingCount, config)`
4. **Updating `handler.ts`** — adapting its post-fetch logic to the new `CrossoverSnapshot` shape (`config.isManager` / `pendingCount` instead of old stub fields `isManager` / `pendingApprovals.length`)
5. **Adding `useWidgetSync`** — a foreground hook that fires `updateWidgetData()` whenever `hoursData` and `config` become non-null, keeping widgets fresh on every app open
6. **Wiring `useWidgetSync`** into `app/(tabs)/_layout.tsx` alongside `useHistoryBackfill`

### Background refresh path (ping server → widget)

```
Ping server (Railway, every 15min)
  → silent push
  → handler.ts: handleBackgroundPush()
      → fetchFreshData()
           → loadConfig() + loadCredentials()
           → getAuthToken(username, password, useQA)
           → parallel: fetchTimesheet() + fetchPayments()
           → calculateHours(timesheetData, paymentsData, rate, limit)
           → read ai_cache [AsyncStorage] + fetchWorkDiary(today)
           → aggregateAICache(merged cache, today) → aiData
           → if isManager: fetchPendingManual() + fetchPendingOvertime()
           → returns CrossoverSnapshot { hoursData, aiData, pendingCount, config }
      → updateWidgetData(snapshot)  [lib/widgetBridge.ts — thin wrapper]
           → widgets/bridge.updateWidgetData(hoursData, aiData, pendingCount, config)
```

### Foreground refresh path (app open → widget)

```
User opens app
  → React hooks load in (tabs)/_layout.tsx
  → useWidgetSync(hoursData, aiData, pendingCount, config)
      → useEffect fires when hoursData + config non-null
      → widgets/bridge.updateWidgetData(hoursData, aiData, pendingCount, config)
      → widget refreshed
```

---

## Out of Scope

1. **Widget UI changes** — **Descoped.** All widget layouts (iOS HourglassWidget.tsx, Android HourglassWidget.tsx) are already implemented in spec 06-widgets. This spec does not touch display logic.

2. **Lock screen widget variants** — **Descoped.** Post-launch; separate spec needed when product decides on lock screen layout.

3. **Widget configuration UI** — **Descoped.** Post-launch; no user-visible widget settings in this spec.

4. **Writing to `ai_cache` from `fetchFreshData`** — **Descoped.** `fetchFreshData` reads the existing `ai_cache` key (written by React hooks) but does not write back to it. Separation of concerns: React hooks own the cache write path.

5. **Background fetch via iOS BGTaskScheduler** — **Descoped.** The ping server + silent push path already covers background refresh. Native BGTaskScheduler integration is a separate concern post-launch.

6. **Widget preview / debug screen** — **Descoped.** No in-app widget preview UI is in scope; smoke testing is done via AsyncStorage inspection in Expo Go.

---

## Functional Requirements

### FR1: Package Installation + app.json Plugin Config

Install `expo-widgets` and `react-native-android-widget` and restore the `app.json` plugin entries so widget components can compile.

**Success Criteria:**
- [ ] `expo-widgets` appears in `hourglassws/package.json` dependencies
- [ ] `react-native-android-widget` appears in `hourglassws/package.json` dependencies
- [ ] `app.json` contains an `expo-widgets` plugin entry referencing `src/widgets/ios/HourglassWidget`
- [ ] `app.json` contains a `react-native-android-widget` plugin entry referencing `src/widgets/android/widgetTaskHandler`
- [ ] `npx expo config --type introspect` shows both plugins without errors
- [ ] `node_modules/expo-widgets` and `node_modules/react-native-android-widget` directories exist

**No unit tests.** Verified by `expo config --type introspect` output and directory existence.

---

### FR2: `fetchFreshData()` in `src/lib/crossoverData.ts`

Replace the throwing stub with a full implementation that authenticates using on-device credentials, fetches Crossover API data, and returns a `CrossoverSnapshot`.

**Interface:**

```typescript
export interface CrossoverSnapshot {
  hoursData: HoursData;
  aiData: AIWeekData | null;
  pendingCount: number;      // pending approvals count (0 for contributors)
  config: CrossoverConfig;
}

export async function fetchFreshData(): Promise<CrossoverSnapshot>
```

**Implementation steps:**
1. `const config = await loadConfig()` — throw if null
2. `const credentials = await loadCredentials()` — throw if null
3. `const token = await getAuthToken(credentials.username, credentials.password, config.useQA)`
4. `const weekStart = getWeekStartDate(true)` (UTC)
5. `const [timesheetData, paymentsData] = await Promise.all([...])` — each wrapped in try/catch to null on failure
6. `const hoursData = calculateHours(timesheetData, paymentsData, config.hourlyRate, config.weeklyLimit)`
7. Fetch today's work diary via `fetchWorkDiary(config.assignmentId, today, credentials, config.useQA)` — catch to null
8. Read `ai_cache` from AsyncStorage — parse or empty object on failure
9. If slots non-null: merge today's `countDiaryTags(slots)` into cache, call `aggregateAICache(mergedCache, today)` → `aiData`; else `aiData = null`
10. If `config.isManager`: fetch approvals in parallel, parse and sum → `pendingCount`; else `pendingCount = 0`
11. Return `{ hoursData, aiData, pendingCount, config }`

**Success Criteria:**
- [ ] Returns `CrossoverSnapshot` with `hoursData`, `aiData`, `pendingCount`, `config` on happy path
- [ ] Calls `getAuthToken` with credentials from `loadCredentials()`
- [ ] Fetches timesheet and payments in parallel via `Promise.all`
- [ ] Calls `calculateHours` with timesheet + payments results
- [ ] Reads `ai_cache` from AsyncStorage, merges with today's fresh work diary slots
- [ ] Calls `aggregateAICache` with merged cache and today's date
- [ ] Manager: calls `fetchPendingManual` + `fetchPendingOvertime`, returns sum as `pendingCount`
- [ ] Non-manager (`config.isManager = false`): skips approval fetch, `pendingCount = 0`
- [ ] `loadConfig()` returns null → throws (with descriptive message)
- [ ] `loadCredentials()` returns null → throws (with descriptive message)
- [ ] `fetchTimesheet` throws → `calculateHours` called with `null` timesheet (non-fatal)
- [ ] `fetchPayments` throws → `calculateHours` called with `null` payments (non-fatal)
- [ ] `fetchWorkDiary` throws → `aiData = null` in snapshot (non-fatal)
- [ ] `AsyncStorage.getItem('ai_cache')` returns null → empty cache, aggregates today's fresh data only
- [ ] `fetchPendingManual` throws (manager) → `pendingCount = 0`, function does not throw

---

### FR3: `widgetBridge.ts` Stub Replacement

Replace the throwing stub with a thin wrapper that delegates to the real `widgets/bridge.updateWidgetData`.

**Interface:**

```typescript
import type { CrossoverSnapshot } from './crossoverData';

export async function updateWidgetData(data: CrossoverSnapshot): Promise<void>
// delegates to widgets/bridge.updateWidgetData(data.hoursData, data.aiData, data.pendingCount, data.config)
```

**Success Criteria:**
- [ ] Calls `widgets/bridge.updateWidgetData` with `data.hoursData`, `data.aiData`, `data.pendingCount`, `data.config`
- [ ] Awaits and resolves when the real bridge resolves
- [ ] Rejects when the real bridge rejects (error propagates)
- [ ] Does not duplicate widget logic (pure delegation, no data transform)

---

### FR4: `handler.ts` Adapter Update

`handler.ts` references old stub fields (`freshData.isManager`, `freshData.pendingApprovals.length`) that no longer exist in the new `CrossoverSnapshot`. Update to use `freshData.config.isManager` and `freshData.pendingCount`.

**Changes in `src/notifications/handler.ts`:**
- `freshData.isManager` → `freshData.config.isManager`
- `freshData.pendingApprovals.length` → `freshData.pendingCount`

**Success Criteria:**
- [ ] `handler.ts` compiles without TypeScript errors after `crossoverData.ts` is updated
- [ ] `handleBackgroundPush` correctly checks `freshData.config.isManager` for notification gating
- [ ] `newCount` is derived from `freshData.pendingCount` not a `.length` property

---

### FR5: `useWidgetSync` Hook

New hook at `src/hooks/useWidgetSync.ts` that calls `updateWidgetData` whenever foreground data is fresh.

**Interface:**

```typescript
import type { HoursData } from '../lib/hours';
import type { AIWeekData } from '../lib/ai';
import type { CrossoverConfig } from '../types/config';

export function useWidgetSync(
  hoursData: HoursData | null,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig | null
): void
```

**Implementation:**
- `useEffect` with deps `[hoursData, pendingCount, config]`
- Guard: if `hoursData === null || config === null` → return (no-op)
- Calls `updateWidgetData(hoursData, aiData, pendingCount, config)` from `src/widgets/bridge` directly
- Error handling: `.catch(err => console.error('[useWidgetSync]', err))`
- Returns `void`

**Success Criteria:**
- [ ] Calls `updateWidgetData` on first render when `hoursData` and `config` are non-null
- [ ] Does NOT call `updateWidgetData` when `hoursData` is null
- [ ] Does NOT call `updateWidgetData` when `config` is null
- [ ] Calls `updateWidgetData` again when `hoursData` changes (new reference)
- [ ] Calls `updateWidgetData` again when `pendingCount` changes
- [ ] Passes `aiData = null` to `updateWidgetData` when `aiData` is null (not blocked)
- [ ] Does not throw when `updateWidgetData` rejects (error is swallowed)

---

### FR6: Wire `useWidgetSync` into `(tabs)/_layout.tsx`

Call `useWidgetSync` in `app/(tabs)/_layout.tsx` using data from `useHoursData`, `useAIData`, `useApprovalItems`, and `useConfig`.

**Success Criteria:**
- [ ] `useWidgetSync` is called in `TabLayout` component
- [ ] `hoursData` sourced from `useHoursData().data`
- [ ] `aiData` sourced from `useAIData().data` (may be null)
- [ ] `pendingCount` sourced from `useApprovalItems().items.length`
- [ ] `config` sourced from `useConfig().config`
- [ ] No new prop drilling — all data obtained via hooks locally
- [ ] Smoke: `widget_data` AsyncStorage key written within 5s of app data loading in Expo Go

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/widgets/bridge.ts` | Real `updateWidgetData(hoursData, aiData, pendingCount, config)` — do not modify |
| `hourglassws/src/widgets/types.ts` | `WidgetData` interface |
| `hourglassws/src/notifications/handler.ts` | Consumes `fetchFreshData` + `updateWidgetData`; needs FR4 adapter update |
| `hourglassws/src/api/client.ts` | `getAuthToken(username, password, useQA)` |
| `hourglassws/src/api/timesheet.ts` | `fetchTimesheet(config, token)` |
| `hourglassws/src/api/payments.ts` | `fetchPayments(config, token)` |
| `hourglassws/src/api/workDiary.ts` | `fetchWorkDiary(assignmentId, date, credentials, useQA)` |
| `hourglassws/src/api/approvals.ts` | `fetchPendingManual`, `fetchPendingOvertime` |
| `hourglassws/src/store/config.ts` | `loadConfig()`, `loadCredentials()` |
| `hourglassws/src/lib/hours.ts` | `calculateHours`, `getWeekStartDate`, `HoursData` |
| `hourglassws/src/lib/ai.ts` | `countDiaryTags`, `aggregateAICache`, `AIWeekData`, `TagData` |
| `hourglassws/src/lib/approvals.ts` | `parseManualItems`, `parseOvertimeItems` |
| `hourglassws/src/types/config.ts` | `CrossoverConfig` |
| `hourglassws/src/hooks/useHoursData.ts` | Pattern reference for HoursData usage |
| `hourglassws/src/hooks/useAIData.ts` | Pattern reference for AIWeekData usage |
| `hourglassws/src/hooks/useApprovalItems.ts` | Pattern reference for pendingCount derivation |

### Files to Create/Modify

| File | Action | FR |
|------|--------|----|
| `hourglassws/package.json` | Add `expo-widgets`, `react-native-android-widget` | FR1 |
| `hourglassws/app.json` | Add plugin entries for both packages | FR1 |
| `hourglassws/src/lib/crossoverData.ts` | Replace stub — implement `CrossoverSnapshot` + `fetchFreshData` | FR2 |
| `hourglassws/src/lib/widgetBridge.ts` | Replace stub — thin wrapper to `widgets/bridge` | FR3 |
| `hourglassws/src/notifications/handler.ts` | Update field references to new `CrossoverSnapshot` shape | FR4 |
| `hourglassws/src/hooks/useWidgetSync.ts` | **New file** — foreground widget update hook | FR5 |
| `hourglassws/app/(tabs)/_layout.tsx` | Wire `useWidgetSync` | FR6 |
| `hourglassws/src/__tests__/lib/crossoverData.test.ts` | **New** — FR2 tests | FR2 |
| `hourglassws/src/__tests__/lib/widgetBridge.test.ts` | **New** — FR3 tests | FR3 |
| `hourglassws/src/__tests__/hooks/useWidgetSync.test.ts` | **New** — FR5 tests | FR5 |

### Data Flow

#### `fetchFreshData` detailed flow

```
fetchFreshData()
  ├── loadConfig()           → CrossoverConfig (throws if null)
  ├── loadCredentials()      → Credentials (throws if null)
  ├── getAuthToken(u, p, qa) → token string
  ├── getWeekStartDate(true) → YYYY-MM-DD (UTC week start)
  ├── today = YYYY-MM-DD (local date, for work diary)
  │
  ├── Promise.all([
  │     fetchTimesheet(config, token) → TimesheetResponse | null (catch → null)
  │     fetchPayments(config, token)  → PaymentsResponse | null (catch → null)
  │   ])
  │
  ├── calculateHours(timesheetData, paymentsData, config.hourlyRate, config.weeklyLimit)
  │   → HoursData (always returns, handles null inputs internally)
  │
  ├── AsyncStorage.getItem('ai_cache')
  │   → parse as Record<string, TagData> (catch/null → {})
  │
  ├── fetchWorkDiary(config.assignmentId, today, credentials, config.useQA)
  │   → WorkDiarySlot[] (catch → null)
  │
  ├── if slots !== null:
  │     todayTags = countDiaryTags(slots)
  │     mergedCache = { ...cache, [today]: todayTags }
  │     aiData = aggregateAICache(mergedCache, today)
  │   else:
  │     aiData = null
  │
  ├── if config.isManager:
  │     Promise.all([
  │       fetchPendingManual(token, qa, weekStart) → catch → raw: null
  │       fetchPendingOvertime(token, qa, weekStart) → catch → raw: null
  │     ])
  │     pendingCount = parseManualItems(raw1, weekStart).length + parseOvertimeItems(raw2).length
  │   else:
  │     pendingCount = 0
  │
  └── return { hoursData, aiData, pendingCount, config }
```

#### `useWidgetSync` data flow

```
TabLayout renders
  → useHoursData()        → { data: HoursData | null }
  → useAIData()           → { data: AIWeekData | null }
  → useApprovalItems()    → { items: ApprovalItem[] }
  → useConfig()           → { config: CrossoverConfig | null }
  → useWidgetSync(
      hoursData,
      aiData,
      items.length,       ← pendingCount
      config
    )
      → useEffect fires when hoursData + config non-null
      → widgets/bridge.updateWidgetData(hoursData, aiData, pendingCount, config)
          → AsyncStorage.setItem('widget_data', JSON.stringify(widgetData))
          → iOS: HourglassWidget.updateTimeline(60 entries)
```

### Critical ID Mapping

| Config Field | Source | Used In |
|-------------|--------|---------|
| `config.userId` | `userAvatars[CANDIDATE].id` | `fetchTimesheet` |
| `config.assignmentId` | `assignment.id` | `fetchWorkDiary` |
| `config.managerId` | `assignment.manager.id` | `fetchTimesheet` |
| `config.primaryTeamId` | `assignment.team.id` | `fetchTimesheet` |
| `config.hourlyRate` | `assignment.salary` | `calculateHours` |
| `config.weeklyLimit` | default 40 | `calculateHours` |
| `config.useQA` | config field | all API calls |
| `config.isManager` | `avatarTypes.includes("MANAGER")` | guards approval calls |

### app.json Plugin Config

The removed plugin config to restore (verify exact options against package docs):

```json
["expo-widgets", {
  "ios": {
    "widgets": [{ "name": "HourglassWidget", "file": "src/widgets/ios/HourglassWidget" }]
  }
}],
["react-native-android-widget", {
  "widgets": [{ "name": "HourglassWidget", "label": "Hourglass" }],
  "widgetTaskHandler": "./src/widgets/android/widgetTaskHandler"
}]
```

Note: Verify exact plugin option names against installed package documentation before use — these may have changed from the git history version.

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| `loadConfig()` returns null | `fetchFreshData` throws `Error('fetchFreshData: config not available')` |
| `loadCredentials()` returns null | `fetchFreshData` throws `Error('fetchFreshData: credentials not available')` |
| `fetchTimesheet` rejects | Caught; `calculateHours(null, paymentsData, ...)` |
| `fetchPayments` rejects | Caught; `calculateHours(timesheetData, null, ...)` |
| Both timesheet + payments reject | Caught; `calculateHours(null, null, ...)` — returns zero-state HoursData |
| `fetchWorkDiary` rejects | Caught; `aiData = null` — widget shows "N/A" for AI% |
| `ai_cache` is null or corrupt JSON | Empty cache `{}`; aggregates today-only |
| `fetchPendingManual` rejects (manager) | Caught; partial count from overtime only |
| `fetchPendingOvertime` rejects (manager) | Caught; partial count from manual only |
| Both approval fetches reject (manager) | `pendingCount = 0`, no throw |
| `hoursData` null in `useWidgetSync` | Early return — `updateWidgetData` not called |
| `config` null in `useWidgetSync` | Early return — `updateWidgetData` not called |
| `updateWidgetData` throws in `useWidgetSync` | Error caught + `console.error('[useWidgetSync]', err)` — app not affected |
| Non-manager calls `fetchFreshData` | `pendingCount = 0`, no approval API calls made |

### `handler.ts` Changes (FR4)

Two field reference fixes:

```typescript
// BEFORE (broken — old stub fields):
if (freshData.isManager) {
  ...
  const newCount = freshData.pendingApprovals.length;
  ...
}

// AFTER (correct — new CrossoverSnapshot):
if (freshData.config.isManager) {
  ...
  const newCount = freshData.pendingCount;
  ...
}
```

### Test Mock Patterns

**FR2 tests** (`crossoverData.test.ts`):
```typescript
jest.mock('../../store/config', () => ({ loadConfig: jest.fn(), loadCredentials: jest.fn() }))
jest.mock('../../api/client', () => ({ getAuthToken: jest.fn() }))
jest.mock('../../api/timesheet', () => ({ fetchTimesheet: jest.fn() }))
jest.mock('../../api/payments', () => ({ fetchPayments: jest.fn() }))
jest.mock('../../api/workDiary', () => ({ fetchWorkDiary: jest.fn() }))
jest.mock('../../api/approvals', () => ({ fetchPendingManual: jest.fn(), fetchPendingOvertime: jest.fn() }))
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }))
jest.mock('../../lib/hours', () => ({ calculateHours: jest.fn(), getWeekStartDate: jest.fn() }))
jest.mock('../../lib/ai', () => ({ countDiaryTags: jest.fn(), aggregateAICache: jest.fn() }))
jest.mock('../../lib/approvals', () => ({ parseManualItems: jest.fn(), parseOvertimeItems: jest.fn() }))
```

**FR3 tests** (`widgetBridge.test.ts`):
```typescript
jest.mock('../../widgets/bridge', () => ({ updateWidgetData: jest.fn() }))
```

**FR5 tests** (`useWidgetSync.test.ts`):
```typescript
jest.mock('../../widgets/bridge', () => ({ updateWidgetData: jest.fn() }))
// renderHook from @testing-library/react-native
```
