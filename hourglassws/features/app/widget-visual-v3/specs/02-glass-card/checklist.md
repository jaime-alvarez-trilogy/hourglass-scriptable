# Checklist: 02-glass-card

## Phase 2.0 — Tests (Red Phase)

### FR1: Fill opacity updated to 75%
- [ ] Write test: `IosGlassCard` renders `RoundedRectangle` with `fill="#1C1E26BF"`
- [ ] Write test: no `RoundedRectangle` in `IosGlassCard` has `fill="#1C1E26CC"` (old 80% value)

### FR2: Specular edge hardcoded to 15% white
- [ ] Write test: `IosGlassCard` renders `RoundedRectangle` with `stroke="#FFFFFF26"` and `strokeWidth={0.5}`
- [ ] Write test: no `RoundedRectangle` in `IosGlassCard` has `stroke="#FFFFFF1A"` (old 10% default)

### FR3: `borderColor` prop removed
- [ ] Write test: rendering `IosGlassCard` without `borderColor` succeeds
- [ ] Write TypeScript type test: passing `borderColor` to `IosGlassCard` causes compile error (`@ts-expect-error`)
- [ ] Update any existing assertions in `widgetPolish.test.ts` that reference old fill/stroke values
- [ ] Update any existing assertions in `widgetLayoutJs.test.ts` that reference old card color values

### Red Phase Gate
- [ ] All new tests fail (red) before implementation
- [ ] Run: `cd hourglassws && npx jest --testPathPattern="widgetPolish|widgetLayoutJs" --no-coverage`

---

## Phase 2.1 — Implementation

### FR1: Fill opacity
- [ ] Update `IosGlassCard` first `RoundedRectangle` fill from `COLORS.surface` to `"#1C1E26BF"`

### FR2: Specular edge
- [ ] Update `IosGlassCard` second `RoundedRectangle` stroke from `borderColor` prop to hardcoded `"#FFFFFF26"`
- [ ] Confirm `strokeWidth={0.5}` is preserved

### FR3: Remove `borderColor` prop
- [ ] Remove `borderColor` parameter from `IosGlassCard` function signature and type
- [ ] Remove `VStack spacing={4}` (use default spacing)
- [ ] Update LargeWidget P3 hours card caller: remove `borderColor={accent + '50'}`
- [ ] Update LargeWidget P3 earned card caller: remove `borderColor={COLORS.gold + '50'}`
- [ ] Update any P2 MetricView wrappers: remove `borderColor={...}`
- [ ] Update MediumWidget caller: remove `borderColor={accent + '50'}`
- [ ] Verify TypeScript compilation: `cd hourglassws && npx tsc --noEmit`

### Implementation Gate
- [ ] All Phase 2.0 tests now pass (green)
- [ ] No TypeScript errors
- [ ] Run full widget test suite: `cd hourglassws && npx jest --testPathPattern="widget" --no-coverage`

---

## Phase 2.2 — Review

- [ ] Run spec-implementation-alignment check
- [ ] Run pr-review-toolkit:review-pr
- [ ] Address any review feedback
- [ ] Run test-optimiser
- [ ] Final test run passes: `cd hourglassws && npx jest --testPathPattern="widget" --no-coverage`

---

## Session Notes
