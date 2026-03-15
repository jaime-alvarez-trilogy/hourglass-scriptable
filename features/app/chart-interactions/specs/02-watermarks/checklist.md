# Checklist: 02-watermarks

**Spec:** [spec.md](./spec.md)
**Status:** Ready for implementation

---

## Phase 2.0 — Tests (Red Phase)

Write all tests before any implementation. All tests must fail initially.

### FR1: WeeklyBarChart watermark label

- [ ] `test(FR1)`: When `watermarkLabel="38.5h"` provided — source contains a Skia `<Text>` render with that string
- [ ] `test(FR1)`: Watermark opacity ≤ 0.10 (verify opacity prop on the Text element)
- [ ] `test(FR1)`: Watermark is horizontally centered — x position derived from width/2 minus half text width
- [ ] `test(FR1)`: Watermark is vertically centered — y position near height/2
- [ ] `test(FR1)`: `watermarkLabel` undefined → no watermark Text element rendered (no crash)
- [ ] `test(FR1)`: `watermarkLabel=""` → no watermark Text element rendered

### FR2: AIConeChart legend row

- [ ] `test(FR2)`: When `size="full"` → legend row rendered with 3 items containing "AI%", "75% target", "projected"
- [ ] `test(FR2)`: Legend references `HOLO_GLOW` (`#38BDF8`) for AI% indicator
- [ ] `test(FR2)`: Legend references `AMBER_CORE` (`#FCD34D`) for target indicator
- [ ] `test(FR2)`: Legend references `PROJ_COLOR` (`#818CF8`) for projected indicator
- [ ] `test(FR2)`: When `size="compact"` → no legend rendered

### FR3: TrendSparkline cap label

- [ ] `test(FR3)`: When `showGuide && capLabel="$2,000"` → Skia `<Text>` element in source with that string
- [ ] `test(FR3)`: Cap label opacity ≤ 0.40
- [ ] `test(FR3)`: Cap label x position ≈ right edge (x near width - padding)
- [ ] `test(FR3)`: `capLabel` without `showGuide` → no cap label rendered
- [ ] `test(FR3)`: `capLabel` undefined → no crash, no label rendered

### FR4: Home tab prop wiring

- [ ] `test(FR4)`: `WeeklyBarChart` receives `watermarkLabel` prop derived from `hoursData.total`
- [ ] `test(FR4)`: Earnings `TrendSparkline` receives `showGuide`, `maxValue`, and `capLabel` props

---

## Phase 2.1 — Implementation

Implement each FR to make its tests pass. Run tests after each FR.

### FR1: WeeklyBarChart watermark label

- [ ] `feat(FR1)`: Add `watermarkLabel?: string` to `WeeklyBarChartProps` interface
- [ ] `feat(FR1)`: Import `matchFont` and `Text` from `@shopify/react-native-skia`
- [ ] `feat(FR1)`: Add `const font = matchFont({ fontFamily: 'System', fontSize: 52 })` inside component
- [ ] `feat(FR1)`: Render centered Skia `<Text>` inside Canvas, guarded by `watermarkLabel && font`
- [ ] `feat(FR1)`: Opacity ≤ 0.10 (target 0.07)
- [ ] `feat(FR1)`: Verify FR1 tests pass

### FR2: AIConeChart legend row

- [ ] `feat(FR2)`: Wrap AIConeChart Canvas in `<View>` when `size === 'full'`
- [ ] `feat(FR2)`: Add legend row below Canvas with 3 items (AI%, 75% target, projected)
- [ ] `feat(FR2)`: Use existing color constants (`HOLO_GLOW`, `AMBER_CORE`, `PROJ_COLOR`)
- [ ] `feat(FR2)`: Guard: `size === 'compact'` renders no legend
- [ ] `feat(FR2)`: Verify FR2 tests pass

### FR3: TrendSparkline cap label

- [ ] `feat(FR3)`: Add `capLabel?: string` to `TrendSparklineProps` interface
- [ ] `feat(FR3)`: Import `Text` and `matchFont` from `@shopify/react-native-skia`
- [ ] `feat(FR3)`: Render Skia `<Text>` at right edge of guide line, guarded by `showGuide && capLabel && font`
- [ ] `feat(FR3)`: Opacity ≤ 0.40 (target 0.35), font size 10sp, right-aligned
- [ ] `feat(FR3)`: Verify FR3 tests pass

### FR4: Home tab prop wiring

- [ ] `feat(FR4)`: Pass `watermarkLabel` to `WeeklyBarChart` in `app/(tabs)/index.tsx`
- [ ] `feat(FR4)`: Pass `showGuide`, `maxValue`, `capLabel` to earnings `TrendSparkline`
- [ ] `feat(FR4)`: Use graceful fallbacks when data is loading
- [ ] `feat(FR4)`: Verify FR4 tests pass

### Integration

- [ ] Run full test suite — all tests passing
- [ ] No TypeScript errors

---

## Phase 2.2 — Review

Sequential gates — do not parallelize.

- [ ] `spec-implementation-alignment`: Validate implementation matches all FR success criteria
- [ ] `pr-review-toolkit:review-pr`: Code review pass
- [ ] Address any review feedback
- [ ] `test-optimiser`: Review tests for redundancy and coverage gaps
- [ ] Final test run — all passing

---

## Session Notes

<!-- Added by spec-executor on completion -->
