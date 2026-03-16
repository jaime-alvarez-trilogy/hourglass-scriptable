# Checklist: 05-panel-glass-surfaces

## Phase 5.0 — Tests (Red Phase)

### FR1: Radial Panel Gradient Tests
- [ ] Write test: `<PanelGradient state="onTrack" />` renders SVG with `RadialGradient` element (not `LinearGradient`)
- [ ] Write test: RadialGradient has `cx="50%"` and `cy="30%"` attributes
- [ ] Write test: all 5 states render without error (`onTrack`, `behind`, `critical`, `crushedIt`, `idle`)
- [ ] Write test: `idle` state renders no visible gradient
- [ ] Write test: opacity animation container (Animated.View) is present
- [ ] Mock `react-native-svg` components (`Svg`, `Defs`, `RadialGradient`, `Stop`, `Rect`)
- [ ] Confirm tests fail (red) before implementation

### FR2: Coloured Glows Tests
- [ ] Write test: `getGlowStyle('onTrack')` returns `shadowColor: '#10B981'` on iOS
- [ ] Write test: `getGlowStyle('critical')` returns `shadowOpacity: 0.18` on iOS
- [ ] Write test: `getGlowStyle('crushedIt')` returns `shadowColor: '#E8C97A'` on iOS
- [ ] Write test: `getGlowStyle('idle')` returns no shadow (shadowOpacity: 0 or `{}`)
- [ ] Write test: on Android, non-idle states return `{ elevation: 4 }`
- [ ] Write test: on Android, idle state returns `{ elevation: 0 }`
- [ ] Mock `Platform.OS` as `'ios'` and `'android'` in respective test cases
- [ ] Confirm tests fail (red) before implementation

### FR3: BlurView Modal Tests
- [ ] Write test: modal renders `BlurView` with `intensity={30}` and `tint="dark"`
- [ ] Write test: modal has inner `View` with semi-transparent `surfaceElevated` background
- [ ] Write test: existing modal content renders correctly (title, close button, children)
- [ ] Mock `expo-blur` `BlurView` as plain `View`
- [ ] Confirm tests fail (red) before implementation

### FR4: NoiseOverlay Tests
- [ ] Write test: `<NoiseOverlay />` renders without error
- [ ] Write test: component root has `pointerEvents="none"`
- [ ] Write test: Image has `opacity: 0.04` style
- [ ] Write test: Image is absolutely positioned (`position: 'absolute'`, `top: 0`, `left: 0`, `right: 0`, `bottom: 0`)
- [ ] Write test: Image has `resizeMode="repeat"`
- [ ] Mock image asset `require('../../assets/images/noise.png')` as `1`
- [ ] Confirm tests fail (red) before implementation

---

## Phase 5.1 — Implementation (Green Phase)

### Setup
- [ ] Run `npx expo install expo-blur` and commit updated `package.json`

### FR1: Radial Panel Gradient Implementation
- [ ] Update `src/components/PanelGradient.tsx`: remove `expo-linear-gradient` import
- [ ] Add `Svg, { Defs, RadialGradient, Stop, Rect }` imports from `react-native-svg`
- [ ] Implement SVG radial gradient with `cx="50%"` `cy="30%"` `r="70%"`
- [ ] Add per-state inner colour mapping
- [ ] Preserve `Animated.View` wrapper with springPremium opacity
- [ ] Verify `idle` state renders nothing / fully transparent
- [ ] Run FR1 tests — all pass

### FR2: Coloured Glows Implementation
- [ ] Export `getGlowStyle(state: PanelState): ViewStyle` from `PanelGradient.tsx`
- [ ] Implement iOS shadow props per-state lookup table
- [ ] Implement Android `elevation` fallback with `Platform.OS === 'android'` guard
- [ ] Run FR2 tests — all pass

### FR3: BlurView Modal Implementation
- [ ] Update `app/modal.tsx`: import `BlurView` from `expo-blur`
- [ ] Wrap modal content in `<BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>`
- [ ] Add inner `<View>` with `backgroundColor: colors.surfaceElevated` and `opacity: 0.85`
- [ ] Preserve existing modal content structure
- [ ] Run FR3 tests — all pass

### FR4: NoiseOverlay Implementation
- [ ] Create `src/components/NoiseOverlay.tsx`
- [ ] Implement absolutely positioned Image with `opacity: 0.04` and `resizeMode="repeat"`
- [ ] Set `pointerEvents="none"` on component root
- [ ] Add `assets/images/noise.png` (256×256 tileable noise PNG)
- [ ] Run FR4 tests — all pass

### Integration
- [ ] Run full test suite — all tests pass
- [ ] No regressions in existing PanelGradient tests

---

## Phase 5.2 — Review

- [ ] Run `spec-implementation-alignment` agent
- [ ] Run `pr-review-toolkit:review-pr`
- [ ] Address any review feedback
- [ ] Run `test-optimiser` agent
- [ ] All tests passing after review fixes
