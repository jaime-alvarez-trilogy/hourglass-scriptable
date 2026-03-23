# Dark Liquid Glass Polish

## Purpose

Four targeted visual fixes to fully align the Hourglass app with the Dark Liquid Glass paradigm. Each fix addresses a specific gap between the current implementation and the design intent.

## Problem Statement

Despite the glass architecture being in place, four specific areas fall short of the Dark Liquid Glass standard:

1. **Overview layout hierarchy**: Cards are identically-sized vertical stacks — no visual weight differentiation between metrics of different importance.
2. **AI Arc Hero ring**: The progress ring renders as a flat grey track with no fill — the SweepGradient shader is invisible because the fill path uses `color="transparent"` (alpha=0), which zeroes the paint alpha and prevents the gradient from rendering.
3. **DailyAIRow flatness**: Daily slot rows inside the AI breakdown card sit as flat text with no spatial separation — they lack the tactile elevation of the rest of the app.
4. **Mesh background darkness**: AnimatedMeshBackground's Node C (status-driven color) is always idle because the AmbientBackground wrapper explicitly ignores its `color` prop. Only Nodes A (violet) and B (cyan) are active, and their opacity (0.15) is too subtle to create visible light refraction behind glass cards.

## Design Intent

### Bento Grid (Fix 1)
- WEEKLY EARNINGS: full-width hero card (signals primary importance via size)
- WEEKLY HOURS + AI USAGE %: side-by-side half-width cards below earnings
- BRAINLIFT HOURS: full-width at bottom
- Visual hierarchy encoded in layout structure, not just color

### Progress Ring (Fix 2)
- Fill arc uses SweepGradient: `#00C2FF` (cyan) → `#A78BFA` (violet) → `#FF00FF` (magenta)
- Ring appears to glow and flow as it fills
- The fix is a one-line change: `color="transparent"` → `color="white"` on the fill Path

### Row Glass Elevation (Fix 3)
- Each DailyAIRow wrapped in a semi-transparent View: `rgba(255,255,255,0.05)` bg
- 1px subtle border: `rgba(255,255,255,0.10)`
- Skia LinearGradient inner shadow (no BackdropFilter — parent card already handles blur)
- 8px border radius, 2px vertical gap between rows
- Result: rows appear to float above the card surface at a secondary z-layer

### Mesh Signal Wiring (Fix 4)
- Replace `<AmbientBackground color={...} />` with direct `<AnimatedMeshBackground>` calls
- Pass `earningsPace` prop in overview.tsx (activates Node C as gold/warning/critical)
- Pass `aiPct` prop in ai.tsx (activates Node C as violet/cyan/warning)
- Bump all node inner opacities: 0.15 → 0.22 for more visible light bloom
- Result: background glows with dynamic status-driven color beneath glass cards

## Scope

### In Scope
- `hourglassws/src/components/AIArcHero.tsx` — progress ring fix
- `hourglassws/src/components/DailyAIRow.tsx` — row elevation
- `hourglassws/src/components/AnimatedMeshBackground.tsx` — opacity bump
- `hourglassws/app/(tabs)/overview.tsx` — bento grid layout + mesh wiring
- `hourglassws/app/(tabs)/ai.tsx` — mesh signal wiring

### Out of Scope
- Index (home) tab layout changes
- New components (all changes are in-place edits)
- Test changes beyond updating affected unit tests

## Status

**Complete** (2026-03-23)

## Specs

| Spec | Status | Description | Blocks | Blocked By | Complexity |
|------|--------|-------------|--------|------------|------------|
| 08-dark-glass-polish | Complete | All 4 visual fixes (bento grid, ring gradient, row glass, mesh signals) | — | — | M |

## Files Touched

| File | Change |
|------|--------|
| `hourglassws/app/(tabs)/overview.tsx` | FR1 bento grid layout + FR4 mesh wiring |
| `hourglassws/app/(tabs)/ai.tsx` | FR4 mesh signal wiring |
| `hourglassws/src/components/AIArcHero.tsx` | FR2 fill path color fix |
| `hourglassws/src/components/DailyAIRow.tsx` | FR3 row glass elevation |
| `hourglassws/src/components/AnimatedMeshBackground.tsx` | FR4 opacity bump 0.15→0.22 |
| `hourglassws/src/components/__tests__/AIArcHeroSkia.test.tsx` | FR2 fill path tests |
| `hourglassws/src/components/__tests__/AnimatedMeshBackground.test.tsx` | FR4 opacity + signal tests |
| `hourglassws/src/components/__tests__/DailyAIRow.test.tsx` | FR3 new test file (22 tests) |
| `hourglassws/app/(tabs)/__tests__/overview.test.tsx` | Update FR4 mesh wiring tests |
| `hourglassws/app/(tabs)/__tests__/ai.test.tsx` | Update FR4 mesh wiring tests |

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-23 | [08-dark-glass-polish](specs/08-dark-glass-polish/spec.md) | Add spec and checklist for 4 visual fixes |
| 2026-03-23 | [08-dark-glass-polish](specs/08-dark-glass-polish/spec.md) | Implement all 4 fixes — bento grid, ring gradient, row glass, mesh signals |
