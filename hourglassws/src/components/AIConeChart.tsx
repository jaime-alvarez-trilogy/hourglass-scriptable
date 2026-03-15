/**
 * AIConeChart — Prime Radiant visualization (02-cone-chart)
 *
 * Renders the AI% trajectory (actual line, left) and possibility cone (right)
 * as a Skia canvas component. Two variants:
 *   - full:    AI tab, ~240px tall, with X/Y axis labels
 *   - compact: home tab card, ~100px tall, no labels
 *
 * Animation pattern: useSharedValue → withTiming → useAnimatedReaction → runOnJS
 * Avoids passing SharedValue directly to Skia props (crashes on Skia < 2.3 + Fabric).
 *
 * Depends on src/lib/aiCone.ts for ConeData and ConePoint types.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Canvas,
  Path,
  Circle,
  Text,
  matchFont,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import type { ConeData, ConePoint } from '@/src/lib/aiCone';
import { colors } from '@/src/lib/colors';
import { timingChartFill } from '@/src/lib/reanimated-presets';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIConeChartProps {
  data: ConeData;
  width: number;
  height: number;
  size?: 'full' | 'compact';
}

type Padding = { top: number; right: number; bottom: number; left: number };
type ToPixelFn = (hoursX: number, pctY: number) => { x: number; y: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING_FULL: Padding = { top: 16, right: 16, bottom: 28, left: 36 };
const PADDING_COMPACT: Padding = { top: 8, right: 8, bottom: 8, left: 8 };

const Y_TICKS = [
  { label: '100%', pct: 100 },
  { label: '75%',  pct: 75  },
  { label: '50%',  pct: 50  },
  { label: '0%',   pct: 0   },
];

const X_TICKS = [0, 10, 20, 30, 40];

const DOT_RADIUS_BASE = 4;
const DOT_RADIUS_PULSE = 7;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps data-space (hoursX, pctY) to canvas pixel coordinates.
 *
 * X: hoursX ∈ [0, weeklyLimit] → [paddingLeft, width - paddingRight]
 * Y: pctY   ∈ [0, 100]         → [height - paddingBottom, paddingTop]  (inverted)
 */
function toPixel(
  hoursX: number,
  pctY: number,
  dims: { width: number; height: number },
  weeklyLimit: number,
  padding: Padding,
): { x: number; y: number } {
  const chartW = dims.width - padding.left - padding.right;
  const chartH = dims.height - padding.top - padding.bottom;

  // Guard: avoid division by zero
  if (weeklyLimit <= 0 || chartW <= 0 || chartH <= 0) {
    return { x: padding.left, y: padding.top + chartH / 2 };
  }

  const x = padding.left + (hoursX / weeklyLimit) * chartW;
  const y = padding.top + chartH * (1 - pctY / 100);
  return { x, y };
}

// ─── Exported path builders ───────────────────────────────────────────────────

/**
 * Constructs the Skia path for the historical AI% trajectory line.
 * Always starts at data origin (0, 0); traces each subsequent point.
 */
export function buildActualPath(points: ConePoint[], toPixelFn: ToPixelFn): string {
  if (points.length === 0) return '';

  const { x: x0, y: y0 } = toPixelFn(points[0].hoursX, points[0].pctY);
  let d = `M ${x0} ${y0}`;

  for (let i = 1; i < points.length; i++) {
    const { x, y } = toPixelFn(points[i].hoursX, points[i].pctY);
    d += ` L ${x} ${y}`;
  }

  return d;
}

/**
 * Constructs the closed Skia path for the possibility cone fill area.
 * Traces upper points left-to-right, then lower points right-to-left, then closes.
 */
export function buildConePath(
  upper: ConePoint[],
  lower: ConePoint[],
  toPixelFn: ToPixelFn,
): string {
  if (upper.length === 0 || lower.length === 0) return '';

  // Upper: left-to-right
  const { x: ux0, y: uy0 } = toPixelFn(upper[0].hoursX, upper[0].pctY);
  let d = `M ${ux0} ${uy0}`;
  for (let i = 1; i < upper.length; i++) {
    const { x, y } = toPixelFn(upper[i].hoursX, upper[i].pctY);
    d += ` L ${x} ${y}`;
  }

  // Lower: right-to-left (reverse traversal)
  const lowerReversed = [...lower].reverse();
  for (const pt of lowerReversed) {
    const { x, y } = toPixelFn(pt.hoursX, pt.pctY);
    d += ` L ${x} ${y}`;
  }

  d += ' Z'; // .close()
  return d;
}

/**
 * Constructs the horizontal dashed reference line at the target percentage.
 * Spans from hoursX=0 to hoursX=weeklyLimit at Y=targetPct.
 */
