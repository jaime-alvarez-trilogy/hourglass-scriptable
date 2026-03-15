# Approvals Tab Redesign

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What is Being Built

This spec transforms the existing manager-only "Approvals" tab into a role-aware "Requests" tab visible to all users. It adds a `MyRequestCard` component and rewrites `approvals.tsx` so contributors see the status of their own submitted manual time entries, and managers see both their team's approval queue and their own submitted requests.

The tab is always visible in the nav bar — the `showApprovals` gate in `_layout.tsx` is removed. Content adapts based on `config.isManager`.

### How It Works

**Layout tab (`_layout.tsx`):**
- Remove the `showApprovals` conditional that hides the tab for contributors
- Rename the tab label from `"Approvals"` to `"Requests"`
- Tab icon (`checkmark.circle.fill`) retained

**Screen (`approvals.tsx`):**
- Reads `config.isManager` to determine which sections to render
- Always calls `useMyRequests()` (works for all roles)
- Calls `useApprovalItems()` unconditionally — hook returns empty for non-managers internally
- Renders a two-section layout (manager) or single-section layout (contributor)
- Top section — `TEAM REQUESTS`: existing `ApprovalCard` swipeable cards, unchanged
- Bottom section — `MY REQUESTS`: new `MyRequestCard` per-entry status cards, static (no swipe)
- Pull-to-refresh triggers both refetch calls when manager; only `myRefetch` for contributor
- Single scroll view wraps both sections — no segmented control or tab switch needed

**New Component (`MyRequestCard`):**
- Displays one `ManualRequestEntry`: date + duration on the left, memo text in center, status badge on the right
- Status badges: PENDING (gold), APPROVED (success green), REJECTED (critical red)
- REJECTED entries show the rejection reason as secondary text below the main row
- Empty rejection reason on REJECTED shows "No reason provided"
- No interactive gestures — read-only display card

### Architecture Fit

Builds directly on the data layer delivered by `01-my-requests-data`. Reuses all existing design system primitives: `Card`, `SectionLabel`, `SkeletonLoader`, `FadeInScreen`. The only new component is `MyRequestCard`, which is a pure presentational component with no API calls.

---

## Out of Scope

1. **Submitting new manual time requests in-app** — **Descoped:** Manual time submission happens in the Crossover web app. No in-app submission form or flow is planned for this feature.

2. **Overtime request tracking for contributors** — **Descoped:** The contributor-facing overtime API needs separate endpoint research not completed. `useMyRequests` covers manual time only; overtime remains manager-action-only for this spec.

3. **Push notifications for approval status changes** — **Descoped:** No websocket or background polling for status change events. Users see current status on pull-to-refresh. Notifications are a separate feature.

4. **Historical requests beyond the current week** — **Descoped:** Date range is Mon–today, matching `useMyRequests` hook behavior from `01-my-requests-data`. Showing previous weeks adds pagination complexity without meaningful MVP value.

5. **Swipeable gesture on `MyRequestCard`** — **Descoped:** `MyRequestCard` is a read-only status card. There is no action the contributor can take on a submitted entry. Swipe is reserved for the manager team-queue section (existing `ApprovalCard`).

6. **Segmented control / tab-switch between team and own requests** — **Descoped:** Agreed in spec-research Decision 3 to use a single scrollable two-section layout for managers. Segmented control adds state management complexity and hides one section entirely.

7. **Mixed-status indicator within a single request** — **Descoped:** When some slots in a group are approved and others pending (partial approval), the worst-case status is shown. No mixed-status badge or breakdown. Handled silently per `01-my-requests-data` decision.

8. **Renaming the screen file** — **Descoped:** `approvals.tsx` filename is retained. The tab label changes in `_layout.tsx`; the file name itself is left unchanged to avoid breaking any existing `href` references.

---

## Functional Requirements

### FR1: Always-Visible Tab (`_layout.tsx`)

Remove the `showApprovals` role gate from the tab layout so the Requests tab is always shown regardless of role.

**Changes to `app/(tabs)/_layout.tsx`:**
- Remove `const showApprovals = config?.isManager === true || config?.showApprovals === true`
- Remove `tabBarButton: showApprovals ? HapticTab : () => null` from the approvals tab options
- Change `title: 'Approvals'` to `title: 'Requests'`
- Remove `useConfig` import if it is no longer used after this change (verify no other usage in the file)

**Success Criteria:**
- SC1.1 — Approvals tab renders for contributor config (`isManager: false`)
- SC1.2 — Approvals tab renders for manager config (`isManager: true`)
- SC1.3 — Approvals tab renders when config is `null` (not yet loaded)
- SC1.4 — Tab title is `"Requests"` (not `"Approvals"`)
- SC1.5 — `showApprovals` variable no longer exists in `_layout.tsx` source

---

