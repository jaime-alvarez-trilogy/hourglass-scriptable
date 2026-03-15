/**
 * AIConeChart — Prime Radiant visualization
 *
 * Animation: an index sweeps from 0 → N-1 across hourlyPoints.
 * At each frame the chart renders:
 *   - Actual line: all points up to the current index
 *   - Cone: from hourlyPoints[idx] → weeklyLimit, narrowing as the line advances
 *   - 75% target dashed line: always visible
 *   - Dot: pulses when the line reaches its final position
 *
 * Two variants:
 *   - full:    AI tab, ~240px tall, with X/Y axis labels
 *   - compact: home tab card, ~100px tall, no labels
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
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
  Easing,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import type { ConeData, ConePoint } from '@/src/lib/aiCone';
import { colors } from '@/src/lib/colors';
import { useScrubGesture } from '@/src/hooks/useScrubGesture';
import { buildScrubCursor } from '@/src/components/ScrubCursor';
import type { ScrubCursorResult } from '@/src/components/ScrubCursor';

// Linear easing so every hour-frame gets equal screen time — the wide cone
// at the start is as visible as the narrow cone at the end.
const CONE_ANIMATION = { duration: 2800, easing: Easing.linear };

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * AIScrubPoint — data emitted by onScrubChange when the user scrubs the chart.
 * Merges the hourlyPoints position with the parallel coneSnapshots bounds.
 */
export interface AIScrubPoint {
  pctY: number;     // hourlyPoints[i].pctY — actual AI% at that hour
  hoursX: number;   // hourlyPoints[i].hoursX — hours elapsed
  upperPct: number; // coneSnapshots[i].upperPct — best case at that moment
  lowerPct: number; // coneSnapshots[i].lowerPct — worst case at that moment
}

export interface AIConeChartProps {
  data: ConeData;
  width: number;
  height: number;
  size?: 'full' | 'compact';
  onScrubChange?: (point: AIScrubPoint | null) => void;
}

