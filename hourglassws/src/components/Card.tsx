// Card.tsx
// FR1 (02-dark-glass): Card glass layer — base variant (BlurView intensity 40)
// FR2 (02-dark-glass): Card glass layer — elevated variant (BlurView intensity 60)
// FR3 (02-dark-glass): glass={false} opt-out for flat legacy render
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
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

// ─── Glass style constants (exported for test access) ─────────────────────────

export const GLASS_BASE = {
  backgroundColor: 'rgba(22, 21, 31, 0.75)',    // surface (#16151F) at 75% opacity
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderWidth: 1,
} as const;

export const GLASS_ELEVATED = {
  backgroundColor: 'rgba(31, 30, 41, 0.80)',    // surfaceElevated (#1F1E29) at 80% opacity
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderWidth: 1,
} as const;

export const BLUR_INTENSITY_BASE = 40;
export const BLUR_INTENSITY_ELEVATED = 60;

// ─── Layout constants (inline — no StyleSheet.create per design system rule) ──
// StyleSheet.absoluteFill is used below (read-only constant, not StyleSheet.create)

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
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Card({
  elevated,
  glass = true,
  className,
  style,
  children,
}: CardProps): JSX.Element {
  // ── glass={false}: flat legacy render ───────────────────────────────────────
  if (!glass) {
    const flatBase = elevated
      ? 'bg-surfaceElevated rounded-2xl border border-border p-5'
      : 'bg-surface rounded-2xl border border-border p-5';
    const flatCombined = className ? `${flatBase} ${className}` : flatBase;
    return (
      <View className={flatCombined} style={style}>
        {children}
      </View>
    );
  }

  // ── glass=true (default): BlurView card ─────────────────────────────────────
  const glassStyle = elevated ? GLASS_ELEVATED : GLASS_BASE;
  const intensity = elevated ? BLUR_INTENSITY_ELEVATED : BLUR_INTENSITY_BASE;

  return (
    <View
      className={className}
      style={[OUTER_STYLE, { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth }, style]}
    >
      {/* Blur layer — absolutely fills outer wrapper, clipped by overflow:hidden */}
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Content layer — semi-transparent surface lets blur show through */}
      <View style={[INNER_STYLE, { backgroundColor: glassStyle.backgroundColor }]}>
        {children}
      </View>
    </View>
  );
}
