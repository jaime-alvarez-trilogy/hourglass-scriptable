// MetricValue.tsx
// FR2: Hero number with Reanimated count-up animation from 0 (03-base-components)
// FR4 (06-wiring-and-tokens): Inter 800 weight (font-display-extrabold), letterSpacing: -0.5
//
// Design system rule (BRAND_GUIDELINES.md):
//   Numeric values always use Inter (font-display-extrabold = Inter_800ExtraBold).
//   Use tabular-nums for all animated counters.
//   Count-up uses timingChartFill — data settling on truth, not spring.
//
// New Architecture (Fabric) note:
//   useAnimatedProps on TextInput.value does not work on Fabric (Reanimated v4).
//   Instead: useSharedValue + withTiming drives the animation, then
//   useAnimatedReaction + runOnJS bridges the UI-thread value to React state.
// No StyleSheet.create — NativeWind className only.

import React, { useEffect, useState, useCallback } from 'react';
import { Text } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { timingChartFill } from '@/src/lib/reanimated-presets';

interface MetricValueProps {
  /** Target numeric value — animates from 0 on mount */
  value: number;
  /** Appended to formatted number (e.g. "h", "%") */
  unit?: string;
  /** Decimal places (default: 1) */
  precision?: number;
  /** Tailwind text color class (default: "text-textPrimary") */
  colorClass?: string;
  /** Tailwind text size class (default: "text-4xl") */
  sizeClass?: string;
}

export default function MetricValue({
  value,
  unit = '',
  precision = 1,
  colorClass = 'text-textPrimary',
  sizeClass = 'text-4xl',
}: MetricValueProps): JSX.Element {
  const displayValue = useSharedValue(0);
  const [text, setText] = useState(`${(0).toFixed(precision)}${unit}`);

  const updateText = useCallback((v: number) => {
    setText(`${v.toFixed(precision)}${unit}`);
  }, [precision, unit]);

  useEffect(() => {
    displayValue.value = withTiming(value, timingChartFill);
  }, [value]);

  useAnimatedReaction(
    () => displayValue.value,
    (v) => {
      runOnJS(updateText)(v);
    },
  );

  return (
    <Text
      className={`font-display-extrabold ${sizeClass} ${colorClass}`}
      style={{ fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}
    >
      {text}
    </Text>
  );
}
