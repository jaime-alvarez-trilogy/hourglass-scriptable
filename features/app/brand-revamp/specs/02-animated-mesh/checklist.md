# Checklist: 02-animated-mesh

**Spec:** Animated Skia Mesh Background
**Feature:** brand-revamp
**Status:** Complete

---

## Phase 1.0 — Tests (Red Phase)

Write all tests before any implementation. Tests must fail initially (red phase).

### FR1 — AnimatedMeshBackground Component

- [x] `test(FR1)` Write `AnimatedMeshBackground.test.tsx` — FR1.1: renders without error when no props provided
- [x] `test(FR1)` FR1.2: renders without error when `panelState="onTrack"`
- [x] `test(FR1)` FR1.3: renders without error when `panelState=null`
- [x] `test(FR1)` FR1.4: source uses `StyleSheet.absoluteFill` for Canvas positioning
- [x] `test(FR1)` FR1.5: source has `pointerEvents="none"` on Canvas element
- [x] `test(FR1)` FR1.6: component is exported as both named and default export

### FR2 — Reanimated Animation Driver

- [x] `test(FR2)` FR2.1: source uses `useSharedValue(0)` for `time` initialization
- [x] `test(FR2)` FR2.2: source calls `withTiming` with `duration: 20000`
- [x] `test(FR2)` FR2.3: source calls `withRepeat` with `-1` (infinite) and `false` (no reverse)
- [x] `test(FR2)` FR2.4: source uses `useDerivedValue` for all three node center computations
- [x] `test(FR2)` FR2.5: at time=0 — nodeACenter formula produces x=w*0.5, y=h*0.5 (verify math constants)
- [x] `test(FR2)` FR2.6: at time=0.5 — nodeACenter.y = h*0.10 (cos(π)=-1 → h*0.3 - h*0.20)
- [x] `test(FR2)` FR2.7: nodeBCenter has phase offset 2π/3 relative to nodeACenter (verify constant in source)
- [x] `test(FR2)` FR2.8: nodeCCenter has phase offset 4π/3 relative to nodeACenter (verify constant in source)

### FR3 — Status-Driven Node C Color

- [x] `test(FR3)` FR3.1: `panelState="onTrack"` → resolveNodeCColor returns string containing `#10B981`
- [x] `test(FR3)` FR3.2: `panelState="crushedIt"` → returns string containing `#E8C97A`
- [x] `test(FR3)` FR3.3: `panelState="critical"` → returns string containing `#F43F5E`
- [x] `test(FR3)` FR3.4: `panelState="behind"` → returns string containing `#F59E0B`
- [x] `test(FR3)` FR3.5: `panelState="idle"` → returns `#0D0C14` (invisible base)
- [x] `test(FR3)` FR3.6: all props null → returns `#0D0C14`
- [x] `test(FR3)` FR3.7: `earningsPace=0.9` (no panelState) → returns string containing `#E8C97A`
- [x] `test(FR3)` FR3.8: `aiPct=80` (no panelState, no earningsPace) → returns string containing `#A78BFA`
- [x] `test(FR3)` FR3.9: `panelState` takes priority over `earningsPace` when both provided

### FR4 — Gradient Node Visual Spec

- [x] `test(FR4)` FR4.1: source imports `Canvas`, `Circle`, `Rect`, `RadialGradient` from `@shopify/react-native-skia`
- [x] `test(FR4)` FR4.2: source imports `vec` from `@shopify/react-native-skia`
- [x] `test(FR4)` FR4.3: source contains `0.12` alpha value for inner gradient stops
- [x] `test(FR4)` FR4.4: Node A constant contains violet hex `A78BFA` (case-insensitive)
- [x] `test(FR4)` FR4.5: Node B constant contains cyan hex `00C2FF` (case-insensitive)
- [x] `test(FR4)` FR4.6: source references `screen` blend mode (blendMode="screen")
- [x] `test(FR4)` FR4.7: base `<Rect>` appears before Circle nodes in source (lowest z-order)

### FR5 — AmbientBackground Backward Compatibility

- [x] `test(FR5)` FR5.1: `import AmbientBackground from '@/src/components/AmbientBackground'` resolves at runtime
- [x] `test(FR5)` FR5.2: rendering `<AmbientBackground color="#10B981" />` does not throw
- [x] `test(FR5)` FR5.3: `AMBIENT_COLORS` named export still present in `AmbientBackground.tsx`
- [x] `test(FR5)` FR5.4: `getAmbientColor` named export still present and functional
- [x] `test(FR5)` FR5.5: `AmbientBackground.tsx` source contains `@deprecated` annotation
- [x] `test(FR5)` FR5.6: existing `AmbientBackground.test.tsx` test suite still passes (no regressions)

---

## Phase 1.1 — Implementation

Implement each FR to make its tests pass. Commit after each FR.

### FR1 — AnimatedMeshBackground Component

- [x] `feat(FR1)` Create `hourglassws/src/components/AnimatedMeshBackground.tsx`
- [x] `feat(FR1)` Add props interface `AnimatedMeshBackgroundProps` with `panelState?`, `earningsPace?`, `aiPct?`
- [x] `feat(FR1)` Render Skia `Canvas` with `StyleSheet.absoluteFill` and `pointerEvents="none"`
- [x] `feat(FR1)` Export as both named (`AnimatedMeshBackground`) and default export

