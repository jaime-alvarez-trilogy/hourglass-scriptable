# Checklist: 05-hours-dashboard

## Phase 5.0 — Tests (Red Phase)

### FR1: `computeDaysElapsed()` utility
- [ ] `test(FR1)`: Extend `src/lib/__tests__/panelState.test.ts`
  - [ ] Monday 08:00 → 1
  - [ ] Monday 00:00:00 → 0 (edge: very start of week)
  - [ ] Friday 23:59 → 5
  - [ ] Saturday 10:00 → 5 (weekend clamps to 5)
  - [ ] Sunday 10:00 → 5 (weekend clamps to 5)
  - [ ] Wednesday 12:00 → 3
  - [ ] No argument → no crash, returns 0–5

### FR2: `getWeeklyEarningsTrend()` utility
- [ ] `test(FR2)`: Create `src/lib/__tests__/payments.test.ts`
  - [ ] Empty payments → `[0, 0, 0, 0]` (4 zeros)
  - [ ] 4 payments with distinct weeks → `[w1, w2, w3, w4]` chronological order
  - [ ] 2 payments (2 distinct weeks) with numWeeks=4 → `[0, 0, w1, w2]` (padded)
  - [ ] `numWeeks=6` with 4 weeks data → `[0, 0, w1, w2, w3, w4]`
  - [ ] 2 payments sharing same `from` date → summed into 1 week value
  - [ ] `Payment` interface exported from `src/lib/payments.ts` (static source check)

### FR3: Hero zone
- [ ] `test(FR3)`: Create `app/(tabs)/__tests__/index.test.tsx`
  - [ ] Renders without crash when `isLoading=true` and `data=null`
  - [ ] Settings button `testID="settings-button"` navigates to `/modal` on press
  - [ ] QA badge `testID="qa-badge"` visible when `config.useQA=true`
  - [ ] QA badge absent when `config.useQA=false`
  - [ ] State badge `testID="state-badge"` visible when data is present
  - [ ] Source file: contains `PanelGradient` import (static)
  - [ ] Source file: contains `computePanelState` and `computeDaysElapsed` (static)
  - [ ] Source file: no `StyleSheet` import (static)
  - [ ] Source file: no hardcoded hex strings `/#[0-9A-Fa-f]{3,8}/` (static)

### FR4: Weekly chart zone
- [ ] `test(FR4)`: Add to `app/(tabs)/__tests__/index.test.tsx`
  - [ ] `WeeklyBarChart` import present in source (static)
  - [ ] `SkeletonLoader` shown in chart zone when `isLoading=true` and `data=null`
  - [ ] Source: `mapDailyToChartData` or equivalent produces 7-entry array (static)

### FR5: Earnings zone
- [ ] `test(FR5)`: Add to `app/(tabs)/__tests__/index.test.tsx`
  - [ ] `TrendSparkline` import present in source (static)
  - [ ] Source contains `colors.gold` reference for sparkline (static)
  - [ ] `SkeletonLoader` shown in earnings zone when loading (render test)
  - [ ] Source: contains `getWeeklyEarningsTrend` call (static)

### FR6: Loading / error states
- [ ] `test(FR6)`: Add to `app/(tabs)/__tests__/index.test.tsx`
  - [ ] Error banner `testID="error-banner"` visible when `error !== null && data === null`
  - [ ] Retry button `testID="retry-button"` calls `refetch()` on press
  - [ ] No full-screen spinner — source does not contain `ActivityIndicator` (static)
  - [ ] Stale indicator visible when `isStale=true && cachedAt !== null`

### FR7: UrgencyBanner design tokens
- [ ] `test(FR7)`: Extend `src/components/__tests__/UrgencyBanner.test.tsx`
  - [ ] Source: no `StyleSheet` import (static)
  - [ ] Source: no hardcoded hex strings (static)
  - [ ] Source: contains `bg-warning` and `bg-critical` classNames (static)
  - [ ] Existing render tests: `testID="urgency-banner"` still present
  - [ ] Banner returns null when `level === 'none'` (render test)

---

## Test Design Validation (MANDATORY)

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching `HoursData` interface from `src/lib/hours.ts`
- [ ] Fix any issues identified before proceeding

---

## Phase 5.1 — Implementation

### FR1: `computeDaysElapsed()` utility
- [ ] `feat(FR1)`: Add `computeDaysElapsed(now?: Date): number` to `src/lib/panelState.ts`
  - [ ] Uses `now.getDay()` (local timezone)
  - [ ] Sunday (0) → 5, Saturday (6) → 5
  - [ ] Monday at exactly 00:00:00 → 0
  - [ ] Monday otherwise → 1
  - [ ] Tue → 2, Wed → 3, Thu → 4, Fri → 5
  - [ ] Defaults to `new Date()` when `now` not provided
  - [ ] Run FR1 tests — GREEN

