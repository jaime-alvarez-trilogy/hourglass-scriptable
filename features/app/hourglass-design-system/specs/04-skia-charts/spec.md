# 04-skia-charts

**Status:** Draft
**Created:** 2026-03-14
**Last Updated:** 2026-03-14
**Owner:** @trilogy

---

## Overview

This spec introduces the Skia-based chart component library for the Hourglass app, plus a shared color constants file that bridges design tokens to Skia's canvas API.

**What is being built:**

1. `src/lib/colors.ts` — A JS constants file that re-exports all design token hex values as named exports, mirroring `tailwind.config.js`. This is necessary because Skia draws on a canvas and cannot consume NativeWind `className` strings; it needs raw hex values.

2. `src/components/WeeklyBarChart.tsx` — A Skia canvas component rendering 7 animated bars (Mon–Sun). Uses `Rect` primitives, staggered `withDelay` + `timingChartFill` for bar fill animation. Bar colors reflect state: success (past completed), gold (today), textMuted (future days).

3. `src/components/TrendSparkline.tsx` — A Skia canvas component rendering a smooth bezier line chart across 4–8 data points. Animates the line draw from left to right using `timingChartFill`. No axes or labels (sparkline style); external callers provide context labels.

4. `src/components/AIRingChart.tsx` — A Skia canvas component rendering one or two concentric arc rings, Oura-style. The outer ring shows AI usage %; the optional inner ring shows BrainLift hours as a % of the 5h target. Animates with `timingChartFill`. Inner text (percentage value) is rendered as a NativeWind `MetricValue` positioned absolutely over the ring hole — Skia does not render the label.

5. `src/components/ProgressBar.tsx` — A NativeWind View-based linear progress bar (no Skia). Uses an inner `Animated.View` with `timingChartFill` to animate the fill width from 0 to `progress`. Color is controlled by a Tailwind `bg-*` className passed in as `colorClass` prop.

**How it fits in:**
- `colors.ts` is a prerequisite for all three Skia components in this spec and for any future Skia work.
- `WeeklyBarChart` replaces `DailyBarChart.tsx` (the existing StyleSheet-based view bars) once the hours dashboard is rebuilt in spec 05-hours-dashboard.
- `TrendSparkline` and `AIRingChart` are consumed by spec 06-ai-tab.
- `ProgressBar` is available to all screens (hours dashboard, approvals, AI tab).

**Technology constraints:**
- All Skia components use `@shopify/react-native-skia` primitives (`Canvas`, `Path`, `Rect`).
- Animations use Reanimated v4 `useSharedValue` + `useDerivedValue` to bridge shared values into Skia's rendering thread.
- No springs in charts — `timingChartFill` only (per design system rule: overshoot implies value exceeded target, which is misleading).
- Canvas dimensions are provided by the parent via `onLayout` → `useState`; no hardcoded sizes inside chart components.

---

## Out of Scope

1. **Replacing `DailyBarChart.tsx`** — The existing StyleSheet-based `DailyBarChart.tsx` is left in place. `WeeklyBarChart` is a new component alongside it. The swap of `DailyBarChart` with `WeeklyBarChart` in the hours dashboard screen happens in **Deferred to 05-hours-dashboard**.

2. **Skia text rendering inside chart components** — Drawing percentage labels or axis values directly onto the Skia canvas using `SkiaText` / font APIs is explicitly out of scope. The `AIRingChart` uses a NativeWind overlay for the center percentage. Any chart axis labels are the caller's responsibility. Rationale: Skia font loading in Expo is complex; using React Native text over the canvas is simpler and more accessible.

3. **Interactive/touch charts** — Tap-to-highlight, drag-to-scrub, tooltip popovers on chart bars or sparkline points are out of scope. Charts are purely display components. **Deferred to 05-hours-dashboard** or later enhancement specs.

4. **Dark/light theme switching** — `colors.ts` exports a single (dark) palette only. Dynamic theme switching is **Descoped**: the Hourglass app is dark-only per brand guidelines.

