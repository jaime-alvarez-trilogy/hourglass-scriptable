# Spec Research: 06-widgets

## Problem Context

Home screen widgets are the most visible and frequently-used surface of the app. Users glance at them dozens of times per day. They must show hours, earnings, AI%, and deadline countdown — always fresh, no loading state. This spec covers the iOS widget (expo-widgets), Android widget (react-native-android-widget), the shared data bridge layer, and the timeline scheduling that keeps widgets current without direct API calls.

## Exploration Findings

### expo-widgets (iOS, SDK 55, official alpha)

**How it works:**
- Config plugin in `app.json` enables the widget extension target
- Widget UI written in JSX using `@expo/ui/swift-ui` components
- Compiles to SwiftUI at build time
- Data passed via `updateSnapshot()` or `updateTimeline()` from app code
- Library handles App Group UserDefaults bridging internally

**JSX subset available:**
- Layout: `VStack`, `HStack`, `ZStack`, `Spacer`
- Display: `Text`, `Image`, `ProgressView`
- Modifiers: `font()`, `foregroundStyle()`, `padding()`, `background()`

**Timeline scheduling:**
```typescript
HourglassWidget.updateTimeline([
  { date: new Date(), props: { hours: '32.5', earnings: '$1,300' } },
  { date: addMinutes(new Date(), 15), props: { ... } },
  // ... up to ~60 entries
])
```

**Sizes supported:** `.systemSmall`, `.systemMedium`, `.systemLarge`

**Widget refresh:** `HourglassWidget.reload()` forces immediate refresh. Timeline entries auto-advance by date.

### react-native-android-widget

**How it works:**
- Config plugin in `app.json`
- Widget UI written in React Native component subset
- Components render to Bitmap via background task handler
- Data passed via AsyncStorage that the widget task handler reads

**Supported components:**
- `FlexWidget`, `TextWidget`, `ImageWidget`, `SvgWidget`
- Background colors, font size/weight, flexbox layout

**Widget lifecycle:**
```typescript
// widgetTaskHandler.ts
async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  if (widgetInfo.widgetName === 'HourglassWidget') {
    await updateAndroidWidget(widgetInfo.widgetId);
  }
}
```

### Data Bridge Design

The widget reads from a local store — never calls Crossover APIs directly.

**iOS:** `updateTimeline()` called by app with pre-built entries
**Android:** AsyncStorage key `widget_data` read by task handler

Shared data shape (written by app, read by both widget platforms):
```typescript
interface WidgetData {
  hours: string           // e.g. "32.5"
  hoursDisplay: string    // e.g. "32.5h"
  earnings: string        // e.g. "$1,300"
  earningsRaw: number     // for calculations
  today: string           // e.g. "6.2h"
  hoursRemaining: string  // e.g. "7.5h left" or "2.5h OT"
  aiPct: string           // e.g. "73%–77%"
  brainlift: string       // e.g. "3.2h"
  deadline: number        // Unix timestamp (ms) — for countdown math in widget
  urgency: 'none' | 'low' | 'high' | 'critical' | 'expired'
  pendingCount: number    // manager only, 0 for contributors
  isManager: boolean
  cachedAt: number        // Unix timestamp — for "stale" indicator
  useQA: boolean
}
```

### Update Trigger Points

1. **App opens** → fetch fresh data → `updateWidgetData(data)` → both platforms
2. **Background fetch fires** (triggered by silent push) → same flow
3. **Approval action completes** (manager) → re-fetch + update
4. **Timeline** (iOS only) → pre-schedule 15-min entries using current data

### Widget Sizes

| Size | Content |
|------|---------|
| Small | Hours total, earnings, hours remaining |
| Medium | Hours + earnings (hero) + today + AI% |
| Large | All of medium + daily bar chart + BrainLift |

For Android: small and medium only (large is rarely used on Android).

## Key Decisions

### Decision 1: Shared `WidgetData` type, platform-specific rendering
- One `updateWidgetData(data)` function writes to both iOS (updateTimeline) and Android (AsyncStorage)
- iOS widget file + Android widget file each render the same data differently
- Rationale: single source of truth, platform-appropriate rendering