### FR2: `getWeeklyEarningsTrend()` utility
- [ ] `feat(FR2)`: Create `src/lib/payments.ts`
  - [ ] Export `Payment` interface: `{ amount: number; from: string; to: string }`
  - [ ] Export `getWeeklyEarningsTrend(payments, numWeeks=4): number[]`
  - [ ] Groups by `from` date, sums amounts per week
  - [ ] Returns exactly `numWeeks` entries, padded with zeros at start
  - [ ] Run FR2 tests — GREEN

### FR2 support: `usePaymentHistory` hook
- [ ] `feat(FR2)`: Create `src/hooks/usePaymentHistory.ts`
  - [ ] Fetches payments for last `numWeeks` weeks (wider date range than `usePayments`)
  - [ ] Returns `{ data: Payment[] | null; isLoading: boolean }`
  - [ ] Uses same auth pattern as `usePayments` (credentials + token)

### FR7: UrgencyBanner design tokens
- [ ] `feat(FR7)`: Update `src/components/UrgencyBanner.tsx`
  - [ ] Remove `StyleSheet` import and `StyleSheet.create` call
  - [ ] Add `URGENCY_CLASSES` constant with `bg-warning` / `bg-critical` map
  - [ ] Replace inline style on `View` with `className={URGENCY_CLASSES[level] + '...'}`
  - [ ] Replace `Text` color with `text-background`
  - [ ] Run FR7 tests — GREEN
  - [ ] Run existing UrgencyBanner tests — all still GREEN

### FR3: Hero zone
- [ ] `feat(FR3)`: Rebuild `app/(tabs)/index.tsx` — hero zone
  - [ ] Import `PanelGradient`, `MetricValue`, `SectionLabel`, `SkeletonLoader`
  - [ ] Import `computePanelState`, `computeDaysElapsed` from `src/lib/panelState`
  - [ ] `panelState` computed via `computePanelState(data?.total??0, weeklyLimit, computeDaysElapsed())`
  - [ ] `PanelGradient` wraps hero content with `state={panelState}`
  - [ ] `StateBadge` inline component with `testID="state-badge"` and correct STATE_LABELS/STATE_COLORS
  - [ ] Sub-metrics row: today, average, hoursRemaining
  - [ ] Header: "Hourglass" title + optional QA badge + settings button
  - [ ] No `StyleSheet` import in `index.tsx`
  - [ ] No hardcoded hex strings in `index.tsx`
  - [ ] Run FR3 tests — GREEN

### FR4: Weekly chart zone
- [ ] `feat(FR4)`: Add chart zone to `app/(tabs)/index.tsx`
  - [ ] `mapDailyToChartData()` produces `DailyHours[7]` (Mon–Sun)
  - [ ] `WeeklyBarChart` in `Card` with `SectionLabel "THIS WEEK"`
  - [ ] `onLayout` state for chart dimensions
  - [ ] `maxHours = Math.max(8, weeklyLimit / 5)`
  - [ ] Day labels Mon–Sun below chart
  - [ ] `SkeletonLoader height={120}` when loading
  - [ ] Run FR4 tests — GREEN

### FR5: Earnings zone
- [ ] `feat(FR5)`: Add earnings zone to `app/(tabs)/index.tsx`
  - [ ] `"$"` prefix `Text` + `MetricValue` in flex row
  - [ ] `MetricValue` with `colorClass="text-gold"`, `precision={0}`
  - [ ] Today's earnings as secondary `Text`
  - [ ] `TrendSparkline` with `color={colors.gold}` in `onLayout` view
  - [ ] `getWeeklyEarningsTrend(paymentHistory ?? [])` for sparkline data
  - [ ] `SkeletonLoader` for both earnings amount and sparkline when loading
  - [ ] Run FR5 tests — GREEN

### FR6: Loading / error states
- [ ] `feat(FR6)`: Add all states to `app/(tabs)/index.tsx`
  - [ ] Loading state: `SkeletonLoader` in all 3 zones (no ActivityIndicator replacing layout)
  - [ ] Error banner with `testID="error-banner"` and `testID="retry-button"`
  - [ ] Stale cache label with `text-warning` class
  - [ ] `RefreshControl` with `tintColor={colors.success}`
  - [ ] Run FR6 tests — GREEN

### Deletions
- [ ] Verify `DailyBarChart` not imported anywhere except `index.tsx` (grep check)
- [ ] Verify `StatCard` not imported anywhere except `index.tsx` (grep check)
- [ ] Delete `src/components/DailyBarChart.tsx`
- [ ] Delete `src/components/StatCard.tsx`

### Integration
- [ ] Run full test suite — all tests GREEN, no regressions

---

## Phase 5.2 — Review (MANDATORY)

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(05-hours-dashboard): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(05-hours-dashboard): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests
- [ ] Code follows existing NativeWind + Reanimated patterns from specs 01–04

---

## Session Notes

<!-- Add notes as you work -->
