/**
 * TrendSparkline — Skia animated line chart with optional scrub gesture
 *
 * Renders a smooth bezier line through 4–12 data points on a Skia canvas.
 * The line animates from left to right on mount using timingChartFill.
 *
 * Scrub gesture (05-earnings-scrub FR2):
 *   - Wrap with GestureDetector for horizontal pan scrubbing
 *   - Calls onScrubChange(index) during pan, onScrubChange(null) on release
 *   - Renders a vertical line + dot cursor at the snapped data point
 *   - activeOffsetX: [-5, 5] prevents conflict with ScrollView vertical scroll
 *
 * Edge cases:
 *   - data=[]   → empty canvas (no crash), gesture disabled
 *   - data=[x]  → Circle at center (no line), cursor snaps to index 0
 *   - all zeros → flat line at vertical center
 *
 * Parent must provide width/height from onLayout:
 *   <View onLayout={e => setDims(e.nativeEvent.layout)}>
 *     <TrendSparkline data={weeklyAmounts} width={dims.width} height={dims.height} />
 *   </View>
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, Path, Circle, Line, vec, matchFont, Text } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { colors } from '@/src/lib/colors';
import { timingChartFill } from '@/src/lib/reanimated-presets';
import { useScrubGesture } from '@/src/hooks/useScrubGesture';
import type { ScrubChangeCallback } from '@/src/hooks/useScrubGesture';
import { buildScrubCursor } from '@/src/components/ScrubCursor';

export interface TrendSparklineProps {
  data: number[];
  width: number;
  height: number;
  /** Line color. Default: colors.gold */
  color?: string;
  /** Line stroke width. Default: 2 */
  strokeWidth?: number;
  /**
   * Optional ceiling value for the Y-axis scale.
   * If provided and >= all data values, the chart scales to this max instead of
   * data max — so bars/lines never touch the top unless data reaches maxValue.
   */
  maxValue?: number;
  /**
   * Show a faint horizontal guide line at the top of the chart (y=2),
   * representing the maxValue reference. Default: false.
   */
  showGuide?: boolean;
  /**
   * Optional label rendered at the right edge of the guide line.
   * Only shown when showGuide is true. e.g. "$2,000"
   */
  capLabel?: string;
  /**
   * Called with the nearest data index (0..N-1) during a horizontal pan gesture,
   * and with null when the gesture ends. Enables parent to update a hero value.
   */
  onScrubChange?: ScrubChangeCallback;
  /**
   * Human-readable week labels for each data point (oldest first).
   * Length should match data.length. Used by parent for sub-label display.
   * Not rendered inside the canvas.
   */
  weekLabels?: string[];
  /**
   * External cursor index driven by a parent component for synchronized scrubbing.
   * When non-null, renders a cursor at that data index regardless of internal gesture state.
   * Takes priority over the internal gesture cursor.
   * Out-of-range values are clamped to [0, data.length - 1].
   * Used by OverviewScreen (07-overview-sync) to sync all 4 charts.
   */
  externalCursorIndex?: number | null;
}

const PADDING_FRACTION = 0.1; // 10% top/bottom margin
const CAP_LABEL_FONT_SIZE = 10;

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

/** Compute pixel X positions for each data point (matches buildPath spacing) */
function computePixelXs(dataLength: number, width: number): number[] {
  if (dataLength === 0) return [];
  if (dataLength === 1) return [width / 2];
  const xStep = width / (dataLength - 1);
  return Array.from({ length: dataLength }, (_, i) => i * xStep);
}

