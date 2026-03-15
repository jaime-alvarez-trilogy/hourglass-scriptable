/**
 * useScrubGesture — reusable scrub gesture engine for Skia chart components.
 *
 * Usage in a chart component:
 *   const { scrubIndex, isScrubbing, gesture } = useScrubGesture({ pixelXs });
 *
 *   // Bridge scrubIndex → React state for parent hero value updates:
 *   useAnimatedReaction(
 *     () => scrubIndex.value,
 *     (index) => {
 *       runOnJS(onScrubChange ?? (() => {}))(index === -1 ? null : index);
 *     },
 *   );
 *
 *   return (
 *     <GestureDetector gesture={gesture}>
 *       <Canvas>
 *         {existing chart paths}
 *         {isScrubbing.value && <ScrubCursorPaths ... />}
 *       </Canvas>
 *     </GestureDetector>
 *   );
 */

import { useSharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { GestureType } from 'react-native-gesture-handler';

/**
 * Canonical callback type for onScrubChange prop on scrub-enabled charts.
 * index: null when scrubbing ends (scrubIndex === -1); number when active.
 */
export type ScrubChangeCallback = (index: number | null) => void;

/**
 * nearestIndex — find the index in pixelXs whose value is closest to x.
 *
 * Runs on the Reanimated UI thread (worklet). Pure function with no side effects.
 * Returns -1 for empty arrays (caller should guard before invoking).
 */
export function nearestIndex(x: number, pixelXs: number[]): number {
  'worklet';
  if (pixelXs.length === 0) return -1;
  let best = 0;
  let bestDist = Math.abs(x - pixelXs[0]);
  for (let i = 1; i < pixelXs.length; i++) {
    const d = Math.abs(x - pixelXs[i]);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/**
 * useScrubGesture — creates SharedValues and a Pan gesture for chart scrubbing.
 *
 * @param pixelXs - X pixel positions of each data point (length N)
 * @param enabled - set false for compact/thumbnail charts (default true)
 *
 * Returns scrubIndex (-1 = not scrubbing), isScrubbing, and gesture to attach
 * to GestureDetector wrapping the Skia Canvas.
 */
export function useScrubGesture(options: {
  pixelXs: number[];
  enabled?: boolean;
}): {
  scrubIndex: SharedValue<number>;
  isScrubbing: SharedValue<boolean>;
  gesture: GestureType;
} {
  const { pixelXs, enabled = true } = options;

  const scrubIndex = useSharedValue(-1);
  const isScrubbing = useSharedValue(false);

  const gesture = Gesture.Pan()
    .minDistance(5)
    .enabled(enabled)
    .onBegin(() => {
      'worklet';
      isScrubbing.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      if (pixelXs.length === 0) return;
      scrubIndex.value = nearestIndex(e.x, pixelXs);
    })
    .onFinalize(() => {
      'worklet';
      scrubIndex.value = -1;
      isScrubbing.value = false;
    });

  return { scrubIndex, isScrubbing, gesture };
}
