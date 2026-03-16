# 02-dark-glass

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

**02-dark-glass** introduces the dark glass depth system to the Hourglass app's card surfaces and hero panel. The brand guidelines specify a three-tier layered depth system using `expo-blur` BlurView, semi-transparent backgrounds, and a 1px translucent highlight border (`rgba(255,255,255,0.06)`). Currently, `expo-blur` is installed but never used — all cards render as flat opaque `bg-surface` (#16151F) with an opaque border (`#2F2E41`).

This spec updates two components:

1. **`Card.tsx`** — wraps children in a `BlurView` (intensity 40 for base, 60 for elevated) with a semi-transparent inner surface and the brand-spec highlight border. A `glass` boolean prop allows opt-out for surfaces that already have blur (e.g. modal overlays).

2. **`PanelGradient.tsx`** — adds a `BlurView` at intensity 30 as a glass base layer beneath the existing coloured gradient, giving the hero panel a depth foundation consistent with the card treatment.

The root-level `NoiseOverlay` (applied once in `_layout.tsx` at opacity 0.04) already handles the noise texture requirement per brand guidelines — no per-card duplication is needed.

The result is a "dark glass command centre" aesthetic where all card surfaces appear translucent, blurring the content behind them on iOS (and degrading gracefully to a dark overlay on Android < API 31).

---

## Out of Scope

1. **Per-card NoiseOverlay** — **Descoped:** Brand guidelines specify noise texture applied once at root screen level only. `NoiseOverlay` is already wired in `_layout.tsx`. Duplicating it per card is explicitly out of scope.

2. **Modal/sheet blur backgrounds** — **Deferred to 03-motion-universality:** Modal overlays may need separate blur treatment coordinated with animation transitions. Excluded here to avoid interaction conflicts.

3. **Tab bar blur** — **Descoped:** The Expo Router built-in tab bar is retained as-is (per FEATURE.md Out of Scope). No BlurView treatment for the tab navigator.

4. **Custom blur intensity per screen** — **Descoped:** All cards use fixed intensities (40 base, 60 elevated, 30 panel) per brand spec. Dynamic or screen-specific intensity overrides are not part of this spec.

5. **Android shimmer/fallback UI** — **Descoped:** The `expo-blur` dark overlay fallback on Android < API 31 is accepted as the graceful degradation path. No custom Android shimmer or alternative glass effect is implemented.

6. **Blur on list items / row cells** — **Descoped:** Only `Card` (base and elevated) and `PanelGradient` receive BlurView treatment in this spec. Inline list rows, table cells, and other flat containers are not included.

---

## Functional Requirements

### FR1 — Card glass layer (base variant)

The base `Card` component renders a `BlurView` absolutely filling the card bounds, behind a semi-transparent content layer.

**Success Criteria:**
- `Card` wraps its children in an outer `View` with `overflow: "hidden"` and `borderRadius: 16`
- A `BlurView` with `intensity={40}` and `tint="dark"` is absolutely positioned (`StyleSheet.absoluteFill`) inside the outer wrapper
- The inner content `View` uses `backgroundColor: 'rgba(22, 21, 31, 0.75)'` (not the opaque `bg-surface` class)
- The outer wrapper has `borderColor: 'rgba(255, 255, 255, 0.06)'` and `borderWidth: 1` via the `style` prop
- The `GLASS_BASE` style constant is exported from `Card.tsx` for use in tests

### FR2 — Card glass layer (elevated variant)

The `elevated` prop variant uses higher blur intensity and a brighter semi-transparent background.

**Success Criteria:**
- When `elevated={true}`, `BlurView` has `intensity={60}`
- When `elevated={true}`, inner content `View` uses `backgroundColor: 'rgba(31, 30, 41, 0.80)'`
- Border treatment (`rgba(255,255,255,0.06)`) is identical to base variant
- The `GLASS_ELEVATED` style constant is exported from `Card.tsx` for use in tests

### FR3 — Card `glass` opt-out prop

A `glass` boolean prop (default `true`) allows opting out of BlurView rendering for surfaces that already provide blur context.

**Success Criteria:**
- `Card` accepts a `glass?: boolean` prop (defaults to `true`)
- When `glass={false}`, no `BlurView` is rendered
- When `glass={false}`, the card renders a flat `View` with the existing `bg-surface` opaque background
- The `className` prop continues to apply to the outer wrapper in both glass and non-glass modes
- The `style` prop is passed through to the outer wrapper in both modes

### FR4 — PanelGradient glass base layer

The hero panel (`PanelGradient`) gains a `BlurView` glass base layer beneath the existing gradient.