### Decision 2: Timeline entries for iOS countdown
- Pre-generate 60 entries at 15-min intervals when app opens / background fetch runs
- Each entry has pre-computed `hoursRemaining` and `urgency` (math is deterministic)
- Rationale: countdown stays accurate even without app open

### Decision 3: Android widget uses AsyncStorage polling
- Android task handler reads `widget_data` from AsyncStorage
- Widget update triggered by push notification wakeup → background task
- Rationale: simplest reliable pattern for android-widget library

### Decision 4: Graceful degradation
- If `widget_data` is missing or stale (>2h) → show "Tap to refresh" or cached timestamp
- Never show blank widget
- Rationale: matches Scriptable failover behavior

## Interface Contracts

### Widget Data Bridge

```typescript
// src/widgets/bridge.ts

async function updateWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig
): Promise<void>
// Builds WidgetData from app data
// iOS: calls HourglassWidget.updateTimeline() with 60 entries
// Android: writes to AsyncStorage 'widget_data'

function buildTimelineEntries(
  baseData: WidgetData,
  count: number,           // default 60
  intervalMinutes: number  // default 15
): Array<{ date: Date; props: WidgetData }>
// Generates future-dated entries
// Each entry recomputes hoursRemaining based on deadline - entryDate

async function readWidgetData(): Promise<WidgetData | null>
// Reads from AsyncStorage 'widget_data'
// Used by Android task handler
```

### iOS Widget (expo-widgets)

```typescript
// src/widgets/ios/HourglassWidget.tsx

'widget'  // directive

// Small variant: hours + earnings + remaining
// Medium variant: hero + today + AI%
// Large variant: all + daily breakdown

const HourglassWidget = createWidget('HourglassWidget', (props: WidgetData) => {
  'widget';
  // JSX using @expo/ui/swift-ui components
})

export default HourglassWidget;
```

### Android Widget

```typescript
// src/widgets/android/HourglassWidget.tsx

function HourglassWidget({ widgetId }: { widgetId: number }) {
  // FlexWidget, TextWidget layout
  // Reads from AsyncStorage via task handler
}

// src/widgets/android/widgetTaskHandler.ts
async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void>
```

## Test Plan

### updateWidgetData

- [ ] Builds correct WidgetData from HoursData + AIWeekData
- [ ] Sets `pendingCount: 0` for contributors (`isManager: false`)
- [ ] Formats hours as string with 1 decimal: `"32.5"`
- [ ] Formats earnings with $ and comma: `"$1,300"`
- [ ] Sets `urgency` from `getUrgencyLevel(deadline - now)`
- [ ] Calls `AsyncStorage.setItem('widget_data', ...)` for Android

### buildTimelineEntries

- [ ] Returns exactly `count` entries
- [ ] First entry date is >= now
- [ ] Each subsequent entry is `intervalMinutes` after previous
- [ ] Each entry recomputes `hoursRemaining` relative to that entry's date and deadline
- [ ] `urgency` field updates correctly as deadline approaches in entries

### readWidgetData

- [ ] Returns null when key absent
- [ ] Returns parsed WidgetData when present
- [ ] Handles malformed JSON gracefully (returns null)

## Files to Create

```
src/
  widgets/
    bridge.ts                     — updateWidgetData, buildTimelineEntries, readWidgetData
    types.ts                      — WidgetData interface
    ios/
      HourglassWidget.tsx         — expo-widgets JSX component
    android/
      HourglassWidget.tsx         — react-native-android-widget component
      widgetTaskHandler.ts        — Android widget lifecycle handler

app.json                          — expo-widgets plugin config + android widget config
```

## Files to Reference

- `WS/hourglass.js` — Widget rendering for each size (small/medium/large sections)
- `WS/app/CONTEXT.md` — Architecture decisions, widget data flow
- `WS/features/app/hourglass-expo/specs/03-hours-dashboard/spec-research.md` — HoursData type
- `WS/features/app/hourglass-expo/specs/04-ai-brainlift/spec-research.md` — AIWeekData type
- expo-widgets docs: https://docs.expo.dev/versions/latest/sdk/widgets/
- react-native-android-widget docs: https://github.com/sAleksovski/react-native-android-widget
