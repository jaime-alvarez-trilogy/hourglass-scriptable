# 03-hours-dashboard

**Status:** Draft
**Created:** 2026-03-08
**Last Updated:** 2026-03-08
**Owner:** @trilogy

---

## Overview

### What Is Being Built

The Hours Dashboard is the primary screen contributors see every time they open the Hourglass app. It presents a real-time view of the current week's tracked work: total hours logged, weekly earnings, today's session, a Mon–Sun bar chart, deadline countdown, and urgency-aware theming. The screen is backed by two React Query hooks (`useTimesheet` and `usePayments`) that run in parallel and feed a pure `calculateHours` function to produce a single derived `HoursData` object.

### How It Works

1. On mount, `useHoursData` fires `useTimesheet` and `usePayments` simultaneously.
2. Both queries use a 15-minute stale time and background-refetch on app focus.
3. Once both resolve, `calculateHours` merges the results: earnings come from the Payments API when available (paidHours > 0 / amount > 0), falling back to timesheet values and hourly rate arithmetic.
4. If both queries fail, the last successful result is retrieved from `AsyncStorage` (`hours_cache`) and displayed with an orange "Cached: HH:MM" indicator.
5. The screen renders a hero block (total hours + weekly earnings), a status bar (remaining or overtime), today's stats, average hours/day, a custom bar chart, and — when the deadline is within 12 hours — an urgency banner.
6. Pull-to-refresh calls `refetch()` on both queries.

### Key Design Decisions

- **Payments API is source of truth for hours and earnings** — paidHours > 0 overrides timesheet totals because the Payments API reflects employer-confirmed figures.
- **Parallel queries** — timesheet and payments are independent; no reason to serialize them.
- **No chart library** — daily breakdown is a custom `View`-based bar chart to keep bundle size small.
- **Stale-while-revalidate** — 15 min stale time matches the widget refresh cycle and avoids hammering the API.
- **Cache failover** — mirrors the Scriptable widget failover pattern; last known good data shown rather than an error screen.

---

## Out of Scope

1. **AI% and BrainLift metrics** — Deferred to [04-ai-brainlift](../04-ai-brainlift/spec.md). Work diary tag fetching and parsing are not part of this spec; the dashboard shows only timesheet/payments data.

2. **Manager approval queue** — Deferred to [05-manager-approvals](../05-manager-approvals/spec.md). The hours dashboard is contributor-only; manager-role detection and approval views are handled separately.

3. **Home screen widgets** — Deferred to [06-widgets](../06-widgets/spec.md). The dashboard provides the data model that widgets will consume, but widget rendering/scheduling is out of scope here.

4. **Historical data beyond current week** — **Descoped.** The app targets current-week data only in v1. Browsing previous weeks is not in scope.

5. **Lock screen accessories** — **Descoped.** Post-launch feature; not part of v1 scope.

6. **Manual time / logbook breakdown** — **Descoped.** The hours dashboard shows total hours and per-day bars; detailed manual-time slot breakdown (autoTracker, status, memo) is not surfaced here.

7. **Offline creation of time entries** — **Descoped.** The app is read-only for contributors; no time entry creation UI.

8. **Payments history list** — **Descoped.** Only the current-week payment amount is used; a full payments history screen is out of scope for v1.

9. **Animated transitions** — **Descoped.** Basic fade/opacity transitions only if trivial; complex animations are post-launch.

---

## Functional Requirements

### FR1: Business Logic — calculateHours and date utilities

Pure functions in `src/lib/hours.ts` that compute all derived data from raw API responses.

**Success Criteria:**
- `calculateHours(timesheetData, paymentsData, hourlyRate, weeklyLimit)` returns a `HoursData` object with: `total`, `average`, `today`, `daily`, `weeklyEarnings`, `todayEarnings`, `hoursRemaining`, `overtimeHours`, `timeRemaining`, `deadline`.
- `total` uses `payments.paidHours` when > 0; falls back to `timesheet.totalHours` (or `timesheet.hourWorked`); defaults to 0 if both null.
- `weeklyEarnings` uses `payments.amount` when > 0; falls back to `total * hourlyRate`.
- `todayEarnings` = `today * hourlyRate`.
- `hoursRemaining` = `Math.max(0, weeklyLimit - total)`.
- `overtimeHours` = `Math.max(0, total - weeklyLimit)`.
- `today` = hours from `timesheet.stats` entry matching today's YYYY-MM-DD local date; returns 0 if not found.
- `daily` = full `stats` array mapped to `DailyEntry[]` with `isToday` flag; empty array if stats absent.
- `deadline` = `getSundayMidnightGMT()` result.
- `timeRemaining` = `deadline.getTime() - Date.now()` (milliseconds; may be negative).
- `calculateHours` is a pure function with no side effects.
- `getSundayMidnightGMT()` returns a `Date` set to 23:59:59 UTC on the Sunday of the current UTC week, regardless of local timezone.
- `getUrgencyLevel(ms)` returns `'none'` for ms > 12h, `'low'` for 3h–12h (inclusive at 12h), `'high'` for 1h–3h, `'critical'` for 0–1h, `'expired'` for negative ms.
- `formatTimeRemaining(ms)` returns human-readable string: `"1d 5h"`, `"12h 30m"`, `"45m"`, `"Expired"` for negative.
- `getWeekStartDate(useUTC)`: when `useUTC=true` uses `Date.UTC()` arithmetic (NOT `toISOString()`); when `false` uses local date arithmetic. Returns YYYY-MM-DD string for Monday.

