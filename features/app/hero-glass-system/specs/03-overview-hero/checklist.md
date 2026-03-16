# Checklist: 03-overview-hero

**Spec:** [spec.md](./spec.md)
**Status:** Not Started

---

## Phase 3.0 — Tests (Red Phase)

Write all tests before any implementation. Tests must fail (red) against current codebase.

### FR3 — `computeEarningsPace` tests

- [ ] Create `hourglassws/src/lib/__tests__/overviewUtils.test.ts`
- [ ] SC3.1 — `[100, 100, 100, 100]` → `1.0`
- [ ] SC3.2 — `[80, 80, 80, 120]` → `1.5`
- [ ] SC3.3 — `[100, 100, 100, 60]` → `0.6`
- [ ] SC3.4 — `[100, 100, 100, 0]` → `0.0`
- [ ] SC3.5 — `[100]` (length 1) → `1.0`
- [ ] SC3.6 — `[]` (empty) → `1.0`
- [ ] SC3.7 — prior average uses `earnings.slice(0, -1)`
- [ ] SC3.8 — prior avg = 0 → `1.0` (division by zero guard)
- [ ] Commit: `test(FR3): add computeEarningsPace tests`

### FR1/FR2 — `OverviewHeroCard` tests

- [ ] Create `hourglassws/src/components/__tests__/OverviewHeroCard.test.tsx`
- [ ] SC1.1 — source contains `$` + `toLocaleString()` earnings formatting
- [ ] SC1.2 — source contains `h` suffix for hours
- [ ] SC1.3 — source imports `Card` and uses `elevated` prop
- [ ] SC1.4 — source contains `"LAST 4 WEEKS"` and `"LAST 12 WEEKS"` strings
- [ ] SC1.5 — source uses `TouchableOpacity` or `Pressable` for toggle
- [ ] SC1.6 — source calls `onWindowChange(4)` (or passes 4)
- [ ] SC1.7 — source calls `onWindowChange(12)` (or passes 12)
- [ ] SC1.8 — active pill uses `colors.surface` background
- [ ] SC1.9 — source has side-by-side row layout (flexDirection row)
- [ ] SC2.1 — overtime badge text contains `OT` when `overtimeHours > 0`
- [ ] SC2.2 — overtime badge uses `overtimeWhiteGold` color
- [ ] SC2.3 — overtime badge absent when `overtimeHours === 0`
- [ ] SC2.4 — overtime value uses `Math.round`
- [ ] Commit: `test(FR1-FR2): add OverviewHeroCard source analysis tests`

### FR4/FR5 — overview.tsx ambient wiring tests

- [ ] Extend `hourglassws/app/(tabs)/__tests__/overview.test.tsx`
- [ ] SC4.1 — `overview.tsx` imports `AmbientBackground`
- [ ] SC4.2 — `AmbientBackground` present outside `ScrollView` in source
- [ ] SC4.3 — `overview.tsx` imports `getAmbientColor`
- [ ] SC4.4 — `computeEarningsPace` called with `overviewData.earnings`
- [ ] SC4.5 — `{ type: 'earningsPace'` pattern present in source
- [ ] SC4.6 — null fallback for ambient color when data unavailable
- [ ] SC5.1 — standalone header toggle row removed (old toggle pattern absent)
- [ ] SC5.2 — `OverviewHeroCard` rendered before scrub panel in source
- [ ] SC5.3 — `window` prop passed to `OverviewHeroCard`
- [ ] SC5.4 — `onWindowChange={handleWindowChange}` passed to `OverviewHeroCard`
- [ ] SC5.5 — `totalEarnings` uses sum of `overviewData.earnings`
- [ ] SC5.6 — `totalHours` uses sum of `overviewData.hours`
- [ ] SC5.7 — `overtimeHours` uses `Math.max(0, ...)` pattern
- [ ] Commit: `test(FR4-FR5): add overview ambient wiring and hero integration tests`

---

## Phase 3.1 — Implementation

Implement in dependency order: FR3 → FR1/FR2 (parallel) → FR4/FR5.

### FR3 — `computeEarningsPace`

- [ ] Create `hourglassws/src/lib/overviewUtils.ts`
- [ ] Implement `computeEarningsPace(earnings: number[]): number`
- [ ] Edge: `length < 2` → `1.0`
- [ ] Edge: prior avg = 0 → `1.0`
- [ ] Verify all `overviewUtils.test.ts` tests pass (green)
- [ ] Commit: `feat(FR3): implement computeEarningsPace in overviewUtils.ts`

### FR1/FR2 — `OverviewHeroCard` component

- [ ] Create `hourglassws/src/components/OverviewHeroCard.tsx`
- [ ] Import `Card` from `./Card`
- [ ] Import `colors` from `@/src/lib/colors`
- [ ] Render period label ("LAST 4 WEEKS" / "LAST 12 WEEKS")
- [ ] Render 4W/12W toggle with active pill styling
- [ ] Render earnings metric (`$X,XXX` in gold)
- [ ] Render hours metric (`XXXh` in textPrimary)
- [ ] Render overtime badge when `overtimeHours > 0` (`+Xh OT` in overtimeWhiteGold)
- [ ] Verify `OverviewHeroCard.test.tsx` tests pass (green)
- [ ] Commit: `feat(FR1-FR2): implement OverviewHeroCard with dual metrics and overtime badge`

### FR4/FR5 — overview.tsx ambient wiring + toggle migration

- [ ] Add `useHoursData` import (if not already present)
- [ ] Import `AmbientBackground`, `getAmbientColor` from `@/src/components/AmbientBackground`
- [ ] Import `computeEarningsPace` from `@/src/lib/overviewUtils`
- [ ] Import `OverviewHeroCard` from `@/src/components/OverviewHeroCard`
- [ ] Compute `earningsPace` and `ambientColor` from `overviewData.earnings`
- [ ] Place `<AmbientBackground color={ambientColor} />` inside `SafeAreaView`, outside `ScrollView`
- [ ] Add `<OverviewHeroCard ... />` as first item inside `ScrollView`
- [ ] Remove standalone header toggle row (the `<View>` with title + toggle pills)
- [ ] Compute `overtimeHours = Math.max(0, (hoursData?.total ?? 0) - (config?.weeklyLimit ?? 0))`
- [ ] Compute `totalEarnings = overviewData.earnings.reduce((s, v) => s + v, 0)`
- [ ] Compute `totalHours = overviewData.hours.reduce((s, v) => s + v, 0)`
- [ ] Verify existing tests still pass (no regressions)
- [ ] Verify new FR4/FR5 tests pass (green)
- [ ] Commit: `feat(FR4-FR5): wire AmbientBackground and OverviewHeroCard into overview screen`

---

## Phase 3.2 — Review

Sequential gates. Complete in order.

- [ ] Run `spec-implementation-alignment` check against spec.md
- [ ] Run `pr-review-toolkit:review-pr`
- [ ] Address any feedback (commit with `fix(03-overview-hero): ...`)
- [ ] Run `test-optimiser` on new test files
- [ ] All tests passing (run full test suite)
- [ ] Update this checklist — mark all tasks complete
- [ ] Update `FEATURE.md` changelog entry for `03-overview-hero`
