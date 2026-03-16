# 01-ambient-layer

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

### What is Being Built

`01-ambient-layer` creates the shared visual infrastructure that enables glass cards to appear visually alive across all Hourglass screens. It consists of three concrete deliverables:

1. **`AmbientBackground` component** — A full-screen absolutely-positioned SVG radial gradient. Renders a soft colored halo from the top-center of the screen, fading to transparent by mid-screen. Accepts `color: string | null` (null = idle, renders nothing). Animates between color states using a fade-through-opacity pattern driven by `useSharedValue` + `springPremium`.

2. **`getAmbientColor()` + `AMBIENT_COLORS`** — A pure mapping function and constant that encodes which color to show for each domain signal (panelState, earningsPace ratio, AI%). Co-located in `AmbientBackground.tsx` for discoverability.

3. **`Card.tsx` opacity + intensity update** — Reduces `GLASS_BASE` opacity from 0.25 → 0.12, `GLASS_ELEVATED` from 0.35 → 0.18, and increases `BLUR_INTENSITY_BASE` from 40 → 60, `BLUR_INTENSITY_ELEVATED` from 60 → 80. These values let the ambient colored field dominate the BlurView sample, making tinted frost visible.

### How It Works

The three-layer rendering stack:

```
Layer 1 — AmbientBackground (absolute, full-screen, z=0)
  SVG RadialGradient, top-center, radius 70% screen width
  8% opacity center stop → transparent edge
  Animated color via fade-through pattern on state change

Layer 2 — PanelGradient / Hero card (existing, unchanged API)
  Provides the intense focal color at the hero metric
  Semi-transparent so Layer 1 bleeds through

Layer 3 — Card components (scroll over Layer 1)
  Lower opacity (0.12 / 0.18) means BlurView samples Layer 1
  Produces visible tinted frost matching ambient color
```

Screens (02, 03, 04) each place `<AmbientBackground color={getAmbientColor(signal)} />` at the root of their layout, behind scroll content.

---

## Out of Scope

1. **Wiring AmbientBackground to the Home screen** — Deferred to `02-home-hero-ambient`. This spec only creates the component; screens use it in their own specs.

2. **Wiring AmbientBackground to the Overview screen** — Deferred to `03-overview-hero`. The `getAmbientColor({ type: 'earningsPace' })` function is defined here, but the Overview hero card and screen wiring are in spec 03.

3. **Wiring AmbientBackground to the AI screen** — Deferred to `04-ai-hero-arc`. The `getAmbientColor({ type: 'aiPct' })` function is defined here, but the AI arc hero and screen wiring are in spec 04.

4. **PanelGradient containment / loosen** — Deferred to `02-home-hero-ambient`. PanelGradient's overflow and positioning changes for the home screen hero are a separate concern.

5. **Overview dual-metric hero card** — Deferred to `03-overview-hero`. This spec does not create or modify the Overview hero card layout.

6. **AI arc hero (`AIArcHero`)** — Deferred to `04-ai-hero-arc`. The bold AI% number and sweeping arc component are a separate spec.

7. **Requests tab hero redesign** — Descoped from the hero-glass-system feature entirely. The Requests tab receives only the Card opacity/intensity changes from FR3/FR4 of this spec.

8. **Skeleton loader changes** — Descoped. Loading states are not impacted by the ambient layer.

9. **Navigation and auth screen changes** — Descoped. These screens do not use the glass system.

---

## Functional Requirements

### FR1 — `AmbientBackground` Component

**What:** A full-screen, absolutely-positioned SVG radial gradient component that creates the colored ambient field BlurView cards sample from.

**Interface:**

```typescript
interface AmbientBackgroundProps {
  color: string | null;   // hex color — null = idle, renders nothing
  intensity?: number;     // gradient opacity multiplier 0–1, default 1.0
}

export default function AmbientBackground(props: AmbientBackgroundProps): JSX.Element
```

**Behavior:**
- When `color` is `null`: renders an empty `<View pointerEvents="none" />` (nothing visible, touch-safe)
- When `color` is provided: renders an SVG `RadialGradient` centered at top-center of the screen
  - Center: `cx="50%"`, `cy="0%"` (top edge), radius = 70% of screen width (`useWindowDimensions`)
  - Inner stop: `color` at 8% opacity (`stopOpacity={0.08 * (intensity ?? 1)}`)
  - Outer stop: transparent
- Root element uses `pointerEvents="none"` — must never intercept touches
- Root element is absolutely positioned covering the full screen (`StyleSheet.absoluteFill`)
- Does not use `StyleSheet.create` — uses inline styles consistent with project convention
- Animates color changes (see FR5)

**Success Criteria:**
- [ ] `color=null` → renders nothing visible (touch-safe empty view)
- [ ] `color="#10B981"` → renders SVG with that color in the gradient fill
- [ ] Root element has `pointerEvents="none"`
- [ ] Root element is absolutely positioned and covers the full screen
- [ ] No `StyleSheet.create` call in the file
- [ ] Component is exported as default

---

