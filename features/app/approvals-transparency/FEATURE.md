# Feature: Approvals Transparency

## Feature ID

`approvals-transparency`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Approvals Transparency |
| **Contributors** | @trilogy |

## Files Touched

### Hooks
- `src/hooks/useMyRequests.ts` (new)

### Types
- `src/types/requests.ts` (new)

### Screens
- `app/(tabs)/approvals.tsx` (modify — role-aware view)

### Navigation
- `app/(tabs)/_layout.tsx` (modify — show tab for all users)

## Table of Contents

- [Feature Overview](#feature-overview)
- [Intended State](#intended-state)
- [System Architecture](#system-architecture)
- [Changelog of Feature Specs](#changelog-of-feature-specs)

## Feature Overview

### Summary

The approvals tab becomes visible to all users. Contributors can see the status of their own submitted manual time requests (Pending / Approved / Rejected). Managers see both: their team's pending queue to act on, and their own submitted requests to track.

### Problem Statement

Contributors currently have no visibility into manual time they have submitted for approval. Once they log time and submit it, there's no in-app indication of whether it's pending, approved, or rejected. This creates confusion and erodes trust. Managers who are also contributors (submitting time to their own managers) have the same blindspot.

### Goals

- All users can see the status of their own submitted manual time requests
- Managers retain full access to their team approval queue
- The approvals tab is always visible regardless of role
- Status is clearly communicated: Pending (waiting), Approved (green), Rejected (red + reason)

### Non-Goals

- Submitting new manual time requests from within the app — out of scope (done in the Crossover web app)
- Overtime request tracking for contributors — deferred, needs endpoint research
- Push notifications for approval status changes — separate notifications feature

## Intended State

When complete, the 4th tab ("Requests") is visible to all users:

**Contributors see:**
- A list of all manual time entries submitted this week, each showing:
  - Date and duration (e.g., "Mon, Mar 17 — 2.5h")
  - Description/memo (what they submitted)
  - Status badge: PENDING (gold), APPROVED (green), REJECTED (red)
  - If REJECTED: the manager's rejection reason shown inline

**Managers see two sections:**
- **Team requests** (top): the existing approval queue — swipeable cards to approve/reject their team's entries
- **My requests** (bottom): same as the contributor view above — their own submitted entries and status

**Both views:**
- Pull-to-refresh
- Empty state when nothing submitted
- Loading skeletons on initial fetch

### Key Behaviors

1. **Always visible tab**: The 4th tab shows for every user. `showApprovals` logic in `_layout.tsx` removed; tab always renders.
2. **Role-aware content**: `approvals.tsx` checks `config.isManager` and renders the appropriate sections.
3. **Work diary as source of truth**: Manual request status comes from `autoTracker === false` slots in the work diary API — no new API endpoints needed.
4. **Entry grouping**: Multiple slots with the same memo + date are grouped into a single request entry (10-min slots → hours total).
5. **Rejection reason surfaced**: The `actions` array on work diary slots contains manager comments; shown when status is REJECTED.

## System Architecture

### Component Structure

```
app/(tabs)/approvals.tsx
  ├── [if manager] TeamApprovalsSection
  │     └── existing ApprovalCard components (swipeable)
  └── [always] MyRequestsSection
        └── MyRequestCard (new) — date, hours, memo, status badge
```

### Data Flow

```
approvals.tsx
  ├── useApprovalItems()  ←  /api/timetracking/workdiaries/manual/pending
  │   (manager only)         /api/overtime/request?status=PENDING
  │
  └── useMyRequests()     ←  /api/timetracking/workdiaries?assignmentId=&date=
      (all users)             (per-day fetch, Mon–today, filter autoTracker===false)
```

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-15 | [01-my-requests-data](specs/01-my-requests-data/spec.md) | useMyRequests hook + ManualRequestEntry types |
| 2026-03-15 | [02-approvals-tab-redesign](specs/02-approvals-tab-redesign/spec-research.md) | Role-aware tab UI, always-visible, contributor + manager views |
