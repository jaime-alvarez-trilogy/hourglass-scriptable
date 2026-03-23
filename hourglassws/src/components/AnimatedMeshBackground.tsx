// AnimatedMeshBackground.tsx
// FR1 (02-animated-mesh): full-screen Skia Canvas with 3 orbiting RadialGradient nodes
// FR2 (02-animated-mesh): Reanimated useDerivedValue drives orbital math on UI thread
// FR3 (02-animated-mesh): status-driven Node C color (panelState > earningsPace > aiPct > idle)
// FR4 (02-animated-mesh): BlendMode.Screen creates auroral intersections between nodes
// FR5 (02-animated-mesh): AmbientBackground.tsx delegates to this component (compat)
//
// Architecture:
//   - Single time SharedValue (0→1 over 20s, repeating) drives all 3 node positions
//   - All sine/cosine math runs in useDerivedValue worklets — zero JS-thread work per frame
//   - Node A = Violet (#A78BFA), constant. Node B = Cyan (#00C2FF), constant.
//   - Node C = status color, resolved from props at render time (not per-frame)
//   - Base <Rect> fills canvas with #0D0C14 before node circles (lowest z-order)
//   - Canvas at full opacity always (Skia canvas + style.opacity < 1.0 = rendering glitch risk)
//   - No StyleSheet.create — StyleSheet.absoluteFill constant used (project convention)

import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  RadialGradient,
  vec,
  Paint,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/src/lib/colors';
import type { PanelState } from '@/src/lib/panelState';

// ─── Color resolution (inlined to avoid circular import with AmbientBackground) ─

// Status color map — mirrors AMBIENT_COLORS.panelState in AmbientBackground.tsx
// These must stay in sync with that file's AMBIENT_COLORS constant.
const PANEL_STATE_COLORS: Record<PanelState, string | null> = {
  onTrack:     colors.success,           // #10B981
  behind:      colors.warning,           // #F59E0B
  critical:    colors.critical,          // #F43F5E
  crushedIt:   colors.gold,              // #E8C97A
  aheadOfPace: colors.gold,              // #E8C97A
  overtime:    colors.overtimeWhiteGold, // #FFF8E7
  idle:        null,
};

function resolveEarningsPaceColor(ratio: number): string {
  if (ratio === 0 || ratio >= 0.85) return colors.gold;
  if (ratio >= 0.60) return colors.warning;
  return colors.critical;
}