### FR2: `MyRequestCard` Component

New presentational component rendering a single `ManualRequestEntry` as a read-only status card.

**File:** `src/components/MyRequestCard.tsx`

**Props:** `{ entry: ManualRequestEntry }`

**Visual layout:**
- Left column: formatted date (`"Mon Mar 17"`) + duration (`"2.5h"` if ≥60min, `"30 min"` if <60min)
- Center: memo text, wraps to 2 lines max
- Right column: status badge pill

**Status badge colors (NativeWind tokens only):**
- `PENDING`: `bg-gold/20` background, `text-gold`
- `APPROVED`: `bg-success/20` background, `text-success`
- `REJECTED`: `bg-critical/20` background, `text-critical`

**Rejection reason row** (REJECTED only):
- Shown below main row as secondary text
- Text: `entry.rejectionReason` if non-null; `"No reason provided"` if null
- Color: `text-textSecondary`

**Success Criteria:**
- SC2.1 — PENDING entry: gold badge rendered, no rejection reason row
- SC2.2 — APPROVED entry: success green badge rendered
- SC2.3 — REJECTED entry: critical red badge rendered + rejection reason text visible
- SC2.4 — REJECTED with `rejectionReason: null`: shows `"No reason provided"`
- SC2.5 — Duration ≥ 60 min: formatted as hours (e.g. `"2.5h"` for 150 min)
- SC2.6 — Duration < 60 min: formatted as `"30 min"` (not `"0.5h"`)
- SC2.7 — Duration 0 min: shows `"0 min"` without crash
- SC2.8 — Long memo: truncated at 2 lines, no overflow crash
- SC2.9 — Source uses NativeWind tokens only (no `StyleSheet.create`, no hardcoded hex)

---

### FR3: Role-Aware `approvals.tsx` Screen

Rewrite `approvals.tsx` to show two sections (managers) or one section (contributors), removing the manager-only redirect.

**Changes to `app/(tabs)/approvals.tsx`:**
- Remove `useRouter` import and redirect `useEffect`
- Remove contributor redirect card (`"This screen is for managers"`)
- Call `useMyRequests()` unconditionally
- Call `useApprovalItems()` unconditionally (hook guards internally for non-managers)
- Header title changes from `"Approvals"` to `"Requests"`
- Manager layout: `TEAM REQUESTS` section (existing `ApprovalCard` list) above `MY REQUESTS` section
- Contributor layout: only `MY REQUESTS` section
- `Approve All` button visible only in manager section when team items exist
- Pull-to-refresh: calls both `teamRefetch` (if manager) and `myRefetch`

**Success Criteria:**
- SC3.1 — Contributor: only `MY REQUESTS` section renders; no `TEAM REQUESTS` section
- SC3.2 — Manager: both `TEAM REQUESTS` and `MY REQUESTS` sections render
- SC3.3 — `isManager: undefined` / `null`: treated as contributor (only `MY REQUESTS`)
- SC3.4 — Loading state: skeletons shown in the loading section(s)
- SC3.5 — Pull-to-refresh calls `myRefetch`; also calls `teamRefetch` when manager
- SC3.6 — Screen header shows `"Requests"` not `"Approvals"`
- SC3.7 — Source has no `useRouter` redirect logic

---

### FR4: Empty States

Empty states for both sections when there is no data to display.

**My Requests — empty:** "No requests this week" message card
**Team Requests — empty:** Existing "All caught up" card (already in `approvals.tsx`) — no change required

**Combined empty (contributor with no own requests):**
- Single empty state card: "No requests this week"

**Success Criteria:**
- SC4.1 — Contributor with empty `entries`: "No requests this week" text rendered
- SC4.2 — Manager with empty team queue: existing "All caught up" card in team section
- SC4.3 — Manager with empty own requests: "No requests this week" in MY REQUESTS section
- SC4.4 — Manager with both empty: both empty states render independently (not collapsed into one)

---

### FR5: Loading Skeletons

`SkeletonLoader` shown during initial data fetch for each section independently.

**Success Criteria:**
- SC5.1 — `myLoading && entries.length === 0`: skeletons in MY REQUESTS section
- SC5.2 — `teamLoading && items.length === 0` (manager): skeletons in TEAM REQUESTS section
- SC5.3 — Skeletons do not block each other (each section loads independently)

---

## Technical Design

### Files to Reference

