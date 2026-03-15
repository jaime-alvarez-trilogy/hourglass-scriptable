# My Requests Data Layer

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What is Being Built

This spec creates the **data layer** for contributor-facing manual time request visibility. It builds the types, pure utility functions, and a TanStack Query hook that fetch the current week's work diary, identify manual time slots, group them into logical request entries, and return typed data ready for the UI.

No UI is built here — that is `02-approvals-tab-redesign`. This spec delivers the data contract that UI will consume.

### How It Works

The Crossover work diary API already returns manual time slot data for contributors. Each manually submitted time block becomes multiple 10-minute slots on a given date, all sharing the same `memo` string. These slots carry a `status` field (`PENDING | APPROVED | REJECTED`) and an `actions` array that contains manager comments on rejection.

The hook:
1. Loads `assignmentId` from the app config (AsyncStorage/SecureStore via `loadConfig()`)
2. Computes the Monday of the current week and generates a date array from Mon to today
3. Calls `fetchWorkDiary(assignmentId, date, credentials, useQA)` for each date in parallel (same pattern as `useAIData.ts`)
4. Filters slots where `autoTracker === false` to isolate manual entries
5. Groups slots by `(date, memo)` into `ManualRequestEntry` objects — each group represents one user submission
6. Applies worst-case status aggregation (REJECTED > PENDING > APPROVED)
7. Extracts rejection reasons from the `actions` array when status is REJECTED
8. Returns entries sorted by date descending, with loading/error state

### Architecture Fit

This hook follows the identical pattern to `useAIData.ts` — per-day fetching, TanStack Query, `loadConfig()` for credentials, `fetchWorkDiary` as the API call. New types live in `src/types/requests.ts` to keep the data layer cleanly separated from the existing `src/types/api.ts`.

---

## Out of Scope

1. **UI components for displaying requests** — **Deferred to 02-approvals-tab-redesign:** The `MyRequestCard` component, status badges, and the section rendered in `approvals.tsx` are all part of the tab redesign spec.

2. **Submitting new manual time requests** — **Descoped:** Manual time submission is done in the Crossover web app. No in-app submission UI is planned for this feature.

3. **Overtime request tracking for contributors** — **Descoped:** Needs separate endpoint research. The overtime API (`/api/overtime/request`) requires contributor-specific endpoint discovery not yet done. Out of scope for this feature entirely.

4. **Historical requests beyond the current week** — **Descoped:** Date range is Mon–today of the current week, matching `useAIData` behavior. Older requests are typically resolved; showing them adds complexity without user value at this stage.

5. **Real-time or push updates** — **Descoped:** No websocket or push notification for status changes. Pull-to-refresh (refetch) is sufficient and consistent with the rest of the app.

6. **Manager-specific filtering or acting on requests** — **Descoped:** Managers acting on requests is handled by the existing `useApprovalItems.ts` and `ApprovalCard` components. This spec delivers `useMyRequests` which is used by all users including managers viewing their own submissions.

7. **Partial approval detection UI** — **Descoped:** Edge case where some slots in a group are approved and others rejected is handled silently via worst-case status. No mixed-status indicator is displayed in this MVP.

---

## Functional Requirements

### FR1: Types for Manual Request Data

Define TypeScript types that represent a grouped manual time request entry and the hook's return shape.

**Types to create in `src/types/requests.ts`:**

- `ManualRequestStatus`: `'PENDING' | 'APPROVED' | 'REJECTED'`
- `ManualRequestEntry`:
  - `id: string` — stable composite key `"{date}|{memo}"` for FlatList
  - `date: string` — `YYYY-MM-DD`
  - `durationMinutes: number` — slot count × 10
  - `memo: string` — description submitted by contributor
  - `status: ManualRequestStatus` — worst-case across grouped slots
  - `rejectionReason: string | null` — from actions array when status is REJECTED
- `UseMyRequestsResult`:
  - `entries: ManualRequestEntry[]` — sorted by date descending
  - `isLoading: boolean`
  - `error: string | null` — `'auth' | 'network' | null`
  - `refetch: () => void`

**Success Criteria:**
- Types are exported from `src/types/requests.ts`
- `ManualRequestEntry.id` uses `"{date}|{memo}"` format
- `error` field is constrained to `'auth' | 'network' | null` (not arbitrary string)
- TypeScript compiles without errors

---

### FR2: `extractRejectionReason` Utility

Pure function that finds the rejection reason from a slot's `actions` array.

**Signature:** `extractRejectionReason(actions: SlotAction[]): string | null`

**Logic:**
- Find action where `actionType === "REJECT_MANUAL_TIME"`
- Return its `comment` if non-empty string, otherwise `null`
- Return `null` if no rejection action found
- Return `null` for empty array input

**Success Criteria:**
- Returns rejection comment when `REJECT_MANUAL_TIME` action exists with non-empty comment
- Returns `null` when no rejection action present
- Returns `null` when comment is empty string
- Returns `null` for empty actions array
- Does not throw for any input

---

### FR3: `groupSlotsIntoEntries` Utility

Pure function that filters manual slots from a single day's work diary and groups them into `ManualRequestEntry` objects.

**Signature:** `groupSlotsIntoEntries(slots: WorkDiarySlot[], date: string): ManualRequestEntry[]`

**Logic:**
1. Filter: keep only slots where `autoTracker === false`
2. Group by `memo` (treat `undefined` memo as empty string)
3. For each group:
   - `id` = `"{date}|{memo}"`
   - `date` = the passed `date` param
   - `durationMinutes` = group.length × 10
   - `status` = worst-case across group: REJECTED > PENDING > APPROVED
   - `rejectionReason` = call `extractRejectionReason` on first rejected slot's actions; `null` if not rejected

