# Feature: Widget Wiring

## Feature ID

`widget-wiring`

## Metadata

| Field | Value |
|-------|-------|
| **Domain** | app |
| **Feature Name** | Widget Activation — Wire up home screen widgets to live data |
| **Contributors** | @trilogy |

## Problem Statement

The `06-widgets` spec (hourglass-expo) implemented all widget UI code: `src/widgets/bridge.ts`, `types.ts`, iOS widget, Android widget, and task handler. However, the widgets are not actually functional because:

1. `expo-widgets` and `react-native-android-widget` npm packages are not installed → widget components cannot compile
2. `app.json` plugin config for both libraries was removed (commit `b0106ee`) after packages failed to resolve
3. `src/lib/crossoverData.ts` — `fetchFreshData()` is a stub that throws "not yet implemented"
4. `src/lib/widgetBridge.ts` — also a stub with the wrong type signature (takes `CrossoverSnapshot` from spec 07 boundary, not the real widget bridge interface)
5. No foreground update path: when React Query hooks resolve fresh data in the app, nothing calls `updateWidgetData()`

The result: widgets exist in code but never receive data. They would show a blank/stale state indefinitely.

## Goals

1. Install packages and restore app.json config so widgets can build
2. Implement `fetchFreshData()` — a non-React async function that reads credentials from SecureStore, fetches Crossover API directly, and returns a full `CrossoverSnapshot` (hours, AI%, approvals, config)
3. Fix `widgetBridge.ts` stub so the background push handler path actually works end-to-end
4. Add a `useWidgetSync` hook that calls `updateWidgetData()` when the app is in the foreground and fresh data is available
5. Wire `useWidgetSync` into the tab layout so widgets update on every app open

## Non-Goals

- Changing any widget UI (already implemented in 06-widgets)
- Lock screen widget variants (post-launch)
- Widget configuration UI (post-launch)
- Making `fetchFreshData()` update the `ai_cache` AsyncStorage key (it reads from it but the React hooks own writing to it)

## Architecture

### Background Refresh Path (ping server → widget)

```
Ping server (Railway cron, every 15min)
  → silent push to device
  → handler.ts receives notification
  → fetchFreshData()
      → loadConfig() + loadCredentials() [SecureStore]
      → getAuthToken(username, password, useQA)
      → parallel: fetchTimesheet() + fetchPayments()
      → calculateHours(timesheetData, paymentsData, rate, limit)
      → load ai_cache [AsyncStorage], fetch today's workDiary fresh
      → aggregateAICache(cache + today, today)
      → if manager: fetchPendingManual() + fetchPendingOvertime() → pendingCount
      → returns CrossoverSnapshot { hoursData, aiData, pendingCount, config }
  → updateWidgetData(snapshot)
      → delegates to widgets/bridge.updateWidgetData(hoursData, aiData, pendingCount, config)
      → iOS: HourglassWidget.updateTimeline(60 timeline entries)
      → Android: AsyncStorage 'widget_data' key
```

### Foreground Refresh Path (app open → widget)

```
User opens app
  → React hooks load (useHoursData, useAIData, useApprovalItems)
  → useWidgetSync(hoursData, aiData, pendingCount, config)
      → useEffect fires when hoursData + config are non-null
      → calls updateWidgetData(hoursData, aiData, pendingCount, config) [widgets/bridge]
      → widget refreshed
```

### Spec Decomposition

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-widget-activation | Packages + app.json config + fetchFreshData + widgetBridge fix + useWidgetSync hook | — | — | M |

## Files Touched

| File | Action |
|------|--------|
| `hourglassws/package.json` | Add expo-widgets + react-native-android-widget |
| `hourglassws/app.json` | Add expo-widgets + react-native-android-widget plugin config |
| `hourglassws/src/lib/crossoverData.ts` | Implement fetchFreshData() |
| `hourglassws/src/lib/widgetBridge.ts` | Replace stub with real delegation to widgets/bridge |
| `hourglassws/src/hooks/useWidgetSync.ts` | New hook: foreground widget update |
| `hourglassws/app/(tabs)/_layout.tsx` | Wire useWidgetSync |
| `hourglassws/src/__tests__/lib/crossoverData.test.ts` | New tests |
| `hourglassws/src/__tests__/lib/widgetBridge.test.ts` | New tests |
| `hourglassws/src/__tests__/hooks/useWidgetSync.test.ts` | New tests |

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-17 | [01-widget-activation](specs/01-widget-activation/spec.md) | Install packages, implement fetchFreshData, fix stubs, add useWidgetSync |
