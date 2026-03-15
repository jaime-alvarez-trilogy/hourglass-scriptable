# Checklist: 01-cone-math

**Spec:** `features/app/prime-radiant/specs/01-cone-math/spec.md`
**Feature:** Prime Radiant — AI Possibility Cone

---

## Phase 1.0 — Tests (Red Phase)

Write all tests first. Tests must fail before implementation begins.

### FR2 — `computeActualPoints`

- [x] `test(FR2)`: empty array → returns `[{ hoursX: 0, pctY: 0 }]`
- [x] `test(FR2)`: 3 days elapsed → returns 4 points (origin + one per day)
- [x] `test(FR2)`: 100% AI all days → all pctY values approach 100%
- [x] `test(FR2)`: 0% AI all days (all tagged, no AI) → all pctY = 0
- [x] `test(FR2)`: all slots untagged → pctY = 0, no division error
- [x] `test(FR2)`: day with 0 total slots → no division error, same pctY as prior day
- [x] `test(FR2)`: null entry in array → skipped gracefully

### FR3 — `computeCone`

- [x] `test(FR3)`: `weeklyLimit <= 0` → returns `{ upper: [], lower: [] }`
- [x] `test(FR3)`: `currentHours >= weeklyLimit` → returns `{ upper: [], lower: [] }`
- [x] `test(FR3)`: mid-week → upper final > currentAIPct, lower final < currentAIPct
- [x] `test(FR3)`: start of week (all zeros) → upper = 100%, lower = 0%
- [x] `test(FR3)`: upper formula exceeds 100% → clamped to 100%
- [x] `test(FR3)`: lower formula below 0% → clamped to 0%
- [x] `test(FR3)`: near end of week → upper and lower converge toward currentAIPct

### FR4 — `computeAICone`

- [x] `test(FR4)`: Monday morning (empty breakdown) → actualPoints = `[{0,0}]`, full cone
- [x] `test(FR4)`: mid-week data → actualPoints has N+1 points, cone spans from current to limit
- [x] `test(FR4)`: `targetPct` always 75 in output
- [x] `test(FR4)`: `isTargetAchievable = true` when upper bound final >= 75
- [x] `test(FR4)`: `isTargetAchievable = false` when upper bound final < 75
- [x] `test(FR4)`: `weeklyLimit = 0` → empty cone, no crash
- [x] `test(FR4)`: `currentHours > weeklyLimit` (overtime) → cone collapsed, `isTargetAchievable` based on currentAIPct

---

## Phase 1.1 — Implementation

Implement minimum code to make all Phase 1.0 tests pass.

### FR1 — Types

- [x] `feat(FR1)`: export `ConePoint` interface (`hoursX: number`, `pctY: number`)
- [x] `feat(FR1)`: export `ConeData` interface with all 8 fields

### FR2 — `computeActualPoints`

- [x] `feat(FR2)`: implement function with cumulative slot aggregation
- [x] `feat(FR2)`: always prepend `{ hoursX: 0, pctY: 0 }`
- [x] `feat(FR2)`: guard for `taggedSlots === 0` (no division)
- [x] `feat(FR2)`: skip null/undefined entries

### FR3 — `computeCone`

- [x] `feat(FR3)`: implement function with guard for `weeklyLimit <= 0`
- [x] `feat(FR3)`: implement guard for `currentHours >= weeklyLimit`
- [x] `feat(FR3)`: compute `slotsRemaining` and bound endpoints
- [x] `feat(FR3)`: clamp upper to [0, 100] and lower to [0, 100]
- [x] `feat(FR3)`: guard for `taggedSlots + slotsRemaining === 0`

### FR4 — `computeAICone`

- [x] `feat(FR4)`: implement orchestrator calling `computeActualPoints` + `computeCone`
- [x] `feat(FR4)`: aggregate totals from `dailyBreakdown`
- [x] `feat(FR4)`: compute `isTargetAchievable` (cone non-empty: upper final >= 75; cone empty: currentAIPct >= 75)
- [x] `feat(FR4)`: set `targetPct: 75` as constant
- [x] `feat(FR4)`: all Phase 1.0 tests passing

---

## Phase 1.2 — Review

Sequential gates. Run in order.

- [x] `spec-implementation-alignment`: validate `src/lib/aiCone.ts` matches all FR success criteria in spec.md
- [x] `pr-review-toolkit:review-pr`: review PR for code quality, test coverage, TypeScript correctness
- [x] Address all review feedback (fix commits prefixed `fix(01-cone-math):`)
- [x] `test-optimiser`: review test suite for redundancy, missing cases, fixture quality

---

## Session Notes

**2026-03-15**: Implementation complete.
- Phase 1.0: 1 test commit — `test(FR2-FR4)` covering 41 tests across all 3 functions
- Phase 1.1: 1 implementation commit — `feat(FR1-FR4)` for types + 3 functions (162 lines)
- Phase 1.2: 1 fix commit — `fix(01-cone-math)` separate ConePoint objects for cone origins
- All 41 tests passing.