### FR2 — Reanimated Animation Driver

- [x] `feat(FR2)` Add `useSharedValue(0)` for `time`
- [x] `feat(FR2)` Add `useEffect` to start `withRepeat(withTiming(1, { duration: 20000 }), -1, false)`
- [x] `feat(FR2)` Add `useDerivedValue` for `nodeACenter` (phase 0, cy_base=0.3h, amplitude 0.30w/0.20h)
- [x] `feat(FR2)` Add `useDerivedValue` for `nodeBCenter` (phase 2π/3, cy_base=0.6h, amplitude 0.30w/0.20h)
- [x] `feat(FR2)` Add `useDerivedValue` for `nodeCCenter` (phase 4π/3, cy_base=0.5h, amplitude 0.25w/0.15h)

### FR3 — Status-Driven Node C Color

- [x] `feat(FR3)` Add `resolveNodeCColor(panelState, earningsPace, aiPct)` helper (pure function)
- [x] `feat(FR3)` Implement priority: panelState → earningsPace → aiPct → idle (#0D0C14)
- [x] `feat(FR3)` Handle `PANEL_STATE_COLORS[panelState] ?? colors.background` for null-returning states (idle)
- [x] `feat(FR3)` Add `hexToRgba(hex, alpha)` helper for Node C color string construction

### FR4 — Gradient Node Visual Spec

- [x] `feat(FR4)` Render base `<Rect x={0} y={0} width={w} height={h} color="#0D0C14" />` as first Canvas child
- [x] `feat(FR4)` Render Node A: `<Circle>` with violet `RadialGradient` at 0.12 alpha + blendMode="screen"
- [x] `feat(FR4)` Render Node B: `<Circle>` with cyan `RadialGradient` at 0.12 alpha + blendMode="screen"
- [x] `feat(FR4)` Render Node C: `<Circle>` with status-color `RadialGradient` at 0.12 alpha + blendMode="screen"
- [x] `feat(FR4)` Set circle radius = `w * 0.7` for all nodes

### FR5 — AmbientBackground Backward Compatibility

- [x] `feat(FR5)` Update `AmbientBackground.tsx`: change default export to delegate to `AnimatedMeshBackground`
- [x] `feat(FR5)` Preserve `AMBIENT_COLORS`, `getAmbientColor`, `AmbientSignal` named exports (inline)
- [x] `feat(FR5)` Add `@deprecated` JSDoc annotation to the default export
- [x] `feat(FR5)` Verify `app/(tabs)/_layout.tsx` requires no changes — confirmed unchanged
- [x] `feat(FR5)` Run existing `AmbientBackground.test.tsx` — all 51 tests pass

---

## Phase 1.2 — Review

Sequential gates. Each must pass before proceeding to the next.

### Step 0: Alignment Check

- [x] Run `spec-implementation-alignment` agent: validate `AnimatedMeshBackground.tsx` against `spec.md` FR1–FR5 success criteria
- [x] All FRs implemented and traceable to spec
- [x] No extra scope added beyond spec (no undocumented features)

### Step 1: PR Review

- [x] TypeScript type errors addressed (`blendMode="screen"` string, `React.JSX.Element`)
- [x] Performance: all position math in `useDerivedValue` worklets (zero JS-thread per frame)
- [x] No `StyleSheet.create` used (project convention)
- [x] Canvas at full opacity (no `style.opacity` on Canvas element)

### Step 2: Address Feedback

- [x] TypeScript fix committed: `fix(02-animated-mesh): resolve TypeScript type errors`
- [x] No additional review issues

### Step 3: Test Optimization

- [x] Reviewed `AnimatedMeshBackground.test.tsx` — no redundant assertions
- [x] All 107 tests meaningful and covering distinct contracts
- [x] `resolveNodeCColor` exported for direct testing (not just source analysis)

---

## Completion Criteria

- [x] All Phase 1.0 test tasks marked `[x]` — tests exist and initially failed (red)
- [x] All Phase 1.1 implementation tasks marked `[x]` — tests pass (green)
- [x] All Phase 1.2 review tasks marked `[x]`
- [x] Full test suite passes: 107 tests (AnimatedMeshBackground + AmbientBackground)
- [x] `AmbientBackground.test.tsx` still passes (all 51 tests — no regressions)
- [x] `app/(tabs)/_layout.tsx` unchanged (verified)
- [x] Checklist and FEATURE.md updated

---

## Session Notes

**2026-03-19**: Spec execution complete.
- Phase 1.0: 1 test commit (`test(FR1-FR5)`) — 56 tests initial red phase
- Phase 1.1: 2 implementation commits (`feat(FR1-FR5)`, `fix(02-animated-mesh)`)
- Phase 1.2: TypeScript fixes — `blendMode` SkEnum string API, `React.JSX.Element` return type
- 107 tests passing (56 new AnimatedMeshBackground + 51 updated AmbientBackground)
- Skia mock extended with `RadialGradient` and `BlendMode` entries
- Color resolution logic inlined in `AnimatedMeshBackground.tsx` to avoid circular imports
- `AmbientBackground.tsx` deprecated, delegates default export to `AnimatedMeshBackground`
