// PanelGradient.tsx
// FR4: 5-state gradient hero panel with springPremium transition (03-base-components)
//
// Design system rule (BRAND_GUIDELINES.md):
//   Panel gradient = status color at 35% opacity top → transparent bottom.
//   Idle = flat surface (#13131A), no gradient.
//   State transitions use springPremium — most emotionally significant transition.
//
// 35% opacity in hex = 0x59 (89/255 ≈ 34.9%)
// No StyleSheet.create — hex values only in PANEL_GRADIENTS constant.

import React, { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { springPremium } from '@/src/lib/reanimated-presets';
import type { PanelState } from '@/src/lib/panelState';

export const PANEL_GRADIENTS: Record<
  PanelState,
  { colors: string[]; start: object; end: object }
> = {
  // success #10B981 at 35% opacity
  onTrack: {
    colors: ['#10B98159', 'transparent'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // warning #F59E0B at 35% opacity
  behind: {
    colors: ['#F59E0B59', 'transparent'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // critical #F43F5E at 35% opacity
  critical: {
    colors: ['#F43F5E59', 'transparent'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // gold #E8C97A at 35% opacity
  crushedIt: {
    colors: ['#E8C97A59', 'transparent'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // idle = flat surface, no gradient effect
  idle: {
    colors: ['#13131A', '#13131A'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
};

interface PanelGradientProps {
  /** Drives gradient selection — use computePanelState() from src/lib/panelState */
  state: PanelState;
  children: React.ReactNode;
  /** Additional NativeWind classes appended to outer container */
  className?: string;
}

export default function PanelGradient({
  state,
  children,
  className,
}: PanelGradientProps): JSX.Element {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(1, springPremium);
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const gradient = PANEL_GRADIENTS[state];
  const base = 'flex-1';
  const combined = className ? `${base} ${className}` : base;

  return (
    <Animated.View className={combined} style={animatedStyle}>
      <LinearGradient
        colors={gradient.colors as any}
        start={gradient.start as any}
        end={gradient.end as any}
        style={{ flex: 1 }}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );
}