**Success Criteria:**
- Two slots with same memo → one entry with `durationMinutes: 20`
- Three slots with three distinct memos → three entries
- Empty input → returns `[]`
- All `autoTracker === true` slots → returns `[]`
- Undefined memo treated as `""` (no throw)
- Single slot → one entry with `durationMinutes: 10`
- Worst-case status: if group has APPROVED + REJECTED → entry status is `REJECTED`
- Worst-case status: if group has APPROVED + PENDING → entry status is `PENDING`

---

### FR4: `useMyRequests` Hook

TanStack Query hook that fetches the current week's work diary for the authenticated contributor, applies grouping, and returns typed results.

**Signature:** `useMyRequests(): UseMyRequestsResult`

**Logic:**
1. Call `loadConfig()` to get credentials and `assignmentId`
2. If `assignmentId` is missing → return `{ entries: [], isLoading: false, error: null, refetch }`
3. Compute week dates: Monday of current week through today (inclusive), using `getWeekStartDate()`
4. For each date, call `fetchWorkDiary(assignmentId, date, credentials, useQA)` — run in parallel via `Promise.allSettled`
5. For each fulfilled result, call `groupSlotsIntoEntries(slots, date)`
6. Skip (don't throw) rejected/failed individual day fetches — show available data
7. Flatten all entries, sort by date descending
8. Map errors: 401/403 responses → `error: 'auth'`; network errors → `error: 'network'`; null if all ok
9. Return `{ entries, isLoading, error, refetch }`

**TanStack Query config:**
- `queryKey: ['myRequests', assignmentId]`
- `staleTime: 60_000` (1 minute)
- `enabled: !!assignmentId`

**Success Criteria:**
- Returns entries sorted newest-first (date descending)
- Fetches exactly Mon–today date range (no extra days)
- Today is Monday → fetches only 1 day
- Missing `assignmentId` → returns empty without error
- Auth failure (401/403) → `error: 'auth'`
- Network failure → `error: 'network'`
- Partial day failure → available days returned, no error thrown
- No manual entries this week → `entries: []`, `error: null`
- `refetch` function triggers re-query

---

## Technical Design

### Files to Reference

| File | Why |
|------|-----|
| `src/hooks/useAIData.ts` | Exact pattern to follow: per-day work diary fetch, `loadConfig()`, `Promise.allSettled`, TanStack Query setup |
| `src/api/workDiary.ts` | `fetchWorkDiary(assignmentId, date, credentials, useQA)` — returns `WorkDiarySlot[]` |
| `src/types/api.ts` | `WorkDiarySlot` type — has `autoTracker: boolean`, `status: string`, `memo: string`, `actions: SlotAction[]`, `tags: string[]` |
| `src/hooks/useApprovalItems.ts` | Pattern for `loadConfig()` credential loading and role guard |
| `src/lib/dateUtils.ts` | `getWeekStartDate()` — returns Monday of current week as `YYYY-MM-DD` string |

### Files to Create

| File | Contents |
|------|----------|
| `src/types/requests.ts` | `ManualRequestStatus`, `ManualRequestEntry`, `UseMyRequestsResult` |
| `src/lib/requestsUtils.ts` | `extractRejectionReason`, `groupSlotsIntoEntries` |
| `src/hooks/useMyRequests.ts` | `useMyRequests` hook |

### Files to Modify

None — this spec is purely additive.

### Test Files to Create

| File | Tests |
|------|-------|
| `src/lib/__tests__/requestsUtils.test.ts` | `groupSlotsIntoEntries` and `extractRejectionReason` unit tests |
| `src/hooks/__tests__/useMyRequests.test.ts` | `useMyRequests` hook tests with mocked `fetchWorkDiary` and `loadConfig` |

### Data Flow

```
useMyRequests()
  │
  ├── loadConfig()
  │     └── AsyncStorage + SecureStore → { assignmentId, credentials, useQA }
  │
  ├── getWeekStartDate() → Monday YYYY-MM-DD
  │
  ├── date range: [Mon, Tue, ..., today]
  │
  ├── Promise.allSettled([
  │     fetchWorkDiary(assignmentId, "Mon", credentials, useQA),
  │     fetchWorkDiary(assignmentId, "Tue", credentials, useQA),
  │     ...
  │   ])
  │
  ├── per fulfilled result:
  │     groupSlotsIntoEntries(slots, date)
  │       ├── filter autoTracker === false
  │       ├── group by memo
  │       ├── for each group:
  │       │     extractRejectionReason(actions)
  │       │     worst-case status
  │       └── return ManualRequestEntry[]
  │
  ├── flatten + sort by date DESC
  │
  └── return UseMyRequestsResult
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `assignmentId` missing | Return `{ entries: [], isLoading: false, error: null }` immediately (no fetch) |
| Today is Monday | `getWeekStartDate()` returns today → date array has 1 element |
| Single day fetch fails (network) | `Promise.allSettled` — skip rejected, show other days' data |
| All days fail with 401 | Map to `error: 'auth'` |
| All days fail with network error | Map to `error: 'network'` |
| Slot has `undefined` memo | Normalize to `""` before grouping — no throw |
| Multiple memos same date | Each memo = separate `ManualRequestEntry` |
| Partial slot statuses in group | Worst-case: REJECTED beats PENDING beats APPROVED |
| Comment on rejection action is `""` | Return `null` for `rejectionReason` (not empty string) |

### Dependencies

- `@tanstack/react-query` — already in project
- `src/api/workDiary.ts` — `fetchWorkDiary` already exists
- `src/lib/dateUtils.ts` — `getWeekStartDate` already exists
- `src/storage/config.ts` (or equivalent) — `loadConfig` already exists, used by `useAIData.ts`

### No New Dependencies

This spec introduces no new npm packages or API endpoints.
