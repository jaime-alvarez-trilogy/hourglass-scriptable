# Feature: Chart Interactions

**Domain:** app
**Feature path:** features/app/chart-interactions
**Status:** Research complete — ready for implementation

---

## Problem Statement

The Hourglass app has rich chart visualizations but they are static — you can look, not touch. This creates several gaps:

1. **No overtime celebration** — when you exceed your weekly limit the UI doesn't reflect the achievement. The panel says "crushed it" but you can't see *how much* overtime you logged.
2. **Charts lack context** — the AI trajectory cone shows lines with no labels (what's gold? what's white?), and the earnings sparkline shows a curve with no values.
3. **No historical exploration** — you can't scrub back through time to see what happened on a specific day/week.
4. **Overview charts are islands** — the 4 metric cards (earnings, hours, AI%, BrainLift) have no time-range control and don't move together.

---

## Goals

1. Make hitting (and exceeding) the weekly limit a **visual celebration** — hero overtime number, white-gold color shift
2. Add **contextual overlays** — faint watermark labels, edge-of-chart value anchors
3. Add **scrub gestures** to the AI trajectory and earnings charts — drag a finger to explore values, hero number updates live
4. Build a **synchronized overview** — 4W/12W toggle, all 4 trend charts scrub in unison

---

## Out of Scope

- Push notifications for overtime milestone
- Server-side recording of overtime
- Scrubbing the WeeklyBarChart on the home screen (7 days only, simple enough as-is)
- Editing past data via scrub interaction

---

## Changelog (Specs)

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-15 | [01-overtime-display](specs/01-overtime-display/spec.md) | Add overtime PanelState, white-gold bar coloring, and hero overtime display — **Complete** |
| 2026-03-15 | [02-watermarks](specs/02-watermarks/spec.md) | WeeklyBarChart hours watermark, AIConeChart legend row, TrendSparkline cap label — **Complete** |
| 2026-03-15 | [06-overview-history](specs/06-overview-history/spec.md) | WeeklySnapshot persistence layer — weekly_history_v2 store, mergeWeeklySnapshot, useWeeklyHistory hook |
| 2026-03-15 | [03-scrub-engine](specs/03-scrub-engine/spec.md) | useScrubGesture hook + nearestIndex worklet + ScrubCursor utility — complete, 40 tests passing |
| 2026-03-15 | [04-ai-scrub](specs/04-ai-scrub/spec.md) | AIConeChart scrub gesture + onScrubChange prop + AI tab hero MetricValue sync — **Complete** |
| 2026-03-15 | [05-earnings-scrub](specs/05-earnings-scrub/spec.md) | TrendSparkline scrub + home earnings hero sync — getWeekLabels utility, gesture layer, hero value swap — **Complete** |
| 2026-03-15 | [07-overview-sync](specs/07-overview-sync/spec.md) | Linked 4-chart overview with 4W/12W toggle, synchronized scrubbing, and week snapshot panel |

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| [01-overtime-display](specs/01-overtime-display/spec.md) | Hero panel overtime mode + bar chart color shift | — | — | S |
| [02-watermarks](specs/02-watermarks/spec.md) | Faint hours watermark + chart edge labels / legend | — | — | S |
| [03-scrub-engine](specs/03-scrub-engine/spec.md) | `useScrubGesture` hook + shared Skia cursor pattern | 04, 05, 07 | — | M |
| 04-ai-scrub | AIConeChart scrub + AI tab hero value sync | — | 03 | M |
| 05-earnings-scrub | TrendSparkline scrub + home earnings hero sync | — | 03 | M |
| [06-overview-history](specs/06-overview-history/spec.md) | Weekly AI%/BrainLift/hours snapshot persistence | 07 | — | M |
| 07-overview-sync | Linked 4-chart overview + 4W/12W toggle | — | 03, 06 | L |

---

## Architecture

### Scrub Engine Pattern (03 → 04, 05, 07)

All interactive charts share the same scrub pattern:

