# Spec Research: 03-hours-dashboard

## Problem Context

The main contributor view. Shows weekly hours, earnings, today's hours, daily breakdown, deadline countdown, and urgency state. This is the primary screen users see every time they open the app — it must be fast, clear, and accurate.

## Exploration Findings

### Timesheet API

`GET /api/timetracking/timesheets`
Params: `date=YYYY-MM-DD&period=WEEK&userId={userId}&managerId={managerId}&teamId={teamId}`

3-strategy fallback:
1. Full: `date + managerId + period + teamId + userId`
2. Partial: `date + managerId + period + userId`
3. Minimal: `date + period + userId`

Response used fields:
```javascript
[{
  totalHours: number,         // or hourWorked
  averageHoursPerDay: number,
  stats: [{ date: 'YYYY-MM-DD', hours: number }]  // per-day breakdown
}]
```

### Payments API (earnings source of truth)

`GET /api/v3/users/current/payments?from=YYYY-MM-DD&to=YYYY-MM-DD`

**CRITICAL:** Uses Mon–Sun UTC weeks. Never use `toISOString()` to format local dates — it shifts timezone.

```javascript
[{
  paidHours: number,    // preferred over timesheet totalHours
  workedHours: number,
  amount: number        // weekly earnings in USD
}]
```

### Hours Calculation Logic (from calculateHours)

```javascript
// Source of truth priority:
total = payments.paidHours > 0 ? payments.paidHours : timesheet.totalHours
earnings = payments.amount > 0 ? payments.amount : (total * hourlyRate)
today = timesheet.stats.find(s => s.date === today).hours
average = timesheet.averageHoursPerDay
deadline = getSundayMidnightGMT()  // Sunday 23:59:59 UTC
hoursRemaining = Math.max(0, weeklyLimit - total)
overtimeHours = Math.max(0, total - weeklyLimit)
```

### Deadline Calculation

Sunday midnight UTC — NOT local time. Uses `getUTCDay()` arithmetic.

### Urgency Levels

| Level | Condition | Color |
|-------|-----------|-------|
| none | >12h remaining | Default |
| low | 12h–3h remaining | Yellow |
| high | 3h–1h remaining | Orange |
| critical | <1h remaining | Red |
| expired | Past deadline | Gray/Red |

### Date Utilities

Week start = Monday UTC.
Payments API dates must be formatted with `Date.UTC()` arithmetic — NOT `new Date().toISOString()`.

## Key Decisions

### Decision 1: Two parallel React Query queries
- `useTimesheet` and `usePayments` run in parallel via `Promise.all` semantics
- `calculateHours` runs as a derived selector once both resolve
- Rationale: matches existing parallel fetch behavior, independent stale times

### Decision 2: Stale time 15 minutes, background refetch on focus
- Data older than 15 min triggers background refetch when app comes to foreground
- Rationale: matches widget refresh cycle, keeps dashboard current without hammering API

### Decision 3: Cache failover
- Last successful result stored in AsyncStorage `hours_cache`
- If both queries fail → show cached data with orange "Cached: HH:MM" label
- Rationale: direct port of Scriptable failover behavior

### Decision 4: Bar chart as custom component
- Daily breakdown rendered as a row of vertical bars (Mon–Sun)
- No chart library — simple View with calculated heights
- Rationale: avoids heavy dependency, matches visual style of widget

## Interface Contracts

### Hooks

```typescript
// src/hooks/useHoursData.ts

function useHoursData(): {
  data: HoursData | null
  isLoading: boolean
  isStale: boolean        // showing cached data
  cachedAt: string | null // ISO timestamp if using cache
  error: string | null
  refetch: () => void
}

interface HoursData {
  total: number           // ← payments.paidHours OR timesheet.totalHours
  average: number         // ← timesheet.averageHoursPerDay
  today: number           // ← timesheet.stats[today].hours
  daily: DailyEntry[]     // ← timesheet.stats
  weeklyEarnings: number  // ← payments.amount OR (total * hourlyRate)
  todayEarnings: number   // ← today * hourlyRate
  hoursRemaining: number  // ← Math.max(0, weeklyLimit - total)
  overtimeHours: number   // ← Math.max(0, total - weeklyLimit)
  timeRemaining: number   // ← deadline.getTime() - Date.now() (ms)
  deadline: Date          // ← Sunday 23:59:59 UTC
}

interface DailyEntry {
  date: string            // ← timesheet.stats[n].date (YYYY-MM-DD)
  hours: number           // ← timesheet.stats[n].hours
  isToday: boolean        // ← computed
}
```

