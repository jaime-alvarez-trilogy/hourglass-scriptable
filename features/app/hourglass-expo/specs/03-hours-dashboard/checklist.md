# Checklist: 03-hours-dashboard

## Phase 3.0 — Tests (Red Phase)

### FR1: Business Logic (hours.ts)

- [ ] `test(FR1)`: calculateHours returns payments.paidHours when > 0
- [ ] `test(FR1)`: calculateHours falls back to timesheet.totalHours when paidHours === 0
- [ ] `test(FR1)`: calculateHours falls back to timesheet.hourWorked when totalHours absent
- [ ] `test(FR1)`: calculateHours defaults total to 0 when both timesheet and payments null
- [ ] `test(FR1)`: calculateHours uses payments.amount for weeklyEarnings when > 0
- [ ] `test(FR1)`: calculateHours falls back to total * hourlyRate when payments.amount === 0
- [ ] `test(FR1)`: calculateHours computes todayEarnings = today * hourlyRate
- [ ] `test(FR1)`: calculateHours computes hoursRemaining = max(0, weeklyLimit - total)
- [ ] `test(FR1)`: calculateHours computes overtimeHours = max(0, total - weeklyLimit)
- [ ] `test(FR1)`: calculateHours finds today from stats array by YYYY-MM-DD match
- [ ] `test(FR1)`: calculateHours returns today = 0 when today not in stats
- [ ] `test(FR1)`: calculateHours returns daily = [] when stats absent
- [ ] `test(FR1)`: calculateHours sets isToday=true on today's DailyEntry
- [ ] `test(FR1)`: getSundayMidnightGMT returns Sunday 23:59:59 UTC of current week
- [ ] `test(FR1)`: getSundayMidnightGMT correct when called on Monday (6 days ahead)
- [ ] `test(FR1)`: getSundayMidnightGMT correct when called on Sunday (end of today)
- [ ] `test(FR1)`: getSundayMidnightGMT time component is 23:59:59 UTC
- [ ] `test(FR1)`: getUrgencyLevel returns 'none' for ms > 12h
- [ ] `test(FR1)`: getUrgencyLevel returns 'low' at exactly 12h
- [ ] `test(FR1)`: getUrgencyLevel returns 'low' for 3h–12h range
- [ ] `test(FR1)`: getUrgencyLevel returns 'high' for 1h–3h range
- [ ] `test(FR1)`: getUrgencyLevel returns 'critical' for 0–1h range
- [ ] `test(FR1)`: getUrgencyLevel returns 'expired' for negative ms
- [ ] `test(FR1)`: formatTimeRemaining returns "Xd Xh" for > 24h
- [ ] `test(FR1)`: formatTimeRemaining returns "Xh Xm" for 1h–24h
- [ ] `test(FR1)`: formatTimeRemaining returns "Xm" for < 1h
- [ ] `test(FR1)`: formatTimeRemaining returns "Expired" for negative ms
- [ ] `test(FR1)`: getWeekStartDate(true) uses Date.UTC arithmetic (not toISOString)
- [ ] `test(FR1)`: getWeekStartDate(false) uses local date arithmetic
- [ ] `test(FR1)`: getWeekStartDate returns Monday of current week

### FR2: API Layer

- [ ] `test(FR2)`: fetchTimesheet calls strategy 1 (full params) first
- [ ] `test(FR2)`: fetchTimesheet falls back to strategy 2 (no teamId) on empty response
- [ ] `test(FR2)`: fetchTimesheet falls back to strategy 3 (minimal) on empty response
- [ ] `test(FR2)`: fetchTimesheet returns first non-empty array response
- [ ] `test(FR2)`: fetchTimesheet uses getWeekStartDate(true) for date param
- [ ] `test(FR2)`: fetchTimesheet throws on 401/403
- [ ] `test(FR2)`: fetchPayments calls correct endpoint with from/to UTC dates
- [ ] `test(FR2)`: fetchPayments formats dates using Date.UTC (not toISOString)
- [ ] `test(FR2)`: fetchPayments throws on 401/403

### FR3: React Query Hooks

- [ ] `test(FR3)`: useTimesheet queryKey includes current week Monday date
- [ ] `test(FR3)`: usePayments queryKey includes current week Monday date
- [ ] `test(FR3)`: useHoursData returns isLoading=true when no data and queries pending
- [ ] `test(FR3)`: useHoursData writes to AsyncStorage hours_cache on success
- [ ] `test(FR3)`: useHoursData reads hours_cache from AsyncStorage on total failure
- [ ] `test(FR3)`: useHoursData returns isStale=true when serving cached data
- [ ] `test(FR3)`: useHoursData returns cachedAt populated when serving cached data
- [ ] `test(FR3)`: useHoursData refetch() triggers both underlying queries

