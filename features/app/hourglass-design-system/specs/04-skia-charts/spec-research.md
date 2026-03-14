# Spec Research: 04-skia-charts

## Problem Context

React Native Skia 2.5.1 is installed but **zero chart components exist**. The existing
`DailyBarChart.tsx` uses View-based bars with StyleSheet — not Skia, no animation, no design
tokens. The AI tab needs a ring chart (like Oura rings), the hours dashboard needs animated
bars, and earnings history needs sparklines.

All chart components must:
- Use `@shopify/react-native-skia` for rendering
- Animate with Reanimated v4 presets (timingChartFill for fills, NO springs for data viz)
- Use design tokens via passed color strings (not className — Skia uses canvas, not NativeWind)
- Never use hardcoded hex — accept color constants from the caller or a shared palette export

## Exploration Findings

**Skia + Reanimated v4 integration pattern:**
```typescript
import { Canvas, Path, Rect, Circle, Line } from '@shopify/react-native-skia';
import { useSharedValue, useAnimatedReaction, useDerivedValue, withTiming } from 'react-native-reanimated';

// Skia's useValue (deprecated) is replaced by Reanimated shared values in v4:
// Pass Reanimated shared values to Skia via `useDerivedValue`
const animatedProgress = useSharedValue(0);
const skiaProgress = useDerivedValue(() => animatedProgress.value);
// Use skiaProgress directly in Skia Path construction via useDerivedValue
```

**Chart components needed:**

1. **`WeeklyBarChart`** — 7 bars (Mon–Sun), each bar height proportional to hours.
   Bars animate left-to-right (staggered withDelay) with timingChartFill.
   Bar color: success for completed days, gold for today, textMuted for future days.

2. **`TrendSparkline`** — simple line chart for 4–8 week earnings or hours trend.
   Y-axis auto-scaled. Line draws from left to right with timingChartFill.
   No axes/labels (sparkline style) — numbers shown externally.

3. **`AIRingChart`** — circular progress ring, Oura-style.
   Shows AI% as arc of `cyan` on `border` track. Inner text shows percentage (MetricValue).
   Optionally 2 rings: outer AI%, inner BrainLift hours as % of 5h target.
   Animates with timingChartFill (NOT spring — arc overshoot implies value exceeded target).

4. **`ProgressBar`** — linear, full-width or fixed-width progress fill.
   Foreground color configurable (success, gold, warning, critical based on PanelState).
   Animates fill with timingChartFill.

**Color access in Skia:**
Skia uses JS color strings (hex). We cannot use NativeWind tokens directly.
Solution: Export a `COLORS` const from `tailwind.config.js` colors, or duplicate the
color constants in a `src/lib/colors.ts` file that mirrors `tailwind.config.js`.
Decision: **Create `src/lib/colors.ts`** that re-exports the color hex values as named
constants, mirroring the tailwind token names. Components import colors from there.

```typescript
// src/lib/colors.ts
export const colors = {
  background: '#0A0A0F',
  surface: '#13131A',
  border: '#2A2A3D',
  gold: '#E8C97A',
  cyan: '#00D4FF',
  // ...all tokens
} as const;
```

This means the color palette has a single source (colors.ts → tailwind.config.js matches it).

**Daily hours data shape (existing):**
```typescript
// From useHoursData / timesheet API
interface DailyHours {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  hours: number;
  date: string; // YYYY-MM-DD
}
```

**Earnings trend data shape (from payments API):**
```typescript
// Aggregated per week by usePayments
interface WeeklyEarnings {
  weekStartDate: string; // YYYY-MM-DD
  amount: number;
}
```

**Stagger pattern for bars:**
- 7 bars, each delayed by `Math.min(index * 50, 300)` ms — from reanimated-presets.ts docs
- Max total stagger: 300ms (bar 7 at 300ms)

## Key Decisions

1. **Skia canvas dimensions**: Charts receive `width` and `height` props (number).
   Parent containers provide dimensions via `onLayout` → `useState`. Avoid hard-coded sizes.

2. **`colors.ts`**: New file at `src/lib/colors.ts` exports all design token hex values as
   named constants. Skia charts import from here. tailwind.config.js stays as the visual
   source of truth — developers must keep these in sync manually (comment warns of this).

3. **WeeklyBarChart**: Renders Mon–Sun (7 bars). Today's bar gets accent color, future days
   get textMuted. Past completed days get success color. Uses `Rect` Skia primitive.

4. **TrendSparkline**: Renders as a `Path` with smooth curve (`cubic` or `quadratic` bezier).
   Points are normalized to canvas height. Minimal labels (just external).

