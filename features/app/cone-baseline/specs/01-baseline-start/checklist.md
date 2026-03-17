# Checklist: 01-baseline-start

## Phase 1.0 — Tests (Red Phase)

### FR1: `computeHourlyPoints` baseline param
- [x] test: `baselinePct=0` (default) → first point is `{ hoursX: 0, pctY: 0 }` — no regression
- [x] test: `baselinePct=81` → first point is `{ hoursX: 0, pctY: 81 }`
- [x] test: `baselinePct=75` → first point is `{ hoursX: 0, pctY: 75 }`
- [x] test: `baselinePct` omitted → behaves same as `baselinePct=0`
- [x] test: `baselinePct=0` with data → subsequent points reflect actual AI% (baseline only affects origin)
- [x] test: `baselinePct=100` → first point is `{ hoursX: 0, pctY: 100 }`, subsequent points track actual

### FR2: `computeAICone` threads `baselinePct`
- [x] test: `computeAICone(breakdown, 40, 81)` → `coneData.hourlyPoints[0].pctY === 81`
- [x] test: `computeAICone(breakdown, 40)` → `coneData.hourlyPoints[0].pctY === 0` (default, no regression)
- [x] test: `computeAICone(breakdown, 40, 0)` → `coneData.hourlyPoints[0].pctY === 0`
- [x] test: `coneData.currentAIPct` is unchanged regardless of `baselinePct`
- [x] test: `coneData.upperBound` is unchanged regardless of `baselinePct`
- [x] test: `coneData.lowerBound` is unchanged regardless of `baselinePct`
- [x] test: `coneData.targetPct === 75` regardless of `baselinePct`

### FR3: Call site threading (source-level verification)
- [x] test: `index.tsx` passes `previousWeekPercent` as third arg to `computeAICone`
- [x] test: `index.tsx` includes `previousWeekPercent` in `useMemo` deps array
- [x] test: `ai.tsx` passes `previousWeekPercent` as third arg to `computeAICone`

## Phase 1.1 — Implementation

### FR1: `computeHourlyPoints` in `aiCone.ts`
- [x] impl: add `baselinePct: number = 0` parameter to `computeHourlyPoints`
- [x] impl: change `const points: ConePoint[] = [{ hoursX: 0, pctY: 0 }]` to `[{ hoursX: 0, pctY: baselinePct }]`
- [x] impl: all FR1 tests pass

### FR2: `computeAICone` in `aiCone.ts`
- [x] impl: add `baselinePct: number = 0` parameter to `computeAICone`
- [x] impl: thread `baselinePct` through to `computeHourlyPoints` call
- [x] impl: all FR2 tests pass

### FR3: Call sites
- [x] impl: `index.tsx` — add `previousWeekPercent` to `useAIData()` destructure
- [x] impl: `index.tsx` — pass `previousWeekPercent` as third arg to `computeAICone`
- [x] impl: `index.tsx` — add `previousWeekPercent` to `useMemo` deps array
- [x] impl: `ai.tsx` — add `previousWeekPercent` as third arg to `computeAICone` call
- [x] impl: TypeScript compiles without errors (pre-existing errors only, none from this spec)
- [x] impl: all existing tests still pass (full test suite green)

## Phase 1.2 — Review

- [x] spec-implementation-alignment: run agent, confirm PASS
- [x] pr-review-toolkit: run review-pr, address any feedback (fixed stale JSDoc)
- [x] test-optimiser: run agent, apply any improvements (tests strong, no changes)
- [x] docs: update checklist session notes
- [x] docs: update FEATURE.md changelog

## Session Notes

**2026-03-17**: Implementation complete.
- Phase 1.0: 1 test commit (FR1+FR2 combined, pure math tests)
- Phase 1.1: 2 implementation commits (feat FR1+FR2 aiCone.ts, feat FR3 call sites + test update)
- Phase 1.2: 1 fix commit (stale JSDoc on computeHourlyPoints)
- All 52 aiCone tests passing; 23 indexConeIntegration tests passing.
- Pre-existing TS errors and test failures unrelated to this spec.
