# Checklist: 03-glass-surfaces

**Spec:** [spec.md](spec.md)
**Status:** Complete

---

## Phase 3.0 — Tests (Red Phase)

Write all tests first. They must fail (red) before implementation begins.

### FR8 — Package mocks (prerequisite for all tests)

- [x] Create `hourglassws/__mocks__/@react-native-masked-view/masked-view.ts` — MaskedView mock rendering `<MaskedView>` element
- [x] Create `hourglassws/__mocks__/react-native-inner-shadow.ts` — InnerShadow mock rendering `<InnerShadow>` element
- [x] Update `hourglassws/__mocks__/@shopify/react-native-skia.ts` — add `BackdropFilter` and `Blur` exports
- [x] Commit: `test(FR8): add jest mocks for masked-view, inner-shadow, skia BackdropFilter`

### FR1 — GlassCard BackdropFilter blur tests

- [x] Test: GlassCard renders children without crash
- [x] Test: GlassCard render tree contains `Canvas` element
- [x] Test: GlassCard render tree contains `BackdropFilter` element
- [x] Test: `elevated=false` (default) — source contains blur radius 16
- [x] Test: `elevated=true` — source contains blur radius 20
- [x] Test: `renderToHardwareTextureAndroid` prop present when Platform.OS = 'android' (source check)
- [x] Test: children appear in rendered output
- [x] Commit: `test(FR1): add GlassCard BackdropFilter blur tests`

### FR2 — Gradient border tests

- [x] Test: GlassCard render tree contains `MaskedView` element
- [x] Test: default `borderAccentColor` is `#A78BFA` (source static check)
- [x] Test: custom `borderAccentColor` prop accepted without crash
- [x] Test: source contains 45° gradient vectors (`{x:0,y:1}` → `{x:1,y:0}` or equivalent)
- [x] Test: source contains `borderWidth: 1.5` or `gap: 1.5` for border gap mask
- [x] Commit: `test(FR1): add GlassCard BackdropFilter blur tests` (FR1–FR6 tests in single commit)

### FR3 — Inner shadow tests

- [x] Test: GlassCard render tree contains `InnerShadow` element
- [x] Test: source contains `rgba(0,0,0,0.6)` (top shadow)
- [x] Test: source contains `rgba(255,255,255,0.08)` (bottom highlight)
- [x] Commit: (included in FR1 test commit)

### FR4 — Pressable animation tests

- [x] Test: `pressable={false}` (default) — no press handler in tree
- [x] Test: `pressable={true}` — Pressable component in source (jest env renders as div)
- [x] Test: `pressable={true}` — onPressIn callback callable without crash
- [x] Test: `pressable={true}` — onPressOut callback callable without crash
- [x] Test: source contains `withSpring(0.97` (press-in scale target)
- [x] Test: source contains `stiffness: 300` and `damping: 20`
- [x] Test: `onPress` prop is called when card is pressed
- [x] Commit: (included in FR1 test commit)

### FR5 — layerBudget fallback tests

- [x] Test: `layerBudget={false}` — no `Canvas` element in render tree
- [x] Test: `layerBudget={false}` — no `MaskedView` element in render tree
- [x] Test: `layerBudget={false}` — no `InnerShadow` element in render tree
- [x] Test: `layerBudget={false}` — children still rendered
- [x] Test: `layerBudget={true}` (default) — `Canvas` present in render tree
- [x] Commit: (included in FR1 test commit)

### FR6 — Padding and radius prop tests

- [x] Test: default `padding='md'` — source contains padding 20 (source static check)
- [x] Test: `padding='lg'` — source contains padding 24
- [x] Test: default `radius='2xl'` — source contains borderRadius 16
- [x] Test: `radius='xl'` — source contains borderRadius 12
- [x] Commit: (included in FR1 test commit)

### FR7 — Card delegation tests

- [x] Test: `Card` with default props — render tree contains `Canvas` (delegates to GlassCard)
- [x] Test: `Card glass={false}` — render tree has NO `Canvas` element
- [x] Test: `Card elevated={true}` — renders without crash (elevated passed through to GlassCard)
- [x] Test: existing Card.test.tsx tests still pass after delegation change
- [x] Commit: `test(FR7): add Card delegation to GlassCard tests`

---

## Phase 3.1 — Implementation

Implement to make all tests pass. Commit each FR separately.

### FR8 — Package installation (prerequisite)

- [x] Add `"@react-native-masked-view/masked-view": "^0.3.2"` to `hourglassws/package.json` dependencies
- [x] Add `"react-native-inner-shadow": "^1.0.0"` to `hourglassws/package.json` dependencies
- [x] Run `npm install` in `hourglassws/` to update `package-lock.json`
- [x] Commit: `feat(FR8): add masked-view and inner-shadow packages`

### FR1 — GlassCard BackdropFilter blur

