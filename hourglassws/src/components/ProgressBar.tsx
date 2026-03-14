/**
 * ProgressBar — animated NativeWind linear progress bar (FR5)
 *
 * NativeWind View-based component (no Skia).
 * Animates fill width from 0 to progress*100% using timingChartFill on mount
 * and whenever progress changes.
 *
 * Usage:
 *   <ProgressBar progress={0.72} colorClass="bg-success" height={4} />
 *   <ProgressBar progress={hoursRatio} colorClass="bg-warning" />
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { timingChartFill } from '@/src/lib/reanimated-presets';

export interface ProgressBarProps {
  /** Fraction filled, 0–1. Values outside [0,1] are clamped. */
  progress: number;
  /** Tailwind bg-* class for fill color. Default: 'bg-success' */
  colorClass?: string;
  /** Bar height in pixels. Default: 4 */
  height?: number;
  /** Additional className for the outer container. */
  className?: string;
}

export default function ProgressBar({
  progress,
  colorClass = 'bg-success',
  height = 4,
  className,
}: ProgressBarProps) {
  // Clamp progress to [0, 1]
  const clamped = Math.min(1, Math.max(0, progress));

  const fillFraction = useSharedValue(0);

  useEffect(() => {
    fillFraction.value = withTiming(clamped, timingChartFill);
  }, [clamped]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${fillFraction.value * 100}%` as any,
  }));

  return (
    <View
      className={`bg-border rounded-full overflow-hidden${className ? ` ${className}` : ''}`}
      style={{ height }}
    >
      <Animated.View
        className={`${colorClass} rounded-full h-full`}
        style={animatedStyle}
      />
    </View>
  );
}