### FR4: UI Components

- [ ] `test(FR4)`: StatCard renders label and value
- [ ] `test(FR4)`: StatCard renders subtitle when provided
- [ ] `test(FR4)`: StatCard omits subtitle when not provided
- [ ] `test(FR4)`: DailyBarChart renders 7 columns (Mon–Sun)
- [ ] `test(FR4)`: DailyBarChart shows day-letter labels
- [ ] `test(FR4)`: DailyBarChart shows hours above each bar (or "–" for 0)
- [ ] `test(FR4)`: DailyBarChart applies accent color to today's bar
- [ ] `test(FR4)`: UrgencyBanner renders null when urgency is 'none'
- [ ] `test(FR4)`: UrgencyBanner renders countdown string when urgency != 'none'
- [ ] `test(FR4)`: UrgencyBanner applies yellow background for 'low'
- [ ] `test(FR4)`: UrgencyBanner applies orange background for 'high'
- [ ] `test(FR4)`: UrgencyBanner applies red background for 'critical' and 'expired'

### FR5: Dashboard Screen

- [ ] `test(FR5)`: Screen shows ActivityIndicator when isLoading and no data
- [ ] `test(FR5)`: Screen shows error message and Retry button when error and no data
- [ ] `test(FR5)`: Screen shows "Cached:" label when isStale=true
- [ ] `test(FR5)`: Screen shows overtime label when overtimeHours > 0
- [ ] `test(FR5)`: Screen shows remaining hours label when overtimeHours === 0
- [ ] `test(FR5)`: Screen shows QA badge when config.useQA=true
- [ ] `test(FR5)`: Screen hides QA badge when config.useQA=false

---

## Phase 3.1 — Implementation

### FR1: Business Logic

- [ ] `feat(FR1)`: Create `src/lib/hours.ts` with calculateHours (all fields per spec)
- [ ] `feat(FR1)`: Implement getSundayMidnightGMT using UTC arithmetic
- [ ] `feat(FR1)`: Implement getUrgencyLevel with 5 levels
- [ ] `feat(FR1)`: Implement formatTimeRemaining (days/hours/minutes/expired)
- [ ] `feat(FR1)`: Implement getWeekStartDate(useUTC) with correct UTC/local branches
- [ ] `feat(FR1)`: Export HoursData, DailyEntry, UrgencyLevel, TimesheetResponse, PaymentsResponse types

### FR2: API Layer

- [ ] `feat(FR2)`: Create `src/api/timesheet.ts` with fetchTimesheet (3-strategy fallback)
- [ ] `feat(FR2)`: Create `src/api/payments.ts` with fetchPayments (UTC date arithmetic)
- [ ] `feat(FR2)`: Both functions accept CrossoverConfig and throw on auth error

### FR3: React Query Hooks

- [ ] `feat(FR3)`: Create `src/hooks/useTimesheet.ts` (staleTime 15min, week-keyed)
- [ ] `feat(FR3)`: Create `src/hooks/usePayments.ts` (staleTime 15min, week-keyed)
- [ ] `feat(FR3)`: Create `src/hooks/useHoursData.ts` (compose + cache failover + AsyncStorage write)

### FR4: UI Components

- [ ] `feat(FR4)`: Create `src/components/StatCard.tsx`
- [ ] `feat(FR4)`: Create `src/components/DailyBarChart.tsx` (7 bars, proportional heights, today accent)
- [ ] `feat(FR4)`: Create `src/components/UrgencyBanner.tsx` (null on 'none', colored otherwise)

### FR5: Dashboard Screen

- [ ] `feat(FR5)`: Create `app/(tabs)/index.tsx` with full screen layout
- [ ] `feat(FR5)`: Implement loading, error, and cached states
- [ ] `feat(FR5)`: Implement pull-to-refresh with RefreshControl
- [ ] `feat(FR5)`: Implement overtime vs remaining status bar logic
- [ ] `feat(FR5)`: Add QA badge conditional on config.useQA
- [ ] `feat(FR5)`: Add useConfig guard with redirect to auth flow

---

## Phase 3.2 — Review

- [ ] Run spec-implementation-alignment check
- [ ] Run pr-review-toolkit:review-pr
- [ ] Address all review feedback
- [ ] Run test-optimiser
- [ ] All tests passing (no skips, no todos)
- [ ] Commit documentation updates (checklist + FEATURE.md)
