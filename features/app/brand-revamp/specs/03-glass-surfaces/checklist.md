# Checklist: 03-glass-surfaces

**Spec:** [spec.md](spec.md)
**Status:** Not Started

---

## Phase 3.0 — Tests (Red Phase)

Write all tests first. They must fail (red) before implementation begins.

### FR8 — Package mocks (prerequisite for all tests)

- [ ] Create `hourglassws/__mocks__/@react-native-masked-view/masked-view.ts` — MaskedView mock rendering `<MaskedView>` element
- [ ] Create `hourglassws/__mocks__/react-native-inner-shadow.ts` — InnerShadow mock rendering `<InnerShadow>` element
- [ ] Update `hourglassws/__mocks__/@shopify/react-native-skia.ts` — add `BackdropFilter` and `Blur` exports
- [ ] Commit: `test(FR8): add jest mocks for masked-view, inner-shadow, skia BackdropFilter`

### FR1 — GlassCard BackdropFilter blur tests

- [ ] Test: GlassCard renders children without crash
- [ ] Test: GlassCard render tree contains `Canvas` element
- [ ] Test: GlassCard render tree contains `BackdropFilter` element
- [ ] Test: `elevated=false` (default) — source contains blur radius 16
- [ ] Test: `elevated=true` — source contains blur radius 20
- [ ] Test: `renderToHardwareTextureAndroid` prop present when Platform.OS = 'android' (source check)
- [ ] Test: children appear in rendered output
- [ ] Commit: `test(FR1): add GlassCard BackdropFilter blur tests`

### FR2 — Gradient border tests

- [ ] Test: GlassCard render tree contains `MaskedView` element
- [ ] Test: default `borderAccentColor` is `#A78BFA` (source static check)
- [ ] Test: custom `borderAccentColor` prop accepted without crash
- [ ] Test: source contains 45° gradient vectors (`{x:0,y:1}` → `{x:1,y:0}` or equivalent)
- [ ] Test: source contains `borderWidth: 1.5` or `gap: 1.5` for border gap mask
- [ ] Commit: `test(FR2): add gradient border masked-view tests`

### FR3 — Inner shadow tests

- [ ] Test: GlassCard render tree contains `InnerShadow` element
- [ ] Test: source contains `rgba(0,0,0,0.6)` (top shadow)
- [ ] Test: source contains `rgba(255,255,255,0.08)` (bottom highlight)
- [ ] Commit: `test(FR3): add inner shadow depth tests`

### FR4 — Pressable animation tests

- [ ] Test: `pressable={false}` (default) — no press handler attached (no Pressable/TouchableOpacity in tree)
- [ ] Test: `pressable={true}` — Pressable or TouchableOpacity present in tree
- [ ] Test: `pressable={true}` — onPressIn callback accessible and callable without crash
- [ ] Test: `pressable={true}` — onPressOut callback accessible and callable without crash
- [ ] Test: source contains `withSpring(0.97` (press-in scale target)
- [ ] Test: source contains `stiffness: 300` and `damping: 20`
- [ ] Test: `onPress` prop is called when card is pressed
- [ ] Commit: `test(FR4): add pressable spring animation tests`

### FR5 — layerBudget fallback tests

- [ ] Test: `layerBudget={false}` — no `Canvas` element in render tree
- [ ] Test: `layerBudget={false}` — no `MaskedView` element in render tree
- [ ] Test: `layerBudget={false}` — no `InnerShadow` element in render tree
- [ ] Test: `layerBudget={false}` — children still rendered
- [ ] Test: `layerBudget={true}` (default) — `Canvas` present in render tree
- [ ] Commit: `test(FR5): add layerBudget fallback tests`

### FR6 — Padding and radius prop tests

- [ ] Test: default `padding='md'` — source contains padding 20 (source static check)
- [ ] Test: `padding='lg'` — source contains padding 24
- [ ] Test: default `radius='2xl'` — source contains borderRadius 16
- [ ] Test: `radius='xl'` — source contains borderRadius 12
- [ ] Commit: `test(FR6): add padding and radius prop tests`

### FR7 — Card delegation tests

- [ ] Test: `Card` with default props — render tree contains `Canvas` (delegates to GlassCard)
- [ ] Test: `Card glass={false}` — render tree has NO `Canvas` element
- [ ] Test: `Card elevated={true}` — renders without crash (elevated passed through to GlassCard)
- [ ] Test: existing Card.test.tsx tests still pass after delegation change
- [ ] Commit: `test(FR7): add Card delegation to GlassCard tests`

---

## Phase 3.1 — Implementation

Implement to make all tests pass. Commit each FR separately.

### FR8 — Package installation (prerequisite)

- [ ] Add `"@react-native-masked-view/masked-view": "^0.3.2"` to `hourglassws/package.json` dependencies
- [ ] Add `"react-native-inner-shadow": "^1.0.0"` to `hourglassws/package.json` dependencies
- [ ] Run `npm install` in `hourglassws/` to update `package-lock.json`
- [ ] Commit: `feat(FR8): add masked-view and inner-shadow packages`

