# Implementation Checklist

Spec: `02-widget-visual-android`
Feature: `widget-ui-complete`

---

## Phase 1.0: Test Foundation

### FR1: GlassPanel Inner Card Opacity
- [x] Write test asserting `GlassPanel` inner `FlexWidget` has `backgroundColor: '#1F1E2C'`
- [x] Write test asserting `GlassPanel` outer `FlexWidget` retains `backgroundColor: '#2F2E41'` (unchanged)
- [x] Write test confirming no structural changes to `GlassPanel` (padding, borderRadius unchanged)

### FR2: `buildBarChartSvg` Function
- [x] Write test: returns string starting with `<svg`
- [x] Write test: SVG contains exactly 7 `<rect` elements
- [x] Write test: SVG contains exactly 7 `<text` elements
- [x] Write test: today bar has `fill` equal to `accentColor`
- [x] Write test: past bar with `hours > 0` has `fill="#4A4A6A"`
- [x] Write test: future bar (`isFuture: true`) has `fill="#2F2E41"`
- [x] Write test: past bar with `hours = 0` has `fill="#2F2E41"`
- [x] Write test: all bars have height >= 2 (floor enforced)
- [x] Write edge case test: all hours = 0 → all bars at minimum 2px, no error thrown
- [x] Write edge case test: today hours = max → today bar height equals `barAreaHeight`
- [x] Write edge case test: exactly 7 entries → exactly 7 bars rendered
- [x] Write edge case test: `accentColor = '#FF2D55'` → today bar fill is `#FF2D55`

### FR3: MediumWidget Hours Mode Bar Chart Integration
- [x] Write test: MediumWidget Hours mode renders a `SvgWidget` after the BrainLift row
- [x] Write test: `SvgWidget` `svg` prop starts with `<svg`
- [x] Write test: `SvgWidget` `height` prop is `40`
- [x] Write test: chart receives `data.daily` array
- [x] Write test: chart uses `URGENCY_ACCENT[data.urgency]` as `accentColor`

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [x] Run `red-phase-test-validator` agent
- [x] All FR success criteria have test coverage
- [x] Assertions are specific (not just "exists" or "doesn't throw")
- [x] Mocks return realistic data matching interface contracts (7 `WidgetDailyEntry` objects with `isToday`, `isFuture`, `hours` fields)
- [x] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: GlassPanel Inner Card Opacity
- [x] Change inner `FlexWidget` `backgroundColor` from `'#16151F'` to `'#1F1E2C'` in `GlassPanel` (single line change)
- [x] Verify outer `FlexWidget` `backgroundColor: '#2F2E41'` is untouched
- [x] Run existing `GlassPanel` tests to confirm passing

### FR2: `buildBarChartSvg` Function
- [x] Implement `buildBarChartSvg(daily, width, barAreaHeight, accentColor): string` in `HourglassWidget.tsx`
- [x] Export the function (so tests can import it directly)
- [x] Implement layout geometry: `colW = width / 7`, `barW = colW * 0.6`
- [x] Implement `maxHours = Math.max(...daily.map(d => d.hours), 0.01)` (division-by-zero guard)
- [x] Implement bar colouring: today → `accentColor`, future/zero → `#2F2E41`, past-with-hours → `#4A4A6A`
- [x] Implement minimum bar height: `Math.max(Math.round(...), 2)`
- [x] Implement day labels: `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']`, `font-size="9"`, centered
- [x] SVG total height: `barAreaHeight + 12`
- [x] Run FR2 tests to confirm all passing

### FR3: MediumWidget Hours Mode Bar Chart Integration
- [x] Locate BrainLift row in MediumWidget Hours mode (lines ~498–617 in `HourglassWidget.tsx`)
- [x] Insert `<SvgWidget svg={buildBarChartSvg(data.daily, 280, 28, accent)} style={{ width: 280, height: 40 }} />` after BrainLift row, before stale indicator
- [x] Confirm `SvgWidget` is already imported (no new imports needed)
- [x] Run FR3 tests to confirm passing
- [x] Run full widget test suite to confirm no regressions (375/375 passing)

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [x] Run `spec-implementation-alignment` agent
- [x] All FR success criteria verified in code
- [x] Interface contracts match implementation
- [x] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [x] Run `pr-review-toolkit:review-pr` skill (diff reviewed, TypeScript check clean)

### Step 2: Address Feedback
- [x] Fix HIGH severity issues (none found)
- [x] Fix MEDIUM severity issues (none found)
- [x] Re-run tests after fixes
- [x] Updated pre-existing test that asserted old colour #16151F → now asserts #1F1E2C

### Step 3: Test Quality Optimization
- [x] Run `test-optimiser` agent on modified tests
- [x] Tests use specific rect height extraction, colour assertions, exact count matching — strong
- [x] Re-run tests to confirm passing

### Final Verification
- [x] All tests passing (375/375 across 7 test suites)
- [x] No regressions in existing tests
- [x] Code follows existing SVG string generation patterns (`buildMeshSvg`, `blProgressBar`)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-25**: Spec created. Blocked-by dependency (01-widget-visual-ios) confirmed complete. `WidgetDailyEntry.isFuture` is available.
**2026-03-25**: Spec execution complete.
- Phase 1.0: 3 test commits (FR1, FR2, FR3 in single file, red phase verified — 22 failures before impl)
- Phase 1.1: FR1 (colour change), FR2 (buildBarChartSvg), FR3 (MediumWidget integration) — 375/375 passing
- Phase 1.2: Alignment PASS, no feedback issues, pre-existing test updated to new colour value
- All tests green. No regressions.
