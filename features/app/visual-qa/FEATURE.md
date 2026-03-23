# Visual QA — Round 1

## Purpose

Six targeted bug fixes surfaced from live testing on device. Four are new rendering regressions on the Overview and Home screens. Two are continuations of the dark-glass-polish arc ring and progress bar fixes that did not fully resolve after the previous spec.

## Problem Statement

1. **TrendSparkline right-edge clipping** (Overview): The neon glowing line plunges vertically at the rightmost edge of WEEKLY HOURS, AI USAGE %, and BRAINLIFT HOURS charts. Caused by trailing zero(s) in the data array (week not yet over, last bucket = 0) combined with no X-axis `domainPadding`, so the `BlurMask` glow on the drop has room to clip outside the canvas bounds.

2. **WeeklyBarChart collapsed bars** (Home): The bar chart renders with only a tiny sliver for Monday and nothing visible for other days. VNX's `CartesianChart` applies internal domain padding that compresses the effective chart area below the passed `domain` bounds. Bars with low hourly values in a small (120px) canvas become sub-pixel after VNX's internal shrink.

3. **Semantic color routing** (Home): `index.tsx` still wires the mesh via `<AmbientBackground color={getAmbientColor(...)} />`, which was identified in `08-dark-glass-polish` as the component that silently discards its `color` prop. The home screen mesh is working (status-driven color visible) but the wiring goes through the same broken wrapper — it needs to be replaced with direct `<AnimatedMeshBackground>` just like `overview.tsx` and `ai.tsx` were updated.

4. **DailyAIRow horizontal padding** (AI screen): The inner content View uses `px-1` (4px per side), leaving text uncomfortably close to the glass border. Should match the card-level spacious feel with `px-4` (16px).

5. **AIArcHero SweepGradient** (AI screen): `start`/`end` angle props were added in the previous spec. User reports "not fixed." Most likely a stale Expo Go bundle. The fix is architecturally correct — verify during implementation by confirming the gradient anchor and that the end cap color is deep violet-magenta (not cyan).

6. **ProgressBar fill invisible** (AI screen): The flex-based rewrite was applied in the previous spec. User reports "not fixed." Verify the `bg-violet` NativeWind class resolves on `Animated.View` from Reanimated, and that `fillFlex`/`spaceFlex` animate correctly from 0 to the target fraction.

## Design Intent

- TrendSparkline: clean right-edge termination, no plunge. Trailing zeros stripped before the chart receives data. `domainPadding` gives glow headroom at both X edges.
- WeeklyBarChart: all 7 bars render at their correct proportional height. No VNX internal axis squash.
- Home mesh: earningsPace drives Node C color directly via AnimatedMeshBackground props, same pattern as overview.tsx.
- DailyAIRow: text breathes inside its glass container with 16px horizontal padding.
- Arc ring: smooth cyan → violet → magenta sweep with no sudden jump at end cap.
- ProgressBar: violet fill animates from 0 to the correct fraction, fully visible.

## Scope

### In Scope
- `hourglassws/src/components/TrendSparkline.tsx` — strip trailing zeros, add domainPadding
- `hourglassws/src/components/WeeklyBarChart.tsx` — fix VNX domain compression
- `hourglassws/app/(tabs)/index.tsx` — replace AmbientBackground with AnimatedMeshBackground
- `hourglassws/src/components/DailyAIRow.tsx` — px-1 → px-4
- `hourglassws/src/components/AIArcHero.tsx` — verify SweepGradient angles
- `hourglassws/src/components/ProgressBar.tsx` — verify flex fill

### Out of Scope
- New chart features or data layer changes
- Other screens (settings, onboarding)

## Specs

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 09-chart-visual-fixes | All 6 visual QA fixes | — | — | M |
