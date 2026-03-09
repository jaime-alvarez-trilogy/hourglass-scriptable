# 05-manager-approvals

**Status:** Draft
**Created:** 2026-03-08
**Last Updated:** 2026-03-08
**Owner:** @trilogy

---

## Overview

### What is Being Built

This spec implements the manager approvals screen for HourglassWS — the full-screen React Native replacement for the Scriptable widget's UITable-based approval queue. It covers fetching pending manual time and overtime requests, displaying them in a unified swipeable list, and providing approve/reject actions with optimistic updates.

Three layers are built:

1. **API functions** (`src/api/approvals.ts`) — Six typed functions wrapping the confirmed Crossover approval endpoints: fetch pending manual, fetch pending overtime, approve manual, reject manual, approve overtime, reject overtime. All functions accept token + useQA flag, matching the pattern established in the foundation API client.

2. **Parser library** (`src/lib/approvals.ts`) — Two pure functions, `parseManualItems` and `parseOvertimeItems`, that transform raw API responses into a unified `ApprovalItem` discriminated union. These handle ID generation, duration-to-hours conversion, and cost calculation. Pure functions make them independently testable without API mocks.

3. **`useApprovalItems` hook** (`src/hooks/useApprovalItems.ts`) — React Query hook that fetches both endpoints in parallel, merges and sorts results by `startDateTime` descending, and exposes `approveItem`, `rejectItem`, and `approveAll` mutations with optimistic list updates and automatic re-fetch on settle.

4. **Approvals screen** (`app/(tabs)/approvals.tsx`) — Full-screen list with header count badge, "Approve All" button, per-item swipe gestures (right = approve, left = reject), and a bottom sheet for rejection reason input. Role-guarded: contributors are redirected to the hours tab.

### How It Works

At runtime:

- On mount, `useApprovalItems` computes the current week's Monday date (Mon–Sun boundary, local timezone) and fires parallel requests to `/api/timetracking/workdiaries/manual/pending` and `/api/overtime/request?status=PENDING`.
- Raw responses pass through `parseManualItems` / `parseOvertimeItems`, producing a merged `ApprovalItem[]` sorted by `startDateTime` descending.
- When the user swipes right on an item, `approveItem` is called: the item is optimistically removed from the local list, the appropriate API endpoint is called (PUT manual/approved or PUT overtime/request/approval/:id), and on settle the list is re-fetched.
- When the user swipes left, the rejection bottom sheet opens. On confirm, `rejectItem` is called with the reason string (default: "Not approved").
- "Approve All" calls `approveItem` for every item in parallel, continues on individual failures (Promise.allSettled), and re-fetches after all settle.
- Role guard: if `config.isManager === false`, the approvals tab is hidden in the tab bar and navigating to it redirects to `/(tabs)/hours`.

---

## Out of Scope

1. **Approved and rejected history views** — The manual/approved and manual/rejected endpoints exist but displaying historical approval records is not part of this spec. The approvals screen shows only pending items. [Descoped: out of v1 scope, no spec owns this]

2. **Push notification delivery via server** — Spec 07-ping-server handles the silent push infrastructure. This spec only schedules local notifications when the app detects new items on a background fetch (no server-side push token registration here). [Deferred to 07-ping-server]

3. **Contributor-facing manual time submission** — Contributors cannot submit manual time through this app. The manual time endpoints (pending/approved/rejected) are manager-only (403 for contributors). No submission UI is built here. [Descoped: API does not support contributor access]

4. **Overtime request creation** — Submitting new overtime requests is out of scope. Only approving/rejecting existing requests is covered. [Descoped: no confirmed endpoint for overtime submission]

5. **Multi-week approval history** — Only the current week's pending items are fetched. Previous weeks are not surfaced. [Descoped: matches existing Scriptable behavior]

6. **Bulk reject** — "Approve All" is implemented. "Reject All" is not — bulk rejection requires per-item reason strings which cannot be auto-filled meaningfully. [Descoped: poor UX for bulk rejection]

7. **Home screen widget for approvals** — The widget layer that displays approval count on the home screen is deferred. The data bridge to write approval counts to local store for widget consumption is in scope for 06-widgets. [Deferred to 06-widgets]

8. **Manager team switching** — Managers with multiple teams are not supported in v1. The app uses `config.primaryTeamId` for all approval queries. [Descoped: matches existing Scriptable behavior]

9. **Real-time updates / websocket** — The list refreshes only on mount and after user actions. No polling or websocket subscription. [Descoped: pull-to-refresh covers the use case]

---

## Functional Requirements

### FR1: Types and Parser Library

Define the `ApprovalItem` discriminated union and implement `parseManualItems` / `parseOvertimeItems` pure functions.