5. **Victory Native / Recharts / other chart libraries** — This spec mandates `@shopify/react-native-skia` only. No third-party chart library abstraction layer is added. Rationale: direct Skia gives pixel-perfect control and Reanimated v4 integration.

6. **Donut chart or pie chart** — The `AIRingChart` is an arc-based ring, not a full pie chart with segments. A general-purpose donut chart component is not built here. **Descoped**: not required by any planned screen.

7. **Animated sparkline dot markers** — `TrendSparkline` does not render dots at each data point. The line draws clean. Adding markers is a future enhancement and **Descoped** from this spec.

8. **Storybook / Docsite integration** — No storybook stories are written for these components. **Deferred to 08-auth-screens** (tools/ux-gauntlet handles visual review at the screen level).

---

## Functional Requirements

---

### FR1: `colors.ts` — Design Token Color Constants

**What:** Create `src/lib/colors.ts` that exports all 18 design token hex values as a typed `colors` const, mirroring `tailwind.config.js`.

**Why:** Skia renders on a canvas and cannot consume NativeWind `className` strings. All Skia components need raw hex values. `colors.ts` is the single source ensuring consistency between the canvas world and the NativeWind world.

**Success Criteria:**
- `colors.ts` exports a `colors` const with all tokens: `background`, `surface`, `surfaceElevated`, `border`, `gold`, `cyan`, `violet`, `success`, `warning`, `critical`, `destructive`, `textPrimary`, `textSecondary`, `textMuted`
- Every exported value exactly matches the corresponding hex string in `tailwind.config.js`
- The file includes a comment warning developers to keep this file in sync with `tailwind.config.js`
- TypeScript type is `as const` for strict inference
- The file has no external dependencies (pure constants, no imports required)

---

### FR2: `WeeklyBarChart` — Animated Skia Bar Chart

**What:** A Skia `Canvas` component rendering 7 bars (Mon–Sun), each bar height proportional to daily hours. Bars animate from height 0 to target using `timingChartFill` with staggered `withDelay`.

**Props:**
```typescript
interface DailyHours {
  day: string;       // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  hours: number;
  isToday?: boolean;
  isFuture?: boolean;
}

interface WeeklyBarChartProps {
  data: DailyHours[];   // up to 7 items
  maxHours?: number;    // Y-axis max; default: Math.max(8, max(data.hours))
  width: number;
  height: number;
}
```

**Success Criteria:**
- Component renders a `Canvas` with correct `width` and `height` without crashing
- Exactly one `Rect` rendered per data item (up to 7)
- Today's bar (`isToday: true`) is colored `colors.gold`
- Future day bars (`isFuture: true`) are colored `colors.textMuted`
- Past/complete day bars (neither flag) are colored `colors.success`
- On mount, each bar animates from y-bottom to target height using `withTiming(..., timingChartFill)`
- Stagger delay per bar: `withDelay(Math.min(index * 50, 300), withTiming(...))`
- `data=[]` renders an empty canvas without crashing
- Bar widths and gaps are computed from `width` prop — no hardcoded pixel values
- `maxHours` defaults to `Math.max(8, Math.max(...data.map(d => d.hours)))` when not provided

---

### FR3: `TrendSparkline` — Animated Skia Line Chart

**What:** A Skia `Canvas` component drawing a smooth bezier line through 4–8 data points. The line animates its draw from left to right on mount using `timingChartFill`.

**Props:**
```typescript
interface TrendSparklineProps {
  data: number[];
  width: number;
  height: number;
  color?: string;         // Default: colors.gold
  strokeWidth?: number;   // Default: 2
}
```

