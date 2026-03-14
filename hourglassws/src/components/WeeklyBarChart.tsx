/**
 * WeeklyBarChart — Skia animated bar chart (FR2)
 *
 * Animation pattern (Skia 2.2.12 + Fabric compatible):
 *   useSharedValue → withTiming → useAnimatedReaction → runOnJS(setProgress)
 *   → React state → static Canvas re-render with scaled heights
 *
 * Avoids passing SharedValue/DerivedValue as arbitrary Skia props (crashes on
 * Skia < 2.3). State lives at the component level, not inside Canvas children,
 * so Skia's reconciler sees clean static values on every frame.
 */

import React, { useEffect, useState } from 'react';
import { Canvas, Rect, Line, vec } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/src/lib/colors';
import { timingChartFill } from '@/src/lib/reanimated-presets';

export interface DailyHours {
  day: string;
  hours: number;
  isToday?: boolean;
  isFuture?: boolean;
}

export interface WeeklyBarChartProps {
  data: DailyHours[];
  maxHours?: number;
  width: number;
  height: number;
}

const TRACK_COLOR = colors.border;

export default function WeeklyBarChart({ data, maxHours, width, height }: WeeklyBarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, timingChartFill);
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (v) => { runOnJS(setAnimProgress)(v); },
  );

  if (data.length === 0 || width === 0) return null;

  const h = height > 0 ? height : 120;
  const resolvedMax = maxHours ?? Math.max(8, ...data.map(d => d.hours));
  const GAP_FRACTION = 0.3;
  const slotWidth = width / data.length;
  const barWidth = slotWidth * (1 - GAP_FRACTION);
  const barOffset = slotWidth * (GAP_FRACTION / 2);

  const guideY = 2;
  const trackY = guideY + 1;
  const trackHeight = h - trackY;
  const chartHeight = h - 4;

  return (
    <Canvas style={{ width, height: h }}>
      {/* Max hours guide line */}
      <Line
        p1={vec(0, guideY)}
        p2={vec(width, guideY)}
        color={TRACK_COLOR}
        strokeWidth={1}
      />

      {data.map((entry, index) => {
        const x = index * slotWidth + barOffset;

        const barColor = entry.isToday
          ? colors.gold
          : entry.isFuture
            ? colors.textMuted
            : colors.success;

        const fullBarHeight = resolvedMax > 0
          ? Math.max(2, (entry.hours / resolvedMax) * chartHeight)
          : 0;
        const animatedBarHeight = fullBarHeight * animProgress;
        const dataBarY = h - animatedBarHeight;

        return (
          <React.Fragment key={entry.day + index}>
            {/* Track (always visible) */}
            <Rect x={x} y={trackY} width={barWidth} height={trackHeight} color={TRACK_COLOR} />
            {/* Data bar (animates up from bottom) */}
            {entry.hours > 0 && animatedBarHeight >= 1 && (
              <Rect x={x} y={dataBarY} width={barWidth} height={animatedBarHeight} color={barColor} />
            )}
          </React.Fragment>
        );
      })}
    </Canvas>
  );
}
