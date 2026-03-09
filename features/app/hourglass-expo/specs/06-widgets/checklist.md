# Implementation Checklist

Spec: `06-widgets`
Feature: `hourglass-expo`

---

## Phase 6.0: Test Foundation

### FR1: WidgetData Type and Bridge Core
- [ ] Write tests: `updateWidgetData` builds correct `WidgetData` from `HoursData` + `AIWeekData`
- [ ] Write tests: hours formatted as string with 1 decimal (`"32.5"`)
- [ ] Write tests: earnings formatted with $ and comma (`"$1,300"`)
- [ ] Write tests: `urgency` derived from `getUrgencyLevel(deadline - now)`
- [ ] Write tests: `pendingCount` set to 0 when `config.isManager === false`
- [ ] Write tests: `cachedAt` set to `Date.now()` on each call
- [ ] Write tests: `AsyncStorage.setItem('widget_data', ...)` called with JSON string
- [ ] Write tests: `aiPct: 'N/A'` and `brainlift: '0.0h'` when `aiData` is null

### FR2: iOS Timeline Entry Generation
- [ ] Write tests: returns exactly `count` entries (default 60)
- [ ] Write tests: first entry date >= `new Date()`
- [ ] Write tests: each subsequent entry is `intervalMinutes` after previous (default 15)
- [ ] Write tests: non-time-dependent fields identical across all entries
- [ ] Write tests: `urgency` recomputed per entry as deadline approaches
- [ ] Write tests: entries past deadline have `urgency: 'expired'`

### FR3: Android AsyncStorage Read
- [ ] Write tests: returns `null` when key absent
- [ ] Write tests: returns parsed `WidgetData` when key present and JSON valid
- [ ] Write tests: returns `null` (no throw) when JSON is malformed
- [ ] Write tests: returns `null` (no throw) when AsyncStorage.getItem throws

### FR5: Android Task Handler
- [ ] Write tests: task handler calls `readWidgetData()` for `'HourglassWidget'` widget name
- [ ] Write tests: renders fallback state when `readWidgetData()` returns null
- [ ] Write tests: passes data to widget component when data is present

---

## Test Design Validation (MANDATORY)

> **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts
- [ ] Fix any issues identified before proceeding

---

## Phase 6.1: Implementation

### FR1: WidgetData Type and Bridge Core
- [ ] Create `src/widgets/types.ts` — `WidgetData` interface with all fields
- [ ] Create `src/widgets/bridge.ts` — implement `updateWidgetData(hoursData, aiData, pendingCount, config)`
- [ ] Format hours: `hoursData.total.toFixed(1)`
- [ ] Format earnings: `$` prefix + comma formatting
- [ ] Derive `urgency` via imported `getUrgencyLevel()` from `src/lib/hours.ts`
- [ ] Zero out `pendingCount` for non-managers
- [ ] Set `cachedAt: Date.now()`
- [ ] Write to `AsyncStorage` key `'widget_data'`
- [ ] On iOS: call `buildTimelineEntries()` then `HourglassWidget.updateTimeline()`

### FR2: iOS Timeline Entry Generation
- [ ] Implement `buildTimelineEntries(baseData, count = 60, intervalMinutes = 15)` in `bridge.ts`
- [ ] Generate entries starting from `new Date()`
- [ ] Increment each entry by `intervalMinutes * 60 * 1000`
- [ ] Recompute `urgency` per entry: `getUrgencyLevel(baseData.deadline - entryDate.getTime())`
- [ ] Recompute `hoursRemaining` string per entry (shows "Expired" past deadline)

### FR3: Android AsyncStorage Read
- [ ] Implement `readWidgetData()` in `bridge.ts`
- [ ] Wrap `AsyncStorage.getItem('widget_data')` in try/catch
- [ ] Return `null` for missing key or parse failure
- [ ] Return `JSON.parse(raw)` as `WidgetData` when successful

### FR4: iOS Widget Component
- [ ] Create `src/widgets/ios/HourglassWidget.tsx`
- [ ] Add `'widget'` directive at top of file
- [ ] Implement small size: hours total + earnings + hours remaining
- [ ] Implement medium size: hero hours + hero earnings + today + AI%
- [ ] Implement large size: medium content + daily breakdown + BrainLift
- [ ] Add manager badge for `pendingCount > 0` when `isManager === true`
- [ ] Add stale indicator when `Date.now() - cachedAt > 7200000`
- [ ] Apply urgency color theming to background/accent
- [ ] Export as default, register as `'HourglassWidget'`

### FR5: Android Widget Component and Task Handler
- [ ] Create `src/widgets/android/widgetTaskHandler.ts`
- [ ] Handle `widgetInfo.widgetName === 'HourglassWidget'`
- [ ] Call `readWidgetData()` in task handler
- [ ] Render fallback "Tap to refresh" when data is null
- [ ] Create `src/widgets/android/HourglassWidget.tsx` using `FlexWidget` + `TextWidget`
- [ ] Implement small size: hours + earnings + remaining
- [ ] Implement medium size: hero hours + earnings + today + AI%
- [ ] Add manager pending badge
- [ ] Add stale indicator when `cachedAt` > 2h ago
- [ ] Export task handler as default

### FR6: app.json Plugin Configuration
- [ ] Add `expo-widgets` plugin entry to `app.json` plugins array
- [ ] Configure iOS App Group identifier for widget data sharing
- [ ] Add `react-native-android-widget` plugin entry with `HourglassWidget` in widgets array
- [ ] Register `widgetTaskHandler` for Android background tasks
- [ ] Verify existing Expo Router and EAS config is not broken

---

## Phase 6.2: Review (MANDATORY)

> **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(06-widgets): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(06-widgets): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing patterns

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-08**: Spec created. 6 FRs: bridge core (FR1), iOS timeline entries (FR2), Android read (FR3), iOS widget component (FR4), Android widget + task handler (FR5), app.json config (FR6).
