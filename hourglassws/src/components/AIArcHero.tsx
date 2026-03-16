// AIArcHero.tsx
// FR1 (04-ai-hero-arc): AIArcHero component — 270° arc gauge with bold AI% center
// FR2 (04-ai-hero-arc): BrainLift secondary metric row (label + hours text + ProgressBar)
// FR6 (04-ai-hero-arc): arcPath pure SVG path generator for arc segments
//
// Design system: FEATURE.md "Hero Glass System — Layer 2: Hero Card"
//   Arc gauge replaces two-ring ring hero — single bold 270° arc
//   Arc fill color = ambientColor prop (violet/cyan/warning per AI% tier)
//   Animated fill via AnimatedPath + useSharedValue + withSpring(springPremium)
//   Wrapped in Card component (dark glass, BlurView backdrop)
//
// Arc geometry:
//   START_ANGLE = 135°  (7 o'clock — bottom-left)
//   SWEEP       = 270°
//   END_TRACK   = 405°  (5 o'clock — bottom-right = START + SWEEP)
//   cx = cy = size / 2
//   r = size / 2 - STROKE_WIDTH / 2 - 2  (inset from edge)
//
// Animation:
//   fillEndAngle useSharedValue starts at START_ANGLE
//   useEffect([aiPct]) → withSpring(START_ANGLE + (aiPct/100) × SWEEP, springPremium)
//   AnimatedPath.animatedProps drives the fill arc d= attribute
//
// Fallback note: If useAnimatedProps on SVG Path is incompatible with the project's
//   RN-SVG version at runtime, the arc renders static (no animation) — graceful fallback.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated';
import { springPremium } from '@/src/lib/reanimated-presets';
import { colors } from '@/src/lib/colors';
import Card from '@/src/components/Card';
import ProgressBar from '@/src/components/ProgressBar';

// ─── Exported constants ────────────────────────────────────────────────────────

export const AI_TARGET_PCT = 75;
export const BRAINLIFT_TARGET_HOURS = 5;

// ─── Arc geometry constants ────────────────────────────────────────────────────

const START_ANGLE = 135;   // degrees — 7 o'clock position
const SWEEP = 270;         // degrees — full track sweep
const STROKE_WIDTH = 6;

// ─── AnimatedPath — created once outside component to avoid recreation ────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── FR6: arcPath — pure SVG path string generator ────────────────────────────
//
// Converts (cx, cy, r, startAngleDeg, endAngleDeg) into an SVG path d= string.
// Uses arc flag convention: large arc flag = 1 when sweep > 180°.
// Always clockwise sweep (sweep-flag = 1).
//
// Degenerate case: startAngleDeg === endAngleDeg → returns "M x y" (no arc drawn, no crash).

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const startRad = startAngleDeg * (Math.PI / 180);
  const endRad = endAngleDeg * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const sweepAngle = endAngleDeg - startAngleDeg;
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  // Degenerate case: zero-length arc
  if (startAngleDeg === endAngleDeg) {
    return `M ${x1} ${y1}`;
  }

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIArcHeroProps {
  aiPct: number;               // 0–100, displayed as bold center number
  brainliftHours: number;      // displayed as secondary "X.Xh / 5h"
  deltaPercent: number | null; // week-over-week, null if no prior data
  ambientColor: string;        // arc fill stroke color (violet/cyan/warning)
  size?: number;               // arc diameter in dp, default 180
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIArcHero({
  aiPct,
  brainliftHours,
  deltaPercent,
  ambientColor,
  size = 180,
}: AIArcHeroProps): JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - STROKE_WIDTH / 2 - 2;

  // Animated fill end angle — starts at START_ANGLE (no fill), springs to target
  const fillEndAngle = useSharedValue(START_ANGLE);

  useEffect(() => {
    const targetAngle = START_ANGLE + (aiPct / 100) * SWEEP;
    fillEndAngle.value = withSpring(targetAngle, springPremium);
  }, [aiPct]);

  const animatedFillProps = useAnimatedProps(() => ({
    d: arcPath(cx, cy, r, START_ANGLE, fillEndAngle.value),
  }));

  // Track arc path — static full 270°
  const trackPath = arcPath(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP);

  // Delta badge styling
  const deltaBadgeColor =
    deltaPercent === null
      ? colors.textSecondary
      : deltaPercent > 0
      ? colors.success
      : deltaPercent < 0
      ? colors.critical
      : colors.textSecondary;

  const deltaText =
    deltaPercent === 0
      ? '+0.0%'
      : deltaPercent !== null && deltaPercent > 0
      ? `+${deltaPercent.toFixed(1)}%`
      : deltaPercent !== null
      ? `${deltaPercent.toFixed(1)}%`
      : '';

  // BrainLift progress (clamped 0–1)
  const brainliftProgress = Math.min(1, brainliftHours / BRAINLIFT_TARGET_HOURS);

  return (
    <Card>
      {/* Arc gauge container */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ position: 'relative', width: size, height: size }}>
          {/* SVG arc gauge */}
          <Svg width={size} height={size}>
            {/* Track arc — full 270°, colors.border */}
            <Path
              d={trackPath}
              stroke={colors.border}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
            {/* Fill arc — animated, ambientColor */}
            <AnimatedPath
              animatedProps={animatedFillProps}
              stroke={ambientColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>

          {/* Center text overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 40,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${aiPct}%`}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              AI USAGE
            </Text>
          </View>
        </View>

        {/* Delta badge — top-right of arc area, only when deltaPercent !== null */}
        {deltaPercent !== null && (
          <View
            testID="delta-badge"
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: deltaBadgeColor,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {deltaText}
            </Text>
          </View>
        )}
      </View>

      {/* BrainLift secondary metric — FR2 */}
      <View style={{ marginTop: 16, gap: 4 }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          BRAINLIFT
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            fontVariant: ['tabular-nums'],
          }}
        >
          {`${brainliftHours.toFixed(1)}h / ${BRAINLIFT_TARGET_HOURS}h`}
        </Text>
        <ProgressBar
          progress={brainliftProgress}
          colorClass="bg-violet"
          height={5}
        />
      </View>
    </Card>
  );
}
