# Checklist: 01-widget-visual-ios

## Phase 1.0 — Tests (Red Phase)

### FR1: `isFuture` in WidgetDailyEntry

- [ ] Test: entry with date = yesterday → `isFuture: false`
- [ ] Test: entry with date = today → `isFuture: false`
- [ ] Test: entry with date = tomorrow → `isFuture: true`
- [ ] Test: entry with date = next Sunday → `isFuture: true`
- [ ] Test: gap-filled entry for a future day → `isFuture: true`
- [ ] Test: gap-filled entry for a past day → `isFuture: false`
- [ ] Test: full week — only days after today have `isFuture: true`
- [ ] Test: `now` at midnight exactly — today is not future

### FR2: iOS glass card layout

- [ ] Test: `MediumWidget` renders two `ZStack` elements with `RoundedRectangle` background in hero row
- [ ] Test: each card's `RoundedRectangle` has `cornerRadius ≥ 10`
- [ ] Test: left card contains hoursDisplay text
- [ ] Test: right card contains earnings text
- [ ] Test: `LargeWidget` hero row uses same two-card layout

### FR3: iOS gradient background

- [ ] Test: `SmallWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [ ] Test: `MediumWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [ ] Test: `LargeWidget` outer `ZStack` contains at least 2 `Rectangle` elements
- [ ] Test: first `Rectangle` fill = `#0D0C14`
- [ ] Test: second `Rectangle` fill changes with urgency

### FR4: iOS Large bar chart

- [ ] Test: `IosBarChart` renders exactly 7 column children
- [ ] Test: today column bar uses accent colour
- [ ] Test: future columns use `#2F2E41`
- [ ] Test: past-with-hours columns use `#4A4A6A`
- [ ] Test: column with max hours has bar height ≈ `MAX_BAR_HEIGHT` (within 5%)
- [ ] Test: zero-hours column has bar height = 0
- [ ] Test: day labels render as 3-char strings ("Mon", "Tue", etc.)
- [ ] Test: all-zero `daily` input → no division-by-zero, all heights 0
- [ ] Test: single non-zero entry → that column bar height = `MAX_BAR_HEIGHT`
- [ ] Test: `LargeWidget` renders `IosBarChart` in its layout

---

## Phase 1.1 — Implementation

### FR1: `isFuture` field

- [ ] Add `isFuture: boolean` to `WidgetDailyEntry` in `src/widgets/types.ts`
- [ ] Add optional `now: Date` param to `buildDailyEntries()` in `src/widgets/bridge.ts`
- [ ] Add `startOfDay()` helper in `bridge.ts`
- [ ] Compute `isFuture` for real entries in `buildDailyEntries()`
- [ ] Compute `isFuture` for gap-filled entries using week-Monday + dayIndex reconstruction
- [ ] Verify all existing `bridge.test.ts` tests pass with updated signature

### FR2: iOS glass cards

- [ ] Add `CARD_BG = '#1F1E2C'` and `CARD_BORDER = '#2F2E41'` constants in `ios/HourglassWidget.tsx`
- [ ] Implement `IosGlassCard` render helper (ZStack + RoundedRectangle + VStack)
- [ ] Refactor `MediumWidget` hero row to use two `IosGlassCard` elements
- [ ] Refactor `LargeWidget` hero row to use two `IosGlassCard` elements

### FR3: iOS gradient background

- [ ] Add `URGENCY_TINTS` constant (none/low/medium/high) in `ios/HourglassWidget.tsx`
- [ ] Remove `background` prop from `SmallWidget` root `VStack`; wrap in gradient `ZStack`
- [ ] Remove `background` prop from `MediumWidget` root `VStack`; wrap in gradient `ZStack`
- [ ] Remove `background` prop from `LargeWidget` root `VStack`; wrap in gradient `ZStack`

### FR4: iOS Large bar chart

- [ ] Add `MAX_BAR_HEIGHT = 100` constant in `ios/HourglassWidget.tsx`
- [ ] Add `BAR_PAST = '#4A4A6A'` and `BAR_MUTED = '#2F2E41'` constants
- [ ] Implement `IosBarChart` render helper (HStack of 7 VStack columns)
- [ ] Add division-by-zero guard in `IosBarChart`
- [ ] Add `IosBarChart` to `LargeWidget` layout below hero row
- [ ] Run full test suite; ensure all tests pass

---

## Phase 1.2 — Review

- [ ] Run `spec-implementation-alignment`: verify implementation matches all FR success criteria
- [ ] Run `pr-review-toolkit:review-pr`: address any structural/style feedback
- [ ] Run `test-optimiser`: remove redundant tests, improve coverage gaps
- [ ] Final test run: all tests green
