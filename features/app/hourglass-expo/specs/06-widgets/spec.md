# 06-widgets: Home Screen Widgets

**Status:** Draft
**Created:** 2026-03-08
**Last Updated:** 2026-03-08
**Owner:** @trilogy

---

## Overview

This spec covers the home screen widget layer for the Hourglass Expo app. Widgets are the highest-frequency surface — users glance at them dozens of times per day without opening the app. They display hours, earnings, AI%, and deadline countdown and must always be fresh.

### What Is Being Built

1. **Widget Data Bridge** (`src/widgets/bridge.ts`) — a shared layer that transforms app data into the `WidgetData` shape, writes it to both iOS timeline and Android AsyncStorage, and provides timeline entry generation for iOS countdown accuracy.

2. **iOS Widget** (`src/widgets/ios/HourglassWidget.tsx`) — built with `expo-widgets` (SDK 55, official), written in JSX using `@expo/ui/swift-ui` components (VStack, HStack, Text, etc.) that compile to SwiftUI. Supports three sizes: small, medium, large.

3. **Android Widget** (`src/widgets/android/HourglassWidget.tsx` + `widgetTaskHandler.ts`) — built with `react-native-android-widget`, rendered via React Native component subset (FlexWidget, TextWidget). Supports small and medium sizes.

4. **Shared WidgetData type** (`src/widgets/types.ts`) — single source of truth for the data shape both platforms read.

### How It Works

**Data flow:**
```
App/Background fetch
  → updateWidgetData(hoursData, aiData, pendingCount, config)
      → iOS: HourglassWidget.updateTimeline(60 entries × 15min)
      → Android: AsyncStorage.setItem('widget_data', JSON.stringify(data))
          → widgetTaskHandler reads AsyncStorage
              → renders HourglassWidget component
```

**Why timeline entries for iOS:**
iOS widgets advance through pre-generated timeline entries automatically, even when the app is closed. By pre-computing 60 entries at 15-minute intervals (each with recalculated `hoursRemaining` and `urgency`), the deadline countdown stays accurate for up to 15 hours without any app activity.

**Graceful degradation:**
If widget data is missing or the `cachedAt` timestamp is >2 hours old, both platforms show a stale indicator ("Tap to refresh") rather than a blank widget.

---

## Out of Scope

1. **Lock screen widgets (iOS accessoryRectangular/Circular/Inline)**
   **Deferred to post-launch:** Spec decomposition in FEATURE.md marks lock screen widgets as post-launch. No spec currently owns this.

2. **Direct Crossover API calls from widget code**
   **Descoped:** Widgets read from local store only. All API access happens in the app layer (specs 01–05). This is an architectural constraint, not a future feature.

3. **Widget configuration UI (long-press → edit widget)**
   **Descoped:** expo-widgets and react-native-android-widget both support configurable widgets, but user-configurable widget settings are out of scope for v1. Configuration is driven by the main app settings.

4. **Interactive widget actions (buttons in widget)**
   **Descoped:** Manager approval actions (approve/reject buttons) inside widgets are not supported in v1. Widgets are read-only displays. Tapping opens the app.

5. **Large widget on Android**
   **Descoped:** Android large widgets (app widget size 4×4) are rarely used on Android. Only small and medium are implemented. iOS supports all three sizes.

6. **Widget analytics / impression tracking**
   **Descoped:** No telemetry or tracking of widget views or tap-throughs in v1.

7. **Per-widget-instance configuration (multiple widget instances)**
   **Descoped:** If users add multiple instances of the Hourglass widget, they all show the same data. Instance-specific config is post-launch.

---

## Functional Requirements

### FR1: WidgetData Type and Bridge Core

Define the `WidgetData` interface and implement `updateWidgetData()`, the single function called by the app whenever fresh data is available.

**Success Criteria:**
- `WidgetData` interface defined in `src/widgets/types.ts` with all required fields (hours, hoursDisplay, earnings, earningsRaw, today, hoursRemaining, aiPct, brainlift, deadline, urgency, pendingCount, isManager, cachedAt, useQA)
- `updateWidgetData(hoursData, aiData, pendingCount, config)` builds a valid `WidgetData` object from app data
- Hours formatted as string with 1 decimal: `"32.5"`
- Earnings formatted with $ and comma: `"$1,300"`
- `urgency` field derived from `getUrgencyLevel(deadline - now)` (imported from `src/lib/hours.ts`)
- `pendingCount` set to 0 when `config.isManager === false`
- `cachedAt` set to `Date.now()` on each call
- Writes to Android AsyncStorage key `'widget_data'` (JSON stringified)
- On iOS, calls `buildTimelineEntries()` then passes entries to `HourglassWidget.updateTimeline()`

