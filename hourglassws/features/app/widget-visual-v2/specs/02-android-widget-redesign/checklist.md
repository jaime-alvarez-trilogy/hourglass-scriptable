# Checklist: 02-android-widget-redesign

## Phase 1.0 — Tests (Red Phase)

### FR1: URGENCY_ACCENT Colors
- [ ] Update FR3.4 test: bar chart for `urgency=critical` asserts `#F43F5E` (not `#FF2D55`)
- [ ] Verify FR1 buildMeshSvg color tests still pass (not modified)
- [ ] Verify URGENCY_ACCENT.none `#00FF88` test-lock untouched

### FR2: badgeColor() Brand Colors
- [ ] Update FR1.8 test: `badgeColor('crushed_it')` asserts `#F5C842` (not `#CEA435`)
- [ ] Update FR1.9 test: `badgeColor('on_track')` asserts `#10B981` (not `#4ADE80`)
- [ ] Update FR1.10 test: `badgeColor('behind')` asserts `#F59E0B` (not `#FCD34D`)
- [ ] Update FR1.11 test: `badgeColor('critical')` asserts `#F43F5E` (not `#F87171`)
- [ ] Verify FR1.12–FR1.26 badge label tests not modified

### FR3: GlassPanel Colors
- [ ] Update FR3.1 test: outer `#1C1E26`, borderRadius 16
- [ ] Update FR3.2 test: inner `#16151F`, borderRadius 15
- [ ] Verify FR3.3 test (borderRadius ≥ 10) not modified — still passes with 16

### FR4: Root Background Color
- [ ] Update FR2.5 test: root backgroundColor `#0B0D13` (not `#0D0C14`)
- [ ] Verify all other FR2 tests not modified

### Red Phase Gate
- [ ] All 8 updated test assertions fail (red) against current implementation
- [ ] All unmodified tests still pass (green)
- [ ] Commit: `test(FR1-FR5): update android widget visual assertions`

---

## Phase 1.1 — Implementation

### FR1: Update URGENCY_ACCENT
- [ ] Update `URGENCY_ACCENT.high` from `#FF6B00` to `#F59E0B`
- [ ] Update `URGENCY_ACCENT.critical` from `#FF2D55` to `#F43F5E`
- [ ] Verify `none`, `low`, `expired` values unchanged
- [ ] Run tests: FR3.4 passes

### FR2: Update badgeColor()
- [ ] Update `crushed_it` return value to `#F5C842`
- [ ] Update `on_track` return value to `#10B981`
- [ ] Update `behind` return value to `#F59E0B`
- [ ] Update `critical` return value to `#F43F5E`
- [ ] Verify default case still returns `''`
- [ ] Run tests: FR1.8–FR1.11 pass

### FR3: Redesign GlassPanel
- [ ] Update outer FlexWidget backgroundColor to `#1C1E26`
- [ ] Update outer FlexWidget borderRadius to `16`
- [ ] Update inner FlexWidget backgroundColor to `#16151F`
- [ ] Update inner FlexWidget borderRadius to `15`
- [ ] Verify padding values unchanged (outer: 1, inner: 12)
- [ ] Run tests: FR3.1, FR3.2, FR3.3 pass

### FR4: Update Root Background
- [ ] Update SmallWidget root FlexWidget backgroundColor to `#0B0D13`
- [ ] Update MediumWidget root FlexWidget backgroundColor to `#0B0D13`
- [ ] Run tests: FR2.5 passes, all other FR2 tests pass

### Integration Verification
- [ ] Run full Android widget test suite — all tests pass
- [ ] Commit: `feat(FR1-FR4): align android widget colors with brand`

---

## Phase 1.2 — Review

### Alignment Check
- [ ] spec-implementation-alignment agent: PASS

### PR Review
- [ ] pr-review-toolkit:review-pr run
- [ ] Feedback addressed (if any)

### Test Optimization
- [ ] test-optimiser agent run
- [ ] Redundant or weak tests addressed (if any)

### Final Gate
- [ ] All tests passing
- [ ] Review complete