export function buildTargetLinePath(
  targetPct: number,
  weeklyLimit: number,
  toPixelFn: ToPixelFn,
): string {
  const { x: x0, y } = toPixelFn(0, targetPct);
  const { x: x1 } = toPixelFn(weeklyLimit, targetPct);
  return `M ${x0} ${y} L ${x1} ${y}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIConeChart({
  data,
  width,
  height,
  size = 'full',
}: AIConeChartProps): React.ReactElement | null {
  const reducedMotion = useReducedMotion();

  // Animation state bridge — avoid passing SharedValue to Skia props (Fabric compat)
  const [animState, setAnimState] = useState({
    lineEnd: 0,
    coneOpacity: 0,
    dotOpacity: 0,
  });
  const [dotRadius, setDotRadius] = useState(DOT_RADIUS_BASE);
  const pulsed = useRef(false);

  const progress = useSharedValue(0);
  const dotScale = useSharedValue(DOT_RADIUS_BASE);

  // Mount animation
  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
    } else {
      progress.value = withTiming(1, timingChartFill);
    }
  }, []);

  // Bridge progress → React state (Skia/Fabric compat pattern from WeeklyBarChart)
  useAnimatedReaction(
    () => progress.value,
    (v) => {
      const lineEnd = Math.min(v / 0.6, 1);
      const coneOpacity = v;
      const dotOpacity = Math.min(Math.max((v - 0.6) / 0.4, 0), 1);
      runOnJS(setAnimState)({ lineEnd, coneOpacity, dotOpacity });
    },
  );

  // Bridge dotScale → React state
  useAnimatedReaction(
    () => dotScale.value,
    (v) => { runOnJS(setDotRadius)(v); },
  );

  // Dot pulse: once dotOpacity reaches 1, pulse once (4 → 7 → 4)
  useEffect(() => {
    if (animState.dotOpacity >= 1 && !pulsed.current) {
      pulsed.current = true;
      dotScale.value = withTiming(DOT_RADIUS_PULSE, { duration: 200 }, () => {
        dotScale.value = withTiming(DOT_RADIUS_BASE, { duration: 200 });
      });
    }
  }, [animState.dotOpacity]);

  // Build paths + compute dot pixel position (memoized)
  const { actualPath, conePath, upperPath, lowerPath, targetPath, dotPixel, toPixelFn } = useMemo(() => {
    const padding = size === 'full' ? PADDING_FULL : PADDING_COMPACT;
    const fn: ToPixelFn = (hx, py) =>
      toPixel(hx, py, { width, height }, data.weeklyLimit, padding);

    return {
      actualPath: buildActualPath(data.actualPoints, fn),
      conePath: buildConePath(data.upperBound, data.lowerBound, fn),
      upperPath: buildActualPath(data.upperBound, fn),
      lowerPath: buildActualPath(data.lowerBound, fn),
      targetPath: buildTargetLinePath(data.targetPct, data.weeklyLimit, fn),
      dotPixel: fn(data.currentHours, data.currentAIPct),
      toPixelFn: fn,
    };
  }, [data, width, height, size]);

  // Axis label font
  const font = matchFont({ fontFamily: 'System', fontSize: 10 });

  // Guard: no canvas before dimensions are known (after all hooks — Rules of Hooks)
  if (width === 0 || height === 0) return null;

  return (
    <Canvas style={{ width, height }}>
      {/* Layer 1: Cone fill (bottom-most) */}
      {conePath !== '' && (
        <Path
          path={conePath}
          color={colors.cyan}
          style="fill"
          opacity={animState.coneOpacity * 0.15}
        />
      )}

      {/* Layer 2: Cone boundary strokes */}
      {upperPath !== '' && (
        <Path
          path={upperPath}
          color={colors.cyan}
          style="stroke"
          strokeWidth={1}
          opacity={animState.coneOpacity * 0.30}
        />
      )}
      {lowerPath !== '' && (
        <Path
          path={lowerPath}
          color={colors.cyan}
          style="stroke"
          strokeWidth={1}
          opacity={animState.coneOpacity * 0.30}
        />
      )}

      {/* Layer 3: 75% target line (dashed) */}
      {targetPath !== '' && (
        <Path
          path={targetPath}
          color={colors.warning}
          style="stroke"
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      {/* Layer 4: Actual trajectory line (animated clip via end) */}
      {actualPath !== '' && (
        <Path
          path={actualPath}
          color={colors.cyan}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
          end={animState.lineEnd}
        />
      )}

      {/* Layer 5: Current position dot */}
      <Circle
        cx={dotPixel.x}
        cy={dotPixel.y}
        r={dotRadius}
        color={colors.cyan}
        opacity={animState.dotOpacity}
      />

      {/* Layer 6: Axis labels (full variant only) */}
      {size === 'full' && font && (
        <>
          {/* Y-axis labels */}
          {Y_TICKS.map(({ label, pct }) => {
            const { y } = toPixelFn(0, pct);
            return (
              <Text
                key={label}
                x={2}
                y={y + 4}
                text={label}
                font={font}
                color={colors.textMuted}
              />
            );
          })}

          {/* X-axis labels */}
          {X_TICKS.filter((tick) => tick <= data.weeklyLimit).map((tick) => {
            const { x } = toPixelFn(tick, 0);
            return (
              <Text
                key={String(tick)}
                x={x - 6}
                y={height - 4}
                text={`${tick}h`}
                font={font}
                color={colors.textMuted}
              />
            );
          })}
        </>
      )}
    </Canvas>
  );
}

export default AIConeChart;
