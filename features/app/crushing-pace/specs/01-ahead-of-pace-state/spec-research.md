# Spec Research: 01-ahead-of-pace-state

## Spec

`features/app/crushing-pace/specs/01-ahead-of-pace-state`

## Problem

`computePanelState` has no state for being significantly ahead of pace mid-week. At 13h on Monday with a 40h week, pacingRatio = 163% but the badge shows `ON TRACK`. The new `aheadOfPace` state fires at ≥150% and displays "CRUSHING IT".

## Exploration Findings

### All Files That Must Change

| File | What Changes |
|------|-------------|
| `src/lib/reanimated-presets.ts` (line 170) | Add `\| "aheadOfPace"` to PanelState union type |
| `src/lib/panelState.ts` (lines 4, 29–61) | Add `PACING_CRUSHING_THRESHOLD = 1.5` constant + return `'aheadOfPace'` |
| `app/(tabs)/index.tsx` (lines 52–79) | Add to STATE_LABELS, STATE_COLORS, TODAY_BAR_COLORS |
| `src/components/PanelGradient.tsx` (lines 42–108) | Add to PANEL_GRADIENT_COLORS, PANEL_GRADIENTS, getGlowStyle |
| `src/components/AmbientBackground.tsx` (lines 38–58) | Add to AMBIENT_COLORS.panelState |
| `src/lib/__tests__/panelState.test.ts` | Add aheadOfPace test cases |
| `src/components/__tests__/PanelGradient.test.tsx` (lines 65, 234) | Add `'aheadOfPace'` to both allStates arrays |
| `src/components/__tests__/AmbientBackground.test.tsx` (lines 148–249) | Add test case, update length assertion 6→7 |

### Current PanelState type (reanimated-presets.ts line 170)

```typescript
export type PanelState = "onTrack" | "behind" | "critical" | "crushedIt" | "idle" | "overtime";
```

### Current computePanelState priority chain (panelState.ts)

```typescript
if (weeklyLimit <= 0) return 'idle';
if (hours > weeklyLimit) return 'overtime';
if (hours >= weeklyLimit) return 'crushedIt';
if (days < 1 && hours === 0) return 'idle';
if (expectedHours === 0) return 'onTrack';
const pacingRatio = hours / expectedHours;
if (pacingRatio >= PACING_ON_TRACK_THRESHOLD) return 'onTrack';  // 0.85
if (pacingRatio >= PACING_BEHIND_THRESHOLD) return 'behind';      // 0.60
return 'critical';
```

### Existing color tokens (colors.ts)

| Token | Hex | Used by |
|-------|-----|---------|
| `colors.gold` | `#E8C97A` | crushedIt ambient, earnings |
| `colors.overtimeWhiteGold` | `#FFF8E7` | overtime |
| `colors.success` | `#10B981` | onTrack |
| `colors.warning` | `#F59E0B` | behind |
| `colors.critical` | `#F43F5E` | critical |

**No new color token needed** — `aheadOfPace` uses `colors.gold` throughout for visual cohesion with `crushedIt`.

## Key Decisions

### 1. Threshold: 1.5 (150% of expected)

```typescript
export const PACING_CRUSHING_THRESHOLD = 1.5;
```

40h week examples:
- Mon EOD: expected 8h → need 12h to trigger
- Tue EOD: expected 16h → need 24h to trigger
- Wed noon: expected 20h → need 30h to trigger

### 2. Priority: after crushedIt, before onTrack

`aheadOfPace` is a pacing state — it sits between the "goal achieved" states (`crushedIt`/`overtime`) and `onTrack`. If you've hit the weekly limit, those states take precedence.

```typescript
// NEW position in priority chain
if (pacingRatio >= PACING_CRUSHING_THRESHOLD) return 'aheadOfPace';  // ← insert here
if (pacingRatio >= PACING_ON_TRACK_THRESHOLD) return 'onTrack';
```

### 3. Color: gold throughout

