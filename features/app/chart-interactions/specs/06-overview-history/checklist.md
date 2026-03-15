# Implementation Checklist

Spec: `06-overview-history`
Feature: `chart-interactions`

---

## Phase 1.0: Test Foundation

### FR1: WeeklySnapshot type and weeklyHistory.ts pure functions

- [ ] Write test: `mergeWeeklySnapshot` — new weekStart appended to empty history with defaults for missing fields
- [ ] Write test: `mergeWeeklySnapshot` — new weekStart appended to non-empty history
- [ ] Write test: `mergeWeeklySnapshot` — existing weekStart merges only provided fields (other fields unchanged)
- [ ] Write test: `mergeWeeklySnapshot` — existing weekStart second write wins for written fields
- [ ] Write test: `mergeWeeklySnapshot` — history trimmed to 12 when 13 entries exist (oldest removed)
- [ ] Write test: `mergeWeeklySnapshot` — result sorted ascending by weekStart
- [ ] Write test: `mergeWeeklySnapshot` — does not mutate input array
- [ ] Write test: `loadWeeklyHistory` — save then load returns same data
- [ ] Write test: `loadWeeklyHistory` — empty AsyncStorage returns `[]`
- [ ] Write test: `loadWeeklyHistory` — corrupted AsyncStorage value returns `[]` gracefully
- [ ] Write test: `loadWeeklyHistory` — non-array JSON value returns `[]`
- [ ] Write test: `saveWeeklyHistory` — writes and is readable via load
- [ ] Write test: `WEEKLY_HISTORY_KEY` and `WEEKLY_HISTORY_MAX` are exported with correct values

### FR2: useWeeklyHistory hook

- [ ] Write test: returns `{ snapshots: [], isLoading: true }` on first render (before AsyncStorage resolves)
- [ ] Write test: returns `isLoading: false` and populated `snapshots` after AsyncStorage resolves
- [ ] Write test: returns `{ snapshots: [], isLoading: false }` on first-ever launch (no persisted data)
- [ ] Write test: returns `{ snapshots: [], isLoading: false }` if AsyncStorage throws (silent failure)

### FR3: useEarningsHistory writes weekly_history_v2

- [ ] Write test: after successful payment fetch, `weekly_history_v2` is written with `{ weekStart, earnings, hours }` for each week
- [ ] Write test: failure to write `weekly_history_v2` does not affect `trend` return value
- [ ] Write test: existing `earnings_history_v1` write is unchanged

### FR4: useAIData flushes AI snapshot on Monday

- [ ] Write test: on Monday with `taggedSlots > 0`, `weekly_history_v2` written with `{ weekStart: prevWeekStart, aiPct, brainliftHours }`
- [ ] Write test: `prevWeekStart` is correctly the Monday 7 days before current Monday
- [ ] Write test: on non-Monday, no flush to `weekly_history_v2`
- [ ] Write test: on Monday with `taggedSlots === 0`, no flush to `weekly_history_v2`
- [ ] Write test: flush failure is silent (does not affect `data` return value)

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

### FR1: WeeklySnapshot type and weeklyHistory.ts pure functions

- [ ] Create `hourglassws/src/lib/weeklyHistory.ts`
- [ ] Define and export `WeeklySnapshot` interface with fields: `weekStart`, `hours`, `earnings`, `aiPct`, `brainliftHours`
- [ ] Export `WEEKLY_HISTORY_KEY = 'weekly_history_v2'` and `WEEKLY_HISTORY_MAX = 12`
- [ ] Implement `mergeWeeklySnapshot(history, partial)` per algorithm in spec
- [ ] Implement `loadWeeklyHistory()` — reads AsyncStorage, returns `[]` on any error
- [ ] Implement `saveWeeklyHistory(snapshots)` — writes to AsyncStorage, propagates errors
- [ ] Confirm `Payment` type has `paidHours` field; add it if missing

### FR2: useWeeklyHistory hook

- [ ] Create `hourglassws/src/hooks/useWeeklyHistory.ts`
- [ ] Initialize state: `snapshots: []`, `isLoading: true`
- [ ] On mount, call `loadWeeklyHistory()`, set `snapshots` and `isLoading: false`
- [ ] Catch AsyncStorage errors: set `snapshots: []`, `isLoading: false`
- [ ] Return `{ snapshots, isLoading }`

### FR3: Extend useEarningsHistory to write weekly_history_v2

- [ ] Modify `hourglassws/src/hooks/useEarningsHistory.ts`
- [ ] In the `useEffect` that processes `payments`, also build `hoursMap` keyed by `periodStartDate`
- [ ] After saving `earnings_history_v1`, load `weekly_history_v2`, merge weeks, save
- [ ] Wrap `weekly_history_v2` write in try/catch (silent failure)

### FR4: Extend useAIData to flush AI snapshot on Monday

- [ ] Modify `hourglassws/src/hooks/useAIData.ts`
- [ ] In the `isMonday && freshData.taggedSlots > 0` block, compute `prevWeekStart` (currentMonday - 7 days)
- [ ] Load `weekly_history_v2`, call `mergeWeeklySnapshot` with AI snapshot, save
- [ ] Wrap in try/catch (silent failure)

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
- [ ] Commit fixes: `fix(06-overview-history): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(06-overview-history): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns (`useEarningsHistory` / `useAIData` patterns)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-15**: Spec and checklist created. Ready for implementation.
