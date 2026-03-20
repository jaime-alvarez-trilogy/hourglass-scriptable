# 03-glass-surfaces

**Status:** Draft
**Created:** 2026-03-19
**Last Updated:** 2026-03-19
**Feature:** brand-revamp

---

## Overview

**What:** A new `GlassCard` component built on Skia BackdropFilter that replaces the flat semi-opaque dark surface used in `Card.tsx`. This provides genuine glass-blur depth without UIVisualEffectView — avoiding the SIGKILL framebuffer crash that led to BlurView removal from cards.

**How:** Three layered rendering techniques compose the illusion:

1. **Skia BackdropFilter blur** — `@shopify/react-native-skia` `<BackdropFilter filter={<Blur blur={16} />}>` runs entirely in the Skia C++ pipeline (no UIVisualEffectView, no concurrent GPU framebuffer allocation). The filter refracts whatever is painted behind the card — in practice the `AnimatedMeshBackground` animated mesh gradient from spec 02.

2. **Masked gradient border** — `@react-native-masked-view/masked-view` wraps a `LinearGradient` (violet `#A78BFA` → transparent, 45°) with a mask shaped as the 1.5px perimeter between the outer and inner rounded rectangles. Only this ring is visible, creating a luminous edge.

3. **Inner shadow** — `react-native-inner-shadow` uses Skia canvas to paint:
   - Top edge: `rgba(0,0,0,0.6)` inset dark shadow (simulates thickness)
   - Bottom edge: `rgba(255,255,255,0.08)` highlight (simulates glass bevel)

**Card.tsx delegation:** `Card.tsx` is updated so `glass={true}` (default) delegates to `GlassCard`. `glass={false}` renders the legacy flat `FlatCard` surface. This preserves backward compatibility while making the glass look the new default.

**Pressable variant:** When `pressable={true}`, a Reanimated spring animation scales the card to `0.97` on press-in, returning to `1.0` on press-out (stiffness=300, damping=20).

**Performance constraint:** Maximum 3 overlapping glass layers per viewport. `PanelGradient`'s existing `BlurView` counts as one layer. On Android, `renderToHardwareTextureAndroid={true}` is mandatory. When `layerBudget={false}` the component falls back to the flat surface (no Skia).

**New packages required:**
- `@react-native-masked-view/masked-view` ^0.3.2
- `react-native-inner-shadow` ^1.0.0

---

## Out of Scope

1. **UIVisualEffectView / BlurView on cards** — Descoped permanently. BlurView per-card causes concurrent GPU framebuffer allocation SIGKILL. Skia BackdropFilter is the chosen replacement architecture.

2. **SKSL fragment shaders for glass** — Descoped. Declarative Skia gradient approach chosen for maintainability (see FEATURE.md Out of Scope).

3. **iOS 26 UIGlassEffect / @callstack/liquid-glass** — Descoped. iOS 26 not yet widely available; cross-platform Skia BackdropFilter is the solution.

4. **Runtime layer budget enforcement** — Descoped. The 3-layer maximum is enforced by caller convention, not a runtime guard. `layerBudget={false}` is a manual opt-out, not an auto-detected system. Runtime counting would require a React context that adds complexity without clear benefit given we control the screens.

5. **Android-specific glass implementation branch** — Descoped. Skia BackdropFilter is cross-platform (iOS + Android) without platform branching. The only Android-specific accommodation is `renderToHardwareTextureAndroid={true}` on the outer View.

6. **Animate inner shadow opacity during PressIn** — Deferred to **05-motion-system**. The spec-research notes the inner shadow opacity as a Skia `useSharedValue`, but driving Skia paint values from Reanimated during press requires the full motion system. This spec delivers the static inner shadow; 05-motion will wire the dynamic press enhancement.

7. **GlassCard usage in non-card surfaces** (modal overlays, drawers) — Descoped. `Card.tsx` is the primary consumer. Applying GlassCard to modal surfaces is a separate design decision and not part of the brand-revamp scope for 03.

8. **Gradient border color as design token** — Descoped. `borderAccentColor` is a runtime prop. Mapping it to tailwind tokens is deferred to a future design-token spec, as status-aware border colors are driven by application state, not static tokens.

9. **Screen-level tests for layer count** — Descoped. Screen integration tests for "max 3 GlassCard on screen" are not feasible in the Jest/test-renderer environment. This is enforced by code review convention and documented in spec.

---

## Functional Requirements

### FR1 — GlassCard: Skia BackdropFilter blur layer

