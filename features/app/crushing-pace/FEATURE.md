# Feature: Crushing Pace State

## Feature ID

`crushing-pace`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Crushing Pace — aheadOfPace Panel State |
| **Contributors** | @trilogy |

## Files Touched

### Logic
- `hourglassws/src/lib/reanimated-presets.ts` (modify — add `"aheadOfPace"` to PanelState union)
- `hourglassws/src/lib/panelState.ts` (modify — add `PACING_CRUSHING_THRESHOLD` + `aheadOfPace` return)

### Screens
- `hourglassws/app/(tabs)/index.tsx` (modify — add to STATE_LABELS, STATE_COLORS, TODAY_BAR_COLORS)

### Components
- `hourglassws/src/components/PanelGradient.tsx` (modify — add to PANEL_GRADIENT_COLORS, PANEL_GRADIENTS, getGlowStyle)
- `hourglassws/src/components/AmbientBackground.tsx` (modify — add to AMBIENT_COLORS.panelState)

### Tests
- `hourglassws/src/lib/__tests__/panelState.test.ts` (modify — add aheadOfPace tests)
- `hourglassws/src/components/__tests__/PanelGradient.test.tsx` (modify — add to allStates arrays + test cases)
- `hourglassws/src/components/__tests__/AmbientBackground.test.tsx` (modify — add test case, update length assertion)

## Feature Overview

### Summary

The This Week screen's pacing badge currently only shows `CRUSHED IT` when you've hit the exact 40h weekly limit — a state rarely seen mid-week. When a user is significantly ahead of their expected pace (e.g., 13h logged on Monday), the badge shows `ON TRACK`, which undersells the achievement. Adding an `aheadOfPace` state that fires at ≥150% of expected pace gives appropriate positive feedback mid-week.

### Goals

- New `aheadOfPace` panel state fires when `pacingRatio ≥ 1.5` (150% of expected hours)
- Displays as badge label **"CRUSHING IT"** in gold
- Gold gradient, gold ambient background, gold bar chart color — cohesive with `crushedIt`
- Existing `crushedIt` (hit 40h) and `overtime` (exceeded 40h) unaffected
- All state maps exhaustively updated; no TypeScript errors

### Non-Goals

- Changing the `crushedIt` or `overtime` states
- Any visual redesign
- Adding animations specific to the new state
- Changing any other tab

## Intended State

Panel state priority order (after this feature):

```
weeklyLimit ≤ 0               → idle
hours > weeklyLimit           → overtime
hours ≥ weeklyLimit           → crushedIt
days < 1 && hours === 0       → idle
expectedHours === 0           → onTrack
pacingRatio ≥ 1.50            → aheadOfPace   ← NEW
pacingRatio ≥ 0.85            → onTrack
pacingRatio ≥ 0.60            → behind
otherwise                     → critical
```

### Example Triggers (40h week)

| When | Expected | Actual | Ratio | Badge |
|------|----------|--------|-------|-------|
| Mon EOD (1.0d) | 8h | 12h | 150% | CRUSHING IT |
| Mon EOD (1.0d) | 8h | 10h | 125% | ON TRACK |
| Tue EOD (2.0d) | 16h | 24h | 150% | CRUSHING IT |
| Wed noon (2.5d) | 20h | 30h | 150% | CRUSHING IT |
| Any time | 40h | 40h | — | CRUSHED IT |
| Any time | 40h | 45h | — | OVERTIME |

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-17 | [01-ahead-of-pace-state](specs/01-ahead-of-pace-state/spec-research.md) | Add aheadOfPace state across all panel state maps |