**Success Criteria:**
- Component renders a `Canvas` with correct `width` and `height` without crashing
- A single Skia `Path` renders the line through all data points
- Y-axis is auto-scaled: min(data) maps to near-bottom, max(data) maps to near-top (with padding)
- Single data point renders as a small filled circle (`Circle`) centered on canvas — no crash
- Two data points render as a straight line (degenerate bezier is acceptable)
- On mount, line draws from left to right: a Reanimated shared value animates 0→1 controlling path trimming (via `end` prop on a `PathEffect` or clipping)
- `color` defaults to `colors.gold` when not provided
- `strokeWidth` defaults to `2` when not provided
- Empty `data=[]` renders an empty canvas without crashing

---

### FR4: `AIRingChart` — Animated Skia Concentric Ring Chart

**What:** A Skia `Canvas` component rendering one or two concentric arc rings. The outer ring fills arc proportional to `aiPercent` (0–100). An optional inner ring fills arc proportional to `brainliftPercent`. Both animate using `timingChartFill`. The percentage label is NOT rendered by Skia — the parent overlays a `MetricValue` component.

**Props:**
```typescript
interface AIRingChartProps {
  aiPercent: number;            // 0–100
  brainliftPercent?: number;    // 0–100 (optional second ring)
  size: number;                 // Outer diameter (width = height = size)
  strokeWidth?: number;         // Ring thickness, default: 12
}
```

**Arc math:**
- Full circle = 2π radians, starts at top (−π/2), sweeps clockwise
- Arc sweep = `(percent / 100) * 2π` radians
- Outer ring center radius = `size/2 − strokeWidth/2`
- Inner ring center radius (if brainliftPercent provided) = `size/2 − strokeWidth * 2.5`
- Track ring (background) = `colors.border`, fill arc = `colors.cyan` (AI) / `colors.violet` (BrainLift)

**Success Criteria:**
- Component renders a `Canvas` with `width=size, height=size` without crashing
- `aiPercent=0` → no colored arc rendered for outer ring (only track)
- `aiPercent=100` → full circle arc rendered for outer ring
- `aiPercent=75` → approximately 3/4 circle arc rendered
- Outer ring arc animates from 0 to target on mount using `withTiming(..., timingChartFill)`
- `brainliftPercent` not provided → only one ring rendered
- `brainliftPercent` provided → two concentric rings rendered
- Inner ring (BrainLift) uses `colors.violet` and animates independently
- `strokeWidth` defaults to `12` when not provided
- Component renders inside a `View` with `position: relative`; no MetricValue is rendered by this component itself

---

### FR5: `ProgressBar` — Animated NativeWind Linear Progress Bar

**What:** A View-based linear progress bar (NativeWind, not Skia). An inner View animates its width from 0 to `progress * 100%` using `timingChartFill` on mount or when `progress` changes.

**Props:**
```typescript
interface ProgressBarProps {
  progress: number;        // 0–1
  colorClass?: string;     // Tailwind bg-* class, default: 'bg-success'
  height?: number;         // Default: 4 (pixels)
  className?: string;      // Outer container className
}
```

