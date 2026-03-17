// Card.tsx
// FR1 (02-dark-glass): Card glass layer — base variant (BlurView intensity 60)
// FR2 (02-dark-glass): Card glass layer — elevated variant (BlurView intensity 80)
// FR3 (02-dark-glass): glass={false} opt-out for flat legacy render
// FR3/FR4 (01-ambient-layer): opacity 0.12/0.18, intensity 60/80 — enables ambient frost sampling
//
// Design system: BRAND_GUIDELINES.md "Surface & Depth — Dark Glass System"
//   backdrop-filter: blur(16px), background: hsla(248,15%,10%,0.75)
//   border: 1px solid rgba(255,255,255,0.06)
//
// Architecture:
//   Outer View  → overflow:hidden + borderRadius (clips BlurView to rounded corners)
//   BlurView    → StyleSheet.absoluteFill (sits behind content layer)
//   Inner View  → semi-transparent backgroundColor (lets blur show through)
//
// glass={false} renders flat legacy card for modal overlays that already provide blur.

import React from 'react';
import { View, ViewStyle } from 'react-native';

// ─── Glass style constants (exported for test access) ─────────────────────────
//
// BlurView removed from Card — each BlurView allocates a UIVisualEffectView
// framebuffer at mount time. With 3–5 Cards per tab mounting simultaneously
// alongside Reanimated spring animations, the concurrent GPU + worklet allocation
// causes throwPendingError crashes (SIGKILL, no .ips report).
//
// Cards now use a flat semi-opaque dark surface. The visual is nearly identical
// since the background is already dark (#0A0A0F). PanelGradient and AIArcHero
// retain their single BlurViews (stable, pre-mounted before any tab navigation).

export const GLASS_BASE = {
  backgroundColor: 'rgba(22, 21, 31, 0.85)',    // surface (#16151F) at 85% opacity — opaque glass look
  borderColor: 'rgba(255, 255, 255, 0.10)',
  borderWidth: 1,
} as const;

export const GLASS_ELEVATED = {
  backgroundColor: 'rgba(31, 30, 41, 0.92)',    // surfaceElevated (#1F1E29) at 92% opacity
  borderColor: 'rgba(255, 255, 255, 0.10)',
  borderWidth: 1,
} as const;

// Kept for test compatibility — no longer drives BlurView intensity
export const BLUR_INTENSITY_BASE = 60;
export const BLUR_INTENSITY_ELEVATED = 80;

// ─── Layout constants ──────────────────────────────────────────────────────────

const OUTER_STYLE: ViewStyle = {
  overflow: 'hidden',
  borderRadius: 16,
};

const INNER_STYLE: ViewStyle = {
  padding: 20,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardProps {
  /** Use elevated glass (intensity 60, brighter bg) — for modals, active cards */
  elevated?: boolean;
  /**
   * Glass mode (default: true).
   * Set false for surfaces that already have blur context (e.g. modal overlays).
   * glass={false} renders the legacy flat opaque card.
   */
  glass?: boolean;
  /** Additional NativeWind classes appended to outer wrapper */
  className?: string;
  /** Pass-through style to outer wrapper (merged after glass styles) */
  style?: ViewStyle;
  /** Pass-through testID to outer wrapper for test selection */
  testID?: string;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Card({
  elevated,
  glass = true,
  className,
  style,
  testID,
  children,
}: CardProps): JSX.Element {
  // ── glass={false}: flat legacy render ───────────────────────────────────────
  if (!glass) {
    const flatBase = elevated
      ? 'bg-surfaceElevated rounded-2xl border border-border p-5'
      : 'bg-surface rounded-2xl border border-border p-5';
    const flatCombined = className ? `${flatBase} ${className}` : flatBase;
    return (
      <View className={flatCombined} style={style} testID={testID}>
        {children}
      </View>
    );
  }

  // ── glass=true (default): flat dark-glass card (no BlurView) ────────────────
  const glassStyle = elevated ? GLASS_ELEVATED : GLASS_BASE;

  return (
    <View
      className={className}
      testID={testID}
      style={[OUTER_STYLE, {
        backgroundColor: glassStyle.backgroundColor,
        borderColor: glassStyle.borderColor,
        borderWidth: glassStyle.borderWidth,
      }, style]}
    >
      <View style={INNER_STYLE}>
        {children}
      </View>
    </View>
  );
}
