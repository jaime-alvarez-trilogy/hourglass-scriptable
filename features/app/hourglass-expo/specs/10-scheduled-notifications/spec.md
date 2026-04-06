# 10-scheduled-notifications

**Status:** Draft
**Created:** 2026-04-05
**Last Updated:** 2026-04-05
**Owner:** @jaime

---

## Overview

This spec implements local scheduled notifications for the Hourglass app. No server or push infrastructure is involved — all scheduling happens on-device using `expo-notifications`.

Two notifications are scheduled:

1. **Thursday 6pm deadline reminder** — fires at 6pm local time on Thursday, showing how many hours remain before the weekly cutoff. Content is sourced from the last widget bridge write in AsyncStorage (`widget_data` key), so no live API call is needed.

2. **Monday 9am weekly summary** — fires at 9am local time every Monday, showing last week's earnings, hours, and AI% from the local weekly history store.

The `useScheduledNotifications(config)` hook is wired into `_layout.tsx`. It reschedules both notifications on mount and on every foreground transition (via `AppState`), so content is always fresh with the latest cached data. Notifications are cancelled and rescheduled — not repeated — which allows the body to be updated each week.

Permission checking uses `getPermissionsAsync()` (not `requestPermissionsAsync`) because permissions were already requested in spec 09. If permissions are not granted, the hook silently skips.

### Key Design Choices

- No API calls in this hook — relies entirely on locally cached data (AsyncStorage)
- `repeats: false` on all triggers — reschedule each app open for fresh content
- Cancel-before-reschedule pattern keyed by AsyncStorage-stored notification IDs
- Thursday reminder skipped on Friday/Saturday (deadline already passed for this week)
- Monday summary skipped if fewer than 2 history snapshots exist

---

## Out of Scope

1. **Requesting notification permissions** — **Deferred to 09-notifications-wiring**: `requestPermissionsAsync()` is called there. This spec only checks `getPermissionsAsync()`.

2. **Push (remote) notifications** — **Deferred to 07-ping-server**: Silent push from Vercel cron is a separate concern. This spec covers local scheduled notifications only.

3. **Per-user notification preferences/toggles** — **Descoped**: No notification settings UI in v1. Notifications are always scheduled when permissions are granted.

4. **Android notification channels** — **Descoped**: `expo-notifications` handles channel creation automatically for scheduled notifications on Android. No explicit channel setup required here.

5. **Live API calls for notification content** — **Descoped**: Notification bodies use locally cached data only (AsyncStorage). This is sufficient for weekly cadence content.

6. **Notification tapping / deep linking** — **Descoped**: `setNotificationResponseHandler` in spec 09 covers response handling. This spec only schedules; it does not handle taps.

7. **BrainLift hours in Monday summary** — **Descoped**: The Monday summary body includes earnings, hours, and AI% only. BrainLift hours omitted for brevity in the notification body.

8. **Re-requesting permissions after denial** — **Descoped**: If permissions are denied, the hook silently skips. No prompting or guidance to re-enable is in scope for this spec.

---

## Functional Requirements

### FR1: useScheduledNotifications hook — lifecycle and orchestration

**Description:** A React hook that checks notification permissions and schedules both notifications on mount and on every app foreground transition.

**Signature:**
```typescript
export function useScheduledNotifications(config: CrossoverConfig | null): void
```

**Success Criteria:**

- SC1.1: Does nothing (no scheduleAll call, no listener) when `config` is `null`
- SC1.2: Does nothing when `config.setupComplete` is `false`
- SC1.3: Calls `scheduleAll()` immediately on mount when `config.setupComplete` is `true`
- SC1.4: Attaches an `AppState` change listener on mount
- SC1.5: Calls `scheduleAll()` when AppState transitions to `'active'`
- SC1.6: Does NOT call `scheduleAll()` for `'background'` or `'inactive'` transitions
- SC1.7: Removes the AppState listener on unmount (no memory leak)
- SC1.8: `scheduleAll()` first calls `Notifications.getPermissionsAsync()`; if `!granted`, returns early without scheduling
- SC1.9: `scheduleAll()` reads `widget_data` from AsyncStorage to get `hoursRemaining`
- SC1.10: `scheduleAll()` calls `scheduleThursdayReminder` and `scheduleMondaySummary`
- SC1.11: Errors thrown inside `scheduleAll()` are caught and silently ignored

---

### FR2: Thursday 6pm deadline reminder

**Description:** Cancels any existing Thursday notification and schedules a new one for 6pm local Thursday, showing remaining hours.

