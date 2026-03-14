# Spec Research: 03-base-components

## Problem Context

No components in the codebase use NativeWind className or design tokens. Before rebuilding
the main screens, we need a shared component library that implements the design system
primitives correctly so every screen gets the same look, animations, and token usage.

**Missing components:**
- `Card` — standard surface container with rounded-2xl, border, bg-surface
- `MetricValue` — hero number with Space Grotesk + count-up Reanimated animation
- `SectionLabel` — section header text in Inter semibold
- `PanelGradient` — 5-state gradient hero panel (onTrack/behind/critical/crushedIt/idle)
- `SkeletonLoader` — shimmer placeholder while data loads

All 5 must use only NativeWind className and Reanimated v4 presets (no StyleSheet.create,
no hardcoded hex, no core Animated API).

## Exploration Findings

**Existing components that will be REPLACED (not extended):**
- `src/components/StatCard.tsx` — StyleSheet-based metric card → replaced by Card + MetricValue
- `src/components/AIProgressBar.tsx` — StyleSheet-based → replaced by ProgressBar (spec 04)
- Keep `ApprovalCard.tsx`, `UrgencyBanner.tsx` — screen-specific, updated in their screen specs

**Reanimated v4 CSS Animations syntax (for simple entrances):**
```typescript
// Simple fade-in on mount — no useSharedValue needed:
<Animated.View style={{ animation: 'fadeIn 300ms ease-out' }} />
```

**Reanimated v4 programmatic (for count-up, press feedback):**
```typescript
import { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { timingChartFill, springSnappy } from '@/src/lib/reanimated-presets';

// Count-up on mount:
const displayValue = useSharedValue(0);
useEffect(() => { displayValue.value = withTiming(targetValue, timingChartFill) }, []);
// useAnimatedProps for text node (Reanimated v4 AnimatedText)
```