**Success Criteria:**
- `PanelGradient` renders a `BlurView` with `intensity={30}` and `tint="dark"` absolutely positioned at the bottom of its visual stack (behind the gradient)
- The existing gradient and content rendering is unchanged
- The component continues to accept and pass through all existing props

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/components/Card.tsx` | Add BlurView layer, semi-transparent bg, glass prop, updated border |
| `hourglassws/src/components/PanelGradient.tsx` | Add BlurView base layer at intensity 30 |
| `hourglassws/src/components/__tests__/Card.test.tsx` | Update existing tests that break with new implementation; add FR1–FR3 glass tests |
| `hourglassws/src/components/__tests__/PanelGradient.test.tsx` | Add FR4 BlurView tests |

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/BRAND_GUIDELINES.md` | "Surface & Depth — Dark Glass System" section — authoritative style values |
| `hourglassws/src/lib/colors.ts` | surface (#16151F), surfaceElevated hex values for rgba derivation |
| `hourglassws/src/components/NoiseOverlay.tsx` | Confirm root-level noise texture already wired (no card duplication needed) |
| `hourglassws/app/(tabs)/_layout.tsx` | Confirm NoiseOverlay placement at root level |

### Files to Create

None. All work is modifications to existing components and their test files.

### Style Constants

Defined in `Card.tsx` and exported for test access:

```typescript
export const GLASS_BASE = {
  backgroundColor: 'rgba(22, 21, 31, 0.75)',   // surface at 75% opacity
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderWidth: 1,
} as const;

export const GLASS_ELEVATED = {
  backgroundColor: 'rgba(31, 30, 41, 0.80)',   // surfaceElevated at 80% opacity
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderWidth: 1,
} as const;

export const BLUR_INTENSITY_BASE = 40;
export const BLUR_INTENSITY_ELEVATED = 60;
export const BLUR_INTENSITY_PANEL = 30;
```

### Card Component Structure (post-change)

```tsx
// Outer wrapper: handles borderRadius, overflow:hidden, border
<View style={[styles.outer, GLASS_BASE, style]} className={className}>
  {/* Glass blur layer — absolute fill, behind content */}
  <BlurView intensity={BLUR_INTENSITY_BASE} tint="dark" style={StyleSheet.absoluteFill} />
  {/* Inner content: semi-transparent surface */}
  <View style={{ backgroundColor: GLASS_BASE.backgroundColor }}>
    {children}
  </View>
</View>
```

When `glass={false}`:
```tsx
<View className={`bg-surface rounded-2xl border border-border p-5 ${className}`} style={style}>
  {children}
</View>
```

### PanelGradient Component Structure (post-change)

The `BlurView` is inserted as the first absolutely-positioned child inside the `Animated.View`, before the SVG gradient layer:

```tsx
<Animated.View className={combined} style={[{ flex: 1 }, animatedStyle]}>
  {/* Glass base layer — behind gradient */}
  <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
  {/* SVG radial gradient — absolutely positioned behind children */}
  {gradientColors !== null && ( ... )}
  {children}
</Animated.View>
```

### Data Flow

No data flow changes. This is a purely visual/rendering change. No state, no hooks, no API calls.

### Edge Cases

1. **Android < API 31**: `BlurView` renders as a dark semi-transparent overlay (expo-blur fallback). This is acceptable — the `backgroundColor` of the inner View still provides the correct surface tone.

2. **`glass={false}` path**: Renders the legacy flat card. Used for modal overlays or surfaces that already have blur context. Must not apply any GLASS_* styles.

3. **`className` passthrough**: The `className` prop must be applied to the outer wrapper in both glass and non-glass modes. The outer wrapper must still receive `rounded-2xl` and any custom classes passed by the caller.

4. **`style` passthrough**: The `style` prop is spread onto the outer wrapper after the GLASS_BASE/ELEVATED styles to allow overrides. Callers can override borderRadius, padding, etc.

5. **`elevated` + `glass={false}`**: When both `elevated={true}` and `glass={false}`, render flat elevated card (current behavior) — no BlurView, use `bg-surfaceElevated` flat style.

6. **borderRadius on BlurView**: `BlurView` itself does not clip — the outer `View` with `overflow: "hidden"` handles clipping the blur to the card's rounded corners.

### Existing Test Constraints (Breaking Changes)

The existing `Card.test.tsx` has source-analysis tests that will break with the new implementation and must be updated as part of this spec:

1. **`SC1.6 — code does not contain hardcoded hex color values`**: The regex `/#[0-9A-Fa-f]{3,8}\b/` will match the hex component sequences inside rgba strings (e.g. `rgba(22, 21, 31, 0.75)`). The test must be updated: either remove this assertion or replace it with a check that only flags bare 3/6-digit hex literals not inside rgba/hsla functions.

2. **`SC1.2 — source contains border-border class string`**: The new border uses inline `borderColor: 'rgba(255,255,255,0.06)'`. This assertion must be removed; replace with a check that the source contains the rgba border value.

3. **`SC1.6 — code does not import StyleSheet`**: The new implementation uses `StyleSheet.absoluteFill`. This assertion must be removed; the prohibition was specifically against `StyleSheet.create` — `StyleSheet.absoluteFill` is a read-only constant, not a stylesheet definition.

The updated `Card.test.tsx` must mock `expo-blur`:
```typescript
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children ?? null,
}));
```

The updated `PanelGradient.test.tsx` must also mock `expo-blur` (same mock pattern).