**Success Criteria:**
- Component renders without crashing
- Outer container has `bg-border` track background and `rounded-full`, respects `height` prop
- `progress=0` → inner fill View has width 0 (empty bar)
- `progress=1` → inner fill View has width 100% of container
- `progress=0.5` → inner fill View animates to 50% of container width
- Reanimated `useSharedValue` + `useAnimatedStyle` drives the fill width
- `width` animates with `withTiming(progress, timingChartFill)` on value change
- `colorClass` defaults to `'bg-success'` when not provided
- `height` defaults to `4` when not provided
- The animated View applies `colorClass` correctly via NativeWind `className`

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/tailwind.config.js` | Source of truth for all color hex values; `colors.ts` must mirror this exactly |
| `hourglassws/src/lib/reanimated-presets.ts` | `timingChartFill` import for all animations |
| `hourglassws/src/components/DailyBarChart.tsx` | Reference for existing bar logic + `DailyHours` data shape; NOT modified |
| `hourglassws/__tests__/components/NativeWindSmoke.test.tsx` | Test pattern to follow: static file analysis for source-level assertions, runtime render assertions for crash-free checks |
| `hourglassws/jest.config.js` | Jest config; `@shopify/react-native-skia` needs adding to `transformIgnorePatterns` |
| `hourglassws/__mocks__/expo-secure-store.ts` | Example mock pattern to follow for Skia mock |

### Files to Create

| File | FR | Description |
|------|----|-------------|
| `hourglassws/src/lib/colors.ts` | FR1 | Color constant exports |
| `hourglassws/src/components/WeeklyBarChart.tsx` | FR2 | Skia bar chart |
| `hourglassws/src/components/TrendSparkline.tsx` | FR3 | Skia sparkline |
| `hourglassws/src/components/AIRingChart.tsx` | FR4 | Skia ring chart |
| `hourglassws/src/components/ProgressBar.tsx` | FR5 | NativeWind progress bar |
| `hourglassws/__mocks__/@shopify/react-native-skia.ts` | FR2–4 | Skia stub mock |
| `hourglassws/__tests__/components/colors.test.ts` | FR1 | Test colors.ts |
| `hourglassws/__tests__/components/WeeklyBarChart.test.tsx` | FR2 | Test WeeklyBarChart |
| `hourglassws/__tests__/components/TrendSparkline.test.tsx` | FR3 | Test TrendSparkline |
| `hourglassws/__tests__/components/AIRingChart.test.tsx` | FR4 | Test AIRingChart |
| `hourglassws/__tests__/components/ProgressBar.test.tsx` | FR5 | Test ProgressBar |

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/jest.config.js` | Add `@shopify/react-native-skia` to `transformIgnorePatterns` allowlist |

### Data Flow

```
tailwind.config.js (color hex values)
       │ (manual sync — developer responsibility)
       ▼
src/lib/colors.ts (colors.background, colors.gold, etc.)
       │
       ├──► WeeklyBarChart.tsx (imports colors.gold, colors.success, colors.textMuted)
       │         │ data prop from: useHoursData().dailyHours (DailyHours[])
       │         │ width/height props from: parent onLayout → useState
       │         │ animations: useSharedValue(0) → withDelay(i*50, withTiming(target, timingChartFill))
       │
       ├──► TrendSparkline.tsx (imports colors.gold as default color)
       │         │ data prop from: usePayments().weeklyTotals.map(w => w.amount)
       │         │ width/height props from: parent onLayout → useState
       │         │ animations: useSharedValue(0) → withTiming(1, timingChartFill) → clip path
       │
       ├──► AIRingChart.tsx (imports colors.cyan, colors.violet, colors.border)
       │         │ aiPercent/brainliftPercent from: useAIData()
       │         │ size prop from: caller (fixed diameter)
       │         │ animations: separate shared values for each ring, timingChartFill
       │
       └──► ProgressBar.tsx (NativeWind View — no Skia, no colors.ts needed)
                 │ progress prop (0–1) from: caller computation
                 │ colorClass prop: Tailwind bg-* class
                 │ animations: useSharedValue → useAnimatedStyle → width: `${progress*100}%`
```

### Skia + Reanimated v4 Integration Pattern

