# Checklist: 10-scheduled-notifications

## Phase 1.0 — Tests (Red Phase)

### FR1: useScheduledNotifications hook lifecycle

- [ ] test: does nothing when `config` is null — no scheduleAll, no AppState listener
- [ ] test: does nothing when `config.setupComplete` is false
- [ ] test: calls `scheduleAll` on mount when `config.setupComplete` is true
- [ ] test: attaches AppState change listener on mount
- [ ] test: calls `scheduleAll` when AppState transitions to `'active'`
- [ ] test: does NOT call `scheduleAll` for `'background'` state transition
- [ ] test: does NOT call `scheduleAll` for `'inactive'` state transition
- [ ] test: removes AppState listener on unmount
- [ ] test: `scheduleAll` calls `Notifications.getPermissionsAsync()` first
- [ ] test: `scheduleAll` returns early without scheduling if `!granted`
- [ ] test: `scheduleAll` reads `widget_data` from AsyncStorage
- [ ] test: errors inside `scheduleAll` are caught and silently ignored

### FR2: scheduleThursdayReminder

- [ ] test: reads existing ID from AsyncStorage `'notif_thursday_id'`
- [ ] test: cancels existing notification when ID is found
- [ ] test: skips cancel when no existing ID in AsyncStorage
- [ ] test: skips scheduling when UTC day is Friday (5)
- [ ] test: skips scheduling when UTC day is Saturday (6)
- [ ] test: schedules notification (does NOT skip) on Sunday, Monday, Tuesday, Wednesday, Thursday
- [ ] test: trigger has `weekday: 5, hour: 18, minute: 0, repeats: false`
- [ ] test: title is `"Hours Deadline Tonight"`
- [ ] test: body shows `"${hoursRemaining.toFixed(1)}h to go"` when hoursRemaining > 0
- [ ] test: body shows `"You've hit your ${weeklyLimit}h target 🎯"` when hoursRemaining <= 0
- [ ] test: saves new notification ID to AsyncStorage `'notif_thursday_id'`
- [ ] test: swallows error from `scheduleNotificationAsync` throwing

### FR3: scheduleMondaySummary

- [ ] test: calls `loadWeeklyHistory()`
- [ ] test: skips scheduling when `snapshots.length < 2`
- [ ] test: uses `snapshots[snapshots.length - 2]` as lastWeek
- [ ] test: skips scheduling when `lastWeek.hours === 0`
- [ ] test: reads existing ID from AsyncStorage `'notif_monday_id'`
- [ ] test: cancels existing notification when ID is found
- [ ] test: trigger has `weekday: 2, hour: 9, minute: 0, repeats: false`
- [ ] test: title is `"Last Week Summary"`
- [ ] test: body includes earnings and hours always
- [ ] test: body includes `AI%` when `lastWeek.aiPct > 0`
- [ ] test: body omits `AI%` when `lastWeek.aiPct === 0`
- [ ] test: saves new notification ID to AsyncStorage `'notif_monday_id'`
- [ ] test: swallows error from `scheduleNotificationAsync` throwing

### FR4: _layout.tsx wiring

- [ ] test: existing layout tests still pass after wiring

---

## Phase 1.1 — Implementation

### FR1: useScheduledNotifications hook

- [ ] impl: create `src/hooks/useScheduledNotifications.ts`
- [ ] impl: export `useScheduledNotifications(config: CrossoverConfig | null): void`
- [ ] impl: guard — return early if `!config || !config.setupComplete`
- [ ] impl: `scheduleAll` inner function with try/catch wrapping all logic
- [ ] impl: permission check via `Notifications.getPermissionsAsync()` — early return if `!granted`
- [ ] impl: read `widget_data` from AsyncStorage, parse `hoursRemaining` with safe default
- [ ] impl: call `scheduleThursdayReminder(hoursRemaining, config.weeklyLimit)`
- [ ] impl: call `scheduleMondaySummary()`
- [ ] impl: `useEffect` runs `scheduleAll` on mount and subscribes to AppState
- [ ] impl: AppState listener calls `scheduleAll` on `'active'` transition only
- [ ] impl: cleanup returns `sub.remove()`

### FR2: scheduleThursdayReminder

- [ ] impl: read `'notif_thursday_id'` from AsyncStorage
- [ ] impl: cancel existing notification if ID found
- [ ] impl: UTC weekday guard — return if `getUTCDay() === 5 || getUTCDay() === 6`
- [ ] impl: build notification content — title + conditional body
- [ ] impl: `scheduleNotificationAsync` with `CALENDAR` trigger, `weekday: 5, hour: 18, minute: 0, repeats: false`
- [ ] impl: save new ID to `'notif_thursday_id'` AsyncStorage
- [ ] impl: wrap in try/catch (errors silently swallowed)

### FR3: scheduleMondaySummary

- [ ] impl: call `loadWeeklyHistory()` and check `snapshots.length < 2`
- [ ] impl: extract `lastWeek = snapshots[snapshots.length - 2]`
- [ ] impl: skip if `lastWeek.hours === 0`
- [ ] impl: read `'notif_monday_id'` from AsyncStorage
- [ ] impl: cancel existing notification if ID found
- [ ] impl: build body string — earnings + hours + conditional AI%
- [ ] impl: `scheduleNotificationAsync` with `CALENDAR` trigger, `weekday: 2, hour: 9, minute: 0, repeats: false`
- [ ] impl: save new ID to `'notif_monday_id'` AsyncStorage
- [ ] impl: wrap in try/catch (errors silently swallowed)

### FR4: _layout.tsx wiring

- [ ] impl: import `useScheduledNotifications` in `app/_layout.tsx`
- [ ] impl: call `useScheduledNotifications(config)` in layout component body
- [ ] impl: verify `config` is sourced from existing `useConfig()` call

---

## Phase 1.2 — Review

- [ ] review: run `spec-implementation-alignment` agent — verify all SCs implemented
- [ ] review: run `pr-review-toolkit:review-pr` — check for issues
- [ ] review: address any feedback from PR review
- [ ] review: run `test-optimiser` — check for redundant or missing coverage
- [ ] review: run full test suite — confirm all tests pass
- [ ] review: verify TypeScript compiles with no errors (`npx tsc --noEmit`)
