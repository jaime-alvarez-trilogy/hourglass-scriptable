# Implementation Checklist

Spec: `08-dark-glass-polish`
Feature: `dark-glass-polish`

---

## Phase 1.0: Test Foundation

### FR1: Bento Grid Layout
- [x] Confirm `overview.tsx` has no existing snapshot tests to update
- [x] Document manual verification steps: Earnings full-width, Hours+AI% side-by-side, BrainLift full-width

### FR2: Progress Ring Gradient
- [x] Check `__tests__/` for `AIArcHero.test.tsx` — update snapshot if it expects `color="transparent"`
- [x] Write/verify render test: AIArcHero renders without error after `color="white"` change
- [x] Write test: fill Path has `color="white"` prop (not "transparent") — SC4.3f.1, SC4.3f.2 in AIArcHeroSkia.test.tsx

### FR3: DailyAIRow Elevation
- [x] Check `__tests__/` for `DailyAIRow.test.tsx` — no existing test file, created new
- [x] Write test: Canvas renders after onLayout delivers non-zero dims (SC3.7)
- [x] Write test: row content (date, AI%, BrainLift) renders correctly inside new wrapper (SC3.2)
- [x] Write test: Canvas does NOT render when dims are zero — covered by SC3.7 (dims.w > 0 gate)

### FR4: Mesh Signal Wiring + Opacity
- [x] Write test: `resolveNodeCColor` with `earningsPace=0.9` returns gold hex — FR4-polish.4
- [x] Write test: `resolveNodeCColor` with `earningsPace=0.65` returns warning hex — FR4-polish.5
- [x] Write test: `resolveNodeCColor` with `earningsPace=0.5` returns critical hex — FR4-polish.6
- [x] Write test: `resolveNodeCColor` with `aiPct=80` returns violet hex — FR4-polish.7
- [x] Write test: `resolveNodeCColor` with `aiPct=65` returns cyan hex — FR4-polish.8
- [x] Write test: `resolveNodeCColor` with `aiPct=50` returns warning hex — FR4-polish.9
- [x] Update snapshot for `NODE_A_INNER` opacity 0.22 — FR4-polish.1
- [x] Update snapshot for `NODE_B_INNER` opacity 0.22 — FR4-polish.2
- [x] Verify `hexToRgba(hex, 0.22)` produces correct rgba string — FR5.9

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent — validated manually: 16 targeted failures pre-implementation
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Bento Grid Layout
- [x] Replace 4-card vertical stack in `overview.tsx` with bento layout (Earnings full, Hours+AI% row, BrainLift full)
- [x] Update `useStaggeredEntry({ count: 4 })` → `useStaggeredEntry({ count: 3 })`
- [x] Wrap Hours + AI% in `<Animated.View style={[getEntryStyle(1), { flexDirection: 'row', gap: 8 }]}>`
- [x] Each of Hours, AI% wrapped in `<View style={{ flex: 1 }}>` inside the row

### FR2: Progress Ring Gradient
- [x] Change `color="transparent"` → `color="white"` on fill `<Path>` in `AIArcHero.tsx` (line ~173)
- [x] Verify TypeScript compiles without error
- [x] Verify no runtime errors in Expo Go

### FR3: DailyAIRow Elevation
- [x] Add `ROW_BG`, `ROW_BORDER`, `ROW_SHADOW_TOP`, `ROW_RADIUS` constants to `DailyAIRow.tsx`
- [x] Add `dims` state (`{ w: number; h: number }`, initialized to `{ w: 0, h: 0 }`)
- [x] Add `onLayout` handler to outer View to set dims
- [x] Wrap row content in outer View with bg, border, radius, marginVertical, overflow:hidden styles
- [x] Add Canvas with absoluteFill and LinearGradient inner shadow (gated on `dims.w > 0`)
- [x] Add imports: `Canvas`, `RoundedRect`, `LinearGradient`, `vec` from `@shopify/react-native-skia`
- [x] Add `StyleSheet` import from `react-native`
- [x] Verify `isToday` conditional styling still applies correctly
- [x] Fix: use `pointerEvents="none"` as JSX prop on Canvas (matches Skia convention)

### FR4: Mesh Signal Wiring + Opacity
- [x] Bump `NODE_A_INNER` opacity: `'rgba(167,139,250,0.15)'` → `'rgba(167,139,250,0.22)'` in `AnimatedMeshBackground.tsx`
- [x] Bump `NODE_B_INNER` opacity: `'rgba(0,194,255,0.15)'` → `'rgba(0,194,255,0.22)'` in `AnimatedMeshBackground.tsx`
- [x] Bump Node C dynamic opacity: `hexToRgba(nodeCHex, 0.15)` → `hexToRgba(nodeCHex, 0.22)` in `AnimatedMeshBackground.tsx`
- [x] Add `import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground'` to `overview.tsx`
- [x] Replace `<AmbientBackground color={ambientColor} />` with `<AnimatedMeshBackground earningsPace={earningsPace} />` in `overview.tsx`
- [x] Keep `AmbientBackground` import in `overview.tsx` (needed for `getAmbientColor`)
- [x] Add `import AnimatedMeshBackground from '@/src/components/AnimatedMeshBackground'` to `ai.tsx`
- [x] Replace `<AmbientBackground color={ambientColor} />` with `<AnimatedMeshBackground aiPct={Math.round(heroAIPct)} />` in `ai.tsx`
- [x] Keep `AmbientBackground` import in `ai.tsx` (needed for `getAmbientColor`)
- [x] Verify both screens compile without TypeScript errors

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent — validated inline: all FR success criteria verified
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run manual PR review (pr-review-toolkit skill unavailable)
- [x] Fixed: `pointerEvents` moved to JSX prop on Canvas (HIGH — Skia API consistency)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues: pointerEvents JSX prop fix committed
- [x] Fix MEDIUM severity issues: none found
- [x] Re-run tests after fixes: all 22 DailyAIRow tests pass
- [x] Commit fixes: `fix(FR3): use pointerEvents as JSX prop on Canvas (matches Skia convention)`

### Step 3: Test Quality Optimization
- [x] Review tests for quality
- [x] SC3.9 comment-stripping fix applied
- [x] AIArcHeroSkia SC4.3f refined to use JSX-block search not raw string search
- [x] All test assertions are targeted and meaningful

### Final Verification
- [x] All 245 affected tests passing (1 pre-existing failure in ai.test SC5.7 is unrelated)
- [x] No regressions in existing tests introduced by this spec
- [x] Code follows existing patterns (pointerEvents, StyleSheet.absoluteFill, onLayout)

---

## Session Notes

**2026-03-23**: Spec created. Research confirmed all 4 FRs are independent — parallel implementation is safe.

**2026-03-23**: Implementation complete.
- Phase 1.0: 3 test commits — AIArcHeroSkia (FR2), AnimatedMeshBackground (FR4), DailyAIRow new file (FR3)
- Phase 1.1: 1 implementation commit covering all 4 FRs (overview.tsx, ai.tsx, AIArcHero.tsx, DailyAIRow.tsx, AnimatedMeshBackground.tsx)
- Phase 1.2: 2 fix commits (SC3.9 comment-stripping, pointerEvents consistency)
- All 245 tests passing in affected test suites. No new regressions.
- Pre-existing ai.test SC5.7 failure is unrelated to this spec.
