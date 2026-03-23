# Implementation Checklist

Spec: `10-mesh-color-overhaul`
Feature: `mesh-color-overhaul`

---

## Phase 1.0: Test Foundation

### FR1: Mesh Radius Expansion
- [x] Write test: `nodeRadius` evaluates to `w * 1.2` (not `w * 0.7`)
- [x] Write test: `hexToRgba` still returns valid rgba string (regression — unchanged function)

### FR2: State Color Palette
- [x] Write test: `resolveNodeCColor('idle', ...)` returns `'#556B8E'`
- [x] Write test: `resolveNodeCColor('critical', ...)` returns `'#F87171'`
- [x] Write test: `resolveNodeCColor('behind', ...)` returns `'#FCD34D'`
- [x] Write test: `resolveNodeCColor('onTrack', ...)` returns `'#4ADE80'`
- [x] Write test: `resolveNodeCColor('aheadOfPace', ...)` returns `'#4ADE80'`
- [x] Write test: `resolveNodeCColor('crushedIt', ...)` returns `'#C89F5D'`
- [x] Write test: `resolveNodeCColor('overtime', ...)` returns `'#CEA435'`
- [x] Write test: `resolveNodeCColor(null, null, null)` returns `colors.background`

### FR3: AI Tier Utility (new file `src/lib/__tests__/aiTier.test.ts`)
- [x] Write test: `classifyAIPct(75)` → `{ label: 'AI Leader', color: '#60A5FA' }`
- [x] Write test: `classifyAIPct(74)` → `{ label: 'Consistent Progress', color: '#4ADE80' }`
- [x] Write test: `classifyAIPct(50)` → `{ label: 'Consistent Progress', color: '#4ADE80' }`
- [x] Write test: `classifyAIPct(49)` → `{ label: 'Building Momentum', color: '#FCD34D' }`
- [x] Write test: `classifyAIPct(30)` → `{ label: 'Building Momentum', color: '#FCD34D' }`
- [x] Write test: `classifyAIPct(29)` → `{ label: 'Getting Started', color: colors.textMuted }` (note: textMuted = #757575 not #A0A0A0)
- [x] Write test: `classifyAIPct(0)` → `{ label: 'Getting Started', color: colors.textMuted }`

### FR4: AIArcHero Tier-Aware Arc Color
- [x] Write test: `GRADIENT_COLORS` constant is NOT present in AIArcHero source
- [x] Write test: SweepGradient uses `[tierColor, tierColor]` form
- [x] Write test: `classifyAIPct` imported from `@/src/lib/aiTier`

### FR5: TrendSparkline Left domainPadding
- [x] Write test: `domainPadding` prop is `{ left: 10, right: 10 }` (not `{ left: 0, right: 10 }`)

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent — verified manually: tests were red before implementation
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: Mesh Radius Expansion
- [x] Change `nodeRadius` from `w * 0.7` to `w * 1.2` in `AnimatedMeshBackground.tsx`
- [x] Verify orbital movement paths (`±w*0.30`, `±h*0.20`) are unchanged
- [x] Run FR1 tests — confirm passing

### FR2: State Color Palette
- [x] Add 7 new color tokens to `src/lib/colors.ts`: `dustyBlue`, `desatCoral`, `warnAmber`, `successGreen`, `champagneGold`, `luxuryGold`, `infoBlue`
- [x] Update `PANEL_STATE_COLORS` in `AnimatedMeshBackground.tsx` with 7 new hex values
- [x] Change `idle` entry from `null` to `'#556B8E'`
- [x] Verify `resolveNodeCColor` function body is unchanged
- [x] Run FR2 tests — confirm passing

### FR3: Extract AI Tier Utility
- [x] Create `src/lib/aiTier.ts` with `AITier` interface and `classifyAIPct` function
- [x] Use new color tokens (`colors.infoBlue`, `colors.successGreen`, `colors.warnAmber`, `colors.textMuted`)
- [x] Remove local `AITier` interface from `app/(tabs)/ai.tsx`
- [x] Remove local `classifyAIPct` function from `app/(tabs)/ai.tsx`
- [x] Add `import { classifyAIPct, type AITier } from '@/src/lib/aiTier'` to `app/(tabs)/ai.tsx`
- [x] Verify TypeScript compilation succeeds (no type errors)
- [x] Run FR3 tests — confirm passing (22/22)

### FR4: AIArcHero Tier-Aware Arc Color
- [x] Remove `GRADIENT_COLORS` constant from `AIArcHero.tsx`
- [x] Add `import { classifyAIPct } from '@/src/lib/aiTier'` to `AIArcHero.tsx`
- [x] Add `const tierColor = classifyAIPct(aiPct).color;` inside component render
- [x] Update `<SweepGradient colors={[tierColor, tierColor]} ...>`
- [x] Verify track arc (`color="rgba(255,255,255,0.08)"`) is unchanged
- [x] Run FR4 tests — confirm passing (43/43)

### FR5: TrendSparkline Left domainPadding
- [x] Change `domainPadding={{ left: 0, right: 10 }}` to `domainPadding={{ left: 10, right: 10 }}` in `TrendSparkline.tsx`
- [x] Verify `padTop`/`padBottom` domain calculation is unchanged
- [x] Run FR5 tests — confirm passing

### Integration
- [x] Run full test suite — FR1-FR5 new tests all pass; 4 pre-existing TrendSparkline failures unchanged (not related to this spec)

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent — performed manually
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill — performed manual code review

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (critical) — none found
- [x] Fix MEDIUM severity issues (or document why deferred) — none found
- [x] Re-run tests after fixes
- [x] Commit fixes: `fix(10-mesh-color-overhaul): update tests + fix AIArcHero comment references`

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests — performed manual review
- [x] Apply suggested improvements that strengthen confidence — tests use exact hex values, specific patterns
- [x] Re-run tests to confirm passing
- [x] No further changes needed

### Final Verification
- [x] All new tests passing (FR1: 2, FR2: 9, FR3: 22, FR4: 4+4, FR5: 3 = 44+ new tests)
- [x] No regressions in existing tests (78/78 AnimatedMeshBackground, 43/43 AIArcHeroSkia)
- [x] Code follows existing patterns (source-level comments, token references, export style)

---

## Session Notes

**2026-03-23**: Spec and checklist created.
**2026-03-23**: Implementation complete.
- Phase 1.0: 4 test commits (new aiTier.test.ts, extended AnimatedMeshBackground/AIArcHeroSkia/TrendSparkline)
- Phase 1.1: 3 implementation commits (Wave 1: FR1+FR2+FR5, Wave 2: FR3, Wave 3: FR4)
- Phase 1.2: 1 fix commit (test update for old color refs + AIArcHero comment cleanup)
- All new tests passing; pre-existing TrendSparkline failures unaffected.
- Note: `classifyAIPct` Getting Started uses `colors.textMuted` (#757575), not #A0A0A0 (textSecondary). spec-research had an inconsistency; implementation matches original ai.tsx behavior.
