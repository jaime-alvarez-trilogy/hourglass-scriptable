# Feature: Brand Revamp — Spatial Dark Glass UI

**Domain:** app
**Feature path:** features/app/brand-revamp
**Status:** 01-design-tokens complete — 02+ ready for implementation

---

## Problem Statement

The Hourglass application has a solid architectural foundation (Expo SDK 55, Reanimated 4.2.1, custom Skia charts) but its visual identity is stuck in a "flat dark mode" paradigm that fails to communicate the premium, technical nature of the product. Specific deficiencies:

1. **Typography** — All text uses Inter exclusively. Hero metrics and headings lack geometric personality; data tables lack the monospaced alignment that makes numerical columns scannable. Text colors use pure white (#FFFFFF) causing halation — visual bleed on dark backgrounds.
2. **Background** — Static SVG radial gradient (0.08 opacity) with a noise overlay. Does not create the "living technical environment" feel.
3. **Card surfaces** — Flat semi-opaque dark rectangles with a 1px white border at 10% opacity. No depth, no background bleed-through, no edge illumination.
4. **Charts** — Custom Skia charts with flat fills and basic strokes. Missing neon glows, gradient area fills, and cylindrical bar effects.
5. **Motion** — Some stagger animations exist, but no physics-based PressIn feedback, no card entry choreography, no inter-screen shared transitions.
6. **Navigation** — JavaScript tab bar, not platform-native.

---

## Goals

1. Migrate typography to **Space Grotesk** (hero/headings) + **Space Mono** (data tables) + **Inter** (body), with desaturated text colors
2. Replace static SVG background with an **animated Skia mesh gradient** (orbiting radial color nodes)
3. Replace flat Card surfaces with **Skia BackdropFilter glass** + masked gradient borders + inner shadows
4. Migrate **WeeklyBarChart** and **TrendSparkline** to Victory Native XL with neon glows + gradient area fills; rebuild **AIArcHero** with Skia SweepGradient
5. Add **physics-based micro-interactions**: staggered card entry springs, PressIn scale/shadow feedback, list cascade animations
6. Migrate to **NativeTabs** (expo-router/unstable-native-tabs) for platform-native tab bars
7. Add **Shared Element Transitions** on key card → detail navigations

---

## Out of Scope

- SKSL fragment shaders (declarative Skia gradient approach chosen for maintainability)
- AIConeChart VNX migration (stays custom Skia — it's a bespoke 3D holographic visualization)
- Hermes Bytecode Diffing (OTA optimization, separate infra concern)
- iOS 26 UIGlassEffect / @callstack/liquid-glass (iOS 26 not yet widely available; Skia BackdropFilter is the cross-platform solution)
- New screens or data changes (visual/aesthetic migration only)

---

## Changelog (Specs)

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-19 | [01-design-tokens](specs/01-design-tokens/spec.md) | Typography system migration + text color desaturation — **COMPLETE** |
| 2026-03-19 | [02-animated-mesh](specs/02-animated-mesh/spec.md) | Animated Skia RadialGradient background — **COMPLETE** |
| 2026-03-19 | [03-glass-surfaces](specs/03-glass-surfaces/spec.md) | Skia BackdropFilter GlassCard + gradient borders + inner shadows — **COMPLETE** |
| 2026-03-19 | [04-victory-charts](specs/04-victory-charts/spec.md) | VNX chart migration + neon glows + SweepGradient AI arc — **COMPLETE** |
| 2026-03-19 | [05-motion-system](specs/05-motion-system/spec-research.md) | Staggered entry, PressIn micro-interactions, list cascade |
| 2026-03-19 | [06-native-tabs](specs/06-native-tabs/spec.md) | NativeTabs migration — **COMPLETE** |
| 2026-03-19 | [07-shared-transitions](specs/07-shared-transitions/spec.md) | Shared Element Transitions on key navigations — **COMPLETE** |

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| [01-design-tokens](specs/01-design-tokens/spec-research.md) | Typography system + text color migration | 02,03,04,05,06,07 | — | S |
| [02-animated-mesh](specs/02-animated-mesh/spec-research.md) | Animated Skia mesh background | 03 | 01 | M |
| [03-glass-surfaces](specs/03-glass-surfaces/spec-research.md) | Skia blur GlassCard + gradient borders + inner shadow | 05 | 01, 02 | L |
| [04-victory-charts](specs/04-victory-charts/spec-research.md) | VNX migration for bar/line charts + AIArcHero rebuild | — | 01 | L |
| [05-motion-system](specs/05-motion-system/spec-research.md) | Physics micro-interactions + stagger animations | — | 01, 03 | M |
| [06-native-tabs](specs/06-native-tabs/spec-research.md) | NativeTabs (unstable-native-tabs) migration | 07 | 01 | M |
| [07-shared-transitions](specs/07-shared-transitions/spec-research.md) | Shared Element Transitions | — | 06 | M |

---

## Architecture

### Typography System (01)

```
font-display-*  → SpaceGrotesk (hero numbers, section headings)
font-mono-*     → SpaceMono (data table rows, timestamps)
font-sans-*     → Inter (body copy, labels, metadata)
font-body-*     → Inter (long-form text)
```

Text color hierarchy:
```
textPrimary   #E0E0E0  ← was #FFFFFF (desaturated to eliminate halation)
textSecondary #A0A0A0  ← was #8B949E
textMuted     #757575  ← was #484F58
```

### Animated Mesh Architecture (02)

```
AnimatedMeshBackground (AbsoluteFill, z=0)
  └── Skia <Canvas> (flex: 1)
        ├── <Circle> fill=eggplant (base layer)
        ├── <RadialGradient node A> center orbits via sine wave (violet)
        ├── <RadialGradient node B> orbits counter-phase (cyan)
        ├── <RadialGradient node C> orbits at 2/3 phase (status color)
        └── BlendMode: screen (luminous intersections)

Uniforms: Reanimated SharedValue<number> time
  → useSharedValue(0) + withRepeat(withTiming(1, {duration: 8000}), -1, false)
  → 3 center coords derived from sin/cos of time + per-node phase offset
```

### Glass Surface Architecture (03)

```
GlassCard
  ├── MaskedView (gradient border)
  │     ├── Mask: outer rounded rect - inner rounded rect (1.5px gap)
  │     └── LinearGradient: violetAccent → transparent (45°)
  ├── Skia Canvas (BackdropFilter)
  │     └── BackdropFilter(ImageFilter.Blur(16, 16))
  │           └── RoundedRect (fill=rgba(22,21,31,0.6), radius=16)
  └── InnerShadow (react-native-inner-shadow)
        ├── top: rgba(0,0,0,0.6) inset
        └── bottom: rgba(255,255,255,0.08) highlight

Platform routing:
  iOS: BackdropFilter (refracts animated mesh)
  Android: renderToHardwareTextureAndroid={true} + same architecture
  Max 3 glass layers per viewport
```

### Victory Native XL Architecture (04)

```
WeeklyBarChart
  └── CartesianChart (VNX)
        └── custom Bar child
              ├── RRect (rounded rectangle)
              ├── LinearGradient fill (neon peak → transparent base)
              └── InnerShadow (cylindrical illusion)

TrendSparkline
  └── CartesianChart (VNX) + useChartPressState
        ├── Line + BlurMaskFilter paint (neon glow)
        ├── Area + LinearGradient (brand color → transparent)
        └── Cursor overlay (externalCursorIndex compat via position mapping)

AIArcHero (stays Skia, enhanced)
  └── Skia Canvas
        ├── Path (arc, 270° sweep)
        └── SweepGradient (cyan → violet → magenta, spring strokeEnd)
```

### Motion Architecture (05)

```
useStaggeredEntry(count, delayMs=150)
  → returns array of Animated.Value for each card
  → spring: mass=1, stiffness=100, damping=15
  → each: opacity 0→1, translateY 20→0, scale 0.95→1

usePressAnimation()
  → returns handlers: onPressIn/onPressOut
  → scale: 1 → 0.96 (spring, stiffness=300, damping=20)
  → inner shadow opacity increase (via Skia canvas redraw)
```

### Navigation Architecture (06 + 07)

```
// 06: NativeTabs
app/(tabs)/_layout.tsx
  → import { unstable_NativeTabs as NativeTabs } from 'expo-router/unstable-native-tabs'
  → <NativeTabs> wraps tab screens (iOS: UITabBarController, Android: BottomNavigationView)
  → ENABLE_NATIVE_TABS: true in app.json extra

// 07: Shared Element Transitions
package.json: ENABLE_SHARED_ELEMENT_TRANSITIONS: true
Key transitions:
  - home EarningsCard → overview Earnings section
  - home HeroPanel → (stays, no detail screen yet)
  - overview weekly-earnings header → (self-contained screen)
```

---

## Key Dependencies to Add

```
victory-native                          (v41+, VNX with Skia)
@react-native-masked-view/masked-view   (gradient borders)
react-native-inner-shadow               (physical thickness simulation)
```

@shopify/react-native-skia (2.4.18), react-native-reanimated (4.2.1), and expo-router are already installed.

---

## File Map

```
hourglassws/
  tailwind.config.js           ← 01: font tokens, text color updates
  app/
    _layout.tsx                ← 01: add SpaceGrotesk + SpaceMono font loading
    (tabs)/
      _layout.tsx              ← 06: migrate to NativeTabs
      index.tsx                ← 07: sharedTransitionTag on EarningsCard
      overview.tsx             ← 07: sharedTransitionTag on EarningsCard destination
  src/
    lib/
      colors.ts                ← 01: sync textPrimary/Secondary/Muted
    components/
      AnimatedMeshBackground.tsx  ← 02: new — Skia Canvas, 3 orbiting RadialGradient nodes, BlendMode.Screen
      AmbientBackground.tsx       ← 02: deprecated (delegates default export to AnimatedMeshBackground; named exports preserved)
      __tests__/
        AnimatedMeshBackground.test.tsx  ← 02: 56 tests (FR1–FR5)
        AmbientBackground.test.tsx       ← 02: updated (51 tests, compat wrapper checks)
      GlassCard.tsx               ← 03: new (Skia BackdropFilter + gradient border + shadow)
      Card.tsx                    ← 03: updated to use GlassCard
      WeeklyBarChart.tsx          ← 04: migrated to VNX CartesianChart + Bar
      TrendSparkline.tsx          ← 04: migrated to VNX CartesianChart + Line + Area
      AIArcHero.tsx               ← 04: rebuilt with Skia SweepGradient
      MetricValue.tsx             ← 01: SpaceGrotesk font class
      SectionLabel.tsx            ← 01: Inter font class (unchanged)
```