### FR2: API Layer — fetchTimesheet and fetchPayments

Functions in `src/api/timesheet.ts` and `src/api/payments.ts` that fetch and normalise raw Crossover API data.

**Success Criteria:**
- `fetchTimesheet(config)` implements the 3-strategy fallback: (1) full params, (2) without teamId, (3) minimal (date+period+userId only). Returns the first non-empty array response.
- `fetchTimesheet` uses the payments-API-compatible Monday date from `getWeekStartDate(true)`.
- `fetchPayments(config)` calls `GET /api/v3/users/current/payments?from=...&to=...` with Mon–Sun UTC dates formatted using `Date.UTC()` arithmetic.
- Both functions throw on auth failure (401/403) so React Query can surface error state.
- Both functions accept a `CrossoverConfig` param (imported from `01-foundation` types).

### FR3: React Query Hooks — useTimesheet, usePayments, useHoursData

Hooks in `src/hooks/` that wrap the API functions and handle caching, stale-while-revalidate, and cache failover.

**Success Criteria:**
- `useTimesheet` and `usePayments` each use `queryKey` arrays that include the current week's Monday date so data auto-invalidates each Monday.
- Both hooks set `staleTime: 15 * 60 * 1000` (15 minutes).
- `useHoursData` composes `useTimesheet` and `usePayments`, derives `HoursData` via `calculateHours`, and returns `{ data, isLoading, isStale, cachedAt, error, refetch }`.
- On successful fetch, `useHoursData` writes `HoursData` to `AsyncStorage` key `hours_cache` with a `cachedAt` ISO timestamp.
- On total failure (both queries errored), `useHoursData` reads `hours_cache` from `AsyncStorage` and returns it with `isStale: true` and `cachedAt` populated.
- `isLoading` is `true` only when there is no data at all (neither fresh nor cached).
- `refetch()` triggers manual refetch of both underlying queries.

### FR4: UI Components — DailyBarChart, UrgencyBanner, StatCard

Reusable components in `src/components/` that render dashboard sections.

**Success Criteria:**
- `StatCard` renders a label + value pair with optional subtitle; accepts `label: string`, `value: string`, `subtitle?: string`, `testID?: string`.
- `DailyBarChart` renders 7 columns (Mon–Sun) each with a vertical bar and a day-letter label. Bar height is proportional to hours relative to the maximum hours in the week (or `weeklyLimit / 5` if all zeros). Today's bar uses accent color; past days use muted color; future days use a lighter muted color.
- `DailyBarChart` shows the hours value above each bar (or "–" for 0).
- `UrgencyBanner` renders a countdown string from `formatTimeRemaining(timeRemaining)` with background color driven by `getUrgencyLevel`: none→hidden, low→yellow, high→orange, critical→red, expired→red.
- `UrgencyBanner` renders `null` when urgency is `'none'`.

### FR5: Hours Dashboard Screen

The main screen at `app/(tabs)/index.tsx` that assembles all components.

**Success Criteria:**
- Screen displays: header ("Hourglass" title + QA badge when `config.useQA` is true + settings icon), hero block (total hours large + weekly earnings large), status bar (hoursRemaining or overtimeHours label), today block (today hours + today earnings), average block, `DailyBarChart`, `UrgencyBanner` (conditional), and `ScrollView` with pull-to-refresh.
- When `isLoading` is true and no cached data exists, screen shows a centered `ActivityIndicator`.
- When `isStale` is true, screen shows an orange "Cached: {formatted cachedAt time}" label in the footer.
- When `error` is non-null and no cached data exists, screen shows an error message with a "Retry" button that calls `refetch()`.
- Overtime state: when `overtimeHours > 0`, the status bar shows "X.Xh overtime" in orange instead of "X.Xh remaining".
- Pull-to-refresh triggers `refetch()` and shows the `RefreshControl` spinner while `isLoading`.
- Settings icon navigates to the settings screen (from `02-auth-onboarding`).
- Screen is wrapped in `useConfig()` guard — if no config, redirects to auth flow.

---

## Technical Design

### Files to Reference

- `/Users/Trilogy/Documents/Claude Code/WS/hourglass.js` — `calculateHours()`, `getSundayMidnightGMT()`, `getUrgencyLevel()`, `formatTimeRemaining()`, timesheet fetch with 3-strategy fallback, cache failover pattern
- `/Users/Trilogy/Documents/Claude Code/WS/memory/MEMORY.md` — Timesheet API, Payments API, Critical ID Mapping, Bug Lessons (timezone, payments API uses Mon–Sun UTC)
- `hourglassws/src/api/client.ts` — base API client (from 01-foundation)
- `hourglassws/src/store/config.ts` — `useConfig()`, `CrossoverConfig` type (from 01-foundation)
- `hourglassws/src/types/index.ts` — shared TypeScript types (from 01-foundation)

