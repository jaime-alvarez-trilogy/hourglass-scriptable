# 03-scrub-engine

**Status:** Draft
**Created:** 2026-03-15
**Last Updated:** 2026-03-15
**Owner:** @trilogy

---

## Overview

### What Is Being Built

`03-scrub-engine` delivers the reusable gesture infrastructure that powers interactive scrubbing across all chart components in the Hourglass app. Three downstream specs (04-ai-scrub, 05-earnings-scrub, 07-overview-sync) all require the same drag-to-explore interaction; this spec builds it once.

### Deliverables

1. **`useScrubGesture` hook** (`src/hooks/useScrubGesture.ts`) — accepts `pixelXs` and returns a `{ scrubIndex, isScrubbing, gesture }` bundle. The hook runs entirely on the Reanimated UI thread: gesture coordinates snap to the nearest data-point X via a `'worklet'` function, and the resulting index is stored in a `SharedValue<number>`.

2. **`buildScrubCursor` utility** (`src/components/ScrubCursor.ts`) — pure function (no React component) that converts a snapped pixel coordinate into Skia path data: a vertical line spanning the chart's drawable area and a filled dot centred on the data point.

3. **`onScrubChange` callback bridge pattern** — the standard `useAnimatedReaction → runOnJS` bridge, applied inside each consuming chart, so parent screens can update hero display values via ordinary React state.

### How It Works

```
User drags finger on Canvas
       │
       ▼
GestureDetector (Gesture.Pan, minDistance: 5)
       │  onUpdate worklet
       ▼
nearestIndex(gestureX, pixelXs)   ← UI thread worklet
       │
       ├─ scrubIndex.value = nearest index
       └─ isScrubbing.value = true
       │
       ▼  onEnd
scrubIndex.value = -1
isScrubbing.value = false
       │
       ▼
useAnimatedReaction (inside chart)
       │  runOnJS bridge
       ▼
onScrubChange(index | null)   ← React state in parent screen
```

The cursor renders inside the same Skia Canvas as the chart data, avoiding layout layer complications.

### Non-goals for this spec

Consuming charts (AIConeChart, TrendSparkline) do **not** integrate the hook here — that is the job of specs 04 and 05. This spec only produces the hook, the cursor utility, and their tests.

---

## Out of Scope

1. **AIConeChart scrub integration** — Deferred to 04-ai-scrub. That spec wires `useScrubGesture` into `AIConeChart.tsx` and syncs the AI tab hero value.

2. **TrendSparkline scrub integration** — Deferred to 05-earnings-scrub. That spec wires `useScrubGesture` into `TrendSparkline.tsx` and syncs the home earnings hero value.

3. **Overview synchronized scrubbing** — Deferred to 07-overview-sync. That spec links all four overview trend charts so scrubbing one moves the cursor on all.

4. **WeeklyBarChart scrubbing** — Descoped: the bar chart shows only 7 days and is simple enough to read without a scrub gesture. Feature FEATURE.md explicitly excludes this.

5. **Haptic feedback on cursor snap** — Descoped: the spec-research.md does not include haptics in the design decisions. Can be added as a future enhancement.

6. **Animated cursor transitions** — Descoped: cursor snaps immediately to the nearest data point. Smooth animation between snapped positions is not required and would add complexity on the UI thread.

7. **Multi-touch / pinch gestures** — Descoped: only single-finger pan is in scope. Zoom/pan-to-scroll is not part of the chart-interactions feature.

8. **Accessibility (VoiceOver scrub)** — Descoped: accessibility support for gesture-based scrubbing is a separate concern not addressed in this feature's research.

---

## Functional Requirements

### FR1 — `useScrubGesture` Hook

**Description:** A React hook that encapsulates all gesture logic for chart scrubbing. It creates and returns Reanimated SharedValues and a configured Pan gesture object.

**Interface:**
```typescript
function useScrubGesture(options: {
  pixelXs: number[];   // X pixel position of each data point (length N)
  enabled?: boolean;   // default true — set false on compact/thumbnail charts
}): {
  scrubIndex: SharedValue<number>;    // -1 = not scrubbing; 0..N-1 = active index
  isScrubbing: SharedValue<boolean>;  // true while finger is on screen
  gesture: GestureType;              // attach to <GestureDetector gesture={gesture}>
}
```

