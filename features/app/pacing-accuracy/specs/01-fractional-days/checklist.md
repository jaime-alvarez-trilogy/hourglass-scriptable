# Implementation Checklist

Spec: `01-fractional-days`
Feature: `pacing-accuracy`

---

## Phase 1.0: Test Foundation

### FR1: `computeDaysElapsed` returns fractional 0.0–5.0

- [ ] Update `SC1.1` — Monday 08:00 now returns ≈ 0.333, not integer `1`
- [ ] Update `SC1.3` — Tuesday 12:00 now returns ≈ 1.500, not integer `2`
- [ ] Update `SC1.4` — Wednesday 12:00 now returns ≈ 2.500, not integer `3`
- [ ] Update `SC1.5` — Thursday 09:00 now returns ≈ 3.375, not integer `4`
- [ ] Update `SC1.9` — Monday 00:01 now returns ≈ 0.000694 (not integer `1`)
- [ ] Update `SC1.10` — Monday 23:59:59 now returns ≈ 0.9999, not integer `1`
- [ ] Add test: Monday 12:00 → ≈ 0.500 (±0.001)
- [ ] Add test: Tuesday 07:00 → ≈ 1.292 (±0.001) — the original bug scenario
- [ ] Add test: Wednesday 09:00 → ≈ 2.375 (±0.001)
- [ ] Add test: Thursday 15:00 → ≈ 3.625 (±0.001)
- [ ] Add test: Monday 00:00:00 → exactly 0.0 (preserved midnight edge case)
- [ ] Verify: Friday (SC1.6) → still returns exactly 5.0 (no change)
- [ ] Verify: Saturday (SC1.7) → still returns exactly 5.0 (no change)
- [ ] Verify: Sunday (SC1.8) → still returns exactly 5.0 (no change)
- [ ] Verify: no-argument call (SC1.11) → still returns number in [0, 5]

### FR2: `computePanelState` idle guard updated

- [ ] Add test: `(0, 40, 0.333)` → `'idle'` (Monday 8am, nothing logged)
- [ ] Add test: `(0, 40, 0.999)` → `'idle'` (Monday near-midnight, nothing logged)
- [ ] Update test: `(0, 40, 0.0)` → `'idle'` (Monday midnight — was `daysElapsed=0`, same result)
- [ ] Add test: `(5, 40, 0.0)` → `'onTrack'` (midnight with hours — zero-guard)
- [ ] Add test: `(0, 40, 1.0)` → `'critical'` (Tuesday started, nothing logged)
- [ ] Add test: `(0, 40, 1.292)` → `'critical'` (Tue 7am, nothing logged)
- [ ] Add test: `(12, 40, 1.292)` → `'onTrack'` (116% — original bug case fixed)
- [ ] Add test: `(8, 40, 1.292)` → `'onTrack'` (77% of 10.33h)
- [ ] Add test: `(5, 40, 1.292)` → `'critical'` (48% of 10.33h)
- [ ] Update existing test: `'returns onTrack when daysElapsed=0 but some hours worked'` — ensure it still passes with the new `expectedHours === 0` guard

---

## Test Design Validation (MANDATORY)

WARNING: **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Fractional assertions use `toBeCloseTo` with appropriate precision (±0.001)
- [ ] Updated integer tests correctly assert the new float values
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: `computeDaysElapsed` returns fractional 0.0–5.0

- [ ] Remove Thursday branch (`if (day === 4) return 4`)
- [ ] Remove Wednesday branch (`if (day === 3) return 3`)
- [ ] Remove Tuesday branch (`if (day === 2) return 2`)
- [ ] Remove Monday midnight special-case (`if (d.getHours() === 0 && ...)`)
- [ ] Remove `return 1` (old Monday fallthrough)
- [ ] Add Friday branch: `if (day === 5) return 5`
- [ ] Add fractional formula for Mon–Thu: `dayIndex = day - 1; hourOfDay = hours + mins/60 + secs/3600; return dayIndex + hourOfDay/24`
- [ ] Update `computeDaysElapsed` JSDoc: change "0–5" to "0.0–5.0", update param/return descriptions, remove integer examples, add fractional examples

### FR2: `computePanelState` idle guard updated

- [ ] Replace `if (days === 0 && hours === 0) return 'idle'` with `if (days < 1 && hours === 0) return 'idle'`
- [ ] Replace `if (days === 0) return 'onTrack'` with: move `expectedHours` computation up, add `if (expectedHours === 0) return 'onTrack'`
- [ ] Ensure `const pacingRatio = hours / expectedHours` follows after the zero guard (no division by zero possible)
- [ ] Update `computePanelState` JSDoc `@param daysElapsed` to note fractional values accepted

---

## Phase 1.2: Review (MANDATORY)

WARNING: **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR1 success criteria verified: fractional outputs match table in spec
- [ ] All FR2 success criteria verified: idle/critical/onTrack states match table
- [ ] No scope creep (no other functions modified)
- [ ] Interface contracts match implementation (signature unchanged)

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(01-fractional-days): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-fractional-days): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns in `panelState.ts`

---

## Session Notes

<!-- Add notes as you work -->
