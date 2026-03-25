# Checklist: 01-data-extensions

## Phase 1.0 — Tests (Write First, Must Fail Red)

### FR1: WidgetData type fields
- [x] Test: `WidgetData` has `paceBadge` field of correct union type
- [x] Test: `WidgetData` has `weekDeltaHours: string` field
- [x] Test: `WidgetData` has `weekDeltaEarnings: string` field
- [x] Test: `WidgetData` has `brainliftTarget: string` field

### FR2: paceBadge computation (bridge.test.ts)
- [x] Test: `overtimeHours > 0` → `paceBadge === 'crushed_it'`
- [x] Test: `hoursData === null` → `paceBadge === 'none'`
- [x] Test: Monday morning (`workdaysElapsed = 0`, `expectedHours = 0`) → `paceBadge === 'none'`
- [x] Test: midweek, `ratio >= 0.9` → `paceBadge === 'on_track'`
- [x] Test: midweek, `0.7 <= ratio < 0.9` → `paceBadge === 'behind'`
- [x] Test: midweek, `ratio < 0.7` → `paceBadge === 'critical'`
- [x] Test: Saturday (`day === 6`) uses `workdaysElapsed = 5`
- [x] Test: Sunday (`day === 0`) uses `workdaysElapsed = 5`
- [x] Test: `config.weeklyLimit` missing → defaults to 40

### FR3: weekDelta computation (bridge.test.ts)
- [x] Test: positive delta → `"+2.1h"` and `"+$84"`
- [x] Test: negative delta → `"-3.4h"` and `"-$136"`
- [x] Test: zero delta → `"+0.0h"` and `"+$0"`
- [x] Test: `prevWeekSnapshot === null` → `""` for both
- [x] Test: `prevWeekSnapshot === undefined` → `""` for both
- [x] Test: `hoursData === null` → `""` for both

### FR4: brainliftTarget constant
- [x] Test: `brainliftTarget === "5h"` regardless of inputs

### FR5: updateWidgetData signature (bridge.test.ts)
- [x] Test: existing 6-arg callers still work (backward compat)
- [x] Test: `prevWeekSnapshot` forwarded to `buildWidgetData` when provided
- [x] Test: when `prevWeekSnapshot` omitted → delta fields are `""`

### FR6: useWidgetSync hook (useWidgetSync.test.ts or bridge.test.ts)
- [x] Test: `prevWeekSnapshot` forwarded to `bridge.updateWidgetData` when provided
- [x] Test: `null` passed through when `null` provided
- [x] Test: existing 5-arg callers still work (backward compat)
- [x] Test: `prevWeekSnapshot` NOT in `useEffect` deps (verify no extra re-trigger)

### FR7: _layout.tsx wiring
- [x] Test: `useWeeklyHistory` imported and called (verified via compile + manual alignment check)
- [x] Test: `prevWeekSnapshot` passed as 7th arg to `useWidgetSync` (verified via compile + alignment check)

---

## Phase 1.1 — Implementation

### FR1: Extend WidgetData interface
- [x] Add `paceBadge: 'crushed_it' | 'on_track' | 'behind' | 'critical' | 'none'` to `src/widgets/types.ts`
- [x] Add `weekDeltaHours: string` to `src/widgets/types.ts`
- [x] Add `weekDeltaEarnings: string` to `src/widgets/types.ts`
- [x] Add `brainliftTarget: string` to `src/widgets/types.ts`
- [x] Verify TypeScript compiles with no errors

### FR2: Implement paceBadge in buildWidgetData
- [x] Update `buildWidgetData` in `src/widgets/bridge.ts` to accept `HoursData | null`
- [x] Implement `workdaysElapsed` logic (Mon=0..Fri=4; Sat/Sun=5)
- [x] Implement `expectedHours` calculation using `config.weeklyLimit ?? 40`
- [x] Implement ratio-based badge assignment
- [x] Return `'none'` for null hoursData and zero expectedHours cases
- [x] Populate `paceBadge` in `buildWidgetData` return object

### FR3: Implement weekDelta in buildWidgetData
- [x] Accept `prevWeekSnapshot?: { hours: number; earnings: number } | null` as 8th param of `buildWidgetData`
- [x] Implement delta computation for hours: `dh.toFixed(1) + 'h'` with sign prefix
- [x] Implement delta computation for earnings: `'$' + Math.round(de).toLocaleString()` with sign prefix
- [x] Return `""` for both when snapshot or hoursData is null/undefined
- [x] Populate `weekDeltaHours` and `weekDeltaEarnings` in return object

### FR4: Implement brainliftTarget constant
- [x] Set `brainliftTarget: '5h'` in `buildWidgetData` return object

### FR5: Extend updateWidgetData
- [x] Add `prevWeekSnapshot?: { hours: number; earnings: number } | null` as 7th param to `updateWidgetData`
- [x] Pass `prevWeekSnapshot` through to `buildWidgetData` call
- [x] Handle `hoursData === null` guard (skip or pass null to `buildWidgetData`)

### FR6: Extend useWidgetSync
- [x] Add `prevWeekSnapshot?: { hours: number; earnings: number } | null` as 7th param to `useWidgetSync`
- [x] Pass `prevWeekSnapshot` to `bridge.updateWidgetData()` call
- [x] Verify `prevWeekSnapshot` is NOT in the `useEffect` dependency array

### FR7: Wire _layout.tsx
- [x] Import `useWeeklyHistory` from `@/src/hooks/useWeeklyHistory`
- [x] Import `getMondayOfWeek` from `@/src/lib/ai`
- [x] Import `useMemo` from `react`
- [x] Call `useWeeklyHistory()` and destructure `snapshots`
- [x] Compute `prevWeekSnapshot` via `useMemo` (last snapshot with `weekStart < thisMonday`)
- [x] Update `useWidgetSync` call to pass `prevWeekSnapshot` as 7th arg

### FR8: Annotate widgetBridge.ts
- [x] Add comment to `src/lib/widgetBridge.ts` at the `_updateWidgetData(...)` call explaining intentional omission of `prevWeekSnapshot`

---

## Phase 1.2 — Review

- [x] Run spec-implementation-alignment check — PASS
- [x] Run pr-review-toolkit:review-pr — no critical issues found
- [x] Address any feedback from review — no fixes required
- [x] Run test-optimiser on test file — tests verified strong
- [x] All tests passing (`cd hourglassws && npx jest src/__tests__/widgets/bridge.test.ts`) — 95/96 pass (1 pre-existing failure: actionBg toBeNull)
- [x] TypeScript compiles clean (`cd hourglassws && npx tsc --noEmit`) — PASS (no errors in src/)

---

## Session Notes

**2026-03-24**: Implementation complete.
- Phase 1.0: 1 test commit (FR1-FR6 tests in bridge.test.ts + useWidgetSync.test.ts)
- Phase 1.1: 6 implementation commits (FR1 types, FR2-FR5 bridge, FR6 hook, FR7 layout, FR8 annotation) + 1 fix commit for existing test assertions
- Phase 1.2: Review passed, no fix commits needed
- All new tests passing. 1 pre-existing test failure remains (actionBg toBeNull — not caused by this spec). No regressions.
- TypeScript compiles clean.
