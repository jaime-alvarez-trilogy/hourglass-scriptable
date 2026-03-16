# Hero Glass System — Hourglass App

## Problem

The current app has two unresolved visual issues:

1. **Glass cards are invisible.** `BlurView` samples the near-black background (`#0D0C14`) and produces near-black — the glass material has nothing to interact with. Cards look flat despite the implementation being correct.

2. **Each screen has no visual hierarchy.** Metric cards share equal visual weight; there is no "hero" that communicates the screen's primary signal at a glance. The UX Gauntlet consistently scored the app below 5/10 for this reason.

## Goals

- Introduce a **per-screen hero card** that functions as a light source: its state color escapes into a full-screen ambient gradient layer behind all content.
- Make glass cards **visually alive**: BlurView now samples a colored field instead of pure black, producing visible tinted frost on every card below the hero.
- Establish a **consistent design language** across all screens: one primary signal, one ambient color, everything else reacting to it.
- Redesign the **Overview** and **AI** heroes to better represent their primary signals.

## Design System

### The Three-Layer Stack (per screen)

```
Layer 1 — AmbientBackground (full-screen, absolute)
  Soft radial gradient from screen top-center
  Color = hero signal color at 8% opacity, large radius (70% screen width)
  Fades to transparent by ~60% screen height
  Animates smoothly between states via Reanimated interpolateColor

Layer 2 — Hero Card (PanelGradient or equivalent)
  Intense focal glow at the primary metric
  Semi-transparent (30–40% opacity bg) so Layer 1 bleeds through
  The "source" of the ambient color — hero and background share the same signal

Layer 3 — Glass Cards (scroll over Layer 1)
  Card background opacity: 0.10–0.15 (down from 0.25–0.45)
  BlurView samples Layer 1's colored field → visible tinted frost
  Cards deeper in scroll receive less ambient (gradient fades naturally)
```

### Ambient Color Mapping

| Signal Source | State | Ambient Color |
|--------------|-------|---------------|
| Home panelState | onTrack | success (#10B981) |
| Home panelState | behind | warning (#F59E0B) |
| Home panelState | critical | critical (#F43F5E) |
| Home panelState | crushedIt | gold (#E8C97A) |
| Home panelState | overtime | overtimeWhiteGold (#FFF8E7) |
| Home panelState | idle | textMuted (#484F58) |
| Overview earningsPace | strong (≥85% of prior period avg) | gold (#E8C97A) |
| Overview earningsPace | behind (60–84%) | warning (#F59E0B) |
| Overview earningsPace | critical (<60%) | critical (#F43F5E) |
| AI aiPct | at target (≥75%) | violet (#A78BFA) |
| AI aiPct | approaching (60–74%) | cyan (#00C2FF) |
| AI aiPct | below (< 60%) | warning (#F59E0B) |

## Screen Redesigns

### Home — "This Week" (unchanged hero, new ambient)
- `PanelGradient` remains the hero; its internal glow is now the **focal point** of `AmbientBackground`
- `AmbientBackground` spreads that same color across the full screen
- Weekly chart, AI trajectory, and earnings cards all pick up the colored frost

### Overview — New dual-metric hero
- **Hero card**: total earnings (window) + total hours (window), side by side
- Overtime displayed as inline badge on hours: `42h +2h OT` in `overtimeWhiteGold`
- Ambient color driven by earnings pace vs prior period
- 4W/12W toggle moves to the hero card itself

### AI — New arc hero
- Replace two-ring gauge with single bold `AI%` number + sweeping arc
- BrainLift hours as secondary metric below
- Ambient driven by AI% vs 75% target

### Requests — No hero redesign (deferred)
- Light touch: glass card updates only (from 01-ambient-layer)

## Out of Scope

- Requests tab hero redesign (deferred to future spec)
- Skeleton loader changes
- Navigation changes
- Auth screen changes

## Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-ambient-layer | AmbientBackground component + useAmbientColor + Card opacity update | 02, 03, 04 | — | S |
| 02-home-hero-ambient | Wire ambient to home screen, loosen PanelGradient containment | — | 01 | M |
| 03-overview-hero | Dual-metric hero card + earnings pace signal + ambient wiring | — | 01 | M |
| 04-ai-hero-arc | AIArcHero component (bold % + arc) + ambient wiring | — | 01 | M |

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-16 | [01-ambient-layer](specs/01-ambient-layer/spec.md) | AmbientBackground component, getAmbientColor mapping, Card opacity/intensity update |

## Reference Files

- Design tokens: `hourglassws/src/lib/colors.ts`, `tailwind.config.js`
- Panel state: `hourglassws/src/lib/panelState.ts`
- Animation presets: `hourglassws/src/lib/reanimated-presets.ts`
- Current Card: `hourglassws/src/components/Card.tsx`
- Current PanelGradient: `hourglassws/src/components/PanelGradient.tsx`
- Home screen: `hourglassws/app/(tabs)/index.tsx`
- Overview screen: `hourglassws/app/(tabs)/overview.tsx`
- AI screen: `hourglassws/app/(tabs)/ai.tsx`
- Brand guidelines: `hourglassws/BRAND_GUIDELINES.md`