**Success Criteria:**
- `ManualApprovalItem` and `OvertimeApprovalItem` interfaces match the contracts in spec-research.md exactly (all fields, all types)
- `ApprovalItem = ManualApprovalItem | OvertimeApprovalItem` type alias exported from `src/lib/approvals.ts`
- `parseManualItems(raw: RawManualResponse[])` flattens each user's `manualTimes[]` array into individual `ManualApprovalItem` objects
- Each manual item's `id` is `"mt-{timecardIds.join('-')}"`
- Each manual item's `hours` is `(durationMinutes / 60).toFixed(1)`
- A user with N `manualTimes` entries produces N separate `ManualApprovalItem` objects (not grouped)
- `parseOvertimeItems(raw: RawOvertimeResponse[])` maps each raw overtime entry to one `OvertimeApprovalItem`
- Each overtime item's `id` is `"ot-{overtimeRequest.id}"`
- Each overtime item's `cost` is `(durationMinutes / 60) * assignment.salary` (rounded to 2 decimal places)
- Candidate info extracted from `assignment.selection.marketplaceMember.application.candidate` path
- `weekStartDate` on overtime items computed as Monday of the week containing `overtimeRequest.startDateTime`

---

### FR2: API Functions

Implement the six API functions in `src/api/approvals.ts`.

**Success Criteria:**
- `fetchPendingManual(token, useQA, weekStartDate)` → GET `/api/timetracking/workdiaries/manual/pending?weekStartDate={weekStartDate}` with `x-auth-token` header
- `fetchPendingOvertime(token, useQA, weekStartDate)` → GET `/api/overtime/request?status=PENDING&weekStartDate={weekStartDate}` with `x-auth-token` header
- `approveManual(token, useQA, approverId, timecardIds)` → PUT `/api/timetracking/workdiaries/manual/approved` with body `{approverId, timecardIds, allowOvertime: false}`
- `rejectManual(token, useQA, approverId, timecardIds, reason)` → PUT `/api/timetracking/workdiaries/manual/rejected` with body `{approverId, timecardIds, rejectionReason: reason}`
- `approveOvertime(token, useQA, overtimeId)` → PUT `/api/overtime/request/approval/{overtimeId}` with empty body `{}`
- `rejectOvertime(token, useQA, overtimeId, memo)` → PUT `/api/overtime/request/rejection/{overtimeId}` with body `{memo}`
- All functions use `api-qa.crossover.com` when `useQA === true`, `api.crossover.com` otherwise
- All functions throw `ApiError` on non-2xx response (reuses foundation error types)
- `approverId` is passed as-is (it is `config.userId`, the candidate avatar ID — NOT the login userId)

---

### FR3: useApprovalItems Hook

Implement the `useApprovalItems` hook using TanStack Query v5.

**Success Criteria:**
- On mount, computes `weekStartDate` as Monday of the current week (Mon–Sun, local timezone)
- Fires `fetchPendingManual` and `fetchPendingOvertime` in parallel (Promise.all or two useQuery calls)
- Merges results into a single `ApprovalItem[]` sorted by `startDateTime` descending
- `isLoading` is true while either fetch is in-flight
- `error` contains the first error message if either fetch fails, null otherwise
- `refetch()` re-fires both queries
- `approveItem(item)`:
  - Optimistically removes item from local list immediately
  - Calls `approveManual` (MANUAL) or `approveOvertime` (OVERTIME) based on `item.category`
  - For MANUAL: passes `config.userId` as `approverId`
  - Re-fetches list after API call settles (success or failure)
  - Restores item to list on failure
- `rejectItem(item, reason)`:
  - Requires non-empty `reason` string — throws if empty
  - Optimistically removes item
  - Calls `rejectManual` (MANUAL) or `rejectOvertime` (OVERTIME)
  - Re-fetches list after settle
  - Restores item on failure
- `approveAll()`:
  - Calls `approveItem` for every item in parallel (Promise.allSettled — does not abort on individual failure)
  - Re-fetches list after all settle
- Hook returns early (items: [], isLoading: false) when `config.isManager === false`

---

### FR4: ApprovalCard Component

Implement `src/components/ApprovalCard.tsx` — swipeable card for a single approval item.

**Success Criteria:**
- Displays: full name, duration in hours, description text
- MANUAL items show `type` badge ("WEB" or "MOBILE") in a small pill
- OVERTIME items show cost formatted as `$XX.XX`
- Swipe right gesture triggers `onApprove` callback
- Swipe left gesture triggers `onReject` callback (opens rejection sheet — handled by parent)
- Swipe actions rendered with colored backgrounds: green for approve, red for reject
- Card is accessible: has appropriate `accessibilityLabel` props

---

### FR5: RejectionSheet Component

Implement `src/components/RejectionSheet.tsx` — bottom sheet modal for entering a rejection reason.

**Success Criteria:**
- Renders as a bottom sheet modal with slide-up animation
- Contains a text input pre-filled with "Not approved"
- "Confirm Reject" button calls `onConfirm(reason)` with the current text value
- "Cancel" button closes the sheet without calling `onConfirm`
- Input is focused automatically when sheet opens
- "Confirm Reject" button is disabled when input is empty or whitespace-only

---

### FR6: Approvals Screen

Implement `app/(tabs)/approvals.tsx` — the full manager approvals screen.