**Success Criteria:**
- `scrubIndex.value` initialises to `-1`
- `isScrubbing.value` initialises to `false`
- When `enabled = false`, the returned gesture does not activate on pan (gesture is disabled)
- When `pixelXs = []`, scrubIndex remains -1 and no crash occurs
- When `pixelXs = [50]` (single point), any pan sets scrubIndex to 0
- On `onBegin`: `isScrubbing.value` becomes `true`
- On `onUpdate`: `scrubIndex.value` updates to the nearest index (via worklet)
- On `onEnd` / `onFinalize`: `scrubIndex.value` resets to `-1`, `isScrubbing.value` resets to `false`
- Gesture activates only after `minDistance: 5` to avoid triggering on taps

---

### FR2 — `nearestIndex` Worklet

**Description:** A pure `'worklet'` function that finds the index in `pixelXs` whose value is closest to a given `x` coordinate. Runs on the Reanimated UI thread; must have no side effects.

**Interface:**
```typescript
function nearestIndex(x: number, pixelXs: number[]): number;
// marked 'worklet'
```

**Success Criteria:**
- `nearestIndex(0, [0, 100, 200])` → `0`
- `nearestIndex(90, [0, 100, 200])` → `1` (closer to 100)
- `nearestIndex(200, [0, 100, 200])` → `2`
- `nearestIndex(300, [0, 100, 200])` → `2` (beyond last, clamps to last)
- `nearestIndex(50, [0, 100])` → `0` or `1` (equidistant — either acceptable)
- `nearestIndex(x, [50])` → `0` for any x
- Exported from `useScrubGesture.ts` for unit testing

---

### FR3 — `buildScrubCursor` Utility

**Description:** A pure function (not a React component) that converts a snapped pixel coordinate into cursor geometry for rendering inside a Skia Canvas.

**Interface:**
```typescript
interface ScrubCursorResult {
  linePath: SkPath;   // Vertical line from (scrubX, topPadding) to (scrubX, chartHeight - topPadding)
  dotX: number;
  dotY: number;
  dotRadius: number;  // fixed: 4
}

function buildScrubCursor(
  scrubX: number,
  scrubY: number,
  chartHeight: number,
  topPadding: number,
): ScrubCursorResult
```

**Success Criteria:**
- Returns a `linePath` whose two points share the same X coordinate (`scrubX`)
- Line runs from `y = topPadding` to `y = chartHeight - topPadding`
- `dotX === scrubX`, `dotY === scrubY`
- `dotRadius === 4` (fixed constant)
- `scrubX = 0` → no crash, line rendered at left edge
- `scrubX` equal to chart width → no crash, line rendered at right edge

---

### FR4 — `ScrubChangeCallback` Type Export

**Description:** Exports the canonical callback type that consuming charts use for their `onScrubChange` prop, and documents the standard bridge pattern. The actual wiring lives in specs 04/05/07.

**Type export** (`src/hooks/useScrubGesture.ts`):
```typescript
export type ScrubChangeCallback = (index: number | null) => void;
// index: null when not scrubbing (i.e. scrubIndex was -1)
```

**Bridge pattern (to be copied into consuming charts):**
```typescript
useAnimatedReaction(
  () => scrubIndex.value,
  (index) => {
    runOnJS(onScrubChange ?? (() => {}))(index === -1 ? null : index);
  },
);
```

