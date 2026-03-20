// GlassCard.tsx
// FR1 (03-glass-surfaces): Skia BackdropFilter blur layer — crash-safe glass
// FR2 (03-glass-surfaces): Masked gradient border (MaskedView + LinearGradient)
// FR3 (03-glass-surfaces): InnerShadow physical depth simulation
// FR4 (03-glass-surfaces): Pressable spring animation (scale 1→0.97)
// FR5 (03-glass-surfaces): layerBudget=false flat-surface fallback
// FR6 (03-glass-surfaces): padding and radius props
//
// Architecture:
//   Animated.View  → spring scale wrapper (pressable=true only)
//   MaskedView     → gradient border: LinearGradient through 1.5px perimeter mask
//   Canvas         → Skia BackdropFilter(blur=16) + RoundedRect fill
//   InnerShadow    → physical glass thickness (top dark + bottom highlight)
//   content View   → children with padding
//
// Why BackdropFilter instead of BlurView:
//   BlurView allocates a UIVisualEffectView GPU framebuffer at mount time.
//   With 3–5 cards mounting concurrently alongside Reanimated startup, this
//   causes SIGKILL. BackdropFilter runs inside the Skia C++ pipeline — no
//   UIVisualEffectView, no concurrent framebuffer allocation.
//
// Performance:
//   - renderToHardwareTextureAndroid={true} MANDATORY on Android
//   - Card opacity stays at 1.0 (sub-1.0 on BackdropFilter = glitches)
//   - BackdropFilter only rendered when dims.w > 0 (guards zero-canvas crash)
//   - Max 3 overlapping GlassCards per viewport (convention, not runtime guard)

import React, { useState } from 'react';
import {
  View,
  Platform,
  ViewStyle,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Canvas,
  BackdropFilter,
  Blur,
  RoundedRect,
} from '@shopify/react-native-skia';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { InnerShadow } from 'react-native-inner-shadow';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLUR_RADIUS = { base: 16, elevated: 20 };

const BORDER_RADIUS = { 'xl': 12, '2xl': 16 };

const PADDING = { 'md': 20, 'lg': 24 };

const BORDER_GAP = 1.5;

const DEFAULT_BORDER_COLOR = '#A78BFA'; // violetAccent

// BackdropFilter tinted fill — 60% opacity (blur provides the depth)
const GLASS_FILL = 'rgba(22,21,31,0.6)';

// Inner shadow colors
const SHADOW_TOP = 'rgba(0,0,0,0.6)';
const SHADOW_BOTTOM = 'rgba(255,255,255,0.08)';

// Flat fallback colors (from Card.tsx GLASS_BASE)
const FLAT_BG = 'rgba(22, 21, 31, 0.85)';
const FLAT_BORDER = 'rgba(255, 255, 255, 0.10)';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
  radius?: 'xl' | '2xl';
  elevated?: boolean;
  borderAccentColor?: string;
  pressable?: boolean;
  onPress?: () => void;
  layerBudget?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlassCard({
  children,
  className,
  padding = 'md',
  radius = '2xl',
  elevated = false,
  borderAccentColor = DEFAULT_BORDER_COLOR,
  pressable = false,
  onPress,
  layerBudget = true,
  style,
  testID,
}: GlassCardProps): JSX.Element {
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const blurRadius = elevated ? BLUR_RADIUS.elevated : BLUR_RADIUS.base;
  const borderRadiusPx = BORDER_RADIUS[radius];
  const paddingPx = PADDING[padding];

  // Spring scale for pressable mode
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 300, damping: 20 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 300, damping: 20 });
  };

  // ── layerBudget=false: flat fallback ─────────────────────────────────────────
  if (!layerBudget) {
    return (
      <View
        testID={testID}
        style={[
          {
            backgroundColor: FLAT_BG,
            borderColor: FLAT_BORDER,
            borderWidth: 1,
            borderRadius: borderRadiusPx,
            overflow: 'hidden',
            padding: paddingPx,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // ── Mask element: outer ring minus inner rect = 1.5px perimeter ───────────────
  const maskElement = (
    <View
      style={{
        flex: 1,
        borderRadius: borderRadiusPx,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderWidth: BORDER_GAP,
        borderColor: 'white', // mask uses white = visible
      }}
    />
  );

  // ── Outer content container with children ─────────────────────────────────────
  const contentStyle: ViewStyle = {
    padding: paddingPx,
    flex: 1,
  };

  // ── Glass card body ───────────────────────────────────────────────────────────
  const glassBody = (
    <Animated.View
      style={[
        {
          borderRadius: borderRadiusPx,
          overflow: 'hidden',
        },
        // Only apply animated scale style when pressable — avoids a no-op GPU
        // layer on Android for the common non-interactive case
        pressable ? animatedStyle : undefined,
        style,
      ]}
      renderToHardwareTextureAndroid={Platform.OS === 'android'}
      testID={testID}
    >
      <MaskedView
        maskElement={maskElement}
        style={StyleSheet.absoluteFill}
      >
        {/* Gradient border — visible through the 1.5px mask perimeter */}
        <LinearGradient
          colors={[borderAccentColor, 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>

      {/* Skia BackdropFilter — refracts the animated mesh behind */}
      <Canvas
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setDims({ w: width, h: height });
        }}
      >
        {dims.w > 0 && (
          <BackdropFilter filter={<Blur blur={blurRadius} />}>
            <RoundedRect
              x={0}
              y={0}
              width={dims.w}
              height={dims.h}
              r={borderRadiusPx}
              color={GLASS_FILL}
            />
          </BackdropFilter>
        )}
      </Canvas>

      {/* InnerShadow: top dark inset + bottom highlight for physical thickness */}
      <InnerShadow
        inset
        shadowColor={SHADOW_TOP}
        shadowOffset={{ width: 0, height: 4 }}
        shadowBlur={8}
        isReflectedLightEnabled
        reflectedLightColor={SHADOW_BOTTOM}
        style={contentStyle}
      >
        {children}
      </InnerShadow>
    </Animated.View>
  );

  // ── Pressable wrapper ─────────────────────────────────────────────────────────
  if (pressable) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {glassBody}
      </Pressable>
    );
  }

  return glassBody;
}
