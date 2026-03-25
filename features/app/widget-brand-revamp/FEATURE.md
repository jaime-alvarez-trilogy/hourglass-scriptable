# Widget Brand Revamp

## Problem

The Hourglass home screen widget looks stale next to the app. The app has evolved a sophisticated design system (orbital mesh background, glass cards with backdrop blur, brand color semantics, animated urgency states, pace badges, trend history) while the widget remains visually flat and data-sparse. The widget shows the right numbers but communicates no context: no status, no pace signal, no trend, no urgency escalation.

## Goal

Bring the Expo app widgets (iOS + Android) into full alignment with the Hourglass design system and make them equally information-dense — a glanceable dashboard that surfaces the same urgency, performance, and AI signals the app shows, constrained to what WidgetKit and Android widget APIs allow.

## Success Criteria

- **Visual**: widget background uses simulated orbital mesh gradient (violet + cyan + state-color nodes); cards rendered as frosted-glass panels with gradient border; brand typography hierarchy (Space Grotesk bold heroes, Inter labels)
- **Pace badge**: small/medium/large all show `ON TRACK` / `BEHIND PACE` / `CRUSHED IT` / `CRITICAL` badge in the correct semantic color
- **Manager urgency**: when `urgency >= high` and `isManager`, the mesh shifts to red/amber tint, deadline countdown is the hero element (not a footnote)
- **Trend deltas**: medium and large show `+2.1h` / `-$84` vs last week, drawn from `WeeklySnapshot` history
- **BrainLift target bar**: large widget shows filled progress bar `3.2h / 5h` with violet fill; medium shows `3.2h / 5h` text label
- **All sizes ship**: systemSmall, systemMedium, systemLarge, accessoryRectangular/Circular/Inline updated for iOS; Android widget updated to match brand

## Scope

### In Scope
- `src/widgets/types.ts` — extend `WidgetData` with `paceBadge`, `weekDeltaHours`, `weekDeltaEarnings`, `brainliftTarget`
- `src/widgets/bridge.ts` — extend `buildWidgetData()` + `updateWidgetData()` to compute and forward new fields; full redesign of `WIDGET_LAYOUT_JS` (iOS rendering)
- `src/hooks/useWidgetSync.ts` — accept optional `prevWeekSnapshot` param
- `src/lib/widgetBridge.ts` — forward `prevWeekSnapshot` from `CrossoverSnapshot` (background path)
- `app/(tabs)/_layout.tsx` — wire `useWeeklyHistory()` and pass `prevWeekSnapshot` to `useWidgetSync`
- `src/widgets/android/HourglassWidget.tsx` — brand redesign for Android

### Out of Scope
- Interactive widget buttons (approve/reject from widget) — deferred to a separate spec
- Lock screen complications redesign beyond cosmetic color fixes — deferred
- Widget configuration UI (size/role picker) — deferred
- Scriptable `hourglass.js` — separate codebase, separate effort

## Architecture

### Data Flow (updated)
```
useHoursData + useAIData + useApprovalItems + useMyRequests + useWeeklyHistory
  ↓  (_layout.tsx)
useWidgetSync(hoursData, aiData, pendingCount, config, approvalItems, myRequests, prevWeekSnapshot)
  ↓
bridge.updateWidgetData(..., prevWeekSnapshot?)
  ↓
buildWidgetData() — computes paceBadge, weekDelta{Hours,Earnings}, brainliftTarget
  ↓
WidgetData written to:
  iOS: UserDefaults App Group via WIDGET_LAYOUT_JS + timeline entries
  Android: AsyncStorage 'widget_data'
```

### New WidgetData Fields
| Field | Type | Source |
|-------|------|--------|
| `paceBadge` | `'crushed_it' \| 'on_track' \| 'behind' \| 'critical' \| 'none'` | computed from hoursData.total vs expectedHours |
| `weekDeltaHours` | `string` | `"+2.1h"` \| `"-3.4h"` \| `""` — delta vs prevWeekSnapshot.hours |
| `weekDeltaEarnings` | `string` | `"+$84"` \| `"-$136"` \| `""` — delta vs prevWeekSnapshot.earnings |
| `brainliftTarget` | `string` | always `"5h"` — weekly BrainLift target constant |

