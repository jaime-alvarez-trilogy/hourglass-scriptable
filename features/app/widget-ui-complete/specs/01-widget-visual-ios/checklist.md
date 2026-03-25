# Checklist: 01-widget-visual-ios

## Phase 1.0 — Tests (Red Phase)

### FR1: `isFuture` in WidgetDailyEntry

- [x] Test: entry with date = yesterday → `isFuture: false`
- [x] Test: entry with date = today → `isFuture: false`
- [x] Test: entry with date = tomorrow → `isFuture: true`
- [x] Test: entry with date = next Sunday → `isFuture: true`
- [x] Test: gap-filled entry for a future day → `isFuture: true`
- [x] Test: gap-filled entry for a past day → `isFuture: false`
- [x] Test: full week — only days after today have `isFuture: true`
- [x] Test: `now` at midnight exactly — today is not future

### FR2: iOS glass card layout

- [x] Test: `MediumWidget` renders two `ZStack` elements with `RoundedRectangle` background in hero row
- [x] Test: each card's `RoundedRectangle` has `cornerRadius ≥ 10`
- [x] Test: left card contains hoursDisplay text
- [x] Test: right card contains earnings text
- [x] Test: `LargeWidget` hero row uses same two-card layout

### FR3: iOS gradient background

- [x] Test: `SmallWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [x] Test: `MediumWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [x] Test: `LargeWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [x] Test: first `Rectangle` fill = `#0D0C14`
- [x] Test: second `Rectangle` fill changes with urgency

### FR4: iOS Large bar chart

- [x] Test: `IosBarChart` renders exactly 7 column children
- [x] Test: today column bar uses accent colour
- [x] Test: future columns use `#2F2E41`
- [x] Test: past-with-hours columns use `#4A4A6A`
- [x] Test: column with max hours has bar height ≈ `MAX_BAR_HEIGHT` (within 5%)
- [x] Test: zero-hours column has bar height = 0
- [x] Test: day labels render as 3-char strings ("Mon", "Tue", etc.)
- [x] Test: all-zero `daily` input → no division-by-zero, all heights 0
- [x] Test: single non-zero entry → that column bar height = `MAX_BAR_HEIGHT`
- [x] Test: `LargeWidget` renders `IosBarChart` in its layout

---

## Phase 1.1 — Implementation

### FR1: `isFuture` field

- [x] Add `isFuture: boolean` to `WidgetDailyEntry` in `src/widgets/types.ts`
- [x] Add optional `now: Date` param to `buildDailyEntries()` in `src/widgets/bridge.ts`
- [x] Add `startOfDay()` helper in `bridge.ts`
- [x] Compute `isFuture` for real entries in `buildDailyEntries()`
- [x] Compute `isFuture` for gap-filled entries using week-Monday + dayIndex reconstruction
- [x] Verify all existing `bridge.test.ts` tests pass with updated signature

### FR2: iOS glass cards

- [x] Add `CARD_BG = '#1F1E2C'` and `CARD_BORDER = '#2F2E41'` constants in `ios/HourglassWidget.tsx`
- [x] Implement `IosGlassCard` render helper (ZStack + RoundedRectangle + VStack)
- [x] Refactor `MediumWidget` hero row to use two `IosGlassCard` elements
- [x] Refactor `LargeWidget` hero row to use two `IosGlassCard` elements

### FR3: iOS gradient background

- [x] Add `URGENCY_TINTS` constant (none/low/medium/high) in `ios/HourglassWidget.tsx`
- [x] Remove `background` prop from `SmallWidget` root `VStack`; wrap in gradient `ZStack`
- [x] Remove `background` prop from `MediumWidget` root `VStack`; wrap in gradient `ZStack`
- [x] Remove `background` prop from `LargeWidget` root `VStack`; wrap in gradient `ZStack`

### FR4: iOS Large bar chart

- [x] Add `MAX_BAR_HEIGHT = 100` constant in `ios/HourglassWidget.tsx`
- [x] Add `BAR_PAST = '#4A4A6A'` and `BAR_MUTED = '#2F2E41'` constants
- [x] Implement `IosBarChart` render helper (HStack of 7 VStack columns)
- [x] Add division-by-zero guard in `IosBarChart`
- [x] Add `IosBarChart` to `LargeWidget` layout below hero row
- [x] Run full test suite; ensure all tests pass

---

## Phase 1.2 — Review

- [x] Run `spec-implementation-alignment`: verify implementation matches all FR success criteria
- [x] Run `pr-review-toolkit:review-pr`: address any structural/style feedback
- [x] Run `test-optimiser`: remove redundant tests, improve coverage gaps
- [x] Final test run: all tests green

---

## Session Notes

**2026-03-25**: Spec execution complete.
- Phase 1.0: 1 test commit (FR1–FR4, 30 tests)
- Phase 1.1: 1 implementation commit (FR1–FR4: types.ts, bridge.ts, ios/HourglassWidget.tsx)
- Phase 1.2: Alignment pass, test optimisation pass — no fixes needed
- All 216 widget tests passing.
- Key implementation notes:
  - expo-widgets `'widget'` directive inside `createWidget` callback causes Babel to transform module default export; named exports (`SmallWidget`, `MediumWidget`, `LargeWidget`) used for testability
  - `buildDailyEntries` signature extended with optional `now: Date` for test injection
  - `isFuture` for gap-filled entries uses `getWeekMonday(now) + dayIndex` reconstruction