**What:** Create `src/components/GlassCard.tsx`. It renders a Skia `<Canvas>` containing a `<BackdropFilter filter={<Blur blur={16} />}>` with a `<RoundedRect>` fill (`rgba(22,21,31,0.6)`) sized to the card via `onLayout` measurement.

**Success Criteria:**
- `GlassCard` renders without crashing when given children
- A Skia `<Canvas>` element is present in the render tree
- A `<BackdropFilter>` is rendered inside the Canvas (testable via tree JSON containing "BackdropFilter")
- Default blur radius is 16; `elevated={true}` uses blur radius 20 (testable via source static check or prop inspection)
- `onLayout` callback sets internal dimensions state (w, h) used to size the Canvas
- `renderToHardwareTextureAndroid={true}` is applied when `Platform.OS === 'android'`
- Children are rendered inside the card content layer
- Component accepts all props from `GlassCardProps` interface without TypeScript error

### FR2 — GlassCard: masked gradient border

**What:** Wrap the Skia canvas in a `<MaskedView>` from `@react-native-masked-view/masked-view`. The mask element is the 1.5px perimeter between the outer rounded rect and an inset rounded rect. The content behind the mask is a `<LinearGradient>` from `expo-linear-gradient` going from `borderAccentColor` (default: `#A78BFA` violet) to `transparent` at 45°.

**Success Criteria:**
- A `MaskedView` component is present in the render tree
- The `LinearGradient` inside MaskedView uses the default violet `#A78BFA` as the start color when `borderAccentColor` is not provided
- When `borderAccentColor` is passed, the gradient start color matches the provided value
- The gradient angle is 45° (testable via source static check for `start`/`end` vectors: `{x:0,y:1}` → `{x:1,y:0}` or equivalent 45° pair)
- The mask uses nested `View`s to create the 1.5px border gap (source check for `borderWidth: 1.5` or `gap: 1.5`)

### FR3 — GlassCard: inner shadow physical depth

**What:** Render an `InnerShadow` component from `react-native-inner-shadow` inside the card. It provides top-edge dark inset (`rgba(0,0,0,0.6)`) and bottom-edge highlight (`rgba(255,255,255,0.08)`) to simulate physical glass thickness.

**Success Criteria:**
- An `InnerShadow` component is present in the render tree
- The component is rendered between the Skia canvas backdrop and the children content
- Source contains `rgba(0,0,0,0.6)` (top shadow) and `rgba(255,255,255,0.08)` (bottom highlight)

### FR4 — GlassCard: pressable spring animation

**What:** When `pressable={true}`, wrap the outer component in `Animated.View` with a `useSharedValue(1)` scale driven by `withSpring(0.97, { stiffness: 300, damping: 20 })` on press-in and `withSpring(1, ...)` on press-out.

**Success Criteria:**
- `pressable={true}` renders a `TouchableOpacity` or `Pressable` (or equivalent gesture handler) that triggers the scale animation
- Press-in drives `scale.value` to 0.97 (testable by calling `onPressIn` and inspecting the shared value)
- Press-out drives `scale.value` back to 1.0
- `pressable={false}` (default) does NOT attach press handlers
- `onPress` callback prop is invoked when the card is tapped

### FR5 — GlassCard: layerBudget fallback

**What:** When `layerBudget={false}`, render a flat surface (identical to the legacy `Card` flat mode: `rgba(22,21,31,0.85)` with `rgba(255,255,255,0.10)` border) — no Skia Canvas, no MaskedView, no InnerShadow.

**Success Criteria:**
- `layerBudget={false}` renders no `Canvas` element in the tree
- `layerBudget={false}` renders no `MaskedView` element in the tree
- `layerBudget={false}` renders no `InnerShadow` element in the tree
- `layerBudget={false}` still renders children
- `layerBudget={true}` (default) renders the full glass treatment

### FR6 — GlassCard: padding and radius props

**What:** `padding` prop controls internal spacing (`'md'` = 20px, `'lg'` = 24px). `radius` prop controls border radius (`'xl'` = 12px, `'2xl'` = 16px, default).

**Success Criteria:**
- Default `padding` is `'md'` (20px internal padding)
- `padding='lg'` applies 24px internal padding (testable via source static check)
- Default `radius` is `'2xl'` (16px border radius)
- `radius='xl'` applies 12px border radius (testable via source static check)

### FR7 — Card.tsx delegation to GlassCard

**What:** Update `Card.tsx` to import and delegate to `GlassCard` when `glass={true}` (the default). When `glass={false}`, render the existing flat surface logic. The external `Card` API is unchanged.

