# Checklist: 10-scheduled-notifications

## Phase 1.0 — Tests (Red Phase)

### FR1: useScheduledNotifications hook lifecycle

- [x] test: does nothing when `config` is null — no scheduleAll, no AppState listener
- [x] test: does nothing when `config.setupComplete` is false
- [x] test: calls `scheduleAll` on mount when `config.setupComplete` is true
- [x] test: attaches AppState change listener on mount
- [x] test: calls `scheduleAll` when AppState transitions to `'active'`
- [x] test: does NOT call `scheduleAll` for `'background'` state transition
- [x] test: does NOT call `scheduleAll` for `'inactive'` state transition
- [x] test: removes AppState listener on unmount
- [x] test: `scheduleAll` calls `Notifications.getPermissionsAsync()` first
- [x] test: `scheduleAll` returns early without scheduling if `!granted`
- [x] test: `scheduleAll` reads `widget_data` from AsyncStorage
- [x] test: errors inside `scheduleAll` are caught and silently ignored

### FR2: scheduleThursdayReminder

- [x] test: reads existing ID from AsyncStorage `'notif_thursday_id'`
- [x] test: cancels existing notification when ID is found
- [x] test: skips cancel when no existing ID in AsyncStorage
- [x] test: skips scheduling when UTC day is Friday (5)
- [x] test: skips scheduling when UTC day is Saturday (6)
- [x] test: schedules notification (does NOT skip) on Sunday, Monday, Tuesday, Wednesday, Thursday
- [x] test: trigger has `weekday: 5, hour: 18, minute: 0, repeats: false`
- [x] test: title is `"Hours Deadline Tonight"`
- [x] test: body shows `"${hoursRemaining.toFixed(1)}h to go"` when hoursRemaining > 0
- [x] test: body shows `"You've hit your ${weeklyLimit}h target 🎯"` when hoursRemaining <= 0
- [x] test: saves new notification ID to AsyncStorage `'notif_thursday_id'`
- [x] test: swallows error from `scheduleNotificationAsync` throwing

### FR3: scheduleMondaySummary

- [x] test: calls `loadWeeklyHistory()`
- [x] test: skips scheduling when `snapshots.length < 2`
- [x] test: uses `snapshots[snapshots.length - 2]` as lastWeek
- [x] test: skips scheduling when `lastWeek.hours === 0`
- [x] test: reads existing ID from AsyncStorage `'notif_monday_id'`
- [x] test: cancels existing notification when ID is found
- [x] test: trigger has `weekday: 2, hour: 9, minute: 0, repeats: false`
- [x] test: title is `"Last Week Summary"`
- [x] test: body includes earnings and hours always
- [x] test: body includes `AI%` when `lastWeek.aiPct > 0`
- [x] test: body omits `AI%` when `lastWeek.aiPct === 0`
- [x] test: saves new notification ID to AsyncStorage `'notif_monday_id'`
- [x] test: swallows error from `scheduleNotificationAsync` throwing

### FR4: _layout.tsx wiring

- [x] test: existing layout tests still pass after wiring

---

## Phase 1.1 — Implementation

### FR1: useScheduledNotifications hook

- [x] impl: create `src/hooks/useScheduledNotifications.ts`
- [x] impl: export `useScheduledNotifications(config: CrossoverConfig | null): void`
- [x] impl: guard — return early if `!config || !config.setupComplete`
- [x] impl: `scheduleAll` inner function with try/catch wrapping all logic
- [x] impl: permission check via `Notifications.getPermissionsAsync()` — early return if `!granted`
- [x] impl: read `widget_data` from AsyncStorage, parse `hoursRemaining` with safe default
- [x] impl: call `scheduleThursdayReminder(hoursRemaining, config.weeklyLimit)`
- [x] impl: call `scheduleMondaySummary()`
- [x] impl: `useEffect` runs `scheduleAll` on mount and subscribes to AppState
- [x] impl: AppState listener calls `scheduleAll` on `'active'` transition only
- [x] impl: cleanup returns `sub.remove()`

### FR2: scheduleThursdayReminder

- [x] impl: read `'notif_thursday_id'` from AsyncStorage
- [x] impl: cancel existing notification if ID found
- [x] impl: UTC weekday guard — return if `getUTCDay() === 5 || getUTCDay() === 6`
- [x] impl: build notification content — title + conditional body
- [x] impl: `scheduleNotificationAsync` with `CALENDAR` trigger, `weekday: 5, hour: 18, minute: 0, repeats: false`
- [x] impl: save new ID to `'notif_thursday_id'` AsyncStorage
- [x] impl: wrap in try/catch (errors silently swallowed)

### FR3: scheduleMondaySummary

- [x] impl: call `loadWeeklyHistory()` and check `snapshots.length < 2`
- [x] impl: extract `lastWeek = snapshots[snapshots.length - 2]`
- [x] impl: skip if `lastWeek.hours === 0`
- [x] impl: read `'notif_monday_id'` from AsyncStorage
- [x] impl: cancel existing notification if ID found
- [x] impl: build body string — earnings + hours + conditional AI%
- [x] impl: `scheduleNotificationAsync` with `CALENDAR` trigger, `weekday: 2, hour: 9, minute: 0, repeats: false`
- [x] impl: save new ID to `'notif_monday_id'` AsyncStorage
- [x] impl: wrap in try/catch (errors silently swallowed)

### FR4: _layout.tsx wiring

- [x] impl: import `useScheduledNotifications` in `app/_layout.tsx`
- [x] impl: call `useScheduledNotifications(config)` in layout component body
- [x] impl: verify `config` is sourced from existing `useConfig()` call

---

## Phase 1.2 — Review

- [x] review: run `spec-implementation-alignment` agent — verify all SCs implemented
- [x] review: run `pr-review-toolkit:review-pr` — check for issues
- [x] review: address any feedback from PR review
- [x] review: run `test-optimiser` — check for redundant or missing coverage
- [x] review: run full test suite — confirm all tests pass (3627 tests passing)
- [x] review: verify TypeScript compiles with no errors (`npx tsc --noEmit`)

---

## Session Notes

**2026-04-05**: Implementation complete.
- Phase 1.0: 1 test commit (43 tests, FR1–FR3 via static analysis + __testOnly exports)
- Phase 1.1: 1 implementation commit (FR1–FR4, useScheduledNotifications + _layout.tsx wiring)
- Phase 1.2: Review passed, 1 fix commit (hoursRemaining parse simplification + redundant null coalescing)
- All 3627 tests passing. TypeScript clean.