| File | Why |
|------|-----|
| `app/(tabs)/_layout.tsx` | Tab gate to remove; tab label rename target |
| `app/(tabs)/approvals.tsx` | Screen to rewrite; existing manager logic to preserve |
| `src/hooks/useApprovalItems.ts` | Existing hook — keep signature, use unconditionally |
| `src/hooks/useMyRequests.ts` | New hook from 01-my-requests-data — drives MY REQUESTS section |
| `src/types/requests.ts` | `ManualRequestEntry`, `ManualRequestStatus` types from 01 |
| `src/components/ApprovalCard.tsx` | Existing swipeable card for team queue — unchanged |
| `src/components/Card.tsx` | Base container for `MyRequestCard` |
| `src/components/SectionLabel.tsx` | `"TEAM REQUESTS"` / `"MY REQUESTS"` section headers |
| `src/components/SkeletonLoader.tsx` | Loading placeholders in each section |
| `src/components/FadeInScreen.tsx` | Tab-switch fade animation wrapper |
| `src/lib/colors.ts` | Token reference for status badge colors |

### Files to Create

| File | Contents |
|------|----------|
| `src/components/MyRequestCard.tsx` | Presentational card for a single `ManualRequestEntry` with date/duration/memo/status badge |
| `src/components/__tests__/MyRequestCard.test.tsx` | Unit tests for `MyRequestCard` — all statuses, edge cases |
| `app/(tabs)/__tests__/approvals.test.tsx` | Integration tests for `ApprovalsScreen` — contributor vs manager, empty states, loading |

### Files to Modify

| File | Change |
|------|--------|
| `app/(tabs)/_layout.tsx` | Remove `showApprovals` gate; rename tab `"Approvals"` → `"Requests"` |
| `app/(tabs)/approvals.tsx` | Remove redirect; add `useMyRequests`; render two-section layout |

### Data Flow

```
app/(tabs)/approvals.tsx
  │
  ├── useConfig()
  │     └── isManager: boolean | undefined
  │
  ├── useMyRequests()  ─────────────────────────────────────────────┐
  │     └── entries: ManualRequestEntry[]                            │
  │         isLoading: boolean                                       │
  │         refetch()                                                │
  │                                                                  ▼
  │                                                        MyRequestCard (per entry)
  │                                                          ├── date + duration label
  │                                                          ├── memo text
  │                                                          └── status badge
  │                                                              (PENDING/APPROVED/REJECTED)
  │
  └── useApprovalItems() [returns empty for non-managers]
        └── items: ApprovalItem[]
            approveItem / rejectItem / approveAll
            refetch()
                │
                ▼
            ApprovalCard (per item) — existing, unchanged
              [rendered only when isManager === true]
```

### Conditional Rendering Pattern

Both hooks are called unconditionally to respect React's rules of hooks. `useApprovalItems` already returns `[]` for non-managers at the query-fn level. The manager section is gated in JSX via `{isManager && (...)}`.

```typescript
const isManager = config?.isManager === true;

const { entries, isLoading: myLoading, error: myError, refetch: myRefetch } = useMyRequests();
const { items, isLoading: teamLoading, error: teamError,
        approveItem, rejectItem, approveAll, refetch: teamRefetch } = useApprovalItems();
```

### Duration Formatting (inline in `MyRequestCard.tsx`)

```
formatDuration(minutes: number): string
  if minutes < 60: "{minutes} min"
  else: "{(minutes/60 rounded to 1 decimal)}h"
```

### Date Formatting (inline in `MyRequestCard.tsx`)

```
formatEntryDate(dateStr: string): string
  // dateStr = YYYY-MM-DD
  // Append T12:00:00 to parse in local timezone (avoids midnight UTC shift)
  new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' })
  // → "Mon, Mar 17"
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `config` not yet loaded (null) | `isManager` resolves to `false` → contributor view until config loads |
| `isManager: undefined` | `config?.isManager === true` is `false` → contributor view |
| Both sections loading simultaneously | Each section shows its own skeletons independently |
| Team section fetch error | Existing error banner retained; shown above team section |
| My requests `error: 'auth'` | Error banner above MY REQUESTS: "Authentication error. Please re-open app." |
| My requests `error: 'network'` | Error banner above MY REQUESTS: "Could not load requests." with retry |
| Zero duration entry | `formatDuration(0)` → `"0 min"` — no crash |
| Rejection reason `null` | `MyRequestCard` shows `"No reason provided"` |
| Long memo (100+ chars) | `numberOfLines={2}` on memo Text — ellipsis truncation |
| Manager with no team items | "All caught up" in TEAM REQUESTS; MY REQUESTS shows own entries normally |

### Test Mocks Required

| Mock | Used In |
|------|---------|
| `jest.mock('@/src/hooks/useConfig')` | `approvals.test.tsx` |
| `jest.mock('@/src/hooks/useMyRequests')` | `approvals.test.tsx` |
| `jest.mock('@/src/hooks/useApprovalItems')` | `approvals.test.tsx` |
| `jest.mock('expo-router', ...)` | `approvals.test.tsx` (for router deps) |
| `ManualRequestEntry` fixtures (PENDING / APPROVED / REJECTED) | Both test files |

### No New Dependencies

This spec introduces no new npm packages or API endpoints.