### paceBadge Logic
```
if hoursData is null → 'none'
if hoursData.overtimeHours > 0 → 'crushed_it'
workdaysElapsed = number of Mon–Fri days completed this week (Mon=1..Fri=5; Sat/Sun = 5 full)
expectedHours = weeklyLimit × (workdaysElapsed / 5)
ratio = hoursData.total / expectedHours
if ratio >= 0.9 → 'on_track'
if ratio >= 0.7 → 'behind'
else → 'critical'
weekend edge case: if Saturday or Sunday, compare total vs weeklyLimit directly
```

### iOS Rendering Constraints
`WIDGET_LAYOUT_JS` is a JS string evaluated in the widget extension's JSContext. Available SwiftUI-like primitives from `expo-widgets`: `ZStack`, `VStack`, `HStack`, `Text`, `Spacer`, `Rectangle`, `Circle`, `Image`, `ContainerBackground`, `LinearGradient`, `RadialGradient`. No backdrop blur, no Skia Canvas, no animations.

Mesh simulation approach: `ZStack` base with 3 overlapping `Circle()` shapes filled with `RadialGradient` at low opacity (0.15) in brand colors (violet, cyan, state-color). This approximates the app's orbital mesh at widget quality.

### Android Rendering Constraints
`react-native-android-widget` supports `FlexWidget`, `TextWidget`, `SvgWidget`, `ImageWidget`, `RowWidget`, `ColumnWidget`. Gradients via `SvgWidget` with SVG linearGradient fill. Brand colors applied directly.

## Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-data-extensions | Add new WidgetData fields + computation + call-chain wiring | 02, 03 | — | S |
| 02-ios-visual | Full WIDGET_LAYOUT_JS redesign: all sizes, mesh bg, glass panels, new fields | — | 01 | L |
| 03-android-visual | Android HourglassWidget.tsx brand alignment + new fields | — | 01 | M |
| 04-cockpit-hud | Dynamic 3-priority HUD: P2 stripped deficit mode, desaturated dark glass colors, iOS monospaced/heavy hero typography | — | 02, 03 | M |

## Files Touched

### 01-data-extensions
- `hourglassws/src/widgets/types.ts` — extended `WidgetData` interface
- `hourglassws/src/widgets/bridge.ts` — `buildWidgetData` + `updateWidgetData` extended
- `hourglassws/src/hooks/useWidgetSync.ts` — 7th param added
- `hourglassws/app/(tabs)/_layout.tsx` — `useWeeklyHistory` wired, `prevWeekSnapshot` derived
- `hourglassws/src/lib/widgetBridge.ts` — annotated (no functional change)

### 02-ios-visual
- `hourglassws/src/widgets/bridge.ts` — `WIDGET_LAYOUT_JS` constant fully replaced (brand redesign)
- `hourglassws/src/widgets/__tests__/widgetLayoutJs.test.ts` — new: 58 unit tests for all FRs

### 03-android-visual
- `hourglassws/src/widgets/android/HourglassWidget.tsx` — full brand redesign (FR1-FR7)
- `hourglassws/src/__tests__/widgets/android/HourglassWidget.test.tsx` — new: 67 unit tests for all FRs
- `hourglassws/src/types/modules.d.ts` — added SvgWidget type declaration

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-24 | [01-data-extensions](specs/01-data-extensions/spec.md) | Add paceBadge, weekDelta, brainliftTarget fields to WidgetData with full call-chain wiring — **Complete** |
| 2026-03-24 | [02-ios-visual](specs/02-ios-visual/spec.md) | Full WIDGET_LAYOUT_JS redesign: mesh bg simulation, glass panels, pace badge, trend deltas, brainliftTarget-driven progress bars, brand color compliance across all sizes — **Complete** |
| 2026-03-24 | [03-android-visual](specs/03-android-visual/spec.md) | Android HourglassWidget brand redesign: SVG mesh bg, glass panels, pace badge, trend deltas, BrainLift bar, urgency mode — **Complete** |
| 2026-03-25 | [04-cockpit-hud](specs/04-cockpit-hud/spec-research.md) | Dynamic 3-priority HUD: desaturated dark glass color tokens, P2 stripped deficit layout (iOS+Android), iOS monospaced/heavy hero typography — **Research** |