- [x] Create `hourglassws/src/components/GlassCard.tsx`
- [x] Implement `onLayout` measurement → `dims` state `{w, h}`
- [x] Render Skia `<Canvas>` with `<BackdropFilter filter={<Blur blur={blurRadius} />}>`
- [x] `<RoundedRect>` fill `rgba(22,21,31,0.6)` sized to `dims.w × dims.h`
- [x] Apply `renderToHardwareTextureAndroid={Platform.OS === 'android'}` to outer View
- [x] Guard: only render BackdropFilter when `dims.w > 0`
- [x] Run FR1 tests → green
- [x] Commit: `feat(FR1): implement GlassCard Skia BackdropFilter blur layer`

### FR2 — Masked gradient border

- [x] Implement `<MaskedView>` wrapping gradient border
- [x] Mask element: View with `borderWidth: 1.5` creates the 1.5px perimeter ring
- [x] `<LinearGradient>` from `expo-linear-gradient` with `colors={[borderAccentColor, 'transparent']}` `start={{x:0,y:1}}` `end={{x:1,y:0}}`
- [x] Default `borderAccentColor='#A78BFA'`
- [x] Run FR2 tests → green
- [x] Commit: (included in FR1 implementation commit)

### FR3 — Inner shadow

- [x] Import `InnerShadow` from `react-native-inner-shadow`
- [x] `inset=true`, `shadowColor=rgba(0,0,0,0.6)`, `isReflectedLightEnabled=true`, `reflectedLightColor=rgba(255,255,255,0.08)`
- [x] Run FR3 tests → green
- [x] Commit: (included in FR1 implementation commit, wired correctly in fix commit)

### FR4 — Pressable spring animation

- [x] Implement `useSharedValue(1)` scale + `useAnimatedStyle`
- [x] `handlePressIn`: `scale.value = withSpring(0.97, { stiffness: 300, damping: 20 })`
- [x] `handlePressOut`: `scale.value = withSpring(1, { stiffness: 300, damping: 20 })`
- [x] Wrap card in `Pressable` when `pressable={true}`
- [x] `onPress` prop wired through
- [x] Run FR4 tests → green
- [x] Commit: (included in FR1 implementation commit)

### FR5 — layerBudget fallback

- [x] When `layerBudget={false}`: render flat `View` with `GLASS_BASE` colors, no Canvas/MaskedView/InnerShadow
- [x] When `layerBudget={true}` (default): full glass treatment
- [x] Run FR5 tests → green
- [x] Commit: (included in FR1 implementation commit)

### FR6 — Padding and radius props

- [x] `padding` prop: `'md'` → 20px, `'lg'` → 24px
- [x] `radius` prop: `'xl'` → 12px, `'2xl'` → 16px
- [x] Run FR6 tests → green
- [x] Commit: (included in FR1 implementation commit)

### FR7 — Card.tsx delegation

- [x] Update `Card.tsx`: import `GlassCard` from `./GlassCard`
- [x] When `glass={true}` (default): delegate to `<GlassCard ...props>`
- [x] When `glass={false}`: keep existing flat surface render
- [x] Keep `GLASS_BASE`, `GLASS_ELEVATED`, `BLUR_INTENSITY_BASE`, `BLUR_INTENSITY_ELEVATED` exports
- [x] Run full Card test suite → green (41 tests)
- [x] Run full GlassCard test suite → green (39 tests)
- [x] Commit: `feat(FR7): update Card.tsx to delegate to GlassCard by default`

---

## Phase 3.2 — Review

Sequential review gates. Run in order.

- [x] Run spec-implementation-alignment check — PASS
- [x] Run `npm test -- --testPathPattern="GlassCard|Card"` → 80 tests passing
- [x] Run full test suite → 22 pre-existing failures (unrelated), no new regressions
- [x] Run pr-review-toolkit:review-pr — inline review completed
- [x] Address review feedback: SHADOW_BOTTOM wired via InnerShadow props, stale Card.tsx comments updated, conditional animatedStyle
- [x] Run test-optimiser on GlassCard.test.tsx — FR4.1 assertion strengthened
- [x] Final fix commits: `fix(03-glass-surfaces): address review feedback`, `fix(03-glass-surfaces): strengthen FR4.1 test assertion`

---

## Definition of Done

- [x] `GlassCard.tsx` created with FR1–FR6 fully implemented
- [x] `Card.tsx` delegates to GlassCard by default (FR7)
- [x] All new package mocks in place (FR8)
- [x] All GlassCard tests passing (green) — 39 tests
- [x] All existing Card tests still passing (no regression) — 41 tests
- [x] No new TypeScript errors
- [x] checklist.md all tasks marked `[x]`
- [x] FEATURE.md changelog updated

---

## Session Notes

**2026-03-19**: Implementation complete.
- Phase 3.0: 3 commits (FR8 mocks, FR1-FR6 tests, FR7 tests)
- Phase 3.1: 3 commits (FR8 packages, FR1-FR6 impl in GlassCard.tsx, FR7 Card delegation)
- Phase 3.2: 3 fix commits (test assertion fixes for jest env, review feedback: InnerShadow SHADOW_BOTTOM wiring + conditional animatedStyle + stale comments, test-optimiser FR4.1 strengthening)
- All tests passing: 39 GlassCard + 41 Card = 80 total.