**Success Criteria:**
- `Card` with default props (no `glass` prop) renders a `GlassCard` (Canvas element present in tree)
- `Card glass={false}` renders no Canvas element (flat surface)
- `Card elevated={true}` passes `elevated={true}` to `GlassCard`
- Existing Card.test.tsx tests continue to pass (backward compatibility)
- `GLASS_BASE`, `GLASS_ELEVATED`, `BLUR_INTENSITY_BASE`, `BLUR_INTENSITY_ELEVATED` remain exported from `Card.tsx`

### FR8 — Package installation

**What:** Add `@react-native-masked-view/masked-view` and `react-native-inner-shadow` to `package.json` dependencies and install.

**Success Criteria:**
- `package.json` lists `"@react-native-masked-view/masked-view": "^0.3.2"`
- `package.json` lists `"react-native-inner-shadow": "^1.0.0"`
- Jest mocks exist for both packages (manual `__mocks__` files)
- `package-lock.json` updated to reflect new packages

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/Card.tsx` | Current implementation — will delegate to GlassCard |
| `hourglassws/src/components/__tests__/Card.test.tsx` | Existing tests — must remain passing |
| `hourglassws/src/components/PanelGradient.tsx` | Reference for existing BlurView (counts as 1 of 3 layer budget) |
| `hourglassws/src/components/WeeklyBarChart.tsx` | Reference: `onLayout` + Skia Canvas sizing pattern |
| `hourglassws/src/components/AnimatedMeshBackground.tsx` | Background layer GlassCard blurs (spec 02 output) |
| `hourglassws/__mocks__/@shopify/react-native-skia.ts` | Skia mock — add BackdropFilter, Blur exports |
| `hourglassws/src/lib/colors.ts` | `violetAccent` color constant for default border |
| `hourglassws/tailwind.config.js` | Surface color tokens |
| `hourglassws/package.json` | Add new package dependencies |

### Files to Create

| File | Purpose |
|------|---------|
| `hourglassws/src/components/GlassCard.tsx` | New GlassCard component (FR1–FR6) |
| `hourglassws/src/components/__tests__/GlassCard.test.tsx` | Tests for GlassCard (FR1–FR6) |
| `hourglassws/__mocks__/@react-native-masked-view/masked-view.ts` | Jest mock for MaskedView |
| `hourglassws/__mocks__/react-native-inner-shadow.ts` | Jest mock for InnerShadow |

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/components/Card.tsx` | Import GlassCard; delegate when glass=true (FR7) |
| `hourglassws/src/components/__tests__/Card.test.tsx` | Update: glass=true now renders Canvas; add FR7 delegation tests |
| `hourglassws/__mocks__/@shopify/react-native-skia.ts` | Add: BackdropFilter, Blur exports |
| `hourglassws/package.json` | Add @react-native-masked-view/masked-view, react-native-inner-shadow |

### Component Architecture

```typescript
// GlassCard.tsx full render tree

<Animated.View style={[animatedScale]} renderToHardwareTextureAndroid={Platform.OS === 'android'}>
  <MaskedView
    maskElement={
      <View style={outerRect}>
        <View style={innerRect} /> {/* 1.5px inset = the "hole" */}
      </View>
    }
  >
    {/* Gradient border fills the 1.5px perimeter visible through mask */}
    <LinearGradient
      colors={[borderAccentColor, 'transparent']}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />

    {/* Card body: Skia BackdropFilter + content */}
    <Canvas style={[StyleSheet.absoluteFill]} onLayout={handleLayout}>
      <BackdropFilter filter={<Blur blur={blurRadius} />}>
        <RoundedRect x={0} y={0} width={dims.w} height={dims.h} r={borderRadiusPx}
          color="rgba(22,21,31,0.6)" />
      </BackdropFilter>
    </Canvas>

    <InnerShadow
      shadowColor="rgba(0,0,0,0.6)"
      shadowOffset={{ width: 0, height: 4 }}
      shadowRadius={8}
      style={contentContainer}
    >
      {children}
    </InnerShadow>
  </MaskedView>
</Animated.View>
```

### Key Constants

```typescript
const BLUR_RADIUS = { base: 16, elevated: 20 };
const BORDER_RADIUS = { 'xl': 12, '2xl': 16 };
const PADDING = { 'md': 20, 'lg': 24 };
const BORDER_GAP = 1.5;         // px gap for gradient border mask
const DEFAULT_BORDER_COLOR = '#A78BFA';  // violetAccent

// BackdropFilter fill
const GLASS_FILL = 'rgba(22,21,31,0.6)';  // surface at 60% (lighter than Card's 85% — blur provides depth)

// Inner shadow
const SHADOW_TOP = 'rgba(0,0,0,0.6)';
const SHADOW_BOTTOM = 'rgba(255,255,255,0.08)';
```

