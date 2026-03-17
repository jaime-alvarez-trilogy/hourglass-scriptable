# Implementation Checklist

Spec: `01-ahead-of-pace-state`
Feature: `crushing-pace`

---

## Phase 1.0: Test Foundation

### FR1: `computePanelState` returns `'aheadOfPace'` at ≥150% pace

- [x] In `panelState.test.ts`: add test — `computePanelState(12, 40, 1.0)` returns `'aheadOfPace'` (Mon EOD 150%)
- [x] In `panelState.test.ts`: add test — `computePanelState(24, 40, 2.0)` returns `'aheadOfPace'` (Tue EOD 150%)
- [x] In `panelState.test.ts`: add test — `computePanelState(20, 40, 1.667)` returns `'aheadOfPace'` (ratio exactly 1.5)
- [x] In `panelState.test.ts`: add test — `pacingRatio = 1.5` exactly returns `'aheadOfPace'`
- [x] In `panelState.test.ts`: add test — `pacingRatio = 1.499` returns `'onTrack'` (just below threshold)
- [x] In `panelState.test.ts`: add test — `pacingRatio = 2.0` returns `'aheadOfPace'` (well above)
- [x] In `panelState.test.ts`: add test — `computePanelState(45, 40, 1.0)` returns `'overtime'` (priority preserved)
- [x] In `panelState.test.ts`: add test — `computePanelState(40, 40, 1.0)` returns `'crushedIt'` (priority preserved)
- [x] In `panelState.test.ts`: add test — `computePanelState(0, 40, 0.5)` returns `'idle'` (idle guard preserved)
- [x] In `panelState.test.ts`: add test — `PACING_CRUSHING_THRESHOLD` is exported and equals `1.5`

### FR2: All state maps include `'aheadOfPace'`

- [x] In `PanelGradient.test.tsx`: add `'aheadOfPace'` to both `allStates` arrays (lines 65 and 234)
- [x] In `PanelGradient.test.tsx`: add test — `getGlowStyle('aheadOfPace')` returns object with `shadowColor === '#E8C97A'`
- [x] In `PanelGradient.test.tsx`: add test — `PANEL_GRADIENT_COLORS['aheadOfPace']` is non-null with `inner` and `outer`
- [x] In `PanelGradient.test.tsx`: add test — `PANEL_GRADIENTS['aheadOfPace'].colors` has length 2
- [x] In `PanelGradient.test.tsx`: add test — `PanelGradient` renders without error when `state="aheadOfPace"`
- [x] In `AmbientBackground.test.tsx`: add `'aheadOfPace'` to the state loop (lines 148–249)
- [x] In `AmbientBackground.test.tsx`: update length assertion from `6` to `7`
- [x] In `AmbientBackground.test.tsx`: add test — `getAmbientColor({ type: 'panelState', state: 'aheadOfPace' })` returns non-null string

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: `computePanelState` returns `'aheadOfPace'` at ≥150% pace

- [x] In `reanimated-presets.ts` line 170: expand `PanelState` union to include `"aheadOfPace"`
- [x] In `panelState.ts`: export `PACING_CRUSHING_THRESHOLD = 1.5` constant (after `PACING_BEHIND_THRESHOLD`)
- [x] In `panelState.ts`: update JSDoc (panel states count 6 → 7, add `aheadOfPace` to list)
- [x] In `panelState.ts`: insert `if (pacingRatio >= PACING_CRUSHING_THRESHOLD) return 'aheadOfPace'` before `onTrack` guard
- [x] Verify TypeScript catches all missing map entries (compile-time check)

### FR2: All state maps include `'aheadOfPace'`

- [x] In `app/(tabs)/index.tsx`: add `aheadOfPace: 'CRUSHING IT'` to `STATE_LABELS`
- [x] In `app/(tabs)/index.tsx`: add `aheadOfPace: 'text-gold'` to `STATE_COLORS`
- [x] In `app/(tabs)/index.tsx`: add `aheadOfPace: colors.gold` to `TODAY_BAR_COLORS`
- [x] In `PanelGradient.tsx`: add `aheadOfPace: { inner: '#E8C97A', outer: 'transparent' }` to `PANEL_GRADIENT_COLORS`
- [x] In `PanelGradient.tsx`: add `aheadOfPace: { colors: ['#E8C97A59', 'transparent'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }` to `PANEL_GRADIENTS`
- [x] In `PanelGradient.tsx`: add `case 'aheadOfPace': return { shadowColor: '#E8C97A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset }` to `getGlowStyle` switch
- [x] In `AmbientBackground.tsx`: add `aheadOfPace: colors.gold` to `AMBIENT_COLORS.panelState`
- [x] Run `tsc --noEmit` in `hourglassws/` — zero errors

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

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
- [x] Commit fixes: `fix(01-ahead-of-pace-state): {description}`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests
- [x] Apply suggested improvements that strengthen confidence
- [x] Re-run tests to confirm passing
- [x] Commit if changes made: `fix(01-ahead-of-pace-state): strengthen test assertions`

### Final Verification
- [x] All tests passing
- [x] No regressions in existing tests (`onTrack`, `behind`, `critical`, `crushedIt`, `idle`, `overtime` all still pass)
- [x] Code follows existing patterns (gold entries mirror crushedIt structure)

---

## Session Notes

**2026-03-17**: Spec created. Research identified 9 insertion points across 5 source files + 3 test files. All maps are `Record<PanelState, T>` — TypeScript will enforce exhaustiveness after type expansion. No new color tokens required; `colors.gold` reused throughout.

**2026-03-17**: Implementation complete.
- Phase 1.0: 1 test commit (16 new tests in 3 files, all red)
- Phase 1.1: 2 commits (FR1+FR2 implementation, fix for FR1.3 float precision in test)
- Phase 1.2: 1 fix commit (stale "five states" → "seven states" JSDoc). Review passed.
- All 173 target tests passing. No new failures in full suite (baseline had 24 failing suites before this change).
