# Feature: Cone Chart Baseline Start

## Feature ID

`cone-baseline`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Cone Chart — Start from Last Week's AI% |
| **Contributors** | @trilogy |

## Files Touched

### Logic
- `hourglassws/src/lib/aiCone.ts` (modify — add `baselinePct` param to `computeAICone` + `computeHourlyPoints`)

### Screens
- `hourglassws/app/(tabs)/index.tsx` (modify — pass `previousWeekPercent` to `computeAICone`)
- `hourglassws/app/(tabs)/ai.tsx` (modify — pass last snapshot's `aiPct` to `computeAICone`)

### Tests
- `hourglassws/src/lib/__tests__/aiCone.test.ts` (modify — add baseline tests)

## Feature Overview

### Summary

The AI Trajectory cone chart starts from `(0, 0)` every week — zero hours, zero AI%. When a user ended last week at 81% AI usage, the chart visually plummets to zero on Monday before climbing back up, which looks wrong and loses context. The fix starts the trajectory from last week's final AI% so the chart reads as a continuation rather than a reset.

### Problem

`computeHourlyPoints()` hardcodes the first point as `{ hoursX: 0, pctY: 0 }`. The previous week's AI% is already available in `useAIData().previousWeekPercent` (loaded from AsyncStorage `previousWeekAIPercent` key on hook mount) but is never passed into the cone math.

### Goals

- Cone chart trajectory starts at last week's final AI% instead of 0
- No visual change if no history exists (first week of use) — defaults to 0
- TrendSparkline (12-week AI tab chart) is unaffected — it already shows correct history
- All existing cone math (interpolation, cone bounds, target line) unchanged

### Non-Goals

- Changing how AI% is calculated
- Modifying the cone bounds logic
- Changing the TrendSparkline
- Any visual redesign

## Intended State

When complete, on Monday morning after a week ending at 81%:
- Chart trajectory starts at `(hoursX: 0, pctY: 81)`
- As Monday work is logged, the line reflects the actual running AI% for this week
- If the week trends below 81%, the line descends from 81
- If above, it stays elevated — giving honest context vs last week

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-17 | [01-baseline-start](specs/01-baseline-start/spec-research.md) | Add `baselinePct` param to `computeAICone`; thread from call sites |
