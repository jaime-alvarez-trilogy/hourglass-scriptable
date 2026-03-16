# Brand Compliance — Hourglass App

## Problem

Two rounds of UX Gauntlet video review (run-001 2026-03-15, run-002 2026-03-16) identified a consistent gap between the brand guidelines in `BRAND_GUIDELINES.md` and what is rendered on screen. Both runs scored the app at **4.2–5/10** overall. The primary failure modes are:

1. **Specific colour violations** — gold used for non-money elements, wrong semantic colours in approvals and overview
2. **Zero dark-glass depth** — `expo-blur` is installed but no `BlurView` is wired up; cards are flat colour, not glass
3. **Incomplete motion wiring** — `AnimatedPressable`, `FadeInScreen`, `useStaggeredEntry` all exist but are not applied to every interactive element; tab icons have no press feedback
4. **Underpowered chart lines** — `TrendSparkline` stroke is 2.5px with a partial glow; brand expects 3px + deeper `shadowColor` glow

## Goals

- Resolve every brand violation flagged in run-001 and run-002 syntheses
- Achieve the "dark glass command centre" aesthetic described in brand guidelines
- Make the app feel alive and tactile across all touchable elements
- Bring both gauntlet runs from ~4.5/10 to 7+/10 on next run

## Out of Scope

- Custom tab navigator replacement (Expo Router's built-in tab bar is retained)
- Skeleton loaders (already implemented)
- Tooltip system for charts (separate feature)
- Auth screen colour usage (setup/credentials/welcome — intentional gold CTAs)

## Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-color-semantics | Fix 5 targeted colour violations | — | — | S |
| 02-dark-glass | BlurView + translucent bg on all cards | — | — | M |
| 03-motion-universality | AnimatedPressable on all touchables; tab-icon feedback; stagger audit | — | — | M |
| 04-chart-polish | TrendSparkline 3px + deep glow; WeeklyBarChart stroke | — | — | S |

All four specs are independent and can run in parallel.

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-16 | [01-color-semantics](specs/01-color-semantics/spec.md) | Complete — Manual badge violet, Approve button violet, overview hours computed colour, Switch textPrimary thumbColor, Building Momentum warning, FR1–FR5 |
| 2026-03-16 | [03-motion-universality](specs/03-motion-universality/spec.md) | Complete — AnimatedPressable on index/approvals/ai touchables, colors.success tint token, FR1–FR3 |
| 2026-03-16 | [02-dark-glass](specs/02-dark-glass/spec.md) | Complete — BlurView on Card (base/elevated) + PanelGradient, glass opt-out prop, GLASS_BASE/ELEVATED constants, FR1–FR4 |
| 2026-03-16 | [04-chart-polish](specs/04-chart-polish/spec.md) | Complete — TrendSparkline 3px + 3-layer glow, WeeklyBarChart todayColor prop, index.tsx TODAY_BAR_COLORS, FR1–FR4 |

## Reference Files

- Brand guidelines: `BRAND_GUIDELINES.md`
- Design tokens: `src/lib/colors.ts`, `tailwind.config.js`
- Animation presets: `src/lib/reanimated-presets.ts`
- Gauntlet run-001: `gauntlet-runs/video/run-001-2026-03-15/synthesis.md`
- Gauntlet run-002: `gauntlet-runs/video/run-002-2026-03-16/synthesis.md`
