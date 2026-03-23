# Implementation Checklist

Spec: `08-dark-glass-polish`
Feature: `dark-glass-polish`

---

## Phase 1.0: Test Foundation

### FR1: Bento Grid Layout
- [ ] Confirm `overview.tsx` has no existing snapshot tests to update
- [ ] Document manual verification steps: Earnings full-width, Hours+AI% side-by-side, BrainLift full-width

### FR2: Progress Ring Gradient
- [ ] Check `__tests__/` for `AIArcHero.test.tsx` — update snapshot if it expects `color="transparent"`
- [ ] Write/verify render test: AIArcHero renders without error after `color="white"` change
- [ ] Write test: fill Path has `color="white"` prop (not "transparent")

### FR3: DailyAIRow Elevation
- [ ] Check `__tests__/` for `DailyAIRow.test.tsx` — update snapshot for new wrapper View
- [ ] Write test: Canvas renders after onLayout delivers non-zero dims (`{ w: 300, h: 40 }`)
- [ ] Write test: row content (date, AI%, BrainLift) renders correctly inside new wrapper
- [ ] Write test: Canvas does NOT render when dims are zero (initial state)

### FR4: Mesh Signal Wiring + Opacity
- [ ] Write test: `resolveNodeCColor` with `earningsPace=0.9` returns gold hex
- [ ] Write test: `resolveNodeCColor` with `earningsPace=0.65` returns warning hex
- [ ] Write test: `resolveNodeCColor` with `earningsPace=0.5` returns critical hex
- [ ] Write test: `resolveNodeCColor` with `aiPct=80` returns violet hex
- [ ] Write test: `resolveNodeCColor` with `aiPct=65` returns cyan hex
- [ ] Write test: `resolveNodeCColor` with `aiPct=50` returns warning hex
- [ ] Update snapshot for `NODE_A_INNER` opacity 0.22
- [ ] Update snapshot for `NODE_B_INNER` opacity 0.22
- [ ] Verify `hexToRgba(hex, 0.22)` produces correct rgba string

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

### FR1: Bento Grid Layout
- [ ] Replace 4-card vertical stack in `overview.tsx` with bento layout (Earnings full, Hours+AI% row, BrainLift full)
- [ ] Update `useStaggeredEntry({ count: 4 })` → `useStaggeredEntry({ count: 3 })`
- [ ] Wrap Hours + AI% in `<Animated.View style={[getEntryStyle(1), { flexDirection: 'row', gap: 8 }]}>`
- [ ] Each of Hours, AI% wrapped in `<View style={{ flex: 1 }}>` inside the row

### FR2: Progress Ring Gradient
- [ ] Change `color="transparent"` → `color="white"` on fill `<Path>` in `AIArcHero.tsx` (line ~173)
- [ ] Verify TypeScript compiles without error
- [ ] Verify no runtime errors in Expo Go

### FR3: DailyAIRow Elevation
- [ ] Add `ROW_BG`, `ROW_BORDER`, `ROW_SHADOW_TOP`, `ROW_RADIUS` constants to `DailyAIRow.tsx`
- [ ] Add `dims` state (`{ w: number; h: number }`, initialized to `{ w: 0, h: 0 }`)
- [ ] Add `onLayout` handler to outer View to set dims
- [ ] Wrap row content in outer View with bg, border, radius, marginVertical, overflow:hidden styles
- [ ] Add Canvas with absoluteFill and LinearGradient inner shadow (gated on `dims.w > 0`)
- [ ] Add imports: `Canvas`, `RoundedRect`, `LinearGradient as SkiaLinearGradient`, `vec` from `@shopify/react-native-skia`
- [ ] Add `StyleSheet` import from `react-native` if not already present
- [ ] Verify `isToday` conditional styling still applies correctly

### FR4: Mesh Signal Wiring + Opacity
- [ ] Bump `NODE_A_INNER` opacity: `'rgba(167,139,250,0.15)'` → `'rgba(167,139,250,0.22)'` in `AnimatedMeshBackground.tsx`
- [ ] Bump `NODE_B_INNER` opacity: `'rgba(0,194,255,0.15)'` → `'rgba(0,194,255,0.22)'` in `AnimatedMeshBackground.tsx`
- [ ] Bump Node C dynamic opacity: `hexToRgba(nodeCHex, 0.15)` → `hexToRgba(nodeCHex, 0.22)` in `AnimatedMeshBackground.tsx`
- [ ] Add `import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground'` to `overview.tsx`
- [ ] Replace `<AmbientBackground color={ambientColor} />` with `<AnimatedMeshBackground earningsPace={earningsPace} />` in `overview.tsx`
- [ ] Keep `AmbientBackground` import in `overview.tsx` (needed for `getAmbientColor`)
- [ ] Add `import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground'` to `ai.tsx`
- [ ] Replace `<AmbientBackground color={ambientColor} />` with `<AnimatedMeshBackground aiPct={Math.round(heroAIPct)} />` in `ai.tsx`
- [ ] Keep `AmbientBackground` import in `ai.tsx` (needed for `getAmbientColor`)
- [ ] Verify both screens compile without TypeScript errors

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
- [ ] Commit fixes: `fix(08-dark-glass-polish): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(08-dark-glass-polish): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-23**: Spec created. Research confirmed all 4 FRs are independent — parallel implementation is safe.
