# Mesh Color Overhaul

## Purpose

Three visual quality improvements identified from live device testing:
1. The animated mesh background nodes produce localized "cup behind glass" light blobs rather than a seamless ambient wash.
2. Mesh node colors use saturated semantic tokens that visually vibrate on dark surfaces and don't match the intended per-state palette.
3. The AI arc ring and AI sparkline glow use a static cyan→violet→magenta sweep regardless of actual AI performance tier.

## Problem Statement

1. **Mesh radius too small** (All screens): Each RadialGradient node has radius `w * 0.7`, so colors terminate sharply within the viewport, creating isolated blobs behind individual cards. The gradient cutoff is visible and looks like a spotlight rather than an ambient wash.

2. **Saturated state colors** (Home & Overview): `PANEL_STATE_COLORS` maps to full-saturation tokens (`#10B981`, `#F59E0B`, `#F43F5E`, `#E8C97A`, `#FFF8E7`) that are too vivid for dark backgrounds. The idle state resolves to `null` (invisible), leaving the mesh looking dead at week start.

3. **Static AI arc gradient** (AI screen): `AIArcHero` SweepGradient always uses `['#00C2FF', '#A78BFA', '#FF00FF']` regardless of actual AI% tier. A user at 20% AI usage sees a cyan glow that signals high performance. The TrendSparkline in the AI tab already uses `tier.color` from `classifyAIPct`, but that function lives in `app/(tabs)/ai.tsx` and can't be imported by `AIArcHero`.

4. **TrendSparkline left-edge clip** (minor, All screens): `domainPadding={{ left: 0, right: 10 }}` gives glow headroom on the right but not the left. First data point glow clips at the left canvas edge.

## Design Intent

- **Mesh**: Nodes bloom beyond screen edges (radius > viewport width) so colors blend into a seamless atmospheric wash. No visible gradient cutoff inside the viewport.
- **State palette**: Desaturated, dark-mode-safe hex values prevent visual vibration. Idle shows a calm Deep Blue ambient rather than nothing.
- **AI arc**: Ring color reflects tier achievement (info blue / success green / warm amber / muted grey). Matches the adjacent line chart color for visual cohesion.
- **Sparkline**: Equal glow headroom on both horizontal edges.

## Scope

### In Scope
- `hourglassws/src/components/AnimatedMeshBackground.tsx` — radius + color palette
- `hourglassws/src/lib/aiTier.ts` — new shared utility (extracted from ai.tsx)
- `hourglassws/src/components/AIArcHero.tsx` — tier-aware arc color
- `hourglassws/app/(tabs)/ai.tsx` — import aiTier instead of local classifyAIPct
- `hourglassws/src/components/TrendSparkline.tsx` — add left: 10 to domainPadding
- `hourglassws/src/lib/colors.ts` — add new desaturated color tokens

### Out of Scope
- Changing the base canvas background color (`#0D0C14`)
- Modifying Node A (violet) or Node B (cyan) constant colors
- Any data layer or API changes

## Already Implemented (no action needed)

The following items from the visual QA pass were already fixed in 09-chart-visual-fixes. If still visible on device, a hard Expo cache clear (`npx expo start -c`) is required:
- AIArcHero SweepGradient `c` center property — already `c={{ x: cx, y: cy }}`
- AIArcHero SweepGradient `start`/`end` angles — already `start={135} end={405}`
- ProgressBar flex-based fill — already replaced percentage string width
- DailyAIRow horizontal padding — already `px-4`
- WeeklyBarChart explicit container height — already `height={120}` with `domainPadding={{ top: 0, bottom: 0 }}`

## Specs

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 10-mesh-color-overhaul | All 4 visual fixes above | — | — | M |

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-23 | [10-mesh-color-overhaul](specs/10-mesh-color-overhaul/spec.md) | Complete. 5 FRs implemented: mesh radius w*1.2, desaturated state palette (7 new tokens), aiTier utility extracted, AIArcHero tier-aware arc, TrendSparkline left padding. |
