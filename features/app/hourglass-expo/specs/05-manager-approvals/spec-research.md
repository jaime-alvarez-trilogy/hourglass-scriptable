# Spec Research: 05-manager-approvals

## Problem Context

Managers need to view, approve, and reject pending manual time and overtime requests from their team. This is a manager-only screen that requires role detection. The current Scriptable implementation requires tapping on the widget to open a UITable — the Expo version gets a proper full-screen list with swipe actions and bulk approve.

## Exploration Findings

### Pending Manual Time API

`GET /api/timetracking/workdiaries/manual/pending?weekStartDate=YYYY-MM-DD`

Manager-only — returns 403 for contributors.

Response: Array of user objects:
```javascript
[{
  userId: number,
  fullName: string,
  manualTimes: [{
    status: "PENDING",
    durationMinutes: number,
    description: string,
    startDateTime: ISO,
    timecardIds: [number],
    type: "WEB" | "MOBILE"
  }]
}]
```

### Pending Overtime API

`GET /api/overtime/request?status=PENDING&weekStartDate=YYYY-MM-DD`

Manager-only. Response:
```javascript
[{
  overtimeRequest: {
    id: number,             // overtimeId
    status: "PENDING",
    durationMinutes: number,
    description: string,
    startDateTime: ISO
  },
  assignment: {
    id: number,
    salary: number,
    selection: {
      marketplaceMember: {
        application: {
          candidate: {
            id: number,
            printableName: string,
            jobTitle: string
          }
        }
      }
    }
  }
}]
```

### Approve/Reject Endpoints

| Action | Method | URL | Body |
|--------|--------|-----|------|
| Approve manual | PUT | `/api/timetracking/workdiaries/manual/approved` | `{approverId, timecardIds: [], allowOvertime: false}` |
| Reject manual | PUT | `/api/timetracking/workdiaries/manual/rejected` | `{approverId, timecardIds: [], rejectionReason: string}` |
| Approve overtime | PUT | `/api/overtime/request/approval/:requestId` | `{}` |
| Reject overtime | PUT | `/api/overtime/request/rejection/:requestId` | `{memo: string}` |

**`approverId`** = `config.userId` (candidate avatar ID, not login userId).

### Notifications (New Items)

Current Scriptable behavior:
- Tracks seen item IDs in `time-approval-state.json`
- Generates IDs: `ot-{overtimeId}` or `mt-{timecardIds.join('-')}`
- Fires notification only for genuinely new items
- Thread: `time-approval`

Expo equivalent: Expo Push Notifications with local notification for new items detected on background fetch.

### Unified Item Model

The existing code parses both manual + overtime into a unified `allItems` array:

```javascript
// Manual item
{
  category: "MANUAL",
  userId: number,
  fullName: string,
  jobTitle: string,
  durationMinutes: number,
  hours: string,           // toFixed(1)
  description: string,
  startDateTime: ISO,
  type: "WEB" | "MOBILE",
  timecardIds: number[],
  weekStartDate: string
}

// Overtime item
{
  category: "OVERTIME",
  overtimeId: number,
  userId: number,
  fullName: string,
  jobTitle: string,
  durationMinutes: number,
  hours: string,
  cost: number,
  description: string,
  startDateTime: ISO,
  weekStartDate: string
}
```

## Key Decisions

### Decision 1: Manager-only screen with role guard
- Approval tab only visible when `config.isManager === true`
- If contributor tries to access → redirect to hours tab
- Rationale: clean role separation, matches existing behavior

### Decision 2: Unified approval item list
- Single `useApprovalItems` hook merges manual + overtime
- Sorted by `startDateTime` descending (most recent first)
- Rationale: matches UITable behavior, single list is easier to scan

### Decision 3: Swipe-to-approve / swipe-to-reject + bulk approve
- Individual items: left swipe = reject (with reason prompt), right swipe = approve
- Header button: "Approve All" for bulk action
- Rationale: faster UX than current widget tap-based flow

### Decision 4: Rejection reason via bottom sheet
- Tapping reject opens a bottom sheet with a text input for reason
- Default reason prefilled: "Not approved"
- Rationale: better UX than blocking alert

### Decision 5: Optimistic updates
- Mark item as approved/rejected locally immediately
- Remove from list; re-fetch in background to confirm
- Rationale: fast feedback, matches expected behavior

### Decision 6: Local push notification on new items
- Background fetch compares new item IDs against stored seen IDs
- If new items found → schedule local notification
- No server-side push needed for this (items are fetched by the app)

## Interface Contracts

### Types