The key integration pattern for Skia + Reanimated v4 (replacing deprecated Skia's own `useValue`):

```typescript
import { Canvas, Rect } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, withDelay, useDerivedValue } from 'react-native-reanimated';
import { timingChartFill } from '@/src/lib/reanimated-presets';

// 1. Drive animation with Reanimated shared value
const progress = useSharedValue(0);

useEffect(() => {
  progress.value = withTiming(1, timingChartFill);
}, []);

// 2. Bridge to Skia via useDerivedValue
const skiaProgress = useDerivedValue(() => progress.value);

// 3. Use skiaProgress inside Skia drawing via useDerivedValue for derived geometry
const skiaHeight = useDerivedValue(() => targetHeight * skiaProgress.value);
```

For `WeeklyBarChart` stagger:
```typescript
// Each bar has its own shared value, staggered withDelay
const h = useSharedValue(0);
useEffect(() => {
  h.value = withDelay(Math.min(index * 50, 300), withTiming(targetHeight, timingChartFill));
}, [targetHeight]);
// In Skia: y = canvasHeight - h.value; height = h.value (Y increases downward)
```

For `TrendSparkline` line draw:
- Build the full bezier `Path` in JS (static, computed from data)
- Animate a clip rect expanding from left to right: `clipWidth` shared value 0 → `width`
- Alternatively use `end` on a Skia `DashPathEffect` — clip approach is simpler

For `AIRingChart` arc:
- Build arc via Skia's `Path` using `addArc(rect, startAngle, sweepAngle)`
- Animate `sweepAngle` shared value 0 → target degrees

### Skia Mock (`__mocks__/@shopify/react-native-skia.ts`)

The mock must be placed in `hourglassws/__mocks__/@shopify/react-native-skia.ts`. Jest auto-hoists files from `__mocks__/` when the matching module is imported.

```typescript
// Stub — Canvas passes through children so React tree is renderable in tests.
// All drawing primitives return null (no canvas output in Jest/node).
const React = require('react');

module.exports = {
  Canvas: ({ children, ...props }: any) =>
    React.createElement('Canvas', props, children),
  Rect: () => null,
  Path: () => null,
  Circle: () => null,
  Line: () => null,
  Group: ({ children }: any) => children,
  useDerivedValue: (fn: () => any) => ({ value: fn() }),
  useSharedValueEffect: () => {},
  Skia: {
    Path: () => ({
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      cubicTo: jest.fn().mockReturnThis(),
      addArc: jest.fn().mockReturnThis(),
      close: jest.fn().mockReturnThis(),
      copy: jest.fn().mockReturnThis(),
    }),
    XYWHRect: jest.fn((x, y, w, h) => ({ x, y, w, h })),
  },
};
```

### jest.config.js Modification

Add `@shopify/react-native-skia` to the `transformIgnorePatterns` allowlist:

```javascript
transformIgnorePatterns: [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia)',
],
```

### Test Strategy

Following the NativeWindSmoke pattern established in spec 01-nativewind-verify:

**Source-level (static) assertions** — read source files with `fs.readFileSync`, assert strings:
- `colors.ts` values match `tailwind.config.js` hex strings
- Skia chart components import from `@/src/lib/colors` (source contains `from.*colors`)
- No hardcoded hex values in chart components (source does not match `/#[0-9A-Fa-f]{6}/`)
- `timingChartFill` is imported and referenced in each chart component
- `withDelay` stagger is present in `WeeklyBarChart` source
- `withTiming` is used (not `withSpring`) in all chart components

**Runtime assertions** — `act(() => create(React.createElement(...)))`:
- Component renders without throwing
- Correct Canvas dimensions (width/height props flow through)
- Edge cases: empty data, boundary values (0, 100, 0.5)

**Note:** With the Skia mock, `Rect`/`Path`/`Circle` return null — rendered tree inspection of drawn primitives is not meaningful. Visual correctness is verified manually in Expo Go or via ux-gauntlet.

### Edge Cases

| Case | Handling |
|------|----------|
| `data=[]` in WeeklyBarChart | Renders empty Canvas (no Rects), no crash |
| `data=[]` in TrendSparkline | Renders empty Canvas (no Path), no crash |
| `data` with 1 point in TrendSparkline | Render Circle at center of canvas instead of Path |
| `aiPercent=0` in AIRingChart | Only track arc rendered, no fill arc (sweep=0) |
| `aiPercent > 100` in AIRingChart | Clamp to 100 (full circle) |
| `progress > 1` in ProgressBar | Clamp to 1 (width 100%) |
| `progress < 0` in ProgressBar | Clamp to 0 (width 0%) |
| `width=0` or `height=0` in chart components | Render empty Canvas without division-by-zero |
| All zeros in TrendSparkline `data` | Render flat line at vertical center |