---

### FR2: iOS Timeline Entry Generation

Implement `buildTimelineEntries()` to pre-generate 60 timeline entries for iOS widget countdown accuracy.

**Success Criteria:**
- `buildTimelineEntries(baseData, count, intervalMinutes)` returns exactly `count` entries
- Default `count` is 60, default `intervalMinutes` is 15
- First entry date is `>= new Date()` (current time or slightly ahead)
- Each subsequent entry date is `intervalMinutes` after the previous
- All non-time-dependent fields (hours, earnings, aiPct, brainlift, etc.) are identical across entries
- `urgency` field in each entry is recomputed as `getUrgencyLevel(baseData.deadline - entryDate.getTime())`
- `hoursRemaining` string in each entry reflects remaining time: shows "Xh left" before deadline, "Expired" after

---

### FR3: Android AsyncStorage Read

Implement `readWidgetData()` for the Android widget task handler to retrieve current widget data.

**Success Criteria:**
- `readWidgetData()` returns `null` when `'widget_data'` key is absent from AsyncStorage
- `readWidgetData()` returns parsed `WidgetData` object when key is present and JSON is valid
- `readWidgetData()` returns `null` (does not throw) when JSON is malformed
- Function is async, returns `Promise<WidgetData | null>`

---

### FR4: iOS Widget Component

Implement the `HourglassWidget` iOS component using `expo-widgets` / `@expo/ui/swift-ui`.

**Success Criteria:**
- File starts with `'widget'` directive (required by expo-widgets)
- Small size shows: weekly hours total, earnings, hours remaining
- Medium size shows: hours (hero) + earnings (hero) + today's hours + AI%
- Large size shows: all of medium + daily breakdown + BrainLift hours
- Manager view: shows `pendingCount` badge when `isManager === true && pendingCount > 0`
- Stale indicator: shows "Cached: HH:MM" when `Date.now() - cachedAt > 2 * 60 * 60 * 1000`
- Urgency theming: background/accent color reflects `urgency` field ('none'=default, 'low'=yellow, 'high'=orange, 'critical'=red, 'expired'=gray)
- Component exported as default, registered as `'HourglassWidget'`

---

### FR5: Android Widget Component and Task Handler

Implement the Android widget component and its lifecycle task handler using `react-native-android-widget`.

**Success Criteria:**
- `widgetTaskHandler.ts` handles `widgetInfo.widgetName === 'HourglassWidget'`
- Task handler reads widget data via `readWidgetData()`
- If data is null → renders fallback "Tap to refresh" state
- Android widget component uses only supported components: `FlexWidget`, `TextWidget`, `ImageWidget`
- Small size shows: hours total, earnings, hours remaining
- Medium size shows: hours (hero) + earnings + today + AI%
- Manager badge: shows pending count when applicable
- Stale indicator when `cachedAt` > 2h ago
- Task handler exported as default from `widgetTaskHandler.ts`

---

### FR6: app.json Plugin Configuration

Configure both widget libraries in `app.json` for build-time integration.

**Success Criteria:**
- `expo-widgets` plugin entry added under `plugins` in `app.json`
- `react-native-android-widget` plugin entry added with `widgets` array pointing to `HourglassWidget`
- `widgetTaskHandler` registered correctly for Android background task
- Both plugins configured without breaking existing Expo Router / EAS build setup
- App Group identifier configured for iOS (required for widget data sharing)

---

## Technical Design

### Files to Reference

- `WS/hourglass.js` — widget rendering for each size (small/medium/large sections), urgency color logic, cachedAt display
- `WS/features/app/hourglass-expo/specs/03-hours-dashboard/spec-research.md` — `HoursData` type, `getUrgencyLevel()` signature
- `WS/features/app/hourglass-expo/specs/04-ai-brainlift/spec-research.md` — `AIWeekData` type
- `WS/app/CONTEXT.md` — architecture decisions, widget data flow
- expo-widgets docs: https://docs.expo.dev/versions/latest/sdk/widgets/
- react-native-android-widget docs: https://github.com/sAleksovski/react-native-android-widget

### Files to Create / Modify

```
hourglassws/
  src/
    widgets/
      types.ts                         ← NEW: WidgetData interface (FR1)
      bridge.ts                        ← NEW: updateWidgetData, buildTimelineEntries, readWidgetData (FR1, FR2, FR3)
      ios/
        HourglassWidget.tsx            ← NEW: expo-widgets JSX component (FR4)
      android/
        HourglassWidget.tsx            ← NEW: react-native-android-widget component (FR5)
        widgetTaskHandler.ts           ← NEW: Android widget lifecycle handler (FR5)
    __tests__/
      widgets/
        bridge.test.ts                 ← NEW: tests for FR1, FR2, FR3
        android/
          widgetTaskHandler.test.ts    ← NEW: tests for FR5 task handler
  app.json                             ← MODIFY: add expo-widgets + android widget plugin config (FR6)
```

