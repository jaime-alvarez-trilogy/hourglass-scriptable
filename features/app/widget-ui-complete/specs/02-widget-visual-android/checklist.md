# Implementation Checklist

Spec: `02-widget-visual-android`
Feature: `widget-ui-complete`

---

## Phase 1.0: Test Foundation

### FR1: GlassPanel Inner Card Opacity
- [ ] Write test asserting `GlassPanel` inner `FlexWidget` has `backgroundColor: '#1F1E2C'`
- [ ] Write test asserting `GlassPanel` outer `FlexWidget` retains `backgroundColor: '#2F2E41'` (unchanged)
- [ ] Write test confirming no structural changes to `GlassPanel` (padding, borderRadius unchanged)

### FR2: `buildBarChartSvg` Function
- [ ] Write test: returns string starting with `<svg`
- [ ] Write test: SVG contains exactly 7 `<rect` elements
- [ ] Write test: SVG contains exactly 7 `<text` elements
- [ ] Write test: today bar has `fill` equal to `accentColor`
- [ ] Write test: past bar with `hours > 0` has `fill="#4A4A6A"`
- [ ] Write test: future bar (`isFuture: true`) has `fill="#2F2E41"`
- [ ] Write test: past bar with `hours = 0` has `fill="#2F2E41"`
- [ ] Write test: all bars have height >= 2 (floor enforced)
- [ ] Write edge case test: all hours = 0 → all bars at minimum 2px, no error thrown
- [ ] Write edge case test: today hours = max → today bar height equals `barAreaHeight`
- [ ] Write edge case test: exactly 7 entries → exactly 7 bars rendered
- [ ] Write edge case test: `accentColor = '#FF2D55'` → today bar fill is `#FF2D55`

### FR3: MediumWidget Hours Mode Bar Chart Integration
- [ ] Write test: MediumWidget Hours mode renders a `SvgWidget` after the BrainLift row
- [ ] Write test: `SvgWidget` `svg` prop starts with `<svg`
- [ ] Write test: `SvgWidget` `height` prop is `40`
- [ ] Write test: chart receives `data.daily` array
- [ ] Write test: chart uses `URGENCY_ACCENT[data.urgency]` as `accentColor`

---

## Test Design Validation (MANDATORY)

⚠️ **Validate test design BEFORE implementing.** Weak tests lead to weak implementation.

- [ ] Run `red-phase-test-validator` agent
- [ ] All FR success criteria have test coverage
- [ ] Assertions are specific (not just "exists" or "doesn't throw")
- [ ] Mocks return realistic data matching interface contracts (7 `WidgetDailyEntry` objects with `isToday`, `isFuture`, `hours` fields)
- [ ] Fix any issues identified before proceeding

---

## Phase 1.1: Implementation

### FR1: GlassPanel Inner Card Opacity
- [ ] Change inner `FlexWidget` `backgroundColor` from `'#16151F'` to `'#1F1E2C'` in `GlassPanel` (single line change)
- [ ] Verify outer `FlexWidget` `backgroundColor: '#2F2E41'` is untouched
- [ ] Run existing `GlassPanel` tests to confirm passing

### FR2: `buildBarChartSvg` Function
- [ ] Implement `buildBarChartSvg(daily, width, barAreaHeight, accentColor): string` in `HourglassWidget.tsx`
- [ ] Export the function (so tests can import it directly)
- [ ] Implement layout geometry: `colW = width / 7`, `barW = colW * 0.6`
- [ ] Implement `maxHours = Math.max(...daily.map(d => d.hours), 0.01)` (division-by-zero guard)
- [ ] Implement bar colouring: today → `accentColor`, future/zero → `#2F2E41`, past-with-hours → `#4A4A6A`
- [ ] Implement minimum bar height: `Math.max(Math.round(...), 2)`
- [ ] Implement day labels: `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']`, `font-size="9"`, centered
- [ ] SVG total height: `barAreaHeight + 12`
- [ ] Run FR2 tests to confirm all passing

### FR3: MediumWidget Hours Mode Bar Chart Integration
- [ ] Locate BrainLift row in MediumWidget Hours mode (lines ~498–617 in `HourglassWidget.tsx`)
- [ ] Insert `<SvgWidget svg={buildBarChartSvg(data.daily, 280, 28, URGENCY_ACCENT[data.urgency])} width={280} height={40} />` after BrainLift row, before stale indicator
- [ ] Confirm `SvgWidget` is already imported (no new imports needed)
- [ ] Run FR3 tests to confirm passing
- [ ] Run full widget test suite to confirm no regressions

---

## Phase 1.2: Review (MANDATORY)

⚠️ **DO NOT skip this phase.** All four steps are mandatory for every change.

### Step 0: Spec-Implementation Alignment
- [ ] Run `spec-implementation-alignment` agent
- [ ] All FR success criteria verified in code
- [ ] Interface contracts match implementation
- [ ] No scope creep or shortfall

### Step 1: Comprehensive PR Review
- [ ] Run `pr-review-toolkit:review-pr` skill (launches 6 specialized agents)

### Step 2: Address Feedback
- [ ] Fix HIGH severity issues (critical)
- [ ] Fix MEDIUM severity issues (or document why deferred)
- [ ] Re-run tests after fixes
- [ ] Commit fixes: `fix(02-widget-visual-android): {description}`

### Step 3: Test Quality Optimization
- [ ] Run `test-optimiser` agent on modified tests
- [ ] Apply suggested improvements that strengthen confidence
- [ ] Re-run tests to confirm passing
- [ ] Commit if changes made: `fix(02-widget-visual-android): strengthen test assertions`

### Final Verification
- [ ] All tests passing
- [ ] No regressions in existing tests (216 passing from Spec 01 still green)
- [ ] Code follows existing SVG string generation patterns (`buildMeshSvg`, `blProgressBar`)

---

## Session Notes

<!-- Add notes as you work -->

**2026-03-25**: Spec created. Blocked-by dependency (01-widget-visual-ios) confirmed complete. `WidgetDailyEntry.isFuture` is available.
