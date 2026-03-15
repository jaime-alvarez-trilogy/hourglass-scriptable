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
import { Canvas, Rect, Line, vec, matchFont, Text } from '@shopify/react-native-skia';
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
  /** Faint centered watermark text overlaid on the chart body (e.g. "38.5h") */
  watermarkLabel?: string;
  /** When provided, bars whose running cumulative total exceeds this value shift to OVERTIME_WHITE_GOLD */
  weeklyLimit?: number;
}

const TRACK_COLOR = colors.border;
const WATERMARK_FONT_SIZE = 52;
/** Warm white-gold used for bars that push the running total beyond weeklyLimit */
const OVERTIME_WHITE_GOLD = '#FFF8E7';

export default function WeeklyBarChart({ data, maxHours, width, height, watermarkLabel, weeklyLimit }: WeeklyBarChartProps) {
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

  // Watermark font — loaded once per render (matchFont is synchronous)
  const font = watermarkLabel ? matchFont({ fontFamily: 'System', fontSize: WATERMARK_FONT_SIZE }) : null;

  // Center the watermark text horizontally and vertically
  const watermarkX = font && watermarkLabel
    ? (width - font.measureText(watermarkLabel).width) / 2
    : width / 2;
  const watermarkY = h / 2 + WATERMARK_FONT_SIZE / 3;

  // Running total for overtime color detection — accumulated before JSX map
  let runningTotal = 0;

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

        // Accumulate running total for non-future bars (left to right)
        if (!entry.isFuture) {
          runningTotal += entry.hours;
        }

        // Overtime color: running total strictly exceeds weeklyLimit
        let barColor: string;
        if (entry.isFuture) {
          barColor = colors.textMuted;
        } else if (weeklyLimit !== undefined && runningTotal > weeklyLimit) {
          barColor = OVERTIME_WHITE_GOLD;
        } else if (entry.isToday) {
          barColor = colors.gold;
        } else {
          barColor = colors.success;
        }

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

      {/* ── WATERMARK: faint total hours centered on chart ─────────────── */}
      {watermarkLabel && font && (
        <Text
          x={watermarkX}
          y={watermarkY}
          text={watermarkLabel}
          font={font}
          color={colors.textPrimary}
          opacity={0.07}
        />
      )}
    </Canvas>
  );
}
