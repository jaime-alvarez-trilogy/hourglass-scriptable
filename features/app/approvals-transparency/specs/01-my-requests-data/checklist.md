# Implementation Checklist

Spec: `01-my-requests-data`
Feature: `approvals-transparency`

---

## Phase 1.0: Test Foundation

### FR1: Types for Manual Request Data
- [ ] Write tests verifying `ManualRequestEntry.id` format is `"{date}|{memo}"`
- [ ] Write tests verifying `ManualRequestStatus` union type (`PENDING | APPROVED | REJECTED`)
- [ ] Write tests verifying `UseMyRequestsResult.error` is constrained to `'auth' | 'network' | null`
- [ ] Write type-level tests (compile-time assertions) that TypeScript accepts valid shapes and rejects invalid ones

### FR2: `extractRejectionReason` Utility
- [ ] Write test: action with `REJECT_MANUAL_TIME` and non-empty comment → returns comment string
- [ ] Write test: no rejection action present → returns `null`
- [ ] Write test: empty actions array → returns `null`
- [ ] Write test: rejection action with empty string comment → returns `null`
- [ ] Write test: multiple actions, only one is rejection → returns rejection comment
- [ ] Write test: does not throw for any valid input

### FR3: `groupSlotsIntoEntries` Utility
- [ ] Write test: two slots with same memo → one entry with `durationMinutes: 20`
- [ ] Write test: three slots with three distinct memos → three entries returned
- [ ] Write test: empty slots array → returns `[]`
- [ ] Write test: all slots have `autoTracker: true` → returns `[]`
- [ ] Write test: slot with `undefined` memo → normalized to `""`, no throw
- [ ] Write test: single slot → one entry with `durationMinutes: 10`
- [ ] Write test: group with APPROVED + REJECTED slots → entry status is `REJECTED`
- [ ] Write test: group with APPROVED + PENDING slots → entry status is `PENDING`
- [ ] Write test: entry `id` is `"{date}|{memo}"` composite key

### FR4: `useMyRequests` Hook
- [ ] Write test: returns entries sorted by date descending
- [ ] Write test: fetches exactly Mon–today date range
- [ ] Write test: today is Monday → fetches only 1 day
- [ ] Write test: missing `assignmentId` → returns empty entries, no error
- [ ] Write test: auth failure (401) → `error: 'auth'`
- [ ] Write test: network failure → `error: 'network'`
- [ ] Write test: one day fetch fails, others succeed → available days returned, no error thrown
- [ ] Write test: no manual entries this week → `entries: []`, `error: null`
- [ ] Write test: `refetch` function is callable and triggers re-query

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

### FR1: Types for Manual Request Data
- [ ] Create `src/types/requests.ts`
- [ ] Export `ManualRequestStatus` type union
- [ ] Export `ManualRequestEntry` interface with all fields
- [ ] Export `UseMyRequestsResult` interface with constrained `error` type
- [ ] Verify TypeScript compiles without errors

### FR2: `extractRejectionReason` Utility
- [ ] Create `src/lib/requestsUtils.ts`
- [ ] Implement `extractRejectionReason(actions: SlotAction[]): string | null`
- [ ] Import `SlotAction` from `src/types/api.ts`
- [ ] Handle empty array, missing action, and empty comment cases

### FR3: `groupSlotsIntoEntries` Utility
- [ ] Implement `groupSlotsIntoEntries(slots: WorkDiarySlot[], date: string): ManualRequestEntry[]` in `src/lib/requestsUtils.ts`
- [ ] Filter `autoTracker === false` slots
- [ ] Group by memo (normalize `undefined` → `""`)
- [ ] Compute worst-case status: REJECTED > PENDING > APPROVED
- [ ] Call `extractRejectionReason` for REJECTED entries
- [ ] Generate composite `id` as `"{date}|{memo}"`

### FR4: `useMyRequests` Hook
- [ ] Create `src/hooks/useMyRequests.ts`
- [ ] Call `loadConfig()` for `assignmentId`, credentials, `useQA`
- [ ] Guard early return when `assignmentId` is missing
- [ ] Use `getWeekStartDate()` and build Mon–today date array
- [ ] Call `fetchWorkDiary` per date via `Promise.allSettled`
- [ ] Apply `groupSlotsIntoEntries` to each fulfilled result
- [ ] Flatten, sort by date descending
- [ ] Map 401/403 errors to `'auth'`, network errors to `'network'`
- [ ] Configure TanStack Query: `queryKey: ['myRequests', assignmentId]`, `staleTime: 60_000`, `enabled: !!assignmentId`
- [ ] Export `useMyRequests` from hook file

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
- [ ] Commit fixes: `fix(01-my-requests-data): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-my-requests-data): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns (matches `useAIData.ts` structure)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec created. Research complete — no open questions. 4 FRs defined: types (FR1), extractRejectionReason (FR2), groupSlotsIntoEntries (FR3), useMyRequests hook (FR4). FR2 and FR3 are independent (Wave 1); FR4 depends on FR2+FR3 (Wave 2).