function resolveAiPctColor(pct: number): string {
  if (pct >= 75) return colors.violet;
  if (pct >= 60) return colors.cyan;
  return colors.warning;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnimatedMeshBackgroundProps {
  /** Current panel state — drives Node C color. Takes priority over earningsPace + aiPct. */
  panelState?: PanelState | null;
  /** Earnings pace ratio (0–1). Used for Node C color when panelState is not provided. */
  earningsPace?: number | null;
  /** AI usage percentage (0–100). Used for Node C color when panelState and earningsPace are not provided. */
  aiPct?: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Node A — Violet (#A78BFA) — constant, always present
// 08-dark-glass-polish: bumped from 0.15 → 0.22 for more visible light bloom behind glass
const NODE_A_INNER = 'rgba(167,139,250,0.22)';

// Node B — Cyan (#00C2FF) — constant, always present
// 08-dark-glass-polish: bumped from 0.15 → 0.22 for more visible light bloom behind glass
const NODE_B_INNER = 'rgba(0,194,255,0.22)';

// Gradient stops arrays — outer stop is always transparent
const NODE_A_COLORS: [string, string] = [NODE_A_INNER, 'transparent'];
const NODE_B_COLORS: [string, string] = [NODE_B_INNER, 'transparent'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts a hex color string (#RRGGBB) + alpha (0–1) to an rgba(...) CSS string.
 * Used to construct the Node C inner gradient stop from a resolved hex color.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Resolves Node C's base hex color from the signal props.
 * Priority: panelState → earningsPace → aiPct → idle (#0D0C14)
 * When the resolved color is #0D0C14, Node C blends invisibly into the base layer.
 *
 * Exported for testing — pure function, no side effects.
 */
export function resolveNodeCColor(
  panelState?: PanelState | null,
  earningsPace?: number | null,
  aiPct?: number | null,
): string {
  if (panelState != null) {
    return PANEL_STATE_COLORS[panelState] ?? colors.background;
  }
  if (earningsPace != null) {
    return resolveEarningsPaceColor(earningsPace);
  }
  if (aiPct != null) {
    return resolveAiPctColor(aiPct);
  }
  return colors.background; // idle — #0D0C14, invisible against base layer
}

// ─── FR1 + FR2 + FR3 + FR4: AnimatedMeshBackground ─────────────────────────

export function AnimatedMeshBackground({
  panelState,
  earningsPace,
  aiPct,
}: AnimatedMeshBackgroundProps): React.JSX.Element {
  const { width: w, height: h } = useWindowDimensions();

  // FR2: Single time SharedValue drives all orbital positions on the UI thread
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(withTiming(1, { duration: 20000 }), -1, false);
  }, []);

  // FR2: Node A — Violet, phase 0
  // cx_A = w * 0.5 + w * 0.30 * sin(time * 2π)
  // cy_A = h * 0.3 + h * 0.20 * cos(time * 2π)
  // At time=0: x = w*0.5, y = h*0.5 (cos(0)=1 → h*0.3 + h*0.20 = h*0.50)
  //
  // Individual cx/cy DerivedValues — passed directly (no .value) to Skia Circle props
  // so Skia can subscribe on the UI thread and animate without JS re-renders per frame.
  const nodeACx = useDerivedValue(() => w * 0.5 + w * 0.30 * Math.sin(time.value * Math.PI * 2));
  const nodeACy = useDerivedValue(() => h * 0.3 + h * 0.20 * Math.cos(time.value * Math.PI * 2));
  // Combined SkPoint DerivedValue for RadialGradient's `c` prop (expects {x, y})
  const nodeACenter = useDerivedValue(() => ({ x: nodeACx.value, y: nodeACy.value }));

  // FR2: Node B — Cyan, phase 2π/3 (120°)
  // cx_B = w * 0.5 + w * 0.30 * sin(time * 2π + 2π/3)
  // cy_B = h * 0.6 + h * 0.20 * cos(time * 2π + 2π/3)
  const nodeBCx = useDerivedValue(() => w * 0.5 + w * 0.30 * Math.sin(time.value * Math.PI * 2 + (2 * Math.PI) / 3));
  const nodeBCy = useDerivedValue(() => h * 0.6 + h * 0.20 * Math.cos(time.value * Math.PI * 2 + (2 * Math.PI) / 3));
  const nodeBCenter = useDerivedValue(() => ({ x: nodeBCx.value, y: nodeBCy.value }));

  // FR2: Node C — Status-driven, phase 4π/3 (240°)
  // cx_C = w * 0.5 + w * 0.25 * sin(time * 2π + 4π/3)
  // cy_C = h * 0.5 + h * 0.15 * cos(time * 2π + 4π/3)
  const nodeCCx = useDerivedValue(() => w * 0.5 + w * 0.25 * Math.sin(time.value * Math.PI * 2 + (4 * Math.PI) / 3));
  const nodeCCy = useDerivedValue(() => h * 0.5 + h * 0.15 * Math.cos(time.value * Math.PI * 2 + (4 * Math.PI) / 3));
  const nodeCCenter = useDerivedValue(() => ({ x: nodeCCx.value, y: nodeCCy.value }));

  // FR3: Resolve Node C color at render time (not per-frame — this is a plain JS value)
  const nodeCHex = resolveNodeCColor(panelState, earningsPace, aiPct);
  // 08-dark-glass-polish: bumped from 0.15 → 0.22 for more visible light bloom behind glass
  const nodeCColors: [string, string] = [hexToRgba(nodeCHex, 0.22), 'transparent'];

  // FR4: Circle radius — large enough for nodes to overlap and create mesh intersections
  const nodeRadius = w * 0.7;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* FR4: Base layer — eggplant fill, lowest z-order */}
      <Rect x={0} y={0} width={w} height={h} color="#0D0C14" />

      {/* FR4: Node A — Violet orbital, BlendMode.Screen */}
      {/* nodeACx/nodeACy are passed directly (no .value) — Skia subscribes to the   */}
      {/* Reanimated SharedValue on the UI thread and redraws without JS per frame.  */}
      <Circle
        cx={nodeACx}
        cy={nodeACy}
        r={nodeRadius}
      >
        <RadialGradient
          c={nodeACenter}
          r={nodeRadius}
          colors={NODE_A_COLORS}
        />
        <Paint blendMode="screen" />
      </Circle>

      {/* FR4: Node B — Cyan orbital, BlendMode.Screen */}
      <Circle
        cx={nodeBCx}
        cy={nodeBCy}
        r={nodeRadius}
      >
        <RadialGradient
          c={nodeBCenter}
          r={nodeRadius}
          colors={NODE_B_COLORS}
        />
        <Paint blendMode="screen" />
      </Circle>

      {/* FR4: Node C — Status-driven orbital, BlendMode.Screen */}
      <Circle
        cx={nodeCCx}
        cy={nodeCCy}
        r={nodeRadius}
      >
        <RadialGradient
          c={nodeCCenter}
          r={nodeRadius}
          colors={nodeCColors}
        />
        <Paint blendMode="screen" />
      </Circle>
    </Canvas>
  );
}

export default AnimatedMeshBackground;
