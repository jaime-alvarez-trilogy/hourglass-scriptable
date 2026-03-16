# Checklist: 01-ambient-layer

## Phase 1.0 — Tests (Red Phase)

### FR1 + FR5 — AmbientBackground component tests
- [ ] Create `hourglassws/src/components/__tests__/AmbientBackground.test.tsx`
- [ ] Test: `color=null` renders nothing (empty touch-safe view)
- [ ] Test: `color="#10B981"` renders SVG with that fill color
- [ ] Test: root element has `pointerEvents="none"`
- [ ] Test: root element is absolutely positioned (uses `StyleSheet.absoluteFill`)
- [ ] Test (source): no `StyleSheet.create` call in `AmbientBackground.tsx`
- [ ] Test (source): `AmbientBackground` is the default export
- [ ] Test (source): uses `springPremium` for animation (import present)
- [ ] Test (source): uses `withSequence` + `withTiming` + `withSpring` (Reanimated pattern)
- [ ] Test (source): mount animation — `useSharedValue(0)` initial value

### FR2 — `getAmbientColor` + `AMBIENT_COLORS` tests
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'onTrack' })` → `colors.success`
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'behind' })` → `colors.warning`
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'critical' })` → `colors.critical`
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'crushedIt' })` → `colors.gold`
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'overtime' })` → `colors.overtimeWhiteGold`
- [ ] Test: `getAmbientColor({ type: 'panelState', state: 'idle' })` → `null`
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 0.85 })` → `colors.gold` (boundary inclusive)
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 1.0 })` → `colors.gold`
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 0.84 })` → `colors.warning`
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 0.60 })` → `colors.warning` (boundary inclusive)
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 0.59 })` → `colors.critical`
- [ ] Test: `getAmbientColor({ type: 'earningsPace', ratio: 0 })` → `colors.gold` (no prior data)
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 75 })` → `colors.violet` (boundary inclusive)
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 100 })` → `colors.violet`
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 74 })` → `colors.cyan`
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 60 })` → `colors.cyan` (boundary inclusive)
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 59 })` → `colors.warning`
- [ ] Test: `getAmbientColor({ type: 'aiPct', pct: 0 })` → `colors.warning`
- [ ] Test: `AMBIENT_COLORS.panelState` has all 6 PanelState keys

### FR3 + FR4 — Card.tsx constant tests (update existing)
- [ ] Update `hourglassws/src/components/__tests__/Card.test.tsx`
  - [ ] Test `FR1.4` — update borderColor assertion if needed (check current value: `0.10`)
  - [ ] Test `FR1.6` — update: `BLUR_INTENSITY_BASE` ≥ 60 (was: `=== 40`)
  - [ ] Test `FR1.8` — update: base BlurView intensity ≥ 60 (was: `=== 40`)
  - [ ] Test `FR2.5` — update: `BLUR_INTENSITY_ELEVATED` ≥ 80 (was: `=== 60`)
  - [ ] Test `FR2.6` — update: elevated BlurView intensity ≥ 80 (was: `=== 60`)
  - [ ] Add test: `GLASS_BASE.backgroundColor` alpha ≤ 0.15
  - [ ] Add test: `GLASS_ELEVATED.backgroundColor` alpha ≤ 0.20

---

## Phase 1.1 — Implementation

### FR1 + FR2 + FR5 — Create `AmbientBackground.tsx`
- [ ] Create `hourglassws/src/components/AmbientBackground.tsx`
- [ ] Export `AMBIENT_COLORS` constant with all signal keys
- [ ] Export `AmbientSignal` type union
- [ ] Export `getAmbientColor(signal: AmbientSignal): string | null` pure function
- [ ] Implement `AmbientBackground` default export
  - [ ] `color=null` → render `<View pointerEvents="none" style={StyleSheet.absoluteFill} />`
  - [ ] `color=hex` → render animated `Animated.View` with SVG RadialGradient
  - [ ] SVG: `cx="50%"`, `cy="0%"`, radius = 70% screen width via `useWindowDimensions`
  - [ ] Inner stop: `stopOpacity={0.08 * intensity}`
  - [ ] Outer stop: `stopOpacity={0}`
  - [ ] `pointerEvents="none"` on root
  - [ ] Absolute positioning via `StyleSheet.absoluteFill`
  - [ ] No `StyleSheet.create` usage
  - [ ] FR5: `useSharedValue(0)` for opacity
  - [ ] FR5: `useEffect` on `color` — mount: `withSpring(1, springPremium)`; update: `withSequence(withTiming(0, {duration:120}), withSpring(1, springPremium))`

### FR3 + FR4 — Modify `Card.tsx`
- [ ] Update `GLASS_BASE.backgroundColor` → `'rgba(22, 21, 31, 0.12)'`
- [ ] Update `GLASS_ELEVATED.backgroundColor` → `'rgba(31, 30, 41, 0.18)'`
- [ ] Update `BLUR_INTENSITY_BASE` → `60`
- [ ] Update `BLUR_INTENSITY_ELEVATED` → `80`
- [ ] Update comment on `GLASS_BASE` to reflect new opacity value
- [ ] Update comment on `GLASS_ELEVATED` to reflect new opacity value
- [ ] Run Card tests — all pass

---

## Phase 1.2 — Review

- [ ] Run `spec-implementation-alignment` validator
- [ ] Run `pr-review-toolkit:review-pr`
- [ ] Address any review feedback
- [ ] Run `test-optimiser`
- [ ] All tests passing (`npx jest --testPathPattern="AmbientBackground|Card"`)
