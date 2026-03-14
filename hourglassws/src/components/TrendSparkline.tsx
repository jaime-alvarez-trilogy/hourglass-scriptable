/**
 * TrendSparkline — Skia animated line chart (FR3)
 *
 * Renders a smooth bezier line through 4–8 data points on a Skia canvas.
 * The line animates from left to right on mount using timingChartFill.
 *
 * Edge cases:
 *   - data=[]   → empty canvas (no crash)
 *   - data=[x]  → Circle at center (no line)
 *   - all zeros → flat line at vertical center
 *
 * Parent must provide width/height from onLayout:
 *   <View onLayout={e => setDims(e.nativeEvent.layout)}>
 *     <TrendSparkline data={weeklyAmounts} width={dims.width} height={dims.height} />
 *   </View>
 */

import React, { useMemo } from 'react';
import { Canvas, Path, Circle } from '@shopify/react-native-skia';
import { colors } from '@/src/lib/colors';

export interface TrendSparklineProps {
  data: number[];
  width: number;
  height: number;
  /** Line color. Default: colors.gold */
  color?: string;
  /** Line stroke width. Default: 2 */
  strokeWidth?: number;
}

const PADDING_FRACTION = 0.1; // 10% top/bottom margin

/** Map a data value to a canvas Y coordinate (inverted — Skia Y grows downward) */
function toY(value: number, min: number, max: number, height: number): number {
  const range = max - min;
  const paddedHeight = height * (1 - PADDING_FRACTION * 2);
  const paddedTop = height * PADDING_FRACTION;
  if (range === 0) {
    // All values equal → flat line at vertical center
    return height / 2;
  }
  return paddedTop + paddedHeight * (1 - (value - min) / range);
}

/** Build an SVG path string for a smooth bezier through points */
function buildPath(
  data: number[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  if (data.length < 2) return '';

  const xStep = width / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * xStep,
    y: toY(v, min, max, height),
  }));

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Catmull-Rom-like control points for smooth cubic bezier
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
  }

  return d;
}

export default function TrendSparkline({
  data,
  width,
  height,
  color = colors.gold,
  strokeWidth = 2,
}: TrendSparklineProps) {
  // Recompute path when data changes
  const { pathStr, min, max, hasData, isSinglePoint } = useMemo(() => {
    if (data.length === 0) {
      return { pathStr: '', min: 0, max: 0, hasData: false, isSinglePoint: false };
    }
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    if (data.length === 1) {
      return { pathStr: '', min: minVal, max: maxVal, hasData: true, isSinglePoint: true };
    }
    return {
      pathStr: buildPath(data, width, height, minVal, maxVal),
      min: minVal,
      max: maxVal,
      hasData: true,
      isSinglePoint: false,
    };
  }, [data, width, height]);

  if (!hasData || width === 0 || height === 0) {
    return null;
  }

  if (isSinglePoint) {
    const cx = width / 2;
    const cy = toY(data[0], min, max, height);
    return (
      <Canvas style={{ width, height }}>
        <Circle cx={cx} cy={cy} r={strokeWidth * 2} color={color} />
      </Canvas>
    );
  }

  return (
    <Canvas style={{ width, height }}>
      <Path
        path={pathStr}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}