**Success Criteria:**
- `ScrubChangeCallback` type is exported from `useScrubGesture.ts`
- When `scrubIndex.value === -1`, bridge calls `onScrubChange(null)`
- When `scrubIndex.value === 2`, bridge calls `onScrubChange(2)`
- When `onScrubChange` is `undefined`, no crash (guard with `?? (() => {})`)

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/AIConeChart.tsx` | SharedValue bridge pattern (`useAnimatedReaction → runOnJS`), Skia Canvas structure |
| `hourglassws/src/components/WeeklyBarChart.tsx` | `toPixel` coordinate system pattern |
| `hourglassws/src/components/TrendSparkline.tsx` | `toPixel` coordinate system, compact chart usage |
| `hourglassws/src/lib/colors.ts` | `colors.textMuted` for cursor line color |

### Files to Create

| File | Contents |
|------|---------|
| `hourglassws/src/hooks/useScrubGesture.ts` | Hook + `nearestIndex` worklet + `ScrubChangeCallback` type |
| `hourglassws/src/components/ScrubCursor.ts` | `buildScrubCursor` function + `ScrubCursorResult` interface |
| `hourglassws/src/hooks/__tests__/useScrubGesture.test.ts` | Unit tests for hook initial state and `nearestIndex` all cases |
| `hourglassws/src/components/__tests__/ScrubCursor.test.ts` | Unit tests for `buildScrubCursor` |

### Files to Modify

None. This spec only creates new files. Consuming charts are modified in specs 04, 05, and 07.

---

### Data Flow

```
Parent screen
  │  onScrubChange={(idx) => setScrubIndex(idx)}
  ▼
Chart component
  │  useScrubGesture({ pixelXs, enabled })
  │    → { scrubIndex, isScrubbing, gesture }
  │
  │  useAnimatedReaction(scrubIndex → runOnJS(onScrubChange))
  │
  ▼
<GestureDetector gesture={gesture}>
  <Canvas>
    {/* existing chart paths */}
    {isScrubbing && (
      // buildScrubCursor(scrubX, scrubY, height, padding)
      // → <Path path={linePath} ... />
      // → <Circle cx={dotX} cy={dotY} r={dotRadius} ... />
    )}
  </Canvas>
</GestureDetector>
```

---

### Implementation Notes

#### `useScrubGesture.ts` structure

```typescript
import { useSharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export function nearestIndex(x: number, pixelXs: number[]): number {
  'worklet';
  if (pixelXs.length === 0) return -1;
  let best = 0;
  let bestDist = Math.abs(x - pixelXs[0]);
  for (let i = 1; i < pixelXs.length; i++) {
    const d = Math.abs(x - pixelXs[i]);
    if (d < bestDist) { best = i; bestDist = d; }
  }
  return best;
}

export type ScrubChangeCallback = (index: number | null) => void;

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
```

#### `ScrubCursor.ts` structure

```typescript
import { Skia } from '@shopify/react-native-skia';

export interface ScrubCursorResult {
  linePath: SkPath;
  dotX: number;
  dotY: number;
  dotRadius: number;
}

export function buildScrubCursor(
  scrubX: number,
  scrubY: number,
  chartHeight: number,
  topPadding: number,
): ScrubCursorResult {
  const linePath = Skia.Path.Make();
  linePath.moveTo(scrubX, topPadding);
  linePath.lineTo(scrubX, chartHeight - topPadding);
  return {
    linePath,
    dotX: scrubX,
    dotY: scrubY,
    dotRadius: 4,
  };
}
```

#### Gesture activation guard

The `enabled` prop is passed directly to `Gesture.Pan().enabled(enabled)`. When `false`, RNGH simply does not activate the gesture — no conditional hook calls needed.

---

### Edge Cases

| Scenario | Handling |
|----------|---------|
| `pixelXs = []` | `onUpdate` returns early; `scrubIndex` stays -1 |
| Single data point | `nearestIndex` always returns 0 |
| Gesture interrupted by system (call, notification) | `onFinalize` always fires in RNGH — resets to -1 |
| `scrubX = 0` | Skia path at x=0 is valid; no crash |
| `scrubX = chartWidth` | Skia path at right edge is valid; no crash |
| `onScrubChange` undefined | Guard `?? (() => {})` in `useAnimatedReaction` |
| Hot reload during scrub | SharedValues reset on component remount |

---

### Testing Approach

Tests use `jest` with `react-native-reanimated/mock` and `@shopify/react-native-skia` mock (already configured in the project).

- `nearestIndex` is a plain worklet function — test it as a regular function (no Reanimated test utils needed).
- `useScrubGesture` initial state: render with `renderHook`, assert `.value` on returned SharedValues.
- `buildScrubCursor`: call directly, assert returned coordinates and path existence.
- Gesture simulation (onBegin/onUpdate/onEnd) is not required at this layer — that integration lives in the consuming chart specs.