type Padding = { top: number; right: number; bottom: number; left: number };
type ToPixelFn = (hoursX: number, pctY: number) => { x: number; y: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING_FULL: Padding    = { top: 16, right: 16, bottom: 28, left: 36 };
const PADDING_COMPACT: Padding = { top: 8,  right: 8,  bottom: 8,  left: 8  };

const Y_TICKS = [
  { label: '100%', pct: 100 },
  { label: '75%',  pct: 75  },
  { label: '50%',  pct: 50  },
  { label: '0%',   pct: 0   },
];

const X_TICKS = [0, 10, 20, 30, 40];

const DOT_RADIUS_BASE  = 3;
const DOT_RADIUS_PULSE = 5;

// ─── Sci-fi "Prime Radiant" palette ──────────────────────────────────────────
// Inspired by Foundation holographic displays and Marvel sacred timeline visuals.
// Glow is simulated by stacking 3 Path layers: wide-dim → mid → thin-bright.

const HOLO_CORE  = '#D4F1FF'; // near-white blue — the bright core of the trajectory
const HOLO_GLOW  = '#38BDF8'; // sky blue — outer bloom on trajectory line
const CONE_EDGE  = '#22D3EE'; // lighter cyan — probability boundary edges
const CONE_SPACE = '#04111F'; // near-black deep blue — the possibility space fill
const PROJ_COLOR = '#818CF8'; // indigo — the projected trend (prediction, not fact)
const AMBER_CORE = '#FCD34D'; // warm amber — 75% target threshold line

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function toPixel(
  hoursX: number,
  pctY: number,
  dims: { width: number; height: number },
  weeklyLimit: number,
  padding: Padding,
): { x: number; y: number } {
  const chartW = dims.width  - padding.left - padding.right;
  const chartH = dims.height - padding.top  - padding.bottom;

  if (weeklyLimit <= 0 || chartW <= 0 || chartH <= 0) {
    return { x: padding.left, y: padding.top + chartH / 2 };
  }

  const x = padding.left + (hoursX / weeklyLimit) * chartW;
  const y = padding.top  + chartH * (1 - pctY / 100);
  return { x, y };
}

// ─── Exported path builders ───────────────────────────────────────────────────

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
 * Cubic bezier from (x0,y0) → (x1,y1).
 * Control points hug the origin horizontally so the curve starts flat
 * and fans outward — gives the cone an organic "opening" shape.
 */
function bezierSegment(x0: number, y0: number, x1: number, y1: number): string {
  const dx = x1 - x0;
  const cp1x = x0 + dx * 0.60; // start flat → go right first
  const cp2x = x1 - dx * 0.20; // approach end from slightly left
  return `C ${cp1x} ${y0}, ${cp2x} ${y1}, ${x1} ${y1}`;
}

/**
 * Cone fill: bezier along upper edge, straight right-side close,
 * reversed bezier back along lower edge, then Z.
 * upper[0] and lower[0] are the same origin point (current position).
 */
export function buildConePath(
  upper: ConePoint[],
  lower: ConePoint[],
  toPixelFn: ToPixelFn,
): string {
  if (upper.length < 2 || lower.length < 2) return '';
  const { x: ox, y: oy } = toPixelFn(upper[0].hoursX, upper[0].pctY);
  const { x: ux, y: uy } = toPixelFn(upper[1].hoursX, upper[1].pctY);
  const { x: lx, y: ly } = toPixelFn(lower[1].hoursX, lower[1].pctY);
  const dx = ux - ox;
  const cp1x = ox + dx * 0.60;
  const cp2x = ux - dx * 0.20;
  // Forward upper bezier, right-side join, reversed lower bezier back to origin
  return (
    `M ${ox} ${oy}` +
    ` C ${cp1x} ${oy}, ${cp2x} ${uy}, ${ux} ${uy}` + // upper curve
    ` L ${lx} ${ly}` +                                // right edge
    ` C ${cp2x} ${ly}, ${cp1x} ${oy}, ${ox} ${oy}` + // lower curve reversed
    ' Z'
  );
}

/**
 * Single bezier edge stroke for one cone boundary (upper or lower).
 */
export function buildConeEdgePath(
  from: ConePoint,
  to: ConePoint,
  toPixelFn: ToPixelFn,
): string {
  const { x: x0, y: y0 } = toPixelFn(from.hoursX, from.pctY);
  const { x: x1, y: y1 } = toPixelFn(to.hoursX, to.pctY);
  return `M ${x0} ${y0} ${bezierSegment(x0, y0, x1, y1)}`;
}

/**
 * Projected trend: dashed line from current tip to weeklyLimit at the same AI%.
 * Dashes communicate "prediction" vs the solid historical line (fact).
 */
export function buildProjectedPath(
  from: ConePoint,
  weeklyLimit: number,
  toPixelFn: ToPixelFn,
): string {
  if (from.hoursX >= weeklyLimit) return '';
  const { x: x0, y } = toPixelFn(from.hoursX, from.pctY);
  const { x: x1 }    = toPixelFn(weeklyLimit, from.pctY);
  if (x1 <= x0) return '';
  // Build manual dash segments: 7px dash, 4px gap
  const DASH = 7;
  const GAP  = 4;
  let d = '';
  let x = x0;
  let on = true;
  while (x < x1) {
    const next = Math.min(x + (on ? DASH : GAP), x1);
    if (on) d += `M ${x} ${y} L ${next} ${y} `;
    x = next;
    on = !on;
  }
  return d.trim();
}

export function buildTargetLinePath(
  targetPct: number,
  weeklyLimit: number,
  toPixelFn: ToPixelFn,
): string {
  const { x: x0, y } = toPixelFn(0, targetPct);
  const { x: x1 }    = toPixelFn(weeklyLimit, targetPct);
  return `M ${x0} ${y} L ${x1} ${y}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIConeChart({
  data,
  width,
  height,
  size = 'full',
  onScrubChange,
}: AIConeChartProps): React.ReactElement | null {
  const reducedMotion = useReducedMotion();
  const N = data.hourlyPoints.length; // total animation frames

  // ── Pre-compute all frame paths ──────────────────────────────────────────
  // At frame i: show line up to hourlyPoints[i], cone from hourlyPoints[i].
  // O(N) path building — N ≤ ~45 for a 40-hour week, fast enough.
  const { linePaths, conePaths, upperEdgePaths, lowerEdgePaths, projectedPaths, targetPath, dotPixel, toPixelFn } =
    useMemo(() => {
      const padding = size === 'full' ? PADDING_FULL : PADDING_COMPACT;
      const fn: ToPixelFn = (hx, py) =>
        toPixel(hx, py, { width, height }, data.weeklyLimit, padding);

      const lPaths:  string[] = [];
      const cPaths:  string[] = [];
      const uPaths:  string[] = [];
      const loPaths: string[] = [];
      const pPaths:  string[] = [];

      for (let i = 0; i < N; i++) {
        const pt   = data.hourlyPoints[i];
        const snap = data.coneSnapshots[i];
        const upperEnd: ConePoint = { hoursX: data.weeklyLimit, pctY: snap.upperPct };
        const lowerEnd: ConePoint = { hoursX: data.weeklyLimit, pctY: snap.lowerPct };

        // Historical line: all points up to this frame
        lPaths.push(buildActualPath(data.hourlyPoints.slice(0, i + 1), fn));

        // Cone fill: bezier-curved area from current tip to weeklyLimit
        cPaths.push(buildConePath([pt, upperEnd], [pt, lowerEnd], fn));

        // Cone edge strokes: bezier curves (not straight lines)
        uPaths.push(buildConeEdgePath(pt, upperEnd, fn));
        loPaths.push(buildConeEdgePath(pt, lowerEnd, fn));

        // Projected trend: flat line from current tip → weeklyLimit at same AI%
        pPaths.push(buildProjectedPath(pt, data.weeklyLimit, fn));
      }

      // pixelXs: X pixel positions of each hourlyPoint — used by useScrubGesture
      const pixelXsArr = data.hourlyPoints.map(p => fn(p.hoursX, p.pctY).x);

      return {
        linePaths:      lPaths,
        conePaths:      cPaths,
        upperEdgePaths: uPaths,
        lowerEdgePaths: loPaths,
        projectedPaths: pPaths,
        targetPath:     buildTargetLinePath(data.targetPct, data.weeklyLimit, fn),
        dotPixel:       fn(data.currentHours, data.currentAIPct),
        toPixelFn:      fn,
        pixelXs:        pixelXsArr,
      };
    }, [data, width, height, size]);

  // ── Scrub gesture (full-size only) ──────────────────────────────────────
  const { scrubIndex, isScrubbing, gesture } = useScrubGesture({
    pixelXs,
    enabled: size === 'full',
  });

  // Bridge isScrubbing → React state for cursor visibility + legend fade
  const [isScrubActive, setIsScrubActive] = useState(false);
  // Bridge scrubIndex → cursor geometry
  const [scrubCursor, setScrubCursor] = useState<ScrubCursorResult | null>(null);

  // Bridge isScrubbing SharedValue → isScrubActive React state
  useAnimatedReaction(
    () => isScrubbing.value,
    (scrubbing) => {
      runOnJS(setIsScrubActive)(scrubbing);
      // Fire null callback when scrubbing ends
      if (!scrubbing && onScrubChange) runOnJS(onScrubChange)(null);
    },
  );

  // Bridge scrubIndex SharedValue → cursor geometry + onScrubChange callback
  useAnimatedReaction(
    () => scrubIndex.value,
    (idx) => {
      if (idx < 0 || idx >= N) return;
      const pt = data.hourlyPoints[idx];
      const snap = data.coneSnapshots[idx];
      if (!pt || !snap) return;
      const { x, y } = toPixelFn(pt.hoursX, pt.pctY);
      const padding = size === 'full' ? PADDING_FULL : PADDING_COMPACT;
      runOnJS(setScrubCursor)(buildScrubCursor(x, y, height, padding.top));
      if (onScrubChange) {
        runOnJS(onScrubChange)({ pctY: pt.pctY, hoursX: pt.hoursX, upperPct: snap.upperPct, lowerPct: snap.lowerPct });
      }
    },
  );

  // ── Animation: sweep index 0 → N-1 ──────────────────────────────────────
  const animIdxSV = useSharedValue(reducedMotion ? N - 1 : 0);
  const dotScale  = useSharedValue(DOT_RADIUS_BASE);
  const pulsed    = useRef(false);

  const [animState, setAnimState] = useState({
    idx:        reducedMotion ? N - 1 : 0,
    dotOpacity: reducedMotion ? 1     : 0,
  });
  const [dotRadius, setDotRadius] = useState(DOT_RADIUS_BASE);

  useEffect(() => {
    if (!reducedMotion && N > 1) {
      animIdxSV.value = withTiming(N - 1, CONE_ANIMATION);
    }
  }, [N]);

  // Bridge idx → React state
  useAnimatedReaction(
    () => animIdxSV.value,
    (v) => {
      const idx = Math.min(Math.max(Math.floor(v), 0), N - 1);
      // Dot fades in over the last 1.5 index-units of the animation
      const dotOpacity = N <= 1
        ? 1
        : Math.min(1, Math.max(0, (v - (N - 1.5)) / 1.5));
      runOnJS(setAnimState)({ idx, dotOpacity });
    },
  );

  useAnimatedReaction(
    () => dotScale.value,
    (v) => { runOnJS(setDotRadius)(v); },
  );

  // Dot pulse once animation completes
  useEffect(() => {
    if (animState.dotOpacity >= 1 && !pulsed.current) {
      pulsed.current = true;
      dotScale.value = withTiming(DOT_RADIUS_PULSE, { duration: 200 }, () => {
        dotScale.value = withTiming(DOT_RADIUS_BASE, { duration: 200 });
      });
    }
  }, [animState.dotOpacity]);

  // ── Current frame paths ──────────────────────────────────────────────────
  const currentLine       = linePaths[animState.idx]      ?? '';
  const currentCone       = conePaths[animState.idx]      ?? '';
  const currentUpperEdge  = upperEdgePaths[animState.idx] ?? '';
  const currentLowerEdge  = lowerEdgePaths[animState.idx] ?? '';
  const currentProjected  = projectedPaths[animState.idx] ?? '';

  const font = matchFont({ fontFamily: 'System', fontSize: 10 });

  if (width === 0 || height === 0) return null;

  // 75% label position (right side of target line, nudged left)
  const targetLabelPos = toPixelFn(data.weeklyLimit, data.targetPct);

  return (
  <View>
    <GestureDetector gesture={gesture}>
    <Canvas style={{ width, height }}>

      {/* ── CONE SPACE: the probability region ──────────────────────────── */}
      {/* Fill: barely-there deep-space atmosphere */}
      {currentCone !== '' && (
        <Path path={currentCone} color={CONE_SPACE} style="fill" opacity={0.60} />
      )}
      {/* Edge glow: outer aura on boundaries */}
      {currentUpperEdge !== '' && (
        <Path path={currentUpperEdge} color={CONE_EDGE} style="stroke" strokeWidth={5} opacity={0.06} />
      )}
      {currentLowerEdge !== '' && (
        <Path path={currentLowerEdge} color={CONE_EDGE} style="stroke" strokeWidth={5} opacity={0.06} />
      )}
      {/* Edge line: crisp boundary at 25% opacity — ethereal, not dominant */}
      {currentUpperEdge !== '' && (
        <Path path={currentUpperEdge} color={CONE_EDGE} style="stroke" strokeWidth={1} opacity={0.28} />
      )}
      {currentLowerEdge !== '' && (
        <Path path={currentLowerEdge} color={CONE_EDGE} style="stroke" strokeWidth={1} opacity={0.28} />
      )}

      {/* ── 75% TARGET: amber threshold ─────────────────────────────────── */}
      {targetPath !== '' && (
        <>
          {/* Outer glow */}
          <Path path={targetPath} color={AMBER_CORE} style="stroke" strokeWidth={6} opacity={0.07} />
          {/* Mid glow */}
          <Path path={targetPath} color={AMBER_CORE} style="stroke" strokeWidth={3} opacity={0.14} />
          {/* Core line */}
          <Path path={targetPath} color={AMBER_CORE} style="stroke" strokeWidth={1} opacity={0.65} />
        </>
      )}

      {/* ── PROJECTED TREND: indigo dashed — prediction, not fact ────────── */}
      {currentProjected !== '' && (
        <>
          {/* Soft glow behind dashes */}
          <Path path={currentProjected} color={PROJ_COLOR} style="stroke" strokeWidth={4} strokeCap="round" opacity={0.10} />
          {/* Dashes */}
          <Path path={currentProjected} color={PROJ_COLOR} style="stroke" strokeWidth={1.5} strokeCap="round" opacity={0.55} />
        </>
      )}

      {/* ── ACTUAL TRAJECTORY: bright holographic line ───────────────────── */}
      {currentLine !== '' && (
        <>
          {/* Outer aura — wide, very dim */}
          <Path path={currentLine} color={HOLO_GLOW} style="stroke" strokeWidth={10} strokeCap="round" strokeJoin="round" opacity={0.06} />
          {/* Mid bloom */}
          <Path path={currentLine} color={HOLO_GLOW} style="stroke" strokeWidth={5} strokeCap="round" strokeJoin="round" opacity={0.18} />
          {/* Bright core */}
          <Path path={currentLine} color={HOLO_CORE} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" opacity={0.95} />
        </>
      )}

      {/* ── CURRENT POSITION: glowing beacon ─────────────────────────────── */}
      {/* Outer pulse ring */}
      <Circle cx={dotPixel.x} cy={dotPixel.y} r={14} color={HOLO_GLOW} opacity={animState.dotOpacity * 0.05} />
      {/* Mid ring */}
      <Circle cx={dotPixel.x} cy={dotPixel.y} r={8}  color={HOLO_GLOW} opacity={animState.dotOpacity * 0.14} />
      {/* Core dot */}
      <Circle cx={dotPixel.x} cy={dotPixel.y} r={dotRadius} color={HOLO_CORE} opacity={animState.dotOpacity} />

      {/* ── AXIS LABELS (full variant only) ─────────────────────────────── */}
      {size === 'full' && font && (
        <>
          {Y_TICKS.map(({ label, pct }) => {
            const { y } = toPixelFn(0, pct);
            return (
              <Text key={label} x={2} y={y + 4} text={label} font={font} color={colors.textMuted} />
            );
          })}
          {X_TICKS.filter((t) => t <= data.weeklyLimit).map((tick) => {
            const { x } = toPixelFn(tick, 0);
            return (
              <Text key={String(tick)} x={x - 6} y={height - 4} text={`${tick}h`} font={font} color={colors.textMuted} />
            );
          })}
          {/* 75% label on the amber line */}
          <Text
            x={targetLabelPos.x - 32}
            y={targetLabelPos.y - 4}
            text="75% target"
            font={font}
            color={AMBER_CORE}
          />
        </>
      )}

      {/* ── SCRUB CURSOR (full variant only, when actively scrubbing) ────── */}
      {isScrubActive && scrubCursor && (
        <>
          {/* Vertical cursor line */}
          <Path
            path={scrubCursor.linePath}
            color={colors.textMuted}
            opacity={0.5}
            strokeWidth={1}
            style="stroke"
          />
          {/* Dot at snapped data point */}
          <Circle
            cx={scrubCursor.dotX}
            cy={scrubCursor.dotY}
            r={scrubCursor.dotRadius}
            color={HOLO_CORE}
          />
        </>
      )}
    </Canvas>
    </GestureDetector>

    {/* ── LEGEND ROW (full variant only) — fades out during scrub ──────── */}
    {size === 'full' && (
      <View style={[legendStyles.row, { opacity: isScrubActive ? 0 : 1 }]}>
        {/* AI% — cyan dot */}
        <View style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: HOLO_GLOW }]} />
          <RNText style={legendStyles.label}>AI%</RNText>
        </View>
        {/* 75% target — amber dash */}
        <View style={legendStyles.item}>
          <RNText style={[legendStyles.indicator, { color: AMBER_CORE }]}>—</RNText>
          <RNText style={legendStyles.label}>75% target</RNText>
        </View>
        {/* projected — indigo dots */}
        <View style={legendStyles.item}>
          <RNText style={[legendStyles.indicator, { color: PROJ_COLOR }]}>⋯</RNText>
          <RNText style={legendStyles.label}>projected</RNText>
        </View>
      </View>
    )}
  </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicator: {
    fontSize: 12,
  },
  label: {
    fontSize: 10,
    color: '#6B7280', // textMuted equivalent — avoid colors import cycle
  },
});

export default AIConeChart;
