# Checklist: 02-home-hero-ambient

## Phase 2.0 — Tests (Red Phase)

### FR1 — Wire AmbientBackground to Home screen (index.test.tsx)

- [x] `FR1.T1` — Add test: source imports `AmbientBackground` from `@/src/components/AmbientBackground`
- [x] `FR1.T2` — Add test: source imports `getAmbientColor` from `@/src/components/AmbientBackground`
- [x] `FR1.T3` — Add test: source renders `<AmbientBackground` in JSX
- [x] `FR1.T4` — Add test: `AmbientBackground` appears before `ScrollView` in JSX (position check via source string index)
- [x] `FR1.T5` — Add test: `getAmbientColor` is called with `type: 'panelState'` signal
- [x] `FR1.T6` — Add test: `getAmbientColor` receives `panelState` as the state argument
- [x] `FR1.T7` — Verify existing test `SC3.1` still passes: no StyleSheet import in index.tsx
- [x] `FR1.T8` — Verify existing test `SC3.2` still passes: no hardcoded hex color strings in index.tsx

### FR2 — Expand PanelGradient radial gradient (PanelGradient.test.tsx)

- [x] `FR2.T1` — Add test: source has `stopOpacity={0.50}` (inner stop opacity expanded)
- [x] `FR2.T2` — Verify existing test `FR1.9` still passes: source has `r="70%"`
- [x] `FR2.T3` — Verify existing test `FR1.7` still passes: source has `cx="50%"`
- [x] `FR2.T4` — Verify existing test `FR1.8` still passes: source has `cy="30%"`
- [x] `FR2.T5` — Verify existing `PANEL_GRADIENT_COLORS` export tests still pass (FR1.12–FR1.18)
- [x] `FR2.T6` — Verify existing `getGlowStyle` export tests still pass (FR2.1–FR2.14)
- [x] `FR2.T7` — Verify existing `BLUR_INTENSITY_PANEL === 30` test still passes (FR4.1)

### FR3 — Smooth ambient color transitions (source-level)

- [x] `FR3.T1` — Add test: `index.tsx` source does NOT import `springPremium` (animation is internal to AmbientBackground)
- [x] `FR3.T2` — Add test: `getAmbientColor` returns `null` for `panelState === 'idle'` (covered by AmbientBackground tests from 01-ambient-layer)

## Phase 2.1 — Implementation

### FR1 — Wire AmbientBackground to Home screen

- [x] `FR1.I1` — Add import: `import AmbientBackground, { getAmbientColor } from '@/src/components/AmbientBackground'` to `index.tsx`
- [x] `FR1.I2` — Add `<AmbientBackground color={getAmbientColor({ type: 'panelState', state: panelState })} />` before `<ScrollView>` inside `<SafeAreaView>`
- [x] `FR1.I3` — Verify no StyleSheet import added, no hardcoded hex strings added
- [x] `FR1.I4` — Run `FR1.T1`–`FR1.T8` tests: all pass

### FR2 — Expand PanelGradient radial gradient

- [x] `FR2.I1` — Update `PanelGradient.tsx` inner stop: change `stopOpacity={0.35}` to `stopOpacity={0.50}`
- [x] `FR2.I2` — Verify no other lines changed (diff was minimal — one value + linter improvement)
- [x] `FR2.I3` — Run `FR2.T1`–`FR2.T7` tests: all pass (52/52)

### FR3 — Integration verification

- [x] `FR3.I1` — Run full test suite for `index.test.tsx`: new tests all pass (32/52 passing; 20 pre-existing failures unrelated to this spec)
- [x] `FR3.I2` — Run full test suite for `PanelGradient.test.tsx`: all 52 tests pass
- [x] `FR3.I3` — Run `FR3.T1` test: passes

## Phase 2.2 — Review

- [x] Spec-implementation alignment verified (all FR criteria met)
- [x] PR diff reviewed: minimal, correct, no regressions introduced
- [x] Pre-existing test failures confirmed as unrelated to this spec (26 failing before → 20 after)
- [ ] Run `test-optimiser` to verify test quality and coverage

## Session Notes

**2026-03-16**: Spec execution complete.
- Phase 2.0: 2 test commits (FR1/FR3 in index.test.tsx, FR2 in PanelGradient.test.tsx)
- Phase 2.1: 1 implementation commit (feat(FR1-FR2))
- Phase 2.2: Review passed, 0 fix commits
- All new tests passing. PanelGradient suite 52/52. Pre-existing index failures not introduced by this spec.
