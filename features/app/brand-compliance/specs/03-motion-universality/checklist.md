# Checklist — 03-motion-universality

## Phase 3.0 — Tests (Red Phase)

### FR1 tests — index.tsx AnimatedPressable

- [x] Write `MotionUniversality.test.tsx` — SC1.1: `index.tsx` does NOT import `TouchableOpacity` from react-native
- [x] Write `MotionUniversality.test.tsx` — SC1.2: `index.tsx` DOES import `AnimatedPressable`
- [x] Write `MotionUniversality.test.tsx` — SC1.3: `index.tsx` contains `AnimatedPressable` with `testID="settings-button"`
- [x] Write `MotionUniversality.test.tsx` — SC1.4: `index.tsx` contains `AnimatedPressable` with `testID="retry-button"`
- [x] Write `MotionUniversality.test.tsx` — SC1.5: smoke render — `HoursDashboard` renders without crash

### FR2 tests — approvals.tsx AnimatedPressable + tint color

- [x] Write `MotionUniversality.test.tsx` — SC2.1: `approvals.tsx` does NOT import plain `Pressable` from react-native
- [x] Write `MotionUniversality.test.tsx` — SC2.2: `approvals.tsx` DOES import `AnimatedPressable`
- [x] Write `MotionUniversality.test.tsx` — SC2.3: `approvals.tsx` contains `AnimatedPressable` wired to `handleApproveAll`
- [x] Write `MotionUniversality.test.tsx` — SC2.4: `approvals.tsx` contains `AnimatedPressable` wired to `teamRefetch` and `myRefetch`
- [x] Write `MotionUniversality.test.tsx` — SC2.5: `approvals.tsx` RefreshControl tint does NOT contain `#10B981`
- [x] Write `MotionUniversality.test.tsx` — SC2.6: `approvals.tsx` RefreshControl tint DOES reference `colors.success`
- [x] Write `MotionUniversality.test.tsx` — SC2.7: smoke render — `ApprovalsScreen` renders without crash

### FR3 tests — ai.tsx AnimatedPressable

- [x] Write `MotionUniversality.test.tsx` — SC3.1: `ai.tsx` does NOT import `TouchableOpacity` from react-native
- [x] Write `MotionUniversality.test.tsx` — SC3.2: `ai.tsx` DOES import `AnimatedPressable`
- [x] Write `MotionUniversality.test.tsx` — SC3.3: `ai.tsx` contains `AnimatedPressable` with `testID="relogin-button"`
- [x] Write `MotionUniversality.test.tsx` — SC3.4: `ai.tsx` contains `AnimatedPressable` with `testID="retry-button"`
- [x] Write `MotionUniversality.test.tsx` — SC3.5: `ai.tsx` contains `AnimatedPressable` wrapping the empty-state Refresh button
- [x] Write `MotionUniversality.test.tsx` — SC3.6: smoke render — `AIScreen` renders without crash

### Red phase validation

- [x] Run test suite — all new tests FAIL (red): `cd hourglassws && npx jest src/components/__tests__/MotionUniversality.test.tsx --no-coverage`
- [x] Confirm failures are the expected "import not found" / "pattern not matched" failures, not test infrastructure errors

---

## Phase 3.1 — Implementation

### FR1 — index.tsx

- [x] Add `import { AnimatedPressable } from '@/src/components/AnimatedPressable'` to `app/(tabs)/index.tsx`
- [x] Remove `TouchableOpacity` from the `react-native` import in `app/(tabs)/index.tsx`
- [x] Replace settings button `TouchableOpacity` with `AnimatedPressable` (preserve `testID="settings-button"` and `onPress`)
- [x] Replace error-banner retry `TouchableOpacity` with `AnimatedPressable` (preserve `testID="retry-button"` and `onPress={refetch}`)
- [x] Run FR1 tests green: SC1.1–SC1.5 pass

### FR2 — approvals.tsx

- [x] Add `import { AnimatedPressable } from '@/src/components/AnimatedPressable'` to `app/(tabs)/approvals.tsx`
- [x] Add `colors` to the `@/src/lib/colors` import in `app/(tabs)/approvals.tsx`
- [x] Remove `Pressable` from the `react-native` import in `app/(tabs)/approvals.tsx`
- [x] Replace Approve All `Pressable` with `AnimatedPressable` (preserve `disabled={isApprovingAll}`, `onPress={handleApproveAll}`, className)
- [x] Replace team error Retry `Pressable` with `AnimatedPressable` (preserve `onPress={teamRefetch}`)
- [x] Replace my-requests error Retry `Pressable` with `AnimatedPressable` (preserve `onPress={myRefetch}`)
- [x] Change RefreshControl `tintColor="#10B981"` to `tintColor={colors.success}`
- [x] Run FR2 tests green: SC2.1–SC2.7 pass

### FR3 — ai.tsx

- [x] Add `import { AnimatedPressable } from '@/src/components/AnimatedPressable'` to `app/(tabs)/ai.tsx`
- [x] Remove `TouchableOpacity` from the `react-native` import in `app/(tabs)/ai.tsx`
- [x] Replace auth error Re-login `TouchableOpacity` with `AnimatedPressable` (preserve `testID="relogin-button"` and `onPress`)
- [x] Replace network error Retry `TouchableOpacity` with `AnimatedPressable` (preserve `testID="retry-button"` and `onPress`)
- [x] Replace empty state Refresh `TouchableOpacity` with `AnimatedPressable` (preserve `onPress={refetch}`)
- [x] Run FR3 tests green: SC3.1–SC3.6 pass

### Full test suite

- [x] Run full test suite — 19/19 MotionUniversality tests pass; pre-existing infrastructure failures unrelated to this spec

---

## Phase 3.2 — Review

- [x] Spec-implementation alignment: all 3 FRs verified complete, all 19 success criteria confirmed by passing tests
- [x] Code review: changes are minimal, mechanical substitutions with no logic changes
- [ ] Run `pr-review-toolkit:review-pr`: skill unavailable in this environment
- [ ] Run `test-optimiser`: skill unavailable in this environment
- [x] Final test run — all 19 MotionUniversality tests pass

## Session Notes

**2026-03-16**: Spec execution complete.
- Phase 3.0: 1 test commit (`test(03-motion-universality)`) — 19 tests, all red
- Phase 3.1: 1 implementation commit (`feat(03-motion-universality)`) — FR1, FR2, FR3 implemented
- Phase 3.2: alignment check passed manually (all 19 SC verified by tests)
- All 19 tests passing. Pre-existing test failures (QueryClient infrastructure) unrelated to this spec.
- HapticTab, FadeInScreen, and useStaggeredEntry on ai/overview/approvals were already implemented — no changes needed there.
