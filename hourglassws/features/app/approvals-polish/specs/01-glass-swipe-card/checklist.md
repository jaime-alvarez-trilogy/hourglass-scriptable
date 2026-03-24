# Implementation Checklist

Spec: `01-glass-swipe-card`
Feature: `approvals-polish`

---

## Phase 1.0: Test Foundation

### Setup: Mocks and Test Infrastructure
- [ ] Add `expo-linear-gradient` mock at `__mocks__/expo-linear-gradient.ts` (renders `LinearGradient` as plain `View`)
- [ ] Add `moduleNameMapper` entry to `jest.config.js` for `.png` assets (`\\.(png|jpg|jpeg|gif)$` → `fileMock.js`)
- [ ] Create `__mocks__/fileMock.js` returning `module.exports = {}` (if not already present)
- [ ] Extend `__mocks__/react-native-gesture-handler.ts` `Gesture.Pan()` with `failOffsetY`, `onStart`, `onEnd` methods (`jest.fn().mockReturnThis()`)

### FR1: Inline Glass Surface
- [ ] Test: card renders without throwing (snapshot or `toBeOnTheScreen`)
- [ ] Test: outer `Animated.View` has `backgroundColor: '#16151F'` (dark fallback, no white flash)
- [ ] Test: `renderToHardwareTextureAndroid` prop is set on outer animated view
- [ ] Test: `LinearGradient` (expo-linear-gradient) is rendered (border gradient present)
- [ ] Test: `BackdropFilter` element is in the render tree when dims are set
- [ ] Test: Canvas is NOT rendered when dims.w = 0 (zero-canvas guard)
- [ ] Test: card content (fullName, hours, description) is visible in rendered output
- [ ] Test: `bg-surface` NativeWind class is absent from card container

### FR2: Full-Width Glow Overlays
- [ ] Test: `approveGlowStyle` opacity = 0 at `translateX = 0` (via `useAnimatedStyle` unit test or mocked shared value)
- [ ] Test: `approveGlowStyle` opacity = `GLOW_OPACITY_MAX` (0.55) at `translateX = SWIPE_THRESHOLD` (100)
- [ ] Test: `rejectGlowStyle` opacity = 0 at `translateX = 0`
- [ ] Test: `rejectGlowStyle` opacity = `GLOW_OPACITY_MAX` at `translateX = -SWIPE_THRESHOLD` (-100)
- [ ] Test: approve glow opacity clamped at GLOW_OPACITY_MAX when translateX > SWIPE_THRESHOLD
- [ ] Test: reject glow opacity = 0 when translateX > 0 (opposite direction)
- [ ] Test: approve glow opacity = 0 when translateX < 0 (opposite direction)

### FR3: Card-Face Directional Overlays
- [ ] Test: approve face overlay is in render tree with `pointerEvents="none"`
- [ ] Test: reject face overlay is in render tree with `pointerEvents="none"`
- [ ] Test: "APPROVE" text is present in approve overlay
- [ ] Test: "REJECT" text is present in reject overlay
- [ ] Test: `approveFaceStyle` opacity = 0 at `translateX = 0`
- [ ] Test: `approveFaceStyle` opacity = 1 at `translateX = SWIPE_THRESHOLD * 0.5` (50)
- [ ] Test: `rejectFaceStyle` opacity = 1 at `translateX = -SWIPE_THRESHOLD * 0.5` (-50)
- [ ] Test: `rejectFaceStyle` opacity = 0 at `translateX = 0`

### FR4: useReducedMotion Gating
- [ ] Test: when `reducedMotion = true`, `cardStyle` rotation is `'0deg'` (no rotation transform)
- [ ] Test: when `reducedMotion = true`, `approveGlowStyle` opacity = 0
- [ ] Test: when `reducedMotion = true`, `rejectGlowStyle` opacity = 0
- [ ] Test: when `reducedMotion = true`, `approveFaceStyle` opacity = 0
- [ ] Test: when `reducedMotion = true`, `rejectFaceStyle` opacity = 0

### FR5: Swipe Dismiss and Callbacks
- [ ] Test: `onApprove` is called when pan gesture ends with `translateX > SWIPE_THRESHOLD`
- [ ] Test: `onReject` is called when pan gesture ends with `translateX < -SWIPE_THRESHOLD`
- [ ] Test: neither callback called when pan ends sub-threshold
- [ ] Test: `Haptics.notificationAsync(Success)` called on approve
- [ ] Test: `Haptics.notificationAsync(Warning)` called on reject
- [ ] Test: callbacks NOT called when `reducedMotion = true` and swipe exceeds threshold

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### Setup: Test Infrastructure
- [ ] Create `__mocks__/expo-linear-gradient.ts`
- [ ] Update `jest.config.js` moduleNameMapper for PNG assets
- [ ] Create `__mocks__/fileMock.js` (if absent)
- [ ] Update `__mocks__/react-native-gesture-handler.ts` to add missing gesture methods

