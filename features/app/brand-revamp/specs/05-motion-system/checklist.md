# Checklist: 05-motion-system

## Phase 5.0 — Tests (Red Phase)

Tests already exist at `hourglassws/src/hooks/__tests__/useStaggeredEntry.test.ts`.
They are partially failing (FR3: ai.tsx has 9 failures). Tests are authoritative — no new test files needed.

- [x] FR1 tests: useStaggeredEntry hook interface — PASSING (56/65 tests pass)
- [x] FR2 tests: Home screen (index.tsx) integration — PASSING
- [ ] FR3 tests: AI screen (ai.tsx) integration — FAILING (9 failures, needs implementation)
- [x] FR4 tests: Approvals screen (approvals.tsx) integration — PASSING
- [x] FR5 tests: Overview screen (overview.tsx) integration — PASSING

## Phase 5.1 — Implementation

### FR1: useStaggeredEntry hook (already complete)
- [x] `src/hooks/useStaggeredEntry.ts` exists with correct exports
- [x] springBouncy + STAGGER_MS=50 + TRANSLATE_Y_START=16
- [x] useIsFocused focus trigger with reset + re-fire
- [x] useReducedMotion accessibility branch
- [x] maxStaggerIndex cap with Math.min

### FR2: Home screen (already complete)
- [x] `app/(tabs)/index.tsx` imports useStaggeredEntry
- [x] Calls useStaggeredEntry({ count: 4 })
- [x] getEntryStyle(0) on hero PanelGradient
- [x] getEntryStyle(1) on weekly chart Card
- [x] getEntryStyle(2) on AI Trajectory card
- [x] getEntryStyle(3) on Earnings card
- [x] Exactly 4 getEntryStyle calls (UrgencyBanner excluded)

### FR3: AI screen (needs implementation — only failing FR)
- [ ] `app/(tabs)/ai.tsx` imports useStaggeredEntry from @/src/hooks/useStaggeredEntry
- [ ] Calls useStaggeredEntry({ count: 6 })
- [ ] getEntryStyle(0) wraps AIArcHero
- [ ] getEntryStyle(1) wraps Prime Radiant card (setTag wrapper)
- [ ] getEntryStyle(2) wraps Daily Breakdown card (inside conditional)
- [ ] getEntryStyle(3) wraps 12-Week Trajectory card (inside conditional)
- [ ] getEntryStyle(4) wraps Legend ("How it's calculated") card
- [ ] getEntryStyle(5) wraps last-fetched timestamp/footer
- [ ] Exactly 6 getEntryStyle(\d+) calls in file

### FR4: Approvals screen (already complete)
- [x] `app/(tabs)/approvals.tsx` imports useStaggeredEntry
- [x] Calls useStaggeredEntry({ count: 2 })
- [x] getEntryStyle(0) on Team Requests section
- [x] getEntryStyle(isManager ? 1 : 0) on My Requests section
- [x] renderApprovalItem function does NOT call getEntryStyle
- [x] Exactly 2 getEntryStyle call sites

### FR5: Overview screen (already complete)
- [x] `app/(tabs)/overview.tsx` imports useStaggeredEntry
- [x] Calls useStaggeredEntry({ count: 4 })
- [x] getEntryStyle(0) on Earnings ChartSection
- [x] getEntryStyle(1) on Hours ChartSection
- [x] getEntryStyle(2) on AI Usage ChartSection
- [x] getEntryStyle(3) on BrainLift ChartSection
- [x] Exactly 4 getEntryStyle(\d+) calls
- [x] panelStyle still used for scrub snapshot panel
- [x] 4W/12W toggle NOT wrapped with getEntryStyle

## Phase 5.2 — Review

- [ ] Run full test suite: `cd hourglassws && npx jest useStaggeredEntry --no-coverage` → all 65 tests pass
- [ ] spec-implementation-alignment check
- [ ] pr-review-toolkit:review-pr
- [ ] test-optimiser

## Commit Discipline

- test phase: tests already exist (committed by prior work)
- feat(FR3): apply useStaggeredEntry to ai.tsx — `app/(tabs)/ai.tsx` only