### FR2 — `AMBIENT_COLORS` Mapping and `getAmbientColor()` Pure Function

**What:** A constant object encoding the color for each signal type, and a pure function that maps a typed signal union to a hex color string or null.

**Interface:**

```typescript
export const AMBIENT_COLORS: {
  panelState: Record<PanelState, string | null>;
  earningsPaceStrong: string;   // gold — ≥85% of prior period avg
  earningsPaceBehind: string;   // warning — 60–84%
  earningsPaceCritical: string; // critical — <60%
  aiAtTarget: string;           // violet — ≥75%
  aiApproaching: string;        // cyan — 60–74%
  aiBelow: string;              // warning — <60%
}

export type AmbientSignal =
  | { type: 'panelState'; state: PanelState }
  | { type: 'earningsPace'; ratio: number }
  | { type: 'aiPct'; pct: number };

export function getAmbientColor(signal: AmbientSignal): string | null
```

**Color Values (all from `colors.ts`):**

| Signal | Condition | Color |
|--------|-----------|-------|
| panelState: onTrack | — | `colors.success` (#10B981) |
| panelState: behind | — | `colors.warning` (#F59E0B) |
| panelState: critical | — | `colors.critical` (#F43F5E) |
| panelState: crushedIt | — | `colors.gold` (#E8C97A) |
| panelState: overtime | — | `colors.overtimeWhiteGold` (#FFF8E7) |
| panelState: idle | — | `null` |
| earningsPace | ratio ≥ 0.85 | `colors.gold` (#E8C97A) |
| earningsPace | 0.60 ≤ ratio < 0.85 | `colors.warning` (#F59E0B) |
| earningsPace | ratio < 0.60 | `colors.critical` (#F43F5E) |
| earningsPace | ratio = 0 (no prior data) | `colors.gold` (assume strong) |
| aiPct | pct ≥ 75 | `colors.violet` (#A78BFA) |
| aiPct | 60 ≤ pct < 75 | `colors.cyan` (#00C2FF) |
| aiPct | pct < 60 | `colors.warning` (#F59E0B) |

**Success Criteria:**
- [ ] All 6 panelState values map to documented colors (or null for idle)
- [ ] earningsPace ratio=0 returns `colors.gold` (no-prior-data assumption)
- [ ] earningsPace boundary at 0.85 inclusive returns gold
- [ ] earningsPace boundary at 0.60 inclusive returns warning
- [ ] earningsPace ratio < 0.60 returns critical
- [ ] aiPct boundary at 75 inclusive returns violet
- [ ] aiPct boundary at 60 inclusive returns cyan
- [ ] aiPct < 60 returns warning
- [ ] `AMBIENT_COLORS.panelState` covers all 6 PanelState keys
- [ ] Function is pure (no side effects, deterministic)

---

### FR3 — `Card.tsx` Opacity Reduction

**What:** Update `GLASS_BASE` and `GLASS_ELEVATED` background opacity constants so BlurView can sample the ambient colored field effectively.

**Changes:**

| Constant | Before | After |
|----------|--------|-------|
| `GLASS_BASE.backgroundColor` | `rgba(22, 21, 31, 0.25)` | `rgba(22, 21, 31, 0.12)` |
| `GLASS_ELEVATED.backgroundColor` | `rgba(31, 30, 41, 0.35)` | `rgba(31, 30, 41, 0.18)` |

**Success Criteria:**
- [ ] `GLASS_BASE.backgroundColor` alpha channel ≤ 0.15 (target 0.12)
- [ ] `GLASS_ELEVATED.backgroundColor` alpha channel ≤ 0.20 (target 0.18)
- [ ] All existing Card tests continue to pass
- [ ] No other Card behavior changes

---

### FR4 — `Card.tsx` BlurView Intensity Increase

**What:** Increase blur intensity constants so the frosted glass effect is pronounced at the new lower opacities.

**Changes:**

| Constant | Before | After |
|----------|--------|-------|
| `BLUR_INTENSITY_BASE` | `40` | `60` |
| `BLUR_INTENSITY_ELEVATED` | `60` | `80` |

**Success Criteria:**
- [ ] `BLUR_INTENSITY_BASE` ≥ 60 (target 60)
- [ ] `BLUR_INTENSITY_ELEVATED` ≥ 80 (target 80)
- [ ] All existing Card tests continue to pass
- [ ] No other Card behavior changes

---

### FR5 — Reanimated Color Transition in `AmbientBackground`

**What:** When the `color` prop changes, `AmbientBackground` animates the transition using a fade-through-opacity pattern: fade current gradient to opacity 0, then fade new gradient in using `springPremium`. This gives the ambient color change the same "cinematic, premium, weighty" feel as panel state transitions.

**Implementation:**
- `useSharedValue(0)` for opacity (starts at 0 for mount animation)
- `useEffect` on `color` prop:
  - If `opacity.value === 0` (mount): `withSpring(1, springPremium)`
  - Else (state change): `withSequence(withTiming(0, {duration:120}), withSpring(1, springPremium))`
- `useAnimatedStyle` applies opacity to the animated container
- Pattern mirrors `PanelGradient.tsx` implementation

**Success Criteria:**
- [ ] Color prop changes trigger opacity animation (fade out → fade in)
- [ ] Animation uses `springPremium` preset for the fade-in phase
- [ ] Mount triggers initial fade-in from 0
- [ ] `color=null` to `color=someColor` transition: animates in
- [ ] `color=someColor` to `color=null`: animates out

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/PanelGradient.tsx` | SVG RadialGradient pattern, BlurView setup, `withSequence` + `withTiming` + `withSpring` animation pattern |
| `hourglassws/src/lib/colors.ts` | All hex color values |
| `hourglassws/src/lib/panelState.ts` | `PanelState` type |
| `hourglassws/src/lib/reanimated-presets.ts` | `springPremium` config |
| `hourglassws/src/components/Card.tsx` | Constants to update |

### Files to Create / Modify

| File | Action | FR |
|------|--------|----|
| `hourglassws/src/components/AmbientBackground.tsx` | **Create** | FR1, FR2, FR5 |
| `hourglassws/src/components/__tests__/AmbientBackground.test.tsx` | **Create** | FR1, FR2, FR5 |
| `hourglassws/src/components/Card.tsx` | **Modify** — 4 constant values | FR3, FR4 |

No new dependencies required. `react-native-svg` and `react-native-reanimated` are already installed.

### `AmbientBackground.tsx` Structure

```typescript
// AmbientBackground.tsx
// FR1: full-screen radial gradient ambient layer
// FR2: AMBIENT_COLORS + getAmbientColor()
// FR5: Reanimated color transition

import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { springPremium } from '@/src/lib/reanimated-presets';
import { colors } from '@/src/lib/colors';
import type { PanelState } from '@/src/lib/panelState';

export const AMBIENT_COLORS = { ... };
export type AmbientSignal = ...;
export function getAmbientColor(signal: AmbientSignal): string | null { ... }

interface AmbientBackgroundProps {
  color: string | null;
  intensity?: number;
}

export default function AmbientBackground({ color, intensity = 1 }: AmbientBackgroundProps): JSX.Element {
  const { width } = useWindowDimensions();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (opacity.value === 0) {
      opacity.value = withSpring(1, springPremium);
    } else {
      opacity.value = withSequence(
        withTiming(0, { duration: 120 }),
        withSpring(1, springPremium),
      );
    }
  }, [color]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (color === null) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Defs>
          <RadialGradient id="ambientGrad" cx="50%" cy="0%" r={`${width * 0.7}px`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={color} stopOpacity={0.08 * intensity} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ambientGrad)" />
      </Svg>
    </Animated.View>
  );
}
```

**Note:** `StyleSheet.absoluteFill` is a read-only constant, not `StyleSheet.create`. Its use is consistent with `Card.tsx` and `PanelGradient.tsx`.

### `Card.tsx` Modification

Only 4 constant values change — no structural changes to component logic.

```typescript
// Before → After
GLASS_BASE.backgroundColor:      'rgba(22, 21, 31, 0.25)' → 'rgba(22, 21, 31, 0.12)'
GLASS_ELEVATED.backgroundColor:  'rgba(31, 30, 41, 0.35)' → 'rgba(31, 30, 41, 0.18)'
BLUR_INTENSITY_BASE:              40 → 60
BLUR_INTENSITY_ELEVATED:          60 → 80
```

### Data Flow

```
Screen (e.g. Home)
  │
  ├─ computePanelState(hours, limit, days) → PanelState
  ├─ getAmbientColor({ type: 'panelState', state }) → hex | null
  └─ <AmbientBackground color={ambientColor} />
        ├─ null → empty view (idle)
        └─ hex → SVG RadialGradient colored halo (absolute, z=0)
               ↑ BlurView in Card samples this field
               → visible tinted frost matching ambient color
```

### FR Dependency Graph

| FR | Depends On | Wave |
|----|------------|------|
| FR1 | — | 1 |
| FR2 | — | 1 |
| FR3 | — | 1 |
| FR4 | FR3 (same file) | 1 (co-located) |
| FR5 | FR1 (same file) | 1 (co-located) |

All FRs are in Wave 1 — no blocking dependencies. FR3+FR4 are applied together to `Card.tsx`. FR1+FR5 are co-located in `AmbientBackground.tsx`.

### Edge Cases

| Case | Handling |
|------|----------|
| `color=null` (idle) | Render empty `<View pointerEvents="none" />` — no SVG, touch-safe |
| `intensity=0` | Gradient renders at 0 opacity (invisible but in tree) |
| `intensity > 1` | `stopOpacity` clamps naturally at 1 per SVG spec |
| Rapid `color` prop changes | Each change restarts `withSequence` animation |
| Screen rotation | `useWindowDimensions` reacts automatically |
| Mount (opacity.value === 0 guard) | Distinguishes mount from state-change in `useEffect` |
| `earningsPace ratio=0` | Returns `colors.gold` — no prior data assumes strong pace |