### FR1: Inline Glass Surface
- [ ] Add `useState` for `dims: { w: number, h: number }` (initialized `{ w: 0, h: 0 }`)
- [ ] Replace outer card container (was `View className="rounded-2xl border border-border bg-surface overflow-hidden"`) with `Animated.View` carrying dark bg fallback + `renderToHardwareTextureAndroid`
- [ ] Add `expo-linear-gradient` `LinearGradient` border at absoluteFill with violet accent `colors.violet + '40'`
- [ ] Add wrapping `View` with `onLayout` to capture `dims`
- [ ] Add Skia `Canvas` (absoluteFill) guarded by `dims.w > 0` with `BackdropFilter(blur=16)` + `RoundedRect(GLASS_FILL)` + inner shadow gradient
- [ ] Add noise overlay `View` at 0.03 opacity with `ImageBackground(noise.png, resizeMode=repeat)`
- [ ] Remove existing top highlight `View` (replaced by inner shadow in Canvas)
- [ ] Add required imports: `useState`, `StyleSheet`, `ImageBackground`, `Platform`, Skia primitives, `LinearGradient`
- [ ] Add constants: `GLOW_OPACITY_MAX`, `GLASS_FILL`, `SHADOW_TOP`, `SHADOW_BOTTOM`, `BLUR_RADIUS`, `BORDER_RADIUS_PX`

### FR2: Full-Width Glow Overlays
- [ ] Remove existing `approveActionStyle` / `rejectActionStyle` animated styles (width-reveal)
- [ ] Add `approveGlowStyle` `useAnimatedStyle`: opacity interpolated `[0, SWIPE_THRESHOLD] → [0, GLOW_OPACITY_MAX]` (CLAMP), returns 0 when `reducedMotion`
- [ ] Add `rejectGlowStyle` `useAnimatedStyle`: opacity interpolated `[-SWIPE_THRESHOLD, 0] → [GLOW_OPACITY_MAX, 0]` (CLAMP), returns 0 when `reducedMotion`
- [ ] Replace existing width-reveal `Animated.View`s in JSX with glow overlay `Animated.View`s (absoluteFill, rendered BEFORE `GestureDetector`)

### FR3: Card-Face Directional Overlays
- [ ] Add `approveFaceStyle` `useAnimatedStyle`: opacity interpolated `[0, SWIPE_THRESHOLD*0.5] → [0, 1]` (CLAMP), returns 0 when `reducedMotion`
- [ ] Add `rejectFaceStyle` `useAnimatedStyle`: opacity interpolated `[-SWIPE_THRESHOLD*0.5, 0] → [1, 0]` (CLAMP), returns 0 when `reducedMotion`
- [ ] Update `approveIconStyle` to use new input range (`[0, SWIPE_THRESHOLD, SWIPE_THRESHOLD, SWIPE_THRESHOLD*1.4]`)
- [ ] Update `rejectIconStyle` to use new input range (`[-SWIPE_THRESHOLD*1.4, -SWIPE_THRESHOLD, -SWIPE_THRESHOLD*0.6, 0]`)
- [ ] Add approve face overlay inside content `View`: absoluteFill, `pointerEvents="none"`, Ionicons `checkmark-circle` 48px in `colors.success`, "APPROVE" label
- [ ] Add reject face overlay inside content `View`: absoluteFill, `pointerEvents="none"`, Ionicons `close-circle` 48px in `colors.destructive`, "REJECT" label

### FR4: useReducedMotion Gating
- [ ] Verify `reducedMotion` is used in `approveGlowStyle` / `rejectGlowStyle` (return 0 when `reducedMotion`)
- [ ] Verify `reducedMotion` is used in `approveFaceStyle` / `rejectFaceStyle` (return 0 when `reducedMotion`)
- [ ] Verify `cardStyle` rotation is already gated with `reducedMotion ? '0deg' : \`${rotation}deg\`` (already in current code, no change needed)

### FR5: Swipe Dismiss and Callbacks
- [ ] Verify `panGesture` `onEnd` callback conditions are unchanged (`!reducedMotion && ...`)
- [ ] Verify `triggerApprove`, `triggerReject`, `triggerLight` callbacks unchanged
- [ ] Verify `SWIPE_THRESHOLD = 100` and `DISMISS_VELOCITY = 800` constants unchanged
- [ ] Run full test suite — all tests green

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(01-glass-swipe-card): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(01-glass-swipe-card): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns (GlassCard layer stack, colors from colors.ts, reanimated-presets)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-24**: Spec created. Key technical notes:
- `expo-linear-gradient` mock needed (not present in `__mocks__/`)
- `react-native-gesture-handler` mock missing `failOffsetY`, `onStart`, `onEnd` — must extend before tests can pass
- `jest.config.js` needs `.png` moduleNameMapper entry for `noise.png`
- Glass layer stack is inlined from `GlassCard.tsx` — DO NOT use `<GlassCard>` wrapper
- Glow overlays replace width-reveal mechanism entirely — remove `approveActionStyle`/`rejectActionStyle`
