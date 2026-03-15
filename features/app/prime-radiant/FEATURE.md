# Feature: Prime Radiant — AI Possibility Cone

## Feature ID

`prime-radiant`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Prime Radiant — AI Possibility Cone |
| **Contributors** | @trilogy |

## Files Touched

### Lib
- `src/lib/aiCone.ts` (new — cone math)

### Components
- `src/components/AIConeChart.tsx` (new — Skia chart, full + compact variants)

### Screens
- `app/(tabs)/ai.tsx` (modify — add full cone chart)
- `app/(tabs)/index.tsx` (modify — add compact cone card)

## Table of Contents

- [Feature Overview](#feature-overview)
- [Intended State](#intended-state)
- [System Architecture](#system-architecture)
- [Changelog of Feature Specs](#changelog-of-feature-specs)

## Feature Overview

### Summary

A trajectory visualization inspired by Asimov's Prime Radiant: a cone of possibilities that shows where your AI percentage is heading, with the cone narrowing as your week progresses and fewer hours remain to influence the outcome.

### Problem Statement

AI percentage is currently shown as a static number with a ring chart. This gives no intuition for how the number will evolve or how much leverage early-week behavior has on the final result. Users don't viscerally understand that a bad Monday makes Friday nearly impossible to fix.

### Goals

- Communicate AI% trajectory visually as the week progresses
- Show the narrowing cone of possible outcomes (best case vs worst case from current position)
- Animate the chart on load to make the progression feel alive
- Surface a compact version on the home tab so users see it the moment they open the app

### Non-Goals

- Historical week-over-week AI% trend (deferred to a future analytics feature)
- Weekly goal setting or AI% targets beyond the 75% reference line
- Notifications when trajectory falls below 75% — separate notifications feature

## Intended State

### AI Tab (full view)

A large `AIConeChart` card sits prominently on the AI tab. It shows:

- **X-axis**: Hours logged this week (0 → weeklyLimit, e.g., 0–40h)
- **Y-axis**: AI percentage (0% → 100%)
- **Actual line** (left of current position): A smooth line tracing the cumulative AI% as each day's hours were logged. Starts at (0, 0) and ends at (hoursLogged, currentAIPct).
- **Possibility cone** (right of current position): A filled area between two curves:
  - Upper bound: if all remaining hours are AI-tagged
  - Lower bound: if all remaining hours are tagged but NOT AI-tagged
- **75% target line**: A subtle horizontal dashed line across the full width
- **Axis labels**: Hour markers on X (0, 10, 20, 30, 40), percentage markers on Y (0%, 50%, 75%, 100%)
- **Current position dot**: A glowing dot at the junction of actual line and cone

**Animation on mount:**
1. The actual line draws from left to right over 1800ms (timingChartFill)
2. Simultaneously, the cone opens from the current position forward
3. The current position dot pulses once it reaches its final position

### Home Tab (compact card)

A compact `AIConeChart` (~100px tall) card between the weekly chart and earnings card. Shows the same chart in miniature — no axis labels, just the line + cone + 75% target line. Tapping it is a no-op (view-only).

### Key Behaviors

1. **Cone narrows over the week**: Monday morning = full width cone (0% to 100% possible). Friday afternoon with 39h logged = near-zero cone (almost certain outcome).
2. **Worst-case is not 0%**: Lower bound is `aiSlots / (taggedSlots + slotsRemaining)` — the current AI slots divided by all tagged slots at week end. Can't go to 0 because past AI work is locked in.
3. **Best-case cap**: Upper bound capped at 100%.
4. **Target visibility**: 75% line is always shown regardless of current AI%.
5. **Reduced motion**: If `useReducedMotion()` is true, chart renders at final state immediately.

## System Architecture

### Component Structure

```
app/(tabs)/ai.tsx
  └── AIConeChart size="full"
        ← computeAICone(dailyBreakdown, weeklyLimit, totalSlots, aiSlots, taggedSlots)

app/(tabs)/index.tsx
  └── AIConeChart size="compact"
        ← same data via useAIData() + useConfig()
```

### Data Flow

```
useAIData()
  └── data.dailyBreakdown[]    ← work diary slots, per day
        ├── .total             ← slots per day → hours via * 10/60
        ├── .aiUsage           ← AI-tagged slots per day
        └── .noTags            ← untagged slots per day

useConfig()
  └── config.weeklyLimit       ← max hours (e.g., 40)

computeAICone(dailyBreakdown, weeklyLimit)
  └── ConeData
        ├── actualPoints[]     ← { hoursX, aiPctY } per day elapsed
        ├── upperBound[]       ← { hoursX, pctY } from current → weeklyLimit
        ├── lowerBound[]       ← { hoursX, pctY } from current → weeklyLimit
        ├── currentHours       ← hours logged so far
        ├── currentAIPct       ← AI% right now
        ├── targetPct          ← 75 (constant)
        ├── weeklyLimit        ← from config
        └── isAchievable       ← whether 75% is still within the upper bound
```

### Cone Math

```
aiSlots    = sum(daily.aiUsage) across all days
taggedSlots = sum(daily.total - daily.noTags) across all days
totalSlots  = sum(daily.total) across all days
hoursLogged = totalSlots * 10 / 60

slotsRemaining = (weeklyLimit - hoursLogged) * 6   // 6 slots per hour

upper(end) = (aiSlots + slotsRemaining) / (taggedSlots + slotsRemaining)  // all remaining = AI
lower(end) = aiSlots / (taggedSlots + slotsRemaining)                      // no more AI tagged

// Both curves are computed as smooth interpolation from currentAIPct → bound at weeklyLimit
```

## Changelog of Feature Specs

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-15 | [01-cone-math](specs/01-cone-math/spec.md) | computeAICone() function, types, unit tests — **Complete** |
| 2026-03-15 | [02-cone-chart](specs/02-cone-chart/spec.md) | AIConeChart Skia component, full + compact variants, animation — **Complete** |
| 2026-03-15 | [03-ai-tab-integration](specs/03-ai-tab-integration/spec.md) | Wire AIConeChart into AI tab (full, Prime Radiant) + home tab compact card (AI TRAJECTORY) |