### Business Logic

```typescript
// src/lib/hours.ts

function calculateHours(
  timesheetData: TimesheetResponse | null,
  paymentsData: PaymentsResponse | null,
  hourlyRate: number,
  weeklyLimit: number
): HoursData
// Pure function — no side effects, fully testable

function getSundayMidnightGMT(): Date
// Returns Sunday 23:59:59 UTC of current week

function getUrgencyLevel(timeRemainingMs: number): UrgencyLevel
// 'none' | 'low' | 'high' | 'critical' | 'expired'

function formatTimeRemaining(ms: number): string
// "1d 5h" | "12h 30m" | "45m" | "Expired"

function getWeekStartDate(useUTC: boolean): string
// Returns YYYY-MM-DD for Monday of current week
// useUTC=true for Payments API, false for local display
```

### Screen

```
app/(tabs)/index.tsx — Hours Dashboard screen

Sections:
1. Header — "Hourglass" title + QA badge + settings icon
2. Hero — weekly total (large), earnings (large)
3. Status bar — hours remaining OR overtime, deadline countdown
4. Today — today's hours + today's earnings
5. Average — avg hours/day
6. Bar chart — Mon–Sun with per-day hours
7. Urgency banner — shows when <12h to deadline
8. Pull-to-refresh
```

## Test Plan

### calculateHours

**Happy Path:**
- [ ] Returns `payments.paidHours` when > 0 (prefers payments over timesheet)
- [ ] Falls back to `timesheet.totalHours` when `paidHours === 0`
- [ ] Returns `payments.amount` for earnings when > 0
- [ ] Falls back to `total * hourlyRate` when amount is 0
- [ ] Calculates `hoursRemaining = weeklyLimit - total` (floors at 0)
- [ ] Calculates `overtimeHours = total - weeklyLimit` (floors at 0)

**Edge Cases:**
- [ ] Null timesheet → returns zeros with valid deadline
- [ ] Null payments → falls through to timesheet values
- [ ] `today` not found in stats → returns 0
- [ ] Empty stats array → daily is []

### getSundayMidnightGMT

- [ ] Returns Sunday of current week (UTC)
- [ ] Correct when called on Monday (returns 6 days ahead)
- [ ] Correct when called on Sunday (returns end of today)
- [ ] Time component is 23:59:59 UTC

### getUrgencyLevel

- [ ] >12h → 'none'
- [ ] Exactly 12h → 'low'
- [ ] 3h–12h → 'low'
- [ ] 1h–3h → 'high'
- [ ] 0–1h → 'critical'
- [ ] Negative ms → 'expired'

### getWeekStartDate

- [ ] Returns Monday of current week
- [ ] UTC mode: uses `Date.UTC()` arithmetic (NOT toISOString)
- [ ] Local mode: uses local date arithmetic

## Files to Create

```
src/
  hooks/
    useHoursData.ts
    useTimesheet.ts       — React Query wrapper for timesheet API
    usePayments.ts        — React Query wrapper for payments API
  lib/
    hours.ts              — calculateHours, getSundayMidnightGMT,
                           getUrgencyLevel, formatTimeRemaining, getWeekStartDate
  api/
    timesheet.ts          — fetchTimesheet (3-strategy fallback)
    payments.ts           — fetchPayments
  components/
    DailyBarChart.tsx     — Mon–Sun bar chart
    UrgencyBanner.tsx     — countdown + color theming
    StatCard.tsx          — reusable metric card (hours/earnings)

app/(tabs)/
  index.tsx               — Hours dashboard screen
```

## Files to Reference

- `WS/hourglass.js` — `calculateHours()`, `getSundayMidnightGMT()`, `getUrgencyLevel()`, timesheet fetch with 3-strategy fallback
- `WS/memory/MEMORY.md` — Timesheet API, Payments API, Bug Lessons (timezone)