**PanelGradient gradients (from BRAND_GUIDELINES.md):**
- `onTrack`: deep emerald gradient (success tones)
- `behind`: amber gradient (warning tones)
- `critical`: rose gradient (critical tones)
- `crushedIt`: gold-champagne gradient (celebration)
- `idle`: default surface (bg-surface / #13131A)

NativeWind can't directly apply gradient backgrounds — must use `expo-linear-gradient` or
React Native Skia. Decision: **`expo-linear-gradient`** (already available in Expo SDK 54,
no Skia dependency for non-chart component).

**Count-up animation for MetricValue:**
- Reanimated v4 doesn't animate `Text` children directly (string interpolation)
- Solution: use `useAnimatedProps` + `AnimatedTextInput` (read-only, fontSize 0 caret) OR
  format number in `useDerivedValue` + `useAnimatedProps` with `{text}` prop.
- Preferred: `useAnimatedProps` on `TextInput` (value prop) with `editable={false}`,
  styled with `font-display text-textPrimary` — proven Reanimated v4 pattern.

**Font family in NativeWind:**
- `font-display` → SpaceGrotesk_400Regular
- `font-sans-semibold` → Inter_600SemiBold
- `font-body` → PlusJakartaSans_400Regular
- These are registered in `tailwind.config.js` and loaded in `_layout.tsx`

## Key Decisions

1. **Card** — pure NativeWind wrapper (`bg-surface rounded-2xl border border-border p-5`)
   with optional `elevated` prop that switches to `bg-surfaceElevated`.

2. **MetricValue** — `Animated.View` entrance (CSS animation) wrapping a `TextInput`
   with `useAnimatedProps` for count-up. Props: `value: number`, `unit?: string`,
   `precision?: number` (default 1), `color?: string` (tailwind class for text color).

3. **SectionLabel** — simple `Text` with `text-textSecondary font-sans-semibold text-xs uppercase tracking-widest`.

4. **PanelGradient** — uses `expo-linear-gradient` for gradient fill, `Reanimated`
   wrapping for entrance animation with `springPremium` on state changes.
   Exports `PANEL_GRADIENTS` lookup: `Record<PanelState, {colors: string[], start, end}>`.

5. **SkeletonLoader** — pulsing opacity animation (timingSmooth loop 50%→100% opacity).
   NativeWind `bg-border rounded-lg` base with animated opacity.

6. **File location**: All in `src/components/` alongside existing components.
   No new subdirectory needed at this stage.

## Interface Contracts

```typescript
// src/components/Card.tsx
interface CardProps {
  elevated?: boolean;  // bg-surfaceElevated instead of bg-surface
  className?: string;  // additional tailwind classes (overrides/extends)
  children: React.ReactNode;
}
export default function Card({ elevated, className, children }: CardProps): JSX.Element

// Sources: elevated ← prop, className ← prop, children ← prop
```

```typescript
// src/components/MetricValue.tsx
interface MetricValueProps {
  value: number;          // Target numeric value (animates from 0 on mount)
  unit?: string;          // E.g. "h" for hours, "%" for percentage (appended)
  precision?: number;     // Decimal places (default: 1)
  colorClass?: string;    // Tailwind text color class (default: "text-textPrimary")
  sizeClass?: string;     // Tailwind text size class (default: "text-4xl")
}
export default function MetricValue(props: MetricValueProps): JSX.Element

// Sources: value ← parent prop (from hook data), unit/precision/colorClass ← prop
```

```typescript
// src/components/SectionLabel.tsx
interface SectionLabelProps {
  children: string;
  className?: string;
}
export default function SectionLabel({ children, className }: SectionLabelProps): JSX.Element
```

```typescript
// src/components/PanelGradient.tsx
import type { PanelState } from '@/src/lib/panelState';

interface PanelGradientProps {
  state: PanelState;              // Drives gradient selection
  children: React.ReactNode;
  className?: string;
}
export default function PanelGradient({ state, children, className }: PanelGradientProps): JSX.Element

export const PANEL_GRADIENTS: Record<PanelState, { colors: string[]; start: object; end: object }>;

// Sources: state ← computePanelState() from src/lib/panelState.ts
```

```typescript
// src/components/SkeletonLoader.tsx
interface SkeletonLoaderProps {
  width?: number | string;    // Default: '100%'
  height?: number;            // Default: 20
  rounded?: boolean;          // rounded-full for circular placeholders (default: false)
  className?: string;
}
export default function SkeletonLoader(props: SkeletonLoaderProps): JSX.Element
```

## Test Plan

### Card
- [ ] Renders children without crash
- [ ] Default: bg-surface, rounded-2xl, border-border applied
- [ ] `elevated=true`: bg-surfaceElevated applied instead of bg-surface
- [ ] `className` prop appends to base classes

### MetricValue
- [ ] Renders with value=0: shows "0.0" (or formatted per precision)
- [ ] Renders with value=42.5: count-up animates to "42.5"
- [ ] `unit="h"`: displays "42.5h"
- [ ] `precision=0`: displays "43" (no decimal)
- [ ] Default font: font-display applied (Space Grotesk)
- [ ] Count-up starts from 0 on mount

### SectionLabel
- [ ] Renders text content
- [ ] Applies text-textSecondary, uppercase, tracking-widest

### PanelGradient
- [ ] Renders without crash for all 5 states
- [ ] `state="idle"`: surface background (no gradient)
- [ ] `state="crushedIt"`: gold gradient visible
- [ ] `state="critical"`: rose gradient visible
- [ ] State change triggers springPremium animation

### SkeletonLoader
- [ ] Renders with default dimensions
- [ ] Opacity pulses (animation running)
- [ ] `rounded=true`: rounded-full applied
- [ ] Custom width/height props respected

**Mocks Needed:**
- `computePanelState` not mocked (pure function, can use real)
- `expo-linear-gradient` — mock for jest (module factory: `jest.mock('expo-linear-gradient', ...)`)
- `react-native-reanimated` — already mocked in `__mocks__/` (existing setup)

## Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/reanimated-presets.ts` — spring/timing presets
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/lib/panelState.ts` — PanelState type + computePanelState
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/tailwind.config.js` — all token names
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/BRAND_GUIDELINES.md` — panel gradient colors
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/src/components/StatCard.tsx` — existing pattern (to understand, then replace)
- `/Users/Trilogy/Documents/Claude Code/WS/hourglassws/__mocks__/` — existing mock setup

## Complexity

**M** — 5 new components, Reanimated count-up animation, gradient integration, tests.

## FRs

1. `Card` — NativeWind surface container with elevated variant
2. `MetricValue` — hero number with Reanimated count-up animation from 0
3. `SectionLabel` — uppercase section header, design system typography
4. `PanelGradient` — 5-state gradient hero panel with springPremium transition
5. `SkeletonLoader` — pulsing shimmer placeholder with timingSmooth loop
