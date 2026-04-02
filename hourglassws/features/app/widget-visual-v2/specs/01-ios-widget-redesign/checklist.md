# Checklist: 01-ios-widget-redesign

## Phase 1.0 — Tests (Red Phase)

### FR1: Circle mock
- [ ] Add `Circle: makeComp('Circle')` to `@expo/ui/swift-ui` jest mock in `widgetVisualIos.test.ts`
- [ ] Verify all three widget sizes render without `TypeError: Circle is not a function`

### FR2: WidgetBackground tests (new assertions)
- [ ] Add test: SmallWidget renders exactly 1 Rectangle (base layer only)
- [ ] Add test: MediumWidget renders exactly 1 Rectangle (base layer only)
- [ ] Add test: LargeWidget renders exactly 1 Rectangle (base layer only)
- [ ] Add test: Rectangle fill === '#0B0D13' (updated base color)
- [ ] Add test: SmallWidget renders at least 2 Circle elements
- [ ] Add test: MediumWidget renders at least 2 Circle elements
- [ ] Add test: LargeWidget renders at least 2 Circle elements
- [ ] Add test: top-right Circle fill === urgency accent color
- [ ] Add test: bottom-left Circle fill === '#3B82F6'
- [ ] Add test: different urgency states produce different Circle accent fills

### FR3: IosGlassCard tests (updated assertions)
- [ ] Add/update test: glass card RoundedRectangle fill === '#1C1E26CC'
- [ ] Add/update test: glass card RoundedRectangle cornerRadius === 16
- [ ] Add/update test: glass card RoundedRectangle strokeWidth === 0.5
- [ ] Add/update test: inner VStack padding === 14

### FR4: MAX_BAR_HEIGHT=60 (updated assertions)
- [ ] Update FR4.5: max bar height `>= 55` and `<= 65` (was `>= 95, <= 105`)
- [ ] Update FR4.9: single non-zero bar height `toContain(60)` (was `toContain(100)`)

### FR5: Hero font bold/rounded (updated assertions)
- [ ] Update FR2.1 (hud layout): `font.weight === 'bold'` (was `'heavy'`)
- [ ] Update FR2.2 (hud layout): `font.design === 'rounded'` (was `'monospaced'`)
- [ ] Update FR4.new.7: LargeWidget P3 hero `weight === 'bold'`, `design === 'rounded'`
- [ ] Update FR4.new.7b: LargeWidget P2 hero `weight === 'bold'`, `design === 'rounded'`

### FR6: StatusPill opacity (updated assertion)
- [ ] Add test: StatusPill background fill ends with '15' (was '25')
- [ ] Add test: StatusPill stroke value ends with '80' (unchanged)

### FR7: widgetPolish.test.ts SC2.2 fix
- [ ] Update SC2.2 in `src/widgets/__tests__/widgetPolish.test.ts`: replace `not.toContain('padding={14}')` with `toContain("padding={{ top: 16")`

### Red-phase verification
- [ ] Run test suite — all new/updated assertions FAIL (red) confirming they test the right things
- [ ] Existing unaffected tests still PASS

---

## Phase 1.1 — Implementation

### FR1: Circle import
- [ ] Add `Circle` to the `require('@expo/ui/swift-ui')` destructure at top of `HourglassWidget.tsx`

### FR2: WidgetBackground component
- [ ] Update `COLORS.bgDark` to `'#0B0D13'` (was `'#0D0C14'`)
- [ ] Add `WidgetBackground` component function to `HourglassWidget.tsx`
- [ ] Replace 2-Rectangle pattern in `SmallWidget` with `<WidgetBackground accent={accent} />`; remove `tint` variable
- [ ] Replace 2-Rectangle pattern in `MediumWidget` with `<WidgetBackground accent={accent} />`; remove `tint`/`bgTint` variables (or keep bgTint as accent if needed for P1)
- [ ] Replace 2-Rectangle pattern in `LargeWidget` with `<WidgetBackground accent={accent} />`; same cleanup
- [ ] Verify WidgetBackground tests pass (green)

### FR3: IosGlassCard
- [ ] Update `COLORS.surface` to `'#1C1E26CC'` (was `'#16151FCC'`)
- [ ] Rename `GlassCard` → `IosGlassCard` throughout `HourglassWidget.tsx`
- [ ] Update fill reference to `COLORS.surface` (picks up new value automatically)
- [ ] Update cornerRadius from 14 to 16
- [ ] Update strokeWidth from 1 to 0.5
- [ ] Update inner VStack padding from 12 to 14
- [ ] Verify IosGlassCard tests pass (green)

### FR4: MAX_BAR_HEIGHT
- [ ] Update `MAX_BAR_HEIGHT` from 100 to 60
- [ ] Verify FR4.5 and FR4.9 tests pass (green)

### FR5: Hero font
- [ ] Update `MetricView` Text font: `weight: 'heavy'` → `weight: 'bold'`, `design: 'monospaced'` → `design: 'rounded'`
- [ ] Update LargeWidget P2 direct hero Text (48pt): same font change
- [ ] Verify FR2.1, FR2.2, FR4.new.7, FR4.new.7b tests pass (green)

### FR6: StatusPill opacity
- [ ] Update `StatusPill` background fill from `color + '25'` to `color + '15'`
- [ ] Verify StatusPill tests pass (green)

### FR7: widgetPolish SC2.2
- [ ] (Test-only change already done in Phase 1.0 — verify still passing with implementation)

### Integration verification
- [ ] Run full test suite: `cd hourglassws && npx jest` — all tests pass
- [ ] Confirm no regressions in FR1 (isFuture), FR3 (MediumWidget priority layouts), FR4 (LargeWidget priority layouts), FR5 (todayDelta), SC1/SC3/SC4/SC5 (widgetPolish)

---

## Phase 1.2 — Review

### Alignment check
- [ ] Run spec-implementation-alignment agent: verify all FR success criteria met in implementation

### PR review
- [ ] Run `pr-review-toolkit:review-pr` skill
- [ ] Address any blocking feedback

### Test optimization
- [ ] Run test-optimiser agent: check for redundant or flaky assertions

### Final sign-off
- [ ] All tests passing
- [ ] Review complete
- [ ] Spec marked Status: Complete