### Files to Create

```
hourglassws/
  src/
    lib/
      hours.ts              — calculateHours, getSundayMidnightGMT, getUrgencyLevel,
                               formatTimeRemaining, getWeekStartDate
    api/
      timesheet.ts          — fetchTimesheet (3-strategy fallback)
      payments.ts           — fetchPayments
    hooks/
      useTimesheet.ts       — React Query wrapper for timesheet API
      usePayments.ts        — React Query wrapper for payments API
      useHoursData.ts       — Composed hook: merges queries + cache failover
    components/
      DailyBarChart.tsx     — Mon–Sun bar chart (custom View-based)
      UrgencyBanner.tsx     — Countdown banner with urgency color theming
      StatCard.tsx          — Reusable metric card (label + value + subtitle)
  app/
    (tabs)/
      index.tsx             — Hours Dashboard screen
  __tests__/
    lib/
      hours.test.ts         — Unit tests for all lib/hours.ts functions
    components/
      DailyBarChart.test.tsx
      UrgencyBanner.test.tsx
      StatCard.test.tsx
    hooks/
      useHoursData.test.ts
```

### Data Flow

```
app/(tabs)/index.tsx
       │
       ├─ useHoursData()
       │       │
       │       ├─ useTimesheet()
       │       │      └─ fetchTimesheet(config) → GET /api/timetracking/timesheets
       │       │              3-strategy fallback
       │       │
       │       ├─ usePayments()
       │       │      └─ fetchPayments(config) → GET /api/v3/users/current/payments
       │       │
       │       ├─ calculateHours(timesheetData, paymentsData, hourlyRate, weeklyLimit)
       │       │      → HoursData
       │       │
       │       └─ AsyncStorage hours_cache (read on error, write on success)
       │
       ├─ <StatCard> (total hours)
       ├─ <StatCard> (weekly earnings)
       ├─ <StatCard> (today hours + earnings)
       ├─ <StatCard> (average)
       ├─ <DailyBarChart daily={data.daily} weeklyLimit={config.weeklyLimit} />
       └─ <UrgencyBanner timeRemaining={data.timeRemaining} />
```

### Type Definitions

These extend/use types from `01-foundation`. Add to or import from `src/types/index.ts`:

```typescript
export type UrgencyLevel = 'none' | 'low' | 'high' | 'critical' | 'expired';

export interface DailyEntry {
  date: string;       // YYYY-MM-DD
  hours: number;
  isToday: boolean;
}

export interface HoursData {
  total: number;
  average: number;
  today: number;
  daily: DailyEntry[];
  weeklyEarnings: number;
  todayEarnings: number;
  hoursRemaining: number;
  overtimeHours: number;
  timeRemaining: number;  // ms
  deadline: Date;
}

export interface TimesheetResponse {
  totalHours?: number;
  hourWorked?: number;
  averageHoursPerDay: number;
  stats: Array<{ date: string; hours: number }>;
}

export interface PaymentsResponse {
  paidHours: number;
  workedHours: number;
  amount: number;
}
```

### Edge Cases

| Case | Handling |
|------|----------|
| Timesheet returns empty array | All 3 strategies tried; if all empty, treat as null |
| `payments.paidHours === 0` | Fall back to `timesheet.totalHours` or `timesheet.hourWorked` |
| Today not in stats array | `today = 0` |
| Stats array empty | `daily = []`, `today = 0` |
| Both API calls fail | Read from `hours_cache`; show "Cached:" label |
| No cache exists and both fail | Show error with retry button |
| `weeklyLimit` undefined/0 | Default to 40 (standard weekly limit) |
| Deadline already passed | `timeRemaining < 0`, `urgency = 'expired'` |
| Called on Sunday before midnight UTC | Returns end of current day (not next Sunday) |
| `getWeekStartDate(true)` called near midnight local time | UTC midnight may shift date; uses `Date.UTC()` — immune |

### API Date Formatting

**CRITICAL — never use `toISOString()` for local dates:**

```typescript
// CORRECT for Payments API (UTC week boundaries)
const now = new Date();
const dayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat
const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const mondayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday);
const from = new Date(mondayUTC).toISOString().slice(0, 10); // safe: already UTC

// WRONG
const from = new Date().toISOString().slice(0, 10); // shifts timezone
```

### Dependency on 01-foundation

Imports expected from `01-foundation`:
- `apiGet(path, params, config)` — authenticated GET helper from `src/api/client.ts`
- `useConfig()` — returns `CrossoverConfig | null` from `src/store/config.ts`
- `CrossoverConfig` type — includes `userId`, `managerId`, `primaryTeamId`, `hourlyRate`, `weeklyLimit`, `useQA`

If `weeklyLimit` is not present in `CrossoverConfig` from `01-foundation`, default to 40.
