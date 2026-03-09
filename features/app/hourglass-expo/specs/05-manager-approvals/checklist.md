# Checklist: 05-manager-approvals

## Phase 5.0 — Tests (Red Phase)

### FR1: Types and Parser Library

- [x] `test(FR1)`: `parseManualItems` flattens user.manualTimes[] into flat ApprovalItem list
- [x] `test(FR1)`: `parseManualItems` generates correct id `mt-{timecardIds.join('-')}`
- [x] `test(FR1)`: `parseManualItems` calculates hours `(durationMinutes/60).toFixed(1)`
- [x] `test(FR1)`: `parseManualItems` handles user with multiple manualTimes entries (N entries → N items)
- [x] `test(FR1)`: `parseOvertimeItems` extracts candidate info from nested assignment path
- [x] `test(FR1)`: `parseOvertimeItems` generates id `ot-{overtimeRequest.id}`
- [x] `test(FR1)`: `parseOvertimeItems` calculates cost `(durationMinutes/60) * assignment.salary`
- [x] `test(FR1)`: `ManualApprovalItem` and `OvertimeApprovalItem` types compile without errors
- [x] `test(FR1)`: `getWeekStartDate` returns Monday of current week in YYYY-MM-DD using local timezone (not UTC)

### FR2: API Functions

- [x] `test(FR2)`: `fetchPendingManual` calls correct GET endpoint with weekStartDate param
- [x] `test(FR2)`: `fetchPendingOvertime` calls correct GET endpoint with status=PENDING and weekStartDate
- [x] `test(FR2)`: `approveManual` calls PUT with body `{approverId, timecardIds, allowOvertime: false}`
- [x] `test(FR2)`: `rejectManual` calls PUT with body `{approverId, timecardIds, rejectionReason}`
- [x] `test(FR2)`: `approveOvertime` calls PUT `/api/overtime/request/approval/{overtimeId}` with empty body
- [x] `test(FR2)`: `rejectOvertime` calls PUT with body `{memo}`
- [x] `test(FR2)`: all functions use QA base URL when useQA === true
- [x] `test(FR2)`: all functions throw ApiError on non-2xx response

### FR3: useApprovalItems Hook

- [x] `test(FR3)`: `approveItem` calls `approveManual` for MANUAL items with correct approverId
- [x] `test(FR3)`: `approveItem` calls `approveOvertime` for OVERTIME items
- [x] `test(FR3)`: `approveItem` removes item from list optimistically
- [x] `test(FR3)`: `approveItem` re-fetches list after success
- [x] `test(FR3)`: `rejectItem` calls `rejectManual` for MANUAL with rejectionReason
- [x] `test(FR3)`: `rejectItem` calls `rejectOvertime` for OVERTIME with memo
- [x] `test(FR3)`: `rejectItem` throws when reason is empty string
- [x] `test(FR3)`: `approveAll` calls approveItem for each item (Promise.allSettled — continues on failure)
- [x] `test(FR3)`: hook returns `{items: [], isLoading: false}` when `config.isManager === false`
- [x] `test(FR3)`: merged items sorted by startDateTime descending

### FR4: ApprovalCard Component

- [x] `test(FR4)`: renders fullName, hours, description
- [x] `test(FR4)`: renders WEB/MOBILE type badge for MANUAL items
- [x] `test(FR4)`: renders formatted cost for OVERTIME items
- [x] `test(FR4)`: swipe right triggers onApprove callback
- [x] `test(FR4)`: swipe left triggers onReject callback

### FR5: RejectionSheet Component

- [x] `test(FR5)`: renders with pre-filled "Not approved" text
- [x] `test(FR5)`: Confirm button disabled when input is empty
- [x] `test(FR5)`: Confirm button disabled when input is whitespace-only
- [x] `test(FR5)`: onConfirm called with current text value on Confirm press
- [x] `test(FR5)`: Cancel press closes sheet without calling onConfirm

### FR6: Approvals Screen

