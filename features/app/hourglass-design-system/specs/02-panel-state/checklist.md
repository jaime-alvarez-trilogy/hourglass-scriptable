# Implementation Checklist

Spec: `02-panel-state`
Feature: `hourglass-design-system`

---

## Phase 2.0: Test Foundation

### FR1: computePanelState — 5 state outputs
- [x] Test: Mon morning, 0h worked, daysElapsed=0 → `"idle"`
- [x] Test: Wed, 20h worked, daysElapsed=2 (pace=16h, ratio=1.25) → `"onTrack"`
- [x] Test: Thu, 30h worked, daysElapsed=4 (pace=32h, ratio=0.9375) → `"onTrack"`
- [x] Test: Fri EOD, 40h worked, daysElapsed=5 → `"crushedIt"`
- [x] Test: Fri, 42h worked (over limit) → `"crushedIt"`
- [x] Test: Wed, 10h worked, daysElapsed=2 (pace=16h, ratio=0.625) → `"behind"`
- [x] Test: Wed, 5h worked, daysElapsed=2 (pace=16h, ratio=0.3125) → `"critical"`

### FR2: PACING thresholds as named constants
- [x] Test: pacingRatio exactly 0.85 → `"onTrack"` (inclusive boundary)
- [x] Test: pacingRatio 0.84 (just below) → `"behind"`
- [x] Test: pacingRatio exactly 0.60 → `"behind"` (inclusive boundary)
- [x] Test: pacingRatio 0.59 (just below) → `"critical"`

### FR3: Edge cases
- [x] Test: weeklyLimit=0 → `"idle"` (no division by zero)
- [x] Test: daysElapsed=0, hoursWorked=0 → `"idle"`
- [x] Test: daysElapsed=0, hoursWorked=5 → `"onTrack"` (early work)
- [x] Test: daysElapsed=7 (>5) → clamped, `"crushedIt"` with 40h/40 limit
- [x] Test: hoursWorked=-1 → valid result (treated as 0, returns `"critical"`)

### FR4: Test file setup
- [x] Create `hourglassws/src/lib/__tests__/panelState.test.ts`
- [x] Organise tests in `describe` blocks: `'happy path'`, `'edge cases'`, `'threshold boundaries'`
- [x] Verify tests fail (red phase) before implementation exists

---

## Test Design Validation (MANDATORY)

**Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (exact state string equality, not just truthy)
- [x] No mocks needed — pure function confirmed
- [x] Fix any issues identified before proceeding

---

## Phase 2.1: Implementation

### FR1: computePanelState function body
- [x] Create `hourglassws/src/lib/panelState.ts`
- [x] Import `PanelState` type from `./reanimated-presets` using `import type`
- [x] Re-export `PanelState` type from `panelState.ts`
- [x] Implement priority-ordered state assignment logic (see spec FR1)
- [x] Run `npx jest panelState` — all tests pass

### FR2: Threshold constants
- [x] Export `PACING_ON_TRACK_THRESHOLD = 0.85`
- [x] Export `PACING_BEHIND_THRESHOLD = 0.60`
- [x] Verify `computePanelState` uses constants internally (no inline 0.85/0.60 literals)

### FR3: Edge case guards
- [x] Guard: `weeklyLimit <= 0` → early return `"idle"`
- [x] Guard: `daysElapsed` clamped to `[0, 5]` via `Math.max(0, Math.min(5, daysElapsed))`
- [x] Guard: `hoursWorked` clamped to `[0, ∞)` via `Math.max(0, hoursWorked)`
- [x] Verify: `daysElapsed=0, hoursWorked>0` → `"onTrack"` path works correctly

### FR4: Tests passing
- [x] Run full test suite: `npx jest panelState` from `hourglassws/`
- [x] All 20 test cases pass (7 happy path + 7 edge + 4 boundary + 2 constant exports)
- [x] TypeScript compiles without errors: `npx tsc --noEmit` from `hourglassws/`

---

## Phase 2.2: Review (MANDATORY)

**DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation (signature matches spec-research.md exactly)
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (inline review — no PR, direct commits to main)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (critical) — none found
- [x] Fix MEDIUM severity issues — JSDoc range comment corrected (40–85% → 60–84%)
- [x] Re-run tests after fixes — 20/20 passing
- [x] Commit fixes: `fix(02-panel-state): correct PACING_BEHIND_THRESHOLD JSDoc range`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on `src/lib/__tests__/panelState.test.ts`
- [x] Apply suggested improvements that strengthen confidence — none needed
- [x] Re-run tests to confirm passing — 20/20

### Final Verification
- [x] All tests passing
- [x] No regressions in existing tests
- [x] Code follows existing patterns (matches `src/lib/hours.ts` style)

---

## Session Notes

**2026-03-14**: Spec created. Research complete, coherence check passed, QC passed. Ready for implementation.
**2026-03-14**: Implementation complete. 20 tests passing. Review passed. JSDoc range comment corrected (60–84%, not 40–85%).