**Success Criteria:**
- On render, checks `config.isManager` — if false, redirects to `/(tabs)/hours`
- Displays a header with "Approvals" title and a count badge showing number of pending items
- When `items.length > 0`, shows an "Approve All" button in the header
- Renders `ApprovalCard` for each item in the `items` array
- On swipe right: calls `approveItem(item)` via the hook
- On swipe left: opens `RejectionSheet` for the item; on confirm calls `rejectItem(item, reason)`
- Shows a loading spinner when `isLoading === true`
- Shows an error message when `error !== null`
- Shows "All caught up" empty state when `items.length === 0` and not loading
- Pull-to-refresh triggers `refetch()`
- "Approve All" button calls `approveAll()` and shows loading state during execution

---

## Technical Design

### Files to Reference

| File | Why |
|------|-----|
| `WS/hourglass.js` | `parseManualData()`, `parseOvertimeData()`, `approveItemViaAPI()`, `rejectItemViaAPI()` — direct ports |
| `WS/memory/MEMORY.md` | Confirmed endpoint URLs, body formats, ID mapping (approverId = candidate avatar ID) |
| `WS/tools/test-approval-confirmed.js` | Validated request/response shapes for approve/reject endpoints |
| `hourglassws/src/api/client.ts` | Foundation API client pattern — all approval functions must match this calling convention |
| `hourglassws/src/store/config.ts` | `CrossoverConfig` type — `isManager`, `userId`, `primaryTeamId`, `useQA` fields used here |
| `hourglassws/src/api/timesheet.ts` | Pattern reference for typed API function structure |

### Files to Create

```
hourglassws/
  src/
    lib/
      approvals.ts              ← parseManualItems, parseOvertimeItems, getWeekStartDate util
    api/
      approvals.ts              ← 6 typed API functions
    hooks/
      useApprovalItems.ts       ← React Query hook, optimistic mutations
    components/
      ApprovalCard.tsx          ← swipeable item card
      RejectionSheet.tsx        ← bottom sheet for rejection reason
  app/
    (tabs)/
      approvals.tsx             ← manager approvals screen
```

### Files to Modify

```
hourglassws/
  app/
    (tabs)/
      _layout.tsx               ← hide approvals tab when isManager === false
```

### Data Flow

```
approvals.tsx
  └─ useApprovalItems()
       ├─ fetchPendingManual(token, useQA, weekStartDate)
       │    └─ GET /api/timetracking/workdiaries/manual/pending?weekStartDate=...
       │         └─ parseManualItems(raw) → ManualApprovalItem[]
       │
       ├─ fetchPendingOvertime(token, useQA, weekStartDate)
       │    └─ GET /api/overtime/request?status=PENDING&weekStartDate=...
       │         └─ parseOvertimeItems(raw) → OvertimeApprovalItem[]
       │
       └─ merge + sort by startDateTime desc → ApprovalItem[]
            │
            ├─ approveItem(ManualItem)
            │    └─ PUT /api/timetracking/workdiaries/manual/approved
            │         body: {approverId: config.userId, timecardIds, allowOvertime: false}
            │
            ├─ approveItem(OvertimeItem)
            │    └─ PUT /api/overtime/request/approval/{overtimeId}
            │
            ├─ rejectItem(ManualItem, reason)
            │    └─ PUT /api/timetracking/workdiaries/manual/rejected
            │         body: {approverId: config.userId, timecardIds, rejectionReason: reason}
            │
            └─ rejectItem(OvertimeItem, reason)
                 └─ PUT /api/overtime/request/rejection/{overtimeId}
                      body: {memo: reason}
```

### weekStartDate Computation

The `weekStartDate` must be Monday of the current week in `YYYY-MM-DD` format using local timezone (not UTC). This matches the existing Scriptable behavior and the validated AI_VALIDATION.md boundary.

```typescript
function getWeekStartDate(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

**Critical:** Never use `toISOString()` for local date formatting — it shifts to UTC and produces wrong dates for users in UTC-offset timezones (documented bug in MEMORY.md).

### Edge Cases

| Case | Handling |
|------|----------|
| Contributor accesses approvals tab | Redirect to `/(tabs)/hours` via `useEffect` on mount |
| Both fetches fail | Show error message with retry button; `items` stays at previous value |
| One fetch fails, one succeeds | Show partial list + error banner |
| Empty timecardIds array on manual item | Do not call approveManual — log warning and skip |
| approveAll with zero items | No-op (button hidden when items.length === 0) |
| Rejection reason is whitespace-only | Treat as empty — disable Confirm button |
| Optimistic update followed by API failure | Restore item at original position in list |
| Token expired during approval action | Foundation ApiError propagates; hook surfaces via error state |
| Multiple manual time entries for same user | Each `manualTimes` entry becomes its own `ApprovalItem` with its own timecardIds |

### Dependency Notes

- `useApprovalItems` requires `config.userId` (candidate avatar ID) as `approverId` — NOT the login userId stored as the token sub. This distinction is critical and documented in MEMORY.md Critical ID Mapping.
- The approval tab visibility in `_layout.tsx` reads `config.isManager` from the foundation config store. This field is set during onboarding (spec 02) and refreshed weekly on Mondays.
- Bottom sheet: if `@gorhom/bottom-sheet` is not in `package.json`, use a React Native `Modal` with `animationType="slide"` as a fallback. Do not add new dependencies without checking.