### FR1 — GlassCard BackdropFilter blur

- [ ] Create `hourglassws/src/components/GlassCard.tsx`
- [ ] Implement `onLayout` measurement → `dims` state `{w, h}`
- [ ] Render Skia `<Canvas>` with `<BackdropFilter filter={<Blur blur={blurRadius} />}>`
- [ ] `<RoundedRect>` fill `rgba(22,21,31,0.6)` sized to `dims.w × dims.h`
- [ ] Apply `renderToHardwareTextureAndroid={Platform.OS === 'android'}` to outer View
- [ ] Guard: only render BackdropFilter when `dims.w > 0`
- [ ] Run FR1 tests → green
- [ ] Commit: `feat(FR1): implement GlassCard Skia BackdropFilter blur layer`

### FR2 — Masked gradient border

- [ ] Implement `<MaskedView>` wrapping the card
- [ ] Mask element: outer View + inner View with `borderWidth: 1.5` gap (or equivalent negative margin inset)
- [ ] `<LinearGradient>` from `expo-linear-gradient` with `colors={[borderAccentColor, 'transparent']}` `start={{x:0,y:1}}` `end={{x:1,y:0}}`
- [ ] Default `borderAccentColor='#A78BFA'`
- [ ] Run FR2 tests → green
- [ ] Commit: `feat(FR2): implement masked gradient border on GlassCard`

### FR3 — Inner shadow

- [ ] Import `InnerShadow` from `react-native-inner-shadow`
- [ ] Render inside card: `shadowColor='rgba(0,0,0,0.6)'` top inset, `rgba(255,255,255,0.08)` bottom highlight
- [ ] Run FR3 tests → green
- [ ] Commit: `feat(FR3): implement inner shadow physical depth on GlassCard`

### FR4 — Pressable spring animation

- [ ] Implement `useSharedValue(1)` scale + `useAnimatedStyle`
- [ ] `handlePressIn`: `scale.value = withSpring(0.97, { stiffness: 300, damping: 20 })`
- [ ] `handlePressOut`: `scale.value = withSpring(1, { stiffness: 300, damping: 20 })`
- [ ] Wrap card in `Pressable` (or `TouchableOpacity`) when `pressable={true}`
- [ ] Wrap in `Animated.View` with `animatedScale` style
- [ ] `onPress` prop wired through
- [ ] Run FR4 tests → green
- [ ] Commit: `feat(FR4): implement pressable spring animation on GlassCard`

### FR5 — layerBudget fallback

- [ ] When `layerBudget={false}`: render flat `View` with `GLASS_BASE` colors, no Canvas/MaskedView/InnerShadow
- [ ] When `layerBudget={true}` (default): full glass treatment
- [ ] Run FR5 tests → green
- [ ] Commit: `feat(FR5): implement layerBudget flat-surface fallback`

### FR6 — Padding and radius props

- [ ] `padding` prop: `'md'` → 20px, `'lg'` → 24px (applied to content container)
- [ ] `radius` prop: `'xl'` → 12px, `'2xl'` → 16px (applied to RoundedRect r, MaskedView border radius)
- [ ] Run FR6 tests → green
- [ ] Commit: `feat(FR6): implement padding and radius props on GlassCard`

### FR7 — Card.tsx delegation

- [ ] Update `Card.tsx`: import `GlassCard` from `./GlassCard`
- [ ] When `glass={true}` (default): delegate to `<GlassCard ...props>`
- [ ] When `glass={false}`: keep existing flat surface render
- [ ] Keep `GLASS_BASE`, `GLASS_ELEVATED`, `BLUR_INTENSITY_BASE`, `BLUR_INTENSITY_ELEVATED` exports
- [ ] Update `Card.test.tsx`: `glass=true` now renders Canvas (update FR1.7, FR2.6, FR3.3 assertions that check `not.toContain('BlurView')` — these still pass since GlassCard uses BackdropFilter not BlurView)
- [ ] Run full Card test suite → green
- [ ] Run full GlassCard test suite → green
- [ ] Commit: `feat(FR7): update Card.tsx to delegate to GlassCard by default`

---

## Phase 3.2 — Review

Sequential review gates. Run in order.

- [ ] Run spec-implementation-alignment check
- [ ] Run `npm test -- --testPathPattern="GlassCard|Card"` → all tests passing
- [ ] Run full test suite → no regressions
- [ ] Run pr-review-toolkit:review-pr
- [ ] Address any review feedback
- [ ] Run test-optimiser on GlassCard.test.tsx
- [ ] Final commit (if fixes needed): `fix(03-glass-surfaces): address review feedback`

---

## Definition of Done

- [ ] `GlassCard.tsx` created with FR1–FR6 fully implemented
- [ ] `Card.tsx` delegates to GlassCard by default (FR7)
- [ ] All new package mocks in place (FR8)
- [ ] All GlassCard tests passing (green)
- [ ] All existing Card tests still passing (no regression)
- [ ] No new TypeScript errors
- [ ] checklist.md all tasks marked `[x]`
- [ ] FEATURE.md changelog updated
