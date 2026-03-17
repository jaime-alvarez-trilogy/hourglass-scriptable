// AmbientBackground.tsx
// FR1 (01-ambient-layer): full-screen SVG radial gradient ambient layer
// FR2 (01-ambient-layer): AMBIENT_COLORS constant + getAmbientColor() pure function
// FR5 (01-ambient-layer): Reanimated color transition (fade-through-opacity pattern)
//
// Design system: FEATURE.md "Hero Glass System — The Three-Layer Stack"
//   Layer 1 = AmbientBackground (absolute, full-screen, behind all content)
//   Soft radial gradient from top-center, color at 8% opacity, fades to transparent
//   Animates smoothly between states via springPremium (same feel as PanelGradient)
//
// Architecture:
//   - color=null (idle) → empty pointerEvents=none View (no gradient, touch-safe)
//   - color=hex → Animated.View wrapping SVG RadialGradient
//   - useWindowDimensions: radius = 70% of screen width (responsive)
//   - No StyleSheet.create — inline styles consistent with project convention
//   - StyleSheet.absoluteFill is a read-only constant (not StyleSheet.create)

import React, { useEffect, useRef } from 'react';
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

// ─── FR2: AMBIENT_COLORS — exported for tests ─────────────────────────────────
//
// Maps each signal type to its ambient hex color.
// panelState mapping is identical to PanelGradient.colorMap — same signal, wider field.
// idle = null (no ambient — flat background only).

export const AMBIENT_COLORS = {
  // panelState — Record<PanelState, string | null>
  panelState: {
    onTrack:   colors.success,           // #10B981 — green
    behind:    colors.warning,           // #F59E0B — amber
    critical:  colors.critical,          // #F43F5E — rose
    crushedIt:   colors.gold,              // #E8C97A — gold
    aheadOfPace: colors.gold,              // #E8C97A — gold, same family as crushedIt
    overtime:    colors.overtimeWhiteGold, // #FFF8E7 — warm white-gold
    idle:        null,                     // no ambient in idle state
  } as Record<PanelState, string | null>,

  // earningsPace — Overview tab signal (earnings pace vs prior period avg)
  earningsPaceStrong:   colors.gold,     // ratio ≥ 0.85 — strong pace
  earningsPaceBehind:   colors.warning,  // 0.60 ≤ ratio < 0.85 — behind pace
  earningsPaceCritical: colors.critical, // ratio < 0.60 — critical behind

  // aiPct — AI tab signal (AI usage % vs 75% target)
  aiAtTarget:    colors.violet,  // pct ≥ 75 — at or above target
  aiApproaching: colors.cyan,    // 60 ≤ pct < 75 — approaching target
  aiBelow:       colors.warning, // pct < 60 — below target
} as const;

// ─── FR2: AmbientSignal — typed signal union ──────────────────────────────────
//
// Screens pass a typed signal; getAmbientColor() resolves to a hex color.
// This keeps AmbientBackground dumb — screens compute the signal, not the color logic.

export type AmbientSignal =
  | { type: 'panelState'; state: PanelState }
  | { type: 'earningsPace'; ratio: number }  // ratio = currentPeriod / avg(priorPeriods)
  | { type: 'aiPct'; pct: number };

// ─── FR2: getAmbientColor — pure function ─────────────────────────────────────
//
// Maps a typed signal to hex color or null (idle).
// Pure: no side effects, deterministic, no imports of external state.
//
// earningsPace boundary rules:
//   ratio = 0 (no prior data) → gold (assume strong — no comparison to make)
//   ratio ≥ 0.85              → gold (strong pace)
//   0.60 ≤ ratio < 0.85       → warning (behind but recoverable)
//   ratio < 0.60              → critical (severe deficit)
//
// aiPct boundary rules:
//   pct ≥ 75  → violet (at or above 75% target)
//   60 ≤ pct < 75  → cyan (approaching target)
//   pct < 60  → warning (below target)

export function getAmbientColor(signal: AmbientSignal): string | null {
  switch (signal.type) {
    case 'panelState':
      return AMBIENT_COLORS.panelState[signal.state];

    case 'earningsPace': {
      const { ratio } = signal;
      // ratio=0 means no prior period data — treat as strong (gold, not critical)
      if (ratio === 0) return AMBIENT_COLORS.earningsPaceStrong;
      if (ratio >= 0.85) return AMBIENT_COLORS.earningsPaceStrong;
      if (ratio >= 0.60) return AMBIENT_COLORS.earningsPaceBehind;
      return AMBIENT_COLORS.earningsPaceCritical;
    }

    case 'aiPct': {
      const { pct } = signal;
      if (pct >= 75) return AMBIENT_COLORS.aiAtTarget;
      if (pct >= 60) return AMBIENT_COLORS.aiApproaching;
      return AMBIENT_COLORS.aiBelow;
    }
  }
}

// ─── FR1: AmbientBackground props ────────────────────────────────────────────

interface AmbientBackgroundProps {
  /** Hex color for the ambient halo — null = idle state (renders nothing) */
  color: string | null;
  /**
   * Gradient opacity multiplier (0–1), default 1.0.
   * Final center stop opacity = 0.08 × intensity.
   * Use to dim the ambient layer for screens with brighter hero cards.
   */
  intensity?: number;
}

// Stable SVG fill style — same pattern as PanelGradient.tsx
const SVG_FILL_STYLE = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

// ─── FR1 + FR5: AmbientBackground component ──────────────────────────────────

export default function AmbientBackground({ color, intensity = 1 }: AmbientBackgroundProps): JSX.Element {
  const { width } = useWindowDimensions();
  // FR5: start at 0 for mount animation
  const opacity = useSharedValue(0);
  // Track mount state without reading opacity.value on the JS thread.
  // Reading a SharedValue from useEffect (JS thread) triggers WorkletRuntime::executeSync
  // which deadlocks when a concurrent worklet (e.g. useAnimatedProps) holds the mutex.
  const mounted = useRef(false);

  // FR5: animate on color change — fade-through-opacity pattern (mirrors PanelGradient)
  useEffect(() => {
    if (!mounted.current) {
      // Mount or transition from null: fade in with springPremium
      mounted.current = true;
      opacity.value = withSpring(1, springPremium);
    } else {
      // State change: brief dip to near-zero then spring back to 1
      opacity.value = withSequence(
        withTiming(0, { duration: 120 }),
        withSpring(1, springPremium),
      );
    }
  }, [color]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Idle state: render empty touch-safe view (no SVG, no visual)
  if (color === null) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  // Radial gradient radius: 70% of screen width (covers top half of screen at full opacity)
  const gradientRadius = width * 0.7;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animatedStyle]}
    >
      <Svg
        width="100%"
        height="100%"
        style={SVG_FILL_STYLE}
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient
            id="ambientGrad"
            cx="50%"
            cy="0%"
            r={`${gradientRadius}px`}
            gradientUnits="userSpaceOnUse"
          >
            {/* Inner stop: 8% opacity at top-center — subtle but colorful enough for BlurView */}
            <Stop offset="0%" stopColor={color} stopOpacity={0.08 * intensity} />
            {/* Outer stop: fades to transparent */}
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ambientGrad)" />
      </Svg>
    </Animated.View>
  );
}
