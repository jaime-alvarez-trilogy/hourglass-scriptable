// MetricValue.tsx
// FR2: Hero number with Reanimated count-up animation from 0 (03-base-components)
//
// Design system rule (BRAND_GUIDELINES.md):
//   Numeric values always use Space Grotesk (font-display).
//   Use tabular-nums for all animated counters.
//   Count-up uses timingChartFill — data settling on truth, not spring.
//
// Pattern: useSharedValue(0) → withTiming(value, timingChartFill) → useAnimatedProps
//          on Animated.createAnimatedComponent(TextInput) with value prop.
// No StyleSheet.create — NativeWind className only.

import React, { useEffect } from 'react';
import { TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { timingChartFill } from '@/src/lib/reanimated-presets';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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
  unit,
  precision = 1,
  colorClass = 'text-textPrimary',
  sizeClass = 'text-4xl',
}: MetricValueProps): JSX.Element {
  const displayValue = useSharedValue(0);

  useEffect(() => {
    displayValue.value = withTiming(value, timingChartFill);
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    value: `${displayValue.value.toFixed(precision)}${unit ?? ''}`,
  } as any));

  const inputClass = `font-display ${sizeClass} ${colorClass}`;

  return (
    <Animated.View style={{ animation: 'fadeIn 300ms ease-out' }}>
      <AnimatedTextInput
        className={inputClass}
        animatedProps={animatedProps}
        editable={false}
        caretHidden
        selectTextOnFocus={false}
        defaultValue={`${(0).toFixed(precision)}${unit ?? ''}`}
      />
    </Animated.View>
  );
}