**Internal function (not exported):**
```typescript
async function scheduleThursdayReminder(
  hoursRemaining: number,
  weeklyLimit: number,
): Promise<void>
```

**Success Criteria:**

- SC2.1: Reads existing notification ID from AsyncStorage key `'notif_thursday_id'`
- SC2.2: If an existing ID is found, calls `Notifications.cancelScheduledNotificationAsync(id)` before scheduling
- SC2.3: If no existing ID in AsyncStorage, skips cancel and proceeds to schedule
- SC2.4: Checks current UTC weekday — skips scheduling (returns early) if `getUTCDay() === 5` (Friday) or `getUTCDay() === 6` (Saturday)
- SC2.5: Schedules with trigger `{ type: CALENDAR, weekday: 5, hour: 18, minute: 0, repeats: false }`
- SC2.6: Notification title is `"Hours Deadline Tonight"`
- SC2.7: Notification body is `"${hoursRemaining.toFixed(1)}h to go"` when `hoursRemaining > 0`
- SC2.8: Notification body is `"You've hit your ${weeklyLimit}h target 🎯"` when `hoursRemaining <= 0`
- SC2.9: Saves the new notification ID to AsyncStorage key `'notif_thursday_id'`
- SC2.10: If `Notifications.scheduleNotificationAsync` throws, the error is caught and silently swallowed

---

### FR3: Monday 9am weekly summary

**Description:** Cancels any existing Monday notification and schedules a new one for 9am Monday showing last week's performance stats.

**Internal function (not exported):**
```typescript
async function scheduleMondaySummary(): Promise<void>
```

**Success Criteria:**

- SC3.1: Calls `loadWeeklyHistory()` to retrieve snapshot history
- SC3.2: Skips scheduling (returns early) if `snapshots.length < 2`
- SC3.3: Uses `snapshots[snapshots.length - 2]` as `lastWeek` (second-to-last entry)
- SC3.4: Skips scheduling (returns early) if `lastWeek.hours === 0`
- SC3.5: Reads existing notification ID from AsyncStorage key `'notif_monday_id'`
- SC3.6: If an existing ID is found, calls `Notifications.cancelScheduledNotificationAsync(id)` before scheduling
- SC3.7: Schedules with trigger `{ type: CALENDAR, weekday: 2, hour: 9, minute: 0, repeats: false }`
- SC3.8: Notification title is `"Last Week Summary"`
- SC3.9: Notification body includes `"$${Math.round(lastWeek.earnings).toLocaleString()} · ${lastWeek.hours.toFixed(1)}h"` always
- SC3.10: Notification body appends `· ${lastWeek.aiPct}% AI` only when `lastWeek.aiPct > 0`
- SC3.11: Saves the new notification ID to AsyncStorage key `'notif_monday_id'`
- SC3.12: If `Notifications.scheduleNotificationAsync` throws, the error is caught and silently swallowed

---

### FR4: Wire hook into _layout.tsx

**Description:** Call `useScheduledNotifications(config)` from the root layout after config loads.

**Success Criteria:**

- SC4.1: `useScheduledNotifications` is imported and called in `_layout.tsx`
- SC4.2: `config` passed to the hook comes from `useConfig()` (existing hook in the app)
- SC4.3: No other changes to `_layout.tsx` behavior (additive only)
- SC4.4: The app compiles and existing layout tests continue to pass

---

## Technical Design

### Files to Reference (do NOT modify)

| File | Purpose |
|------|---------|
| `src/lib/hours.ts` | `computeDeadlineCountdown`, `DeadlineCountdown` type, `UrgencyLevel` |
| `src/lib/weeklyHistory.ts` | `loadWeeklyHistory`, `WeeklySnapshot` type, `WEEKLY_HISTORY_KEY` |
| `src/types/config.ts` | `CrossoverConfig` interface |
| `src/hooks/useRoleRefresh.ts` | Reference pattern: AppState listener in a hook |
| `src/__tests__/notifications/handler.test.ts` | Reference: mock patterns for `expo-notifications` |
| `app/(tabs)/index.tsx` | Reference: how `useConfig()` is called |

### Files to Create

| File | Description |
|------|-------------|
| `src/hooks/useScheduledNotifications.ts` | New hook — full implementation (FR1–FR3) |
| `src/hooks/__tests__/useScheduledNotifications.test.ts` | Tests for FR1–FR3 |

### Files to Modify

