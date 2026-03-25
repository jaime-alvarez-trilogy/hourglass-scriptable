# Widget Layout Polish

## Overview

Fix content overflow, visual noise, and data redundancy in the Hourglass iOS and Android home-screen widgets. The current implementation has four verified problem areas: (1) the Small widget on both platforms is cramming too many data points into ~150×150px, (2) the iOS Large widget can clip bottom content without explicit bottom padding, (3) the Android SVG mesh background renders three radial-gradient ellipses that anti-alias poorly on some launchers ("weird circles"), and (4) the "today" row in the Large widget repeats `hoursRemaining` rather than showing meaningful delta context.

## Goals

- Size-appropriate content on Small widgets (hero hours + status only)
- No clipping on iOS Large widget
- Clean, launcher-safe Android background (no overlapping blurred ellipses)
- Today row shows `+X.Xh` / `-X.Xh` vs daily average instead of repeating remaining hours
- Progress bars tall enough to read (≥8px) with clear human-readable labels

## Non-Goals

- Android Large widget (separate feature)
- Dynamic font scaling / accessibility sizing
- Full design-system token unification across both platforms (that's brand-revamp)
- Weekly bar charts in widgets

## Architecture

### Files Modified

| File | Change |
|------|--------|
| `src/widgets/ios/HourglassWidget.tsx` | FR1: trim SmallWidget; FR2: Large padding; FR4: show todayDelta in Large |
| `src/widgets/android/HourglassWidget.tsx` | FR1: trim SmallWidget; FR3: replace mesh SVG; FR5: progress bar |
| `src/widgets/bridge.ts` | FR4: add `todayDelta` computation + null-guard default |
| `src/widgets/types.ts` | FR4: add `todayDelta: string` to WidgetData |

### Data Flow for `todayDelta`

```
HoursData.today (hours worked today)
HoursData.average (average daily hours this week)
  ↓  bridge.ts buildWidgetData()
todayDelta = today - average  → "+1.2h" | "-0.5h" | "" (when average = 0)
  ↓  WidgetData.todayDelta
iOS LargeWidget: "Today 6.2h  +1.2h"
Android MediumWidget: replaces second hoursRemaining occurrence
```

## Spec Units

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-widget-polish | All layout, visual, and data fixes | — | — | M |

## Success Criteria

- [ ] iOS Small shows only `hoursDisplay` + urgency accent + `paceBadge` (no earnings, no hoursRemaining)
- [ ] iOS Large renders without bottom clipping at `padding={16}` (increased from 14)
- [ ] Android mesh SVG replaced with a single top-to-bottom linear gradient (no ellipses)
- [ ] `WidgetData.todayDelta` field added; bridge computes it from `today - average`
- [ ] iOS Large and Android Medium display `todayDelta` alongside today's hours
- [ ] BrainLift progress bar height ≥ 8px; label reads "BrainLift" not "BL"
- [ ] All modified widget tests still pass; snapshot tests updated