```typescript
interface ManualApprovalItem {
  id: string                // ← "mt-{timecardIds.join('-')}"
  category: 'MANUAL'
  userId: number            // ← manualTimes parent.userId
  fullName: string          // ← manualTimes parent.fullName
  durationMinutes: number   // ← manualTimes[n].durationMinutes
  hours: string             // ← computed: (durationMinutes/60).toFixed(1)
  description: string       // ← manualTimes[n].description
  startDateTime: string     // ← manualTimes[n].startDateTime
  type: 'WEB' | 'MOBILE'   // ← manualTimes[n].type
  timecardIds: number[]     // ← manualTimes[n].timecardIds
  weekStartDate: string     // ← param used to fetch (Mon of current week)
}

interface OvertimeApprovalItem {
  id: string                // ← "ot-{overtimeRequest.id}"
  category: 'OVERTIME'
  overtimeId: number        // ← overtimeRequest.id
  userId: number            // ← assignment.selection...candidate.id
  fullName: string          // ← assignment.selection...candidate.printableName
  jobTitle: string          // ← assignment.selection...candidate.jobTitle
  durationMinutes: number   // ← overtimeRequest.durationMinutes
  hours: string             // ← computed
  cost: number              // ← computed: (durationMinutes/60) * assignment.salary
  description: string       // ← overtimeRequest.description
  startDateTime: string     // ← overtimeRequest.startDateTime
  weekStartDate: string     // ← computed
}

type ApprovalItem = ManualApprovalItem | OvertimeApprovalItem
```

**Note on jobTitle:** Not present in the pending manual API response. Omitted from `ManualApprovalItem` for v1 — shown only for overtime items where it is available in the nested assignment response.

### Hooks

```typescript
// src/hooks/useApprovalItems.ts

function useApprovalItems(): {
  items: ApprovalItem[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  approveItem: (item: ApprovalItem) => Promise<void>
  rejectItem: (item: ApprovalItem, reason: string) => Promise<void>
  approveAll: () => Promise<void>
}
```

### API Functions

```typescript
// src/api/approvals.ts

async function fetchPendingManual(token: string, useQA: boolean, weekStartDate: string): Promise<RawManualResponse[]>
async function fetchPendingOvertime(token: string, useQA: boolean, weekStartDate: string): Promise<RawOvertimeResponse[]>
async function approveManual(token: string, useQA: boolean, approverId: string, timecardIds: number[]): Promise<void>
async function rejectManual(token: string, useQA: boolean, approverId: string, timecardIds: number[], reason: string): Promise<void>
async function approveOvertime(token: string, useQA: boolean, overtimeId: number): Promise<void>
async function rejectOvertime(token: string, useQA: boolean, overtimeId: number, memo: string): Promise<void>
```

### Screen

```
app/(tabs)/approvals.tsx — Manager approvals screen (hidden for contributors)

Sections:
1. Header — "Approvals" + count badge + "Approve All" button
2. Empty state — "All caught up" when no items
3. Item list — grouped by category (MANUAL / OVERTIME)
   - Each item: name, hours, description, type badge, cost (OT only)
   - Swipe right → approve
   - Swipe left → reject (opens reason sheet)
4. Rejection bottom sheet — reason input + confirm
```

## Test Plan

### parseManualItems

- [ ] Flattens user.manualTimes[] into flat ApprovalItem list
- [ ] Generates correct id: `mt-{timecardIds.join('-')}`
- [ ] Calculates hours: `(durationMinutes/60).toFixed(1)`
- [ ] Handles user with multiple manualTimes entries

### parseOvertimeItems

- [ ] Extracts candidate info from nested assignment path
- [ ] Generates id: `ot-{overtimeRequest.id}`
- [ ] Calculates cost: `(durationMinutes/60) * assignment.salary`

### approveItem (hook)

- [ ] Calls correct API for MANUAL category (PUT manual/approved)
- [ ] Calls correct API for OVERTIME category (PUT overtime/request/approval/:id)
- [ ] Uses `config.userId` as approverId (not login userId)
- [ ] Removes item from list optimistically
- [ ] Re-fetches list after success

### rejectItem (hook)

- [ ] Calls correct API for MANUAL (PUT manual/rejected with rejectionReason)
- [ ] Calls correct API for OVERTIME (PUT overtime/request/rejection/:id with memo)
- [ ] Requires non-empty reason string
- [ ] Removes item optimistically

### approveAll (hook)

- [ ] Calls approveItem for each item in list
- [ ] Continues on individual failures (doesn't abort batch)
- [ ] Refetches list after all settled

### Role guard

- [ ] Approval tab not rendered when `isManager === false`
- [ ] Fetches return early / not called for contributors

## Files to Create

```
src/
  hooks/
    useApprovalItems.ts
  api/
    approvals.ts
  lib/
    approvals.ts        — parseManualItems, parseOvertimeItems
  components/
    ApprovalCard.tsx    — individual item card with swipe actions
    RejectionSheet.tsx  — bottom sheet for reason input
    ApprovalBadge.tsx   — count badge for tab icon

app/(tabs)/
  approvals.tsx
```

## Files to Reference

- `WS/hourglass.js` — `parseManualData()`, `parseOvertimeData()`, `approveItemViaAPI()`, `rejectItemViaAPI()`, `checkAndNotify()`
- `WS/memory/MEMORY.md` — Approve manual, Reject manual, Approve overtime, Reject overtime endpoints
- `WS/tools/test-approval-confirmed.js` — confirmed endpoint test patterns