```
GestureDetector (PanGestureHandler)
  └── Skia Canvas
        ├── [existing chart paths]
        └── ScrubCursorLayer (conditional on isScrubbing)
              ├── vertical line
              └── dot at data point

useScrubGesture(data, width) → { scrubIndex, isScrubbing, gesture }
  scrubIndex: SharedValue<number>   (-1 = not scrubbing)
  isScrubbing: SharedValue<boolean>
  gesture: GestureType              (attach to GestureDetector)
```

The parent screen/component subscribes via `onScrubChange` callback (bridged from Reanimated via `useAnimatedReaction → runOnJS`) and updates a hero display value.

### Overview Sync Pattern (06 + 07)

```
OverviewScreen
  activeWeekIndex: number | null     (shared state)
  window: 4 | 12                     (toggle)

  ├── EarningsTrendCard   ← receives activeWeekIndex, calls onScrub
  ├── HoursTrendCard      ← same
  ├── AITrendCard         ← same
  └── BrainLiftTrendCard  ← same

When any card scrubs → setActiveWeekIndex → all cards rerender with cursor
```

### Data Sources

| Feature | Data Available | Notes |
|---------|---------------|-------|
| Overtime hours | `HoursData.overtimeHours` | Already computed in hours.ts |
| Earnings history (12w) | `useEarningsHistory().trend` | Already implemented |
| Hours history (12w) | Derive from weekly snapshots | Need `useWeeklyHistory` |
| AI% history (12w) | Need new persistence | Save on weekly boundary |
| BrainLift history (12w) | Need new persistence | Same flush mechanism |

---

## Key Types

```typescript
// 03-scrub-engine
interface ScrubState {
  scrubIndex: SharedValue<number>;     // -1 when not scrubbing
  isScrubbing: SharedValue<boolean>;
  gesture: GestureType;
}

// 06-overview-history
interface WeeklySnapshot {
  weekStart: string;          // YYYY-MM-DD (Monday)
  hours: number;
  aiPct: number;              // Midpoint (aiPctLow + aiPctHigh) / 2
  brainliftHours: number;
}

// AsyncStorage key: 'weekly_history_v2'
// Shape: WeeklySnapshot[] (12 entries max, rolling window, oldest first)
```

---

## Visual Design

### Overtime State (01)
- Hero number: overtime hours (e.g. `1.5h`) in `#FFF8E7` (warm white-gold, near-white)
- Sub-label: "overtime this week"
- WeeklyBarChart bars beyond weeklyLimit: shift to `#FFF8E7` (same warm white-gold)
- PanelState: new `'overtime'` value (priority above `crushedIt`)

### Watermarks (02)
- Hours watermark: `text-7xl font-display opacity-[0.06]` overlaid on WeeklyBarChart
- AIConeChart legend: two rows below chart — `● AI%` (cyan) and `— 75% target` (amber), `text-xs text-textMuted`
- TrendSparkline cap label: faint right-edge annotation at `maxValue` y-position

### Scrub Cursor
- Vertical line: `colors.textMuted` at 0.5 opacity, 1px wide
- Dot at intersection: 4px radius, filled with line color
- Hero number updates smoothly via `runOnJS` bridge

---

## File Map

```
src/
  lib/
    panelState.ts          ← add 'overtime' state (01)
    aiCone.ts              ← unchanged (math already complete)
  hooks/
    useWeeklyHistory.ts    ← new hook (06)
  components/
    WeeklyBarChart.tsx     ← overtime color + watermark (01, 02)
    AIConeChart.tsx        ← legend overlay + scrub cursor (02, 04)
    TrendSparkline.tsx     ← scrub cursor + cap label (02, 05)
    ScrubCursor.tsx        ← new reusable (03) [Skia paths only, used inside Canvas]
  hooks/
    useScrubGesture.ts     ← new hook (03)
app/
  (tabs)/
    index.tsx              ← overtime hero display + scrub callbacks (01, 04, 05)
    ai.tsx                 ← scrub callback → hero update (04)
    overview.tsx           ← full rewrite with sync + toggle (07)
```
