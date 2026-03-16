# Implementation Checklist

Spec: `02-dark-glass`
Feature: `brand-compliance`

---

## Phase 1.0: Test Foundation

### FR1: Card glass layer (base variant)
- [ ] Write test: Card renders a `BlurView` child (mock expo-blur)
- [ ] Write test: BlurView has `intensity={40}` in base variant
- [ ] Write test: outer wrapper has `overflow: "hidden"`
- [ ] Write test: outer wrapper has `borderRadius: 16`
- [ ] Write test: `GLASS_BASE.backgroundColor` contains `rgba` (semi-transparent)
- [ ] Write test: `GLASS_BASE.borderColor` equals `rgba(255, 255, 255, 0.06)`
- [ ] Update existing test: remove/replace `SC1.6 — no hardcoded hex` assertion (rgba values are now intentional)
- [ ] Update existing test: remove `SC1.2 — source contains border-border` assertion
- [ ] Update existing test: remove `SC1.6 — no StyleSheet import` assertion

### FR2: Card glass layer (elevated variant)
- [ ] Write test: BlurView has `intensity={60}` when `elevated={true}`
- [ ] Write test: `GLASS_ELEVATED.backgroundColor` contains `rgba` and is different from `GLASS_BASE`
- [ ] Write test: `GLASS_ELEVATED.borderColor` equals `rgba(255, 255, 255, 0.06)`

### FR3: Card `glass` opt-out prop
- [ ] Write test: `glass={false}` renders no `BlurView`
- [ ] Write test: `glass={false}` renders flat View with `bg-surface` class
- [ ] Write test: `className` prop applies to outer wrapper in both glass and non-glass modes
- [ ] Write test: renders children in both glass and non-glass modes

### FR4: PanelGradient glass base layer
- [ ] Write test: PanelGradient renders a `BlurView` with `intensity={30}` (mock expo-blur)
- [ ] Write test: existing children still render when BlurView is present
- [ ] Write test: all existing PanelGradient tests continue to pass

---

## Test Design Validation (MANDATORY)

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (check intensity values, not just existence)
- [ ] expo-blur mock returns realistic passthrough component
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Card glass layer (base variant)
- [ ] Add `import { BlurView } from 'expo-blur'` to `Card.tsx`
- [ ] Add `import { StyleSheet } from 'react-native'` to `Card.tsx`
- [ ] Export `GLASS_BASE` constant with `backgroundColor`, `borderColor`, `borderWidth`
- [ ] Export `BLUR_INTENSITY_BASE = 40`
- [ ] Restructure base Card: outer `View` with `overflow: "hidden"`, `borderRadius: 16`, border via style prop
- [ ] Add `BlurView` absolutely positioned (`StyleSheet.absoluteFill`) inside outer wrapper
- [ ] Inner content `View` uses `backgroundColor: GLASS_BASE.backgroundColor`

### FR2: Card glass layer (elevated variant)
- [ ] Export `GLASS_ELEVATED` constant with brighter `backgroundColor`, same border
- [ ] Export `BLUR_INTENSITY_ELEVATED = 60`
- [ ] Elevated path uses `GLASS_ELEVATED` styles and `BLUR_INTENSITY_ELEVATED` on BlurView

### FR3: Card `glass` opt-out prop
- [ ] Add `glass?: boolean` to `CardProps` interface (default `true`)
- [ ] Add `style?: ViewStyle` to `CardProps` interface
- [ ] Implement conditional: `glass !== false` → glass path, else → flat legacy path
- [ ] Ensure `className` and `style` props pass through in both paths

### FR4: PanelGradient glass base layer
- [ ] Add `import { BlurView } from 'expo-blur'` to `PanelGradient.tsx`
- [ ] Export `BLUR_INTENSITY_PANEL = 30` from `PanelGradient.tsx`
- [ ] Insert `<BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />` as first child of `Animated.View`, before the SVG gradient

---

## Phase 1.2: Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] GLASS_BASE and GLASS_ELEVATED constants match brand spec values
- [ ] No scope creep (no extra blur surfaces beyond Card + PanelGradient)

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(02-dark-glass): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified test files
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(02-dark-glass): strengthen test assertions`

### Final Verification
- [ ] All tests passing (`yarn test` or `npx jest`)
- [ ] No regressions in existing Card / PanelGradient tests
- [ ] `expo-blur` mock in place for test environment

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-16**: Spec created. Key constraint: existing Card.test.tsx has 3 source-analysis assertions that must be updated alongside the new glass tests. PanelGradient.test.tsx already mocks react-native-svg; expo-blur mock must be added.