### Data Flow

```
App (foreground or background fetch)
  │
  ├─ Receives: HoursData, AIWeekData | null, pendingCount, CrossoverConfig
  │
  ▼
updateWidgetData() [bridge.ts]
  │
  ├─ Builds WidgetData from inputs
  │    ├─ hours: hoursData.total.toFixed(1)
  │    ├─ earnings: formatCurrency(hoursData.weeklyEarnings)
  │    ├─ urgency: getUrgencyLevel(hoursData.deadline.getTime() - Date.now())
  │    ├─ pendingCount: isManager ? pendingCount : 0
  │    └─ cachedAt: Date.now()
  │
  ├─── iOS branch:
  │    buildTimelineEntries(data, 60, 15)
  │      → Array<{ date: Date, props: WidgetData }>
  │      → Each entry: urgency recomputed for entry.date vs deadline
  │    HourglassWidget.updateTimeline(entries)
  │
  └─── Android branch:
       AsyncStorage.setItem('widget_data', JSON.stringify(data))
         → widgetTaskHandler (background task)
              → readWidgetData()
              → renders HourglassWidget component
```

### Interface Contracts

```typescript
// src/widgets/types.ts
export interface WidgetData {
  hours: string           // "32.5"
  hoursDisplay: string    // "32.5h"
  earnings: string        // "$1,300"
  earningsRaw: number     // raw number for calculations
  today: string           // "6.2h"
  hoursRemaining: string  // "7.5h left" | "2.5h OT"
  aiPct: string           // "73%–77%"
  brainlift: string       // "3.2h"
  deadline: number        // Unix timestamp ms
  urgency: 'none' | 'low' | 'high' | 'critical' | 'expired'
  pendingCount: number    // 0 for contributors
  isManager: boolean
  cachedAt: number        // Unix timestamp ms
  useQA: boolean
}

// src/widgets/bridge.ts
export async function updateWidgetData(
  hoursData: HoursData,
  aiData: AIWeekData | null,
  pendingCount: number,
  config: CrossoverConfig
): Promise<void>

export function buildTimelineEntries(
  baseData: WidgetData,
  count?: number,           // default 60
  intervalMinutes?: number  // default 15
): Array<{ date: Date; props: WidgetData }>

export async function readWidgetData(): Promise<WidgetData | null>
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| `aiData` is null | `aiPct: 'N/A'`, `brainlift: '0.0h'` |
| `hoursData.weeklyEarnings === 0` | Fall back to `total * hourlyRate` |
| `deadline` in the past | `urgency: 'expired'`, `hoursRemaining: '0h left'` |
| `cachedAt` > 2h ago | Both platforms show stale indicator |
| AsyncStorage read throws | `readWidgetData()` catches and returns `null` |
| Timeline entry date > deadline | `urgency: 'expired'` for that entry |
| Android: widget update called before data exists | Renders fallback "Tap to refresh" state |
| iOS: `updateTimeline` called with 0 entries | Not possible; `buildTimelineEntries` always returns >= 1 entry |

### Dependencies

| Dependency | Source | Used By |
|------------|--------|---------|
| `HoursData` type | `src/hooks/useHoursData.ts` (spec 03) | `bridge.ts` |
| `AIWeekData` type | `src/hooks/useAIData.ts` (spec 04) | `bridge.ts` |
| `CrossoverConfig` type | `src/store/config.ts` (spec 01) | `bridge.ts` |
| `getUrgencyLevel()` | `src/lib/hours.ts` (spec 03) | `bridge.ts` |
| `@expo/ui/swift-ui` | expo-widgets SDK 55 | `ios/HourglassWidget.tsx` |
| `react-native-android-widget` | npm | `android/HourglassWidget.tsx`, `widgetTaskHandler.ts` |
| `@react-native-async-storage/async-storage` | spec 01 foundation | `bridge.ts`, `widgetTaskHandler.ts` |

### Urgency Color Mapping

| Urgency | iOS Background | Android Background |
|---------|---------------|-------------------|
| `none` | System default | #1A1A2E |
| `low` | Yellow (#F5C842) | #4A3B00 |
| `high` | Orange (#FF6B00) | #4A1F00 |
| `critical` | Red (#FF2D55) | #4A0000 |
| `expired` | Gray (#6B6B6B) | #2A2A2A |
