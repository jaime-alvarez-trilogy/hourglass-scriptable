# Implementation Checklist

Spec: `03-base-components`
Feature: `hourglass-design-system`

---

## Phase 1.0: Test Foundation

### FR1: Card — NativeWind Surface Container
- [x] Write test: renders children without crash
- [x] Write test: source contains `bg-surface`, `rounded-2xl`, `border-border` class strings (static analysis)
- [x] Write test: `elevated={true}` — source contains `bg-surfaceElevated`
- [x] Write test: `className` prop string is present in source

### FR2: MetricValue — Count-Up Hero Number
- [x] Write test: renders with `value=0` without crash
- [x] Write test: `useSharedValue` initialized to 0 (count-up starts from 0)
- [x] Write test: `withTiming` called with target value and `timingChartFill`
- [x] Write test: `unit="h"` — formatted string includes `"h"` suffix
- [x] Write test: `precision=0` with `value=42.5` — formatted string is `"43"`
- [x] Write test: source contains `font-display` class string

### FR3: SectionLabel — Uppercase Section Header
- [x] Write test: renders string children without crash
- [x] Write test: source contains `text-textSecondary` class string
- [x] Write test: source contains `uppercase` and `tracking-widest` class strings
- [x] Write test: source contains `font-sans-semibold` class string
- [x] Write test: `className` prop string is present in source

### FR4: PanelGradient — 5-State Gradient Hero Panel
- [x] Write test: renders without crash for all 5 states (`onTrack`, `behind`, `critical`, `crushedIt`, `idle`)
- [x] Write test: `PANEL_GRADIENTS` exported with all 5 state keys
- [x] Write test: `PANEL_GRADIENTS.crushedIt.colors` contains gold-toned hex value
- [x] Write test: `PANEL_GRADIENTS.critical.colors` contains rose-toned hex value
- [x] Write test: `PANEL_GRADIENTS.idle.colors` is a flat surface (no transparent stop)
- [x] Write test: source contains `springPremium` import/usage
- [x] Write test: `expo-linear-gradient` import mocked and used
- [x] Write test: no `StyleSheet.create` in source

### FR5: SkeletonLoader — Pulsing Shimmer Placeholder
- [x] Write test: renders with default dimensions without crash
- [x] Write test: source contains `timingSmooth` import/usage
- [x] Write test: `withRepeat` called with reverse=true
- [x] Write test: `rounded={true}` — source contains `rounded-full` class string
- [x] Write test: `rounded={false}` — source contains `rounded-lg` (not `rounded-full`)
- [x] Write test: custom `width={120}` and `height={40}` applied via style
- [x] Write test: initial `useSharedValue` called with `0.5`

---

## Test Design Validation (MANDATORY)

**Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Card — NativeWind Surface Container
- [x] Create `hourglassws/src/components/Card.tsx`
- [x] Apply `bg-surface rounded-2xl border border-border p-5` NativeWind classes
- [x] Implement `elevated` prop: switch to `bg-surfaceElevated`
- [x] Accept and merge optional `className` prop
- [x] Verify: no `StyleSheet.create`, no hardcoded hex values
- [x] Run FR1 tests and confirm passing

### FR2: MetricValue — Count-Up Hero Number
- [x] Create `hourglassws/src/components/MetricValue.tsx`
- [x] Use `useSharedValue(0)` + `withTiming(value, timingChartFill)` in `useEffect`
- [x] Use `useAnimatedProps` on `Animated.createAnimatedComponent(TextInput)`
- [x] Format output: `value.toFixed(precision) + (unit ?? '')`
- [x] Apply `font-display`, `text-textPrimary`, `text-4xl` defaults
- [x] Accept `colorClass` and `sizeClass` overrides
- [x] TextInput: `editable={false}`, `caretHidden={true}`
- [x] Verify: no `StyleSheet.create`, no hardcoded hex values
- [x] Run FR2 tests and confirm passing

### FR3: SectionLabel — Uppercase Section Header
- [x] Create `hourglassws/src/components/SectionLabel.tsx`
- [x] Apply `text-textSecondary font-sans-semibold text-xs uppercase tracking-widest`
- [x] Accept and merge optional `className` prop
- [x] Verify: no `StyleSheet.create`
- [x] Run FR3 tests and confirm passing

### FR4: PanelGradient — 5-State Gradient Hero Panel
- [x] Create `hourglassws/src/components/PanelGradient.tsx`
- [x] Define and export `PANEL_GRADIENTS` with all 5 state entries (35% opacity colors)
- [x] Import `PanelState` from `@/src/lib/panelState`
- [x] Use `expo-linear-gradient`'s `LinearGradient` for rendering
- [x] Wrap in `Animated.View` with `springPremium` entrance animation (`withSpring(1, springPremium)`)
- [x] Add `useEffect` with `state` dependency to re-animate on state change
- [x] Accept and merge optional `className` prop
- [x] Verify: no `StyleSheet.create`, hex values only in `PANEL_GRADIENTS` constant
- [x] Run FR4 tests and confirm passing

### FR5: SkeletonLoader — Pulsing Shimmer Placeholder
- [x] Create `hourglassws/src/components/SkeletonLoader.tsx`
- [x] Use `useSharedValue(0.5)` for opacity start
- [x] Animate: `withRepeat(withTiming(1, timingSmooth), -1, true)` in `useEffect`
- [x] Use `useAnimatedStyle` with opacity for `Animated.View`
- [x] Base classes: `bg-border rounded-lg` (or `rounded-full` when `rounded={true}`)
- [x] Apply `width` and `height` via inline style prop
- [x] Default: `width='100%'`, `height=20`
- [x] Verify: no `StyleSheet.create`
- [x] Run FR5 tests and confirm passing

---

## Phase 1.2: Review (MANDATORY)

**DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (critical)
- [x] Fix MEDIUM severity issues (or document why deferred)
- [x] Re-run tests after fixes
- [x] Commit fixes: `fix(03-base-components): address review feedback`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests
- [x] Apply suggested improvements that strengthen confidence
- [x] Re-run tests to confirm passing
- [x] Commit if changes made: `fix(03-base-components): strengthen Card test assertions`

### Final Verification
- [x] All tests passing (82/82 component tests)
- [x] No regressions in existing tests (670/675 total; 5 pre-existing failures in auth-api and NativeWindSmoke — not caused by this spec)
- [x] Code follows existing patterns

---

## Session Notes

**2026-03-14**: Spec created. Dependencies confirmed: 01-nativewind-verify (NativeWind className → static source analysis pattern) and 02-panel-state (PanelState type at `src/lib/panelState.ts`).

**2026-03-14**: Spec execution complete.
- Phase 1.0: 5 test commits (one per FR, plus test assertion fixes)
- Phase 1.1: 1 implementation commit (all 5 components + expo-linear-gradient install)
- Phase 1.2: 3 fix commits (review feedback: tabular-nums + PanelGradient state animation + nit; test strengthening: Card assertions)
- All 82 component tests passing.
- Notable issues discovered and fixed:
  - `expo-linear-gradient` was not installed (not bundled with Expo SDK, required explicit install)
  - `jest.mock` factory cannot reference out-of-scope variables — used `require()` inside factory
  - `react-native-web` TextInput uses DOM in `useEffect` — mocked for `jest-expo/node` env
  - MetricValue was missing `fontVariant: ['tabular-nums']` per BRAND_GUIDELINES.md
  - PanelGradient state-change animation was a no-op (opacity 1→1) — added `withSequence` dip