- [x] `test(FR6)`: redirects to /(tabs)/hours when isManager === false
- [x] `test(FR6)`: shows count badge with number of pending items
- [x] `test(FR6)`: shows "Approve All" button when items.length > 0
- [x] `test(FR6)`: hides "Approve All" button when items.length === 0
- [x] `test(FR6)`: shows loading spinner when isLoading === true
- [x] `test(FR6)`: shows "All caught up" when items is empty and not loading

---

## Phase 5.1 — Implementation

### FR1: Types and Parser Library

- [x] `feat(FR1)`: Create `src/lib/approvals.ts` with `ManualApprovalItem`, `OvertimeApprovalItem`, `ApprovalItem` types
- [x] `feat(FR1)`: Implement `parseManualItems(raw: RawManualResponse[]): ManualApprovalItem[]`
- [x] `feat(FR1)`: Implement `parseOvertimeItems(raw: RawOvertimeResponse[]): OvertimeApprovalItem[]`
- [x] `feat(FR1)`: Implement `getWeekStartDate(): string` (local timezone, Mon–Sun)
- [ ] `feat(FR1)`: All FR1 tests pass

### FR2: API Functions

- [x] `feat(FR2)`: Create `src/api/approvals.ts` with all 6 typed functions
- [x] `feat(FR2)`: Implement `fetchPendingManual`
- [x] `feat(FR2)`: Implement `fetchPendingOvertime`
- [x] `feat(FR2)`: Implement `approveManual`
- [x] `feat(FR2)`: Implement `rejectManual`
- [x] `feat(FR2)`: Implement `approveOvertime`
- [x] `feat(FR2)`: Implement `rejectOvertime`
- [ ] `feat(FR2)`: All FR2 tests pass

### FR3: useApprovalItems Hook

- [x] `feat(FR3)`: Create `src/hooks/useApprovalItems.ts`
- [x] `feat(FR3)`: Implement parallel fetch + merge + sort
- [x] `feat(FR3)`: Implement `approveItem` with optimistic update + restore on failure
- [x] `feat(FR3)`: Implement `rejectItem` with empty reason guard
- [x] `feat(FR3)`: Implement `approveAll` with Promise.allSettled
- [x] `feat(FR3)`: Early return when isManager === false
- [ ] `feat(FR3)`: All FR3 tests pass

### FR4: ApprovalCard Component

- [x] `feat(FR4)`: Create `src/components/ApprovalCard.tsx`
- [x] `feat(FR4)`: Implement swipe gesture handlers (react-native-gesture-handler)
- [x] `feat(FR4)`: Render type badge for MANUAL, cost for OVERTIME
- [x] `feat(FR4)`: Add accessibilityLabel props
- [ ] `feat(FR4)`: All FR4 tests pass

### FR5: RejectionSheet Component

- [x] `feat(FR5)`: Create `src/components/RejectionSheet.tsx`
- [x] `feat(FR5)`: Implement bottom sheet with pre-filled input (Modal fallback if @gorhom/bottom-sheet not available)
- [x] `feat(FR5)`: Disable Confirm when input empty/whitespace
- [ ] `feat(FR5)`: All FR5 tests pass

### FR6: Approvals Screen

- [x] `feat(FR6)`: Create `app/(tabs)/approvals.tsx`
- [x] `feat(FR6)`: Implement role guard redirect
- [x] `feat(FR6)`: Render list with ApprovalCard, count badge, Approve All
- [x] `feat(FR6)`: Implement pull-to-refresh
- [x] `feat(FR6)`: Wire RejectionSheet for swipe-left flow
- [x] `feat(FR6)`: Modify `app/(tabs)/_layout.tsx` to hide approvals tab for contributors
- [ ] `feat(FR6)`: All FR6 tests pass
- [ ] All tests pass (full suite)

---

## Phase 5.2 — Review

- [ ] Run `spec-implementation-alignment`: verify all FR success criteria met
- [ ] Run `pr-review-toolkit:review-pr`: address any feedback
- [ ] Run `test-optimiser`: remove redundant tests, improve coverage where needed
- [ ] Final test suite passes
- [ ] Commit documentation: update checklist.md + FEATURE.md changelog

---

## Session Notes

<!-- Added by spec-executor after completion -->