5. **AIRingChart**: Renders using `Path` arc. Two concentric rings for AI% + BrainLift.
   Inner text NOT drawn by Skia (can't use font-display in Skia easily) — instead the ring
   has a hole and MetricValue component renders over it (positioned absolutely).

6. **ProgressBar**: Can be implemented as Skia `Rect` OR as a NativeWind View with animated
   width. Decision: **NativeWind View** for ProgressBar (simpler, no canvas overhead for a
   simple linear fill). Only WeeklyBarChart, TrendSparkline, AIRingChart use Skia.

## Interface Contracts

```typescript
// src/components/WeeklyBarChart.tsx
interface DailyHours {
  day: string;    // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  hours: number;
  isToday?: boolean;
  isFuture?: boolean;
}

interface WeeklyBarChartProps {
  data: DailyHours[];   // 7 items (Mon–Sun)
  maxHours?: number;    // Y-axis max, default: Math.max(8, max(data.hours))
  width: number;        // Canvas width (from onLayout)
  height: number;       // Canvas height (from onLayout)
}
export default function WeeklyBarChart(props: WeeklyBarChartProps): JSX.Element

// Sources: data ← useHoursData().dailyHours, width/height ← onLayout in parent
```

```typescript
// src/components/TrendSparkline.tsx
interface TrendSparklineProps {
  data: number[];         // Array of values (e.g. weekly earnings last 8 weeks)
  width: number;
  height: number;
  color?: string;         // Hex color for line (default: colors.gold)
  strokeWidth?: number;   // Default: 2
}
export default function TrendSparkline(props: TrendSparklineProps): JSX.Element

// Sources: data ← usePayments().weeklyTotals map to amounts, width/height ← onLayout
```

```typescript
// src/components/AIRingChart.tsx
interface AIRingChartProps {
  aiPercent: number;        // 0–100 (AI usage %)
  brainliftPercent?: number; // 0–100 (BrainLift hours as % of 5h target, optional 2nd ring)
  size: number;             // Diameter of outer ring (width = height = size)
  strokeWidth?: number;     // Ring thickness (default: 12)
}
export default function AIRingChart(props: AIRingChartProps): JSX.Element

// Sources: aiPercent ← useAIData().aiPercent, brainliftPercent ← useAIData().brainliftHours / 5 * 100
```

```typescript
// src/components/ProgressBar.tsx
interface ProgressBarProps {
  progress: number;        // 0–1 (fraction filled)
  colorClass?: string;     // Tailwind bg class (default: 'bg-success')
  height?: number;         // Default: 4
  className?: string;
}
export default function ProgressBar(props: ProgressBarProps): JSX.Element

// Sources: progress ← computed ratio (e.g. hoursWorked / weeklyLimit), colorClass ← PanelState mapping
```

```typescript
// src/lib/colors.ts
export const colors: Record<string, string>  // All design token hex values
// NOTE: Must stay in sync with tailwind.config.js colors object
```

## Test Plan

### colors.ts
- [ ] All 18 design token colors exported by name
- [ ] Values match tailwind.config.js exactly

### WeeklyBarChart
- [ ] Renders Canvas without crash
- [ ] 7 bars rendered (one per day)
- [ ] Today's bar uses gold color
- [ ] Future bars use textMuted color
- [ ] Past bars use success color
- [ ] Bars animate from height=0 to target with stagger
- [ ] `data=[]` does not crash

### TrendSparkline
- [ ] Renders path without crash
- [ ] Single data point renders as dot (no line)
- [ ] 2 data points render as straight line
- [ ] Animates line draw on mount

### AIRingChart
- [ ] Renders arc from 0 to aiPercent on mount
- [ ] `aiPercent=0` → empty ring (no arc)
- [ ] `aiPercent=100` → full ring
- [ ] `brainliftPercent` renders as inner ring when provided
- [ ] Animation uses timingChartFill (not spring)

### ProgressBar
- [ ] Renders without crash
- [ ] `progress=0` → empty bar
- [ ] `progress=1` → full bar
- [ ] `progress=0.5` → 50% fill width
- [ ] Animates fill on value change

**Mocks Needed:**
- `@shopify/react-native-skia` — jest mock (`jest.mock('@shopify/react-native-skia', ...)`)
  with Canvas, Path, Rect, Circle stubs returning null
- `react-native-reanimated` — existing mock in `__mocks__/`

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/reanimated-presets.ts` — timingChartFill, timingChartFast
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tailwind.config.js` — all color tokens
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/components/DailyBarChart.tsx` — existing bar logic (reference only, to be replaced)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/useHoursData.ts` — data shape
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/hooks/useAIData.ts` — AI data shape
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/__mocks__/` — existing mock patterns

## Complexity

**L** — 4 chart components + colors.ts utility, Skia + Reanimated integration, canvas sizing,
arc math for ring chart, bezier math for sparkline, stagger animations.

## FRs

1. `colors.ts` — re-export all design token hex values as named JS constants
2. `WeeklyBarChart` — Skia canvas with 7 animated staggered bars (timingChartFill + withDelay)
3. `TrendSparkline` — Skia path line chart, smooth bezier, animated draw
4. `AIRingChart` — Skia arc ring(s) for AI% and optionally BrainLift%, animated fill
5. `ProgressBar` — NativeWind linear fill bar, animated width with timingChartFill