### Skia Mock Updates Required

The existing `__mocks__/@shopify/react-native-skia.ts` is missing `BackdropFilter` and `Blur`. These must be added:

```typescript
// Additions to existing mock
BackdropFilter: ({ children, filter }: any) =>
  React.createElement('BackdropFilter', { filter }, children),
Blur: (_props: any) => null,
```

### New Package Mocks

**`__mocks__/@react-native-masked-view/masked-view.ts`:**
```typescript
const React = require('react');
module.exports = {
  __esModule: true,
  default: ({ children, maskElement }: any) =>
    React.createElement('MaskedView', { maskElement }, children),
};
```

**`__mocks__/react-native-inner-shadow.ts`:**
```typescript
const React = require('react');
module.exports = {
  __esModule: true,
  InnerShadow: ({ children, ...props }: any) =>
    React.createElement('InnerShadow', props, children),
};
```

### Data Flow

```
Screen renders Card (glass=true, default)
  └── Card delegates to GlassCard
        └── GlassCard mounts
              ├── onLayout fires → sets dims {w, h}
              ├── Animated.View (scale = 1.0)
              │     └── MaskedView (gradient border mask)
              │           ├── LinearGradient (#A78BFA → transparent, 45°)
              │           └── Canvas (dims.w × dims.h)
              │                 └── BackdropFilter (blur=16)
              │                       └── RoundedRect (glass fill)
              └── InnerShadow → children (padding 20px)
```

### PressIn Animation Flow

```
User touches card (pressable=true)
  → onPressIn: scale.value = withSpring(0.97, {stiffness:300, damping:20})
  → Animated.View scale interpolates 1.0 → 0.97 (Reanimated worklet)
  → onPressOut: scale.value = withSpring(1.0, {stiffness:300, damping:20})
  → onPress: calls props.onPress() if provided
```

### Edge Cases

1. **Zero dimensions on first render** — Canvas must handle `dims.w === 0`. Guard: only render BackdropFilter when `dims.w > 0`. Before layout fires, render a transparent placeholder View of the same size (to trigger layout without flash).

2. **layerBudget=false on low-end Android** — Renders flat View with `GLASS_BASE` colors from Card.tsx. No Skia, no MaskedView, no InnerShadow.

3. **Elevated + pressable combined** — Both props can coexist: `elevated` increases blur radius to 20, `pressable` adds spring animation. No conflict.

4. **borderAccentColor = undefined** — Falls back to `DEFAULT_BORDER_COLOR` (`#A78BFA`) via default prop value.

5. **Children overflow** — `overflow: 'hidden'` is set on the outer container so children cannot bleed outside the rounded rect boundary.

6. **Card.tsx backward compat** — Existing tests check `GLASS_BASE`, `GLASS_ELEVATED`, `BLUR_INTENSITY_BASE`, `BLUR_INTENSITY_ELEVATED` are exported. These exports must remain in `Card.tsx` even after GlassCard delegation. Tests also check `not.toContain('BlurView')` — GlassCard uses BackdropFilter, not BlurView, so this assertion still passes.

### Performance Notes

- `renderToHardwareTextureAndroid={true}` on the outer `Animated.View` is MANDATORY on Android to prevent Skia BackdropFilter compositing artifacts
- Card opacity must remain at 1.0 — sub-1.0 opacity on elements containing BackdropFilter causes RN rendering glitches
- Max 3 overlapping GlassCards per viewport. `PanelGradient`'s BlurView counts as layer 1. Home screen: hero panel (1) + up to 2 stat cards is the typical budget
- `BackdropFilter` must only render when `dims.w > 0` to avoid a zero-size Skia canvas crash on some Android Skia backends

### Interface: GlassCardProps

```typescript
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;                    // NativeWind passthrough for margin/flex
  padding?: 'md' | 'lg';                // p-5 (20px) | p-6 (24px) — spec mandated
  radius?: 'xl' | '2xl';                // 12px | 16px border radius
  elevated?: boolean;                    // 20px blur, surfaceElevated tint
  borderAccentColor?: string;            // gradient border start color (default: #A78BFA)
  pressable?: boolean;                   // enable PressIn scale animation
  onPress?: () => void;
  layerBudget?: boolean;                 // false = render flat (performance fallback)
  style?: ViewStyle;
  testID?: string;
}
```
