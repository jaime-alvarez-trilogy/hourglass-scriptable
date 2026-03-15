# Implementation Checklist

Spec: `02-approvals-tab-redesign`
Feature: `approvals-transparency`

---

## Phase 2.0: Test Foundation

### FR1: Always-Visible Tab (`_layout.tsx`)
- [ ] Write test: tab renders for contributor config (`isManager: false`) — SC1.1
- [ ] Write test: tab renders for manager config (`isManager: true`) — SC1.2
- [ ] Write test: tab renders when config is `null` (not yet loaded) — SC1.3
- [ ] Write source-file static test: title is `"Requests"` not `"Approvals"` — SC1.4
- [ ] Write source-file static test: `showApprovals` variable absent from `_layout.tsx` — SC1.5

### FR2: `MyRequestCard` Component
- [ ] Write test: PENDING entry renders gold badge, no rejection reason row — SC2.1
- [ ] Write test: APPROVED entry renders success green badge — SC2.2
- [ ] Write test: REJECTED entry renders critical red badge + rejection reason text — SC2.3
- [ ] Write test: REJECTED with `rejectionReason: null` shows `"No reason provided"` — SC2.4
- [ ] Write test: duration ≥ 60 min formatted as hours (150 min → `"2.5h"`) — SC2.5
- [ ] Write test: duration < 60 min formatted as `"30 min"` — SC2.6
- [ ] Write test: duration 0 min shows `"0 min"` without crash — SC2.7
- [ ] Write test: component renders without crash for long memo — SC2.8
- [ ] Write source-file static test: no `StyleSheet.create`, no hardcoded hex values — SC2.9

### FR3: Role-Aware `approvals.tsx` Screen
- [ ] Write test: contributor — only MY REQUESTS section renders, no TEAM REQUESTS — SC3.1
- [ ] Write test: manager — both TEAM REQUESTS and MY REQUESTS sections render — SC3.2
- [ ] Write test: `isManager: undefined` treated as contributor — SC3.3
- [ ] Write test: loading state — skeletons shown in loading section(s) — SC3.4
- [ ] Write test: pull-to-refresh calls `myRefetch`; also `teamRefetch` when manager — SC3.5
- [ ] Write source-file static test: header shows `"Requests"` not `"Approvals"` — SC3.6
- [ ] Write source-file static test: no `useRouter` redirect logic — SC3.7

### FR4: Empty States
- [ ] Write test: contributor with empty entries shows `"No requests this week"` — SC4.1
- [ ] Write test: manager with empty team queue shows `"All caught up"` in team section — SC4.2
- [ ] Write test: manager with empty own requests shows `"No requests this week"` in MY REQUESTS — SC4.3
- [ ] Write test: manager with both empty — both empty states render independently — SC4.4

### FR5: Loading Skeletons
- [ ] Write test: `myLoading && entries.length === 0` → skeletons in MY REQUESTS — SC5.1
- [ ] Write test: `teamLoading && items.length === 0` (manager) → skeletons in TEAM REQUESTS — SC5.2

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 2.1: Implementation

### FR1: Always-Visible Tab (`_layout.tsx`)
- [ ] Remove `const showApprovals = ...` line
- [ ] Remove `tabBarButton: showApprovals ? HapticTab : () => null` from approvals tab options
- [ ] Change `title: 'Approvals'` to `title: 'Requests'`
- [ ] Remove `useConfig` import if no longer used in `_layout.tsx`
- [ ] Verify no other `showApprovals` usage remains in file

### FR2: `MyRequestCard` Component
- [ ] Create `src/components/MyRequestCard.tsx`
- [ ] Implement `formatDuration(minutes)` inline helper
- [ ] Implement `formatEntryDate(dateStr)` inline helper
- [ ] Implement status badge with correct NativeWind tokens per status
- [ ] Implement rejection reason row (REJECTED only, "No reason provided" fallback)
- [ ] Verify no `StyleSheet.create`, no hardcoded hex colors

### FR3: Role-Aware `approvals.tsx` Screen
- [ ] Remove `useRouter` import and redirect `useEffect`
- [ ] Remove contributor redirect card render
- [ ] Add `useMyRequests()` call (unconditional)
- [ ] Verify `useApprovalItems()` remains unconditional (already present)
- [ ] Change screen header title from `"Approvals"` to `"Requests"`
- [ ] Add `isManager` derivation from config
- [ ] Implement TEAM REQUESTS section: `{isManager && ...}` gate around existing ApprovalCard list
- [ ] Add `SectionLabel` for `"TEAM REQUESTS"` heading
- [ ] Add MY REQUESTS section (always rendered)
- [ ] Add `SectionLabel` for `"MY REQUESTS"` heading
- [ ] Render `MyRequestCard` per entry in MY REQUESTS section
- [ ] Update pull-to-refresh to call both refetches (teamRefetch only if manager)

### FR4: Empty States
- [ ] Add "No requests this week" empty state card in MY REQUESTS section
- [ ] Verify existing "All caught up" card in TEAM REQUESTS section remains intact
- [ ] Confirm both empty states render independently for manager with no data

### FR5: Loading Skeletons
- [ ] Add `SkeletonLoader` cards in MY REQUESTS section when `myLoading && entries.length === 0`
- [ ] Add `SkeletonLoader` cards in TEAM REQUESTS section when `teamLoading && items.length === 0`
- [ ] Confirm sections load and display skeletons independently

---

## Phase 2.2: Review (MANDATORY)

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
- [ ] Commit fixes: `fix(02-approvals-tab-redesign): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(02-approvals-tab-redesign): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec created. Depends on 01-my-requests-data (complete). Ready for implementation.