| File | Change |
|------|--------|
| `app/_layout.tsx` | Add `useScheduledNotifications(config)` call (FR4) |

### AsyncStorage Keys

| Key | Type | Source |
|-----|------|--------|
| `'widget_data'` | `string` (JSON) | Written by widget bridge; contains `hoursRemaining` |
| `'notif_thursday_id'` | `string` | Notification ID stored after each schedule |
| `'notif_monday_id'` | `string` | Notification ID stored after each schedule |
| `'weekly_history_v2'` | `string` (JSON) | Read via `loadWeeklyHistory()` from `weeklyHistory.ts` |

### Data Flow

```
_layout.tsx
  └── useScheduledNotifications(config)
        │
        ├── [on mount + AppState 'active']
        │     └── scheduleAll()
        │           │
        │           ├── Notifications.getPermissionsAsync()
        │           │     └── if !granted → return
        │           │
        │           ├── AsyncStorage.getItem('widget_data')
        │           │     └── JSON.parse → hoursRemaining
        │           │
        │           ├── scheduleThursdayReminder(hoursRemaining, config.weeklyLimit)
        │           │     ├── AsyncStorage.getItem('notif_thursday_id')
        │           │     ├── Notifications.cancelScheduledNotificationAsync(id?)
        │           │     ├── guard: skip if UTC day is Fri(5) or Sat(6)
        │           │     ├── Notifications.scheduleNotificationAsync(...)
        │           │     └── AsyncStorage.setItem('notif_thursday_id', newId)
        │           │
        │           └── scheduleMondaySummary()
        │                 ├── loadWeeklyHistory() → snapshots[]
        │                 ├── guard: skip if snapshots.length < 2 or lastWeek.hours === 0
        │                 ├── AsyncStorage.getItem('notif_monday_id')
        │                 ├── Notifications.cancelScheduledNotificationAsync(id?)
        │                 ├── Notifications.scheduleNotificationAsync(...)
        │                 └── AsyncStorage.setItem('notif_monday_id', newId)
        │
        └── AppState.addEventListener('change', ...)
              └── on 'active' → scheduleAll()
```

### CalendarTrigger Weekday Convention

Expo's `CalendarTriggerInput` uses iOS weekday numbers:

| Day | iOS weekday |
|-----|-------------|
| Sunday | 1 |
| Monday | 2 |
| Tuesday | 3 |
| Wednesday | 4 |
| Thursday | 5 |
| Friday | 6 |
| Saturday | 7 |

This is NOT the same as JavaScript's `Date.getUTCDay()` (0=Sun, 1=Mon, ..., 6=Sat).

### Thursday Guard Logic

Skip scheduling the Thursday reminder if the current UTC day is already Friday or Saturday — the deadline has already passed for this week.

```typescript
const utcDay = new Date().getUTCDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
if (utcDay === 5 || utcDay === 6) return; // Skip Fri/Sat
```

Note: Sunday (0) is fine to schedule — next Thursday's deadline is valid to remind about.

### hoursRemaining Parsing

`widget_data` AsyncStorage value is a JSON string written by the widget bridge. Parse safely:

```typescript
const raw = await AsyncStorage.getItem('widget_data');
const hoursRemaining = raw ? (JSON.parse(raw)?.hoursRemaining ?? 0) : 0;
```

Default to `0` if key is missing or field absent — hook will use the target-hit message.

### Edge Cases

| Scenario | Handling |
|----------|---------|
| `config` is null | Hook does nothing — no `useEffect` side-effects |
| `config.setupComplete` is false | Effect returns early before scheduleAll or AppState listener |
| Permissions not granted | `scheduleAll()` returns after permission check |
| `widget_data` key missing | `hoursRemaining` defaults to `0` |
| No existing notif ID in AsyncStorage | Skip cancel step, proceed to schedule |
| `snapshots.length < 2` | Monday summary skipped — not enough history |
| `lastWeek.hours === 0` | Monday summary skipped — week was empty |
| Current day is Friday UTC | Thursday reminder skipped |
| Current day is Saturday UTC | Thursday reminder skipped |
| `scheduleNotificationAsync` throws | Error caught, silently swallowed |

### Mock Requirements for Tests

```typescript
// Jest module mocks needed:
jest.mock('expo-notifications');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({ AppState: { addEventListener: jest.fn() } }));
jest.mock('../../lib/weeklyHistory', () => ({ loadWeeklyHistory: jest.fn() }));
```

`renderHook` from `@testing-library/react-native` for hook tests.
