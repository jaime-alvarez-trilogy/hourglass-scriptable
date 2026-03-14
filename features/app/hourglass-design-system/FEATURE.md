# Feature: Hourglass Design System Migration

## Overview

Migrate the Hourglass Expo app from `StyleSheet.create()` + hardcoded hex values to the
full design system: NativeWind v4 (Tailwind className), Reanimated v4 presets, React Native
Skia charts, and the 5-state PanelGradient system.

**Goal:** Every screen and component uses only design tokens from `tailwind.config.js`,
animations from `reanimated-presets.ts`, and Skia for data visualisation. No hardcoded
hex colors, no `StyleSheet.create()`, no raw `Animated` API.

## Current State

- NativeWind v4 configured (metro, tailwind, global.css) but **never verified** in Expo Go
- All 11 screens use `StyleSheet.create()` with hardcoded hex values
- Existing components: StatCard, DailyBarChart, ApprovalCard, AIProgressBar, UrgencyBanner
  — all StyleSheet-based, none using design tokens
- Reanimated presets defined in `src/lib/reanimated-presets.ts` but unused in components
- React Native Skia 2.5.1 installed, zero chart components exist
- No panelState utility exists
- `.gitignore` missing `gauntlet-output/` entry; no `.env.example`

## Target State

- NativeWind confirmed working; all new code uses `className` only
- Base component library: Card, MetricValue (count-up), SectionLabel, PanelGradient (5-state), SkeletonLoader
- Skia chart library: WeeklyBarChart, TrendSparkline, AIRingChart, ProgressBar
- panelState utility: pure function mapping hours/days → PanelState
- All 11 screens rebuilt using design tokens + new components
- `gauntlet-output/` gitignored; `.env.example` documents required env vars
- Tools (gemini-ui, ux-gauntlet) fully functional with correct API keys

## Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 00-env-setup | .gitignore fix + .env.example | — | — | S |
| 01-nativewind-verify | Verify className renders + smoke test component | 03, 04, 05, 06, 07, 08 | — | S |
| 02-panel-state | panelState(hours, limit, daysElapsed) utility | 03, 05 | — | S |
| 03-base-components | Card, MetricValue, SectionLabel, PanelGradient, SkeletonLoader | 05, 06, 07, 08 | 01, 02 | M |
| 04-skia-charts | WeeklyBarChart, TrendSparkline, AIRingChart, ProgressBar | 05, 06 | 01 | L |
| 05-hours-dashboard | Rebuild index.tsx — hero panel, metrics, chart, urgency | — | 02, 03, 04 | L |
| 06-ai-tab | Rebuild ai.tsx — AIRingChart, BrainLift, sparklines | — | 03, 04 | M |
| 07-approvals-tab | Rebuild approvals.tsx — new card design, bulk actions | — | 03 | M |
| 08-auth-screens | Rebuild welcome/credentials/verifying/setup/success | — | 03 | M |

## Dependency Graph

```
00-env-setup        (no blockers — ready immediately)
01-nativewind-verify (no blockers — ready immediately)
02-panel-state       (no blockers — ready immediately)

01 + 02 → 03-base-components
01       → 04-skia-charts

02 + 03 + 04 → 05-hours-dashboard
03 + 04      → 06-ai-tab
03           → 07-approvals-tab
03           → 08-auth-screens
```

## Key Files

| File | Role |
|------|------|
| `hourglassws/tailwind.config.js` | Design token source of truth |
| `hourglassws/src/lib/reanimated-presets.ts` | Animation preset source of truth |
| `hourglassws/BRAND_GUIDELINES.md` | Visual identity + rules |
| `hourglassws/global.css` | Tailwind directives (already correct) |
| `hourglassws/metro.config.js` | NativeWind metro plugin (already correct) |
| `hourglassws/app/(tabs)/index.tsx` | Hours dashboard — to rebuild |
| `hourglassws/app/(tabs)/ai.tsx` | AI tab — to rebuild |
| `hourglassws/app/(tabs)/approvals.tsx` | Approvals tab — to rebuild |
| `hourglassws/app/(auth)/*.tsx` | Auth screens (5) — to rebuild |
| `hourglassws/src/components/` | Component library — to extend with new design |
| `hourglassws/tools/ux-gauntlet.ts` | AI UI generation tool |
| `hourglassws/tools/gemini-ui.ts` | AI UI generation tool (single model) |

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-14 | [00-env-setup](specs/00-env-setup/spec.md) | Add gitignore entry + .env.example template — **Complete** |
| 2026-03-14 | [01-nativewind-verify](specs/01-nativewind-verify/spec.md) | NativeWindSmoke component + visual verification of className pipeline — **Complete** |
| 2026-03-14 | [02-panel-state](specs/02-panel-state/spec.md) | computePanelState utility — pure function mapping hours/days → PanelState — **Complete** |
| 2026-03-14 | [03-base-components](specs/03-base-components/spec.md) | Card, MetricValue, SectionLabel, PanelGradient, SkeletonLoader — design system primitives with NativeWind + Reanimated v4 |
| 2026-03-14 | [04-skia-charts](specs/04-skia-charts/spec.md) | WeeklyBarChart, TrendSparkline, AIRingChart, ProgressBar + colors.ts — Skia chart library with Reanimated v4 animations |
