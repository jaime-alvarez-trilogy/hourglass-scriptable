# Checklist: 04-ai-tab-screen

**Spec:** [04-ai-tab-screen](spec.md)
**Feature:** [AI Tab Rebuild](../../FEATURE.md)

---

## Phase 4.0 — Tests (Red Phase)

Write all tests first. Tests must FAIL before implementation.

### FR1 — Data-Gated Loading Screen

- [ ] `test(FR1)` Write test: source imports `ActivityIndicator` from `react-native`
- [ ] `test(FR1)` Write test: renders `ActivityIndicator` when `data=null, isLoading=true` (SC1.1)
- [ ] `test(FR1)` Write test: `ActivityIndicator` uses `colors.success` color (SC1.2)
- [ ] `test(FR1)` Write test: `ActivityIndicator` does NOT render when `data !== null` (SC1.3 / SC1.6)
- [ ] `test(FR1)` Write test: no `SkeletonLoader` renders during loading state (SC1.5)

### FR2 — Remove `useStaggeredEntry`

- [ ] `test(FR2)` Write test: source does NOT import `useStaggeredEntry` (SC2.1)
- [ ] `test(FR2)` Write test: source does NOT call `useStaggeredEntry` (SC2.2)
- [ ] `test(FR2)` Write test: source does NOT use `getEntryStyle` (SC2.3)

### FR3 — Remove `useHistoryBackfill` Call

- [ ] `test(FR3)` Write test: source does NOT import `useHistoryBackfill` (SC3.1)
- [ ] `test(FR3)` Write test: source does NOT call `useHistoryBackfill()` (SC3.2)

### FR4 — Remove `SkeletonLoader`

- [ ] `test(FR4)` Write test: source does NOT import `SkeletonLoader` (SC4.1)
- [ ] `test(FR4)` Write test: source does NOT contain `showSkeleton` variable (SC4.3)

### FR5 — Content Renders Correctly After Data Arrives

- [ ] `test(FR5)` Update existing SC1.12–SC1.18 tests: verify still pass with no `Animated.View` wrappers
- [ ] `test(FR5)` Update existing SC1.19: does not crash when `data=null, isLoading=true`
- [ ] `test(FR5)` Remove SC1.11: SkeletonLoader height={240} test (no longer valid)
- [ ] `test(FR5)` Remove SC1.20: SkeletonLoader for Prime Radiant skeleton test
- [ ] `test(FR5)` Write test: `onScrubChange` still passed to `AIConeChart` (SC5.6)

### Red Phase Validation

- [ ] Run test suite: confirm all new tests FAIL (source not yet changed)
- [ ] Run red-phase-test-validator sub-agent

---

## Phase 4.1 — Implementation (Green Phase)

Make all tests pass with minimum necessary changes.

### FR1 — Data-Gated Loading Screen

- [ ] `feat(FR1)` Add `ActivityIndicator` to `react-native` import in `ai.tsx`
- [ ] `feat(FR1)` Add loading gate: `if (!data && isLoading)` return `ActivityIndicator` view after error checks
- [ ] `feat(FR1)` Verify loading gate is positioned correctly (after error checks, before empty state)

### FR2 — Remove `useStaggeredEntry`

- [ ] `feat(FR2)` Remove `import { useStaggeredEntry }` from `ai.tsx`
- [ ] `feat(FR2)` Remove `import Animated from 'react-native-reanimated'` (if unused after changes)
- [ ] `feat(FR2)` Remove `const { getEntryStyle } = useStaggeredEntry({ count: 5 })`
- [ ] `feat(FR2)` Strip all `<Animated.View style={getEntryStyle(N)}>` wrappers (5 instances: indices 0–4)

### FR3 — Remove `useHistoryBackfill` (Verification)

- [ ] `feat(FR3)` Verify `useHistoryBackfill` import is absent (handled by spec 03, confirm final state)

### FR4 — Remove `SkeletonLoader`

- [ ] `feat(FR4)` Remove `import SkeletonLoader` from `ai.tsx`
- [ ] `feat(FR4)` Remove `showSkeleton` variable declaration
- [ ] `feat(FR4)` Remove all `showSkeleton ? <SkeletonLoader ...> :` conditional branches
- [ ] `feat(FR4)` Remove standalone skeleton-only sections (e.g., `{showSkeleton && <Card>...skeleton...</Card>}`)

### FR5 — Content Renders Correctly

- [ ] `feat(FR5)` Verify `AIArcHero` receives correct props after skeleton wrapper removal
- [ ] `feat(FR5)` Verify Prime Radiant card renders `coneData ?` guard (unchanged logic, wrapper removed)
- [ ] `feat(FR5)` Verify daily breakdown card guard is `data.dailyBreakdown.length > 0` (not `data && data.dailyBreakdown.length > 0` since data is guaranteed non-null at this point)
- [ ] `feat(FR5)` Verify trajectory card guard is `hasTrajectory` (unchanged)
- [ ] `feat(FR5)` Verify `FadeInScreen` still wraps all content

### Integration Verification

- [ ] Run full test suite: all tests pass
- [ ] Verify no TypeScript errors: `npx tsc --noEmit` in `hourglassws/`

---

## Phase 4.2 — Review

Sequential gates — run in order.

### Step 0: Alignment Check

- [ ] Run `spec-implementation-alignment` agent
  - Confirm FR1–FR5 all implemented
  - Confirm no out-of-scope changes made
  - If FAIL: fix alignment issues, re-run

### Step 1: PR Review

- [ ] Run `pr-review-toolkit:review-pr` skill
  - Address any blocking feedback
  - Re-run if significant changes made

### Step 2: Address Feedback

- [ ] Fix any issues identified in PR review
- [ ] Commit fixes with prefix `fix(04-ai-tab-screen):`

### Step 3: Test Optimization

- [ ] Run `test-optimiser` agent
  - Identify redundant or low-value tests
  - Consolidate if appropriate

---

## Completion Criteria

- [ ] All Phase 4.0 tests committed with `test(FR*)` prefixes
- [ ] All Phase 4.1 implementation committed with `feat(FR*)` prefixes
- [ ] Full test suite passes
- [ ] `ai.tsx` imports `ActivityIndicator`, does NOT import `useStaggeredEntry`, `SkeletonLoader`
- [ ] Phase 4.2 review complete
- [ ] FEATURE.md changelog updated
- [ ] This checklist fully checked off
