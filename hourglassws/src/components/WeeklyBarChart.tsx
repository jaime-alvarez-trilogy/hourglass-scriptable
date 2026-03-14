/**
 * WeeklyBarChart — Skia bar chart (FR2)
 *
 * Static rendering (no Reanimated animation) for Expo Go / Skia 2.2.12 compatibility.
 * Reanimated shared values cannot be passed as Skia prop values in Skia < 2.3.
 *
 * Bar colors:
 *   - Past completed day → colors.success
 *   - Today              → colors.gold
 *   - Future day         → colors.textMuted
 */

import React from 'react';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { colors } from '@/src/lib/colors';

export interface DailyHours {
  day: string;       // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  hours: number;
  isToday?: boolean;
  isFuture?: boolean;
}

export interface WeeklyBarChartProps {
  data: DailyHours[];
  /** Y-axis max. Default: Math.max(8, max(data.hours)) */
  maxHours?: number;
  width: number;
  height: number;
}

export default function WeeklyBarChart({
  data,
  maxHours,
  width,
  height,
}: WeeklyBarChartProps) {
  if (data.length === 0 || width === 0 || height === 0) {
    return null;
  }

  const resolvedMax = maxHours ?? Math.max(8, ...data.map(d => d.hours));

  const barCount = data.length;
  const GAP_FRACTION = 0.3;
  const slotWidth = width / barCount;
  const barWidth = slotWidth * (1 - GAP_FRACTION);
  const barOffset = slotWidth * (GAP_FRACTION / 2);

  return (
    <Canvas style={{ width, height }}>
      {data.map((entry, index) => {
        const barHeight =
          resolvedMax > 0
            ? Math.max(2, (entry.hours / resolvedMax) * height)
            : 2;

        const barColor = entry.isToday
          ? colors.gold
          : entry.isFuture
          ? colors.textMuted
          : colors.success;

        const x = index * slotWidth + barOffset;
        const y = height - barHeight;

        return (
          <Rect
            key={entry.day + index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            color={barColor}
          />
        );
      })}
    </Canvas>
  );
}