All visual representations use `colors.gold` (#E8C97A) — same as `crushedIt`. Both states are achievement states; consistent gold treatment reinforces that they're in the same family.

| Map | Value |
|-----|-------|
| `STATE_LABELS` | `'CRUSHING IT'` |
| `STATE_COLORS` | `'text-gold'` |
| `TODAY_BAR_COLORS` | `colors.gold` |
| `PANEL_GRADIENT_COLORS` | `{ inner: '#E8C97A', outer: 'transparent' }` |
| `PANEL_GRADIENTS` | `{ colors: ['#E8C97A59', 'transparent'], ... }` (same alpha as crushedIt) |
| `getGlowStyle` | `{ shadowColor: '#E8C97A', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset }` |
| `AMBIENT_COLORS.panelState` | `colors.gold` |

## Interface Contracts

### Updated `PanelState` type

```typescript
// reanimated-presets.ts
export type PanelState = "onTrack" | "behind" | "critical" | "crushedIt" | "idle" | "overtime" | "aheadOfPace";
```

**Source:** New value — computed by `computePanelState` when `pacingRatio >= 1.5`

### Updated `computePanelState(hoursWorked, weeklyLimit, daysElapsed): PanelState`

**New constant:**
```typescript
export const PACING_CRUSHING_THRESHOLD = 1.5;
// Source: product decision — 150% of expected pace
```

**New return path:**
```typescript
if (pacingRatio >= PACING_CRUSHING_THRESHOLD) return 'aheadOfPace';
// Source: computed — pacingRatio = hoursWorked / ((daysElapsed / 5) * weeklyLimit)
```

**Signature:** unchanged. Return type expands from 6 → 7 possible values.

### Maps in `index.tsx`

All are `Record<PanelState, T>` — TypeScript will error if `aheadOfPace` is missing after the type update. All three maps require a new entry.

### `PANEL_GRADIENT_COLORS` and `PANEL_GRADIENTS` in `PanelGradient.tsx`

Both are `Record<PanelState, ...>` — same TypeScript enforcement. Two entries needed.

### `AMBIENT_COLORS.panelState` in `AmbientBackground.tsx`

Cast as `Record<PanelState, string | null>` — TypeScript enforces completeness. One entry needed.

## Test Plan

### FR1: `computePanelState` returns `'aheadOfPace'` at ≥150% pace

**Happy path:**
- [ ] `(12, 40, 1.0)` → `'aheadOfPace'` (Mon EOD, 12h = 150% of 8h expected)
- [ ] `(24, 40, 2.0)` → `'aheadOfPace'` (Tue EOD, 24h = 150% of 16h expected)
- [ ] `(20, 40, 1.667)` → `'aheadOfPace'` (ratio exactly 1.5)

**Threshold boundaries:**
- [ ] `pacingRatio = 1.5` exactly → `'aheadOfPace'`
- [ ] `pacingRatio = 1.499` → `'onTrack'` (just below threshold)
- [ ] `pacingRatio = 2.0` → `'aheadOfPace'` (well above)

**Priority preserved:**
- [ ] `(45, 40, 1.0)` → `'overtime'` (overtime takes priority over aheadOfPace)
- [ ] `(40, 40, 1.0)` → `'crushedIt'` (crushedIt takes priority over aheadOfPace)
- [ ] `(0, 40, 0.5)` → `'idle'` (idle guard still fires for days < 1 + no hours)

**No regression:**
- [ ] `PACING_CRUSHING_THRESHOLD` is exported and equals `1.5`
- [ ] All existing state tests still pass (onTrack, behind, critical, crushedIt, idle, overtime)

### FR2: All state maps include `aheadOfPace`

**STATE_LABELS:**
- [ ] `STATE_LABELS['aheadOfPace'] === 'CRUSHING IT'`

**STATE_COLORS:**
- [ ] `STATE_COLORS['aheadOfPace'] === 'text-gold'`

**TODAY_BAR_COLORS:**
- [ ] `TODAY_BAR_COLORS['aheadOfPace'] === colors.gold`

**PanelGradient:**
- [ ] `PANEL_GRADIENT_COLORS['aheadOfPace']` is non-null (has inner + outer)
- [ ] `PANEL_GRADIENTS['aheadOfPace']` has a `colors` array of length 2
- [ ] `getGlowStyle('aheadOfPace')` returns a non-empty shadow style
- [ ] `PanelGradient` renders without error when `state="aheadOfPace"`

**AmbientBackground:**
- [ ] `AMBIENT_COLORS.panelState['aheadOfPace']` is non-null
- [ ] `getAmbientColor({ type: 'panelState', state: 'aheadOfPace' })` returns a string
- [ ] `Object.keys(AMBIENT_COLORS.panelState)` has length 7 (was 6)
- [ ] `Object.keys(AMBIENT_COLORS.panelState)` contains `'aheadOfPace'`

## Files to Reference

- `hourglassws/src/lib/reanimated-presets.ts` — PanelState type (line 170)
- `hourglassws/src/lib/panelState.ts` — computePanelState + constants
- `hourglassws/src/lib/__tests__/panelState.test.ts` — existing test structure
- `hourglassws/app/(tabs)/index.tsx` — 3 maps (lines 52–79)
- `hourglassws/src/components/PanelGradient.tsx` — 2 maps + switch (lines 42–108)
- `hourglassws/src/components/AmbientBackground.tsx` — AMBIENT_COLORS map (lines 38–58)
- `hourglassws/src/components/__tests__/PanelGradient.test.tsx` — allStates arrays (lines 65, 234)
- `hourglassws/src/components/__tests__/AmbientBackground.test.tsx` — state tests (lines 148–249)

## Out of Scope

- Visual animation for the new state
- Any changes to the AI tab, Overview tab, or Approvals tab
- Changing `crushedIt` or `overtime` behavior
- New color tokens — `colors.gold` reused throughout