export default function TrendSparkline({
  data,
  width,
  height,
  color = colors.gold,
  strokeWidth = 2,
  maxValue,
  showGuide = false,
  capLabel,
  onScrubChange,
  weekLabels: _weekLabels, // accepted prop — used by parent for sub-label, not rendered in canvas
  externalCursorIndex = null,
}: TrendSparklineProps) {
  const clipProgress = useSharedValue(0);
  // Resolve effective height — never 0 (avoids invisible canvas before onLayout fires)
  const h = height > 0 ? height : 52;

  useEffect(() => {
    clipProgress.value = withTiming(1, timingChartFill);
  }, []);

  // Recompute path when data or dimensions change
  const { pathStr, min, max, hasData, isSinglePoint } = useMemo(() => {
    if (data.length === 0) {
      return { pathStr: '', min: 0, max: 0, hasData: false, isSinglePoint: false };
    }
    const minVal = Math.min(...data);
    const dataMax = Math.max(...data);
    // If maxValue is provided and >= all data, use it as the axis ceiling
    const maxVal = maxValue !== undefined && maxValue >= dataMax ? maxValue : dataMax;
    if (data.length === 1) {
      return { pathStr: '', min: minVal, max: maxVal, hasData: true, isSinglePoint: true };
    }
    return {
      pathStr: buildPath(data, width, h, minVal, maxVal),
      min: minVal,
      max: maxVal,
      hasData: true,
      isSinglePoint: false,
    };
  }, [data, width, h, maxValue]);

  // ── Scrub gesture ──────────────────────────────────────────────────────────

  const pixelXs = useMemo(() => computePixelXs(data.length, width), [data.length, width]);

  const { scrubIndex, gesture } = useScrubGesture({
    pixelXs,
    enabled: data.length > 0,
  });

  // Apply activeOffsetX so horizontal scrub doesn't block ScrollView vertical scroll
  const scrubGesture = gesture.activeOffsetX([-5, 5]);

  // Cursor pixel position bridged from UI thread to React state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Safe fallback for optional onScrubChange
  const safeOnScrubChange: ScrubChangeCallback = onScrubChange ?? (() => {});

  // Bridge scrubIndex → onScrubChange callback (JS thread)
  useAnimatedReaction(
    () => scrubIndex.value,
    (index) => {
      runOnJS(safeOnScrubChange)(index === -1 ? null : index);
    },
  );

  // Bridge scrubIndex → cursor pixel position (JS thread, for canvas rendering)
  useAnimatedReaction(
    () => scrubIndex.value,
    (index) => {
      if (index === -1 || data.length === 0) {
        runOnJS(setCursorPos)(null);
        return;
      }
      const clampedIdx = Math.min(Math.max(index, 0), data.length - 1);
      const x = pixelXs[clampedIdx] ?? 0;
      const y = toY(data[clampedIdx] ?? 0, min, max, h);
      runOnJS(setCursorPos)({ x, y });
    },
  );

  // ── Early return ───────────────────────────────────────────────────────────

  if (!hasData || width === 0) {
    return null;
  }

  const guideY = 2;

  // Cap label font — only loaded when needed
  const capFont = (showGuide && capLabel)
    ? matchFont({ fontFamily: 'System', fontSize: CAP_LABEL_FONT_SIZE })
    : null;

  // Right-align the cap label: measure text width, position at right edge
  const capLabelX = capFont && capLabel
    ? width - capFont.measureText(capLabel).width - 4
    : 0;
  const capLabelY = guideY + CAP_LABEL_FONT_SIZE;

  // Cursor geometry — external index takes priority over internal gesture state
  // externalCursorIndex: set by parent (overview sync); cursorPos: set by own gesture
  const activeCursorPos: { x: number; y: number } | null = (() => {
    if (externalCursorIndex != null && data.length > 0) {
      // Clamp to valid range
      const clampedIdx = Math.max(0, Math.min(externalCursorIndex, data.length - 1));
      const x = pixelXs[clampedIdx] ?? 0;
      const y = toY(data[clampedIdx] ?? 0, min, max, h);
      return { x, y };
    }
    return cursorPos;
  })();

  const cursor = activeCursorPos
    ? buildScrubCursor(activeCursorPos.x, activeCursorPos.y, h, h * PADDING_FRACTION)
    : null;

  if (isSinglePoint) {
    const cx = width / 2;
    const cy = toY(data[0], min, max, h);
    return (
      <GestureDetector gesture={scrubGesture}>
        <Canvas style={{ width, height: h }}>
          {showGuide && (
            <Line p1={vec(0, guideY)} p2={vec(width, guideY)} color={colors.border} strokeWidth={1} />
          )}
          {showGuide && capLabel && capFont && (
            <Text
              x={capLabelX}
              y={capLabelY}
              text={capLabel}
              font={capFont}
              color={colors.textMuted}
              opacity={0.35}
            />
          )}
          <Circle cx={cx} cy={cy} r={strokeWidth * 2} color={color} />
          {cursor && (
            <>
              <Path
                path={cursor.linePath}
                color={colors.textMuted}
                style="stroke"
                strokeWidth={1}
                opacity={0.5}
              />
              <Circle cx={cursor.dotX} cy={cursor.dotY} r={cursor.dotRadius} color={color} />
            </>
          )}
        </Canvas>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={scrubGesture}>
      <Canvas style={{ width, height: h }}>
        {showGuide && (
          <Line p1={vec(0, guideY)} p2={vec(width, guideY)} color={colors.border} strokeWidth={1} />
        )}
        {showGuide && capLabel && capFont && (
          <Text
            x={capLabelX}
            y={capLabelY}
            text={capLabel}
            font={capFont}
            color={colors.textMuted}
            opacity={0.35}
          />
        )}
        <Path
          path={pathStr}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          strokeJoin="round"
          end={clipProgress}
        />
        {cursor && (
          <>
            <Path
              path={cursor.linePath}
              color={colors.textMuted}
              style="stroke"
              strokeWidth={1}
              opacity={0.5}
            />
            <Circle cx={cursor.dotX} cy={cursor.dotY} r={cursor.dotRadius} color={color} />
          </>
        )}
      </Canvas>
    </GestureDetector>
  );
}
