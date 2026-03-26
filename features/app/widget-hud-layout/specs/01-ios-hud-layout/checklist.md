# Checklist: 01-ios-hud-layout

## Phase 1.0 — Tests (write first, must fail before implementation)

### FR1 — getPriority helper

- [ ] `test(FR1)` — SC1.1: isManager=true, pendingCount=3 → 'approvals'
- [ ] `test(FR1)` — SC1.2: isManager=false, paceBadge='critical' → 'deficit'
- [ ] `test(FR1)` — SC1.3: isManager=false, paceBadge='behind' → 'deficit'
- [ ] `test(FR1)` — SC1.4: isManager=false, paceBadge='on_track' → 'default'
- [ ] `test(FR1)` — SC1.5: paceBadge='crushed_it' → 'default'
- [ ] `test(FR1)` — SC1.6: paceBadge='none' → 'default'
- [ ] `test(FR1)` — SC1.7: isManager=true, pendingCount=3, paceBadge='critical' → 'approvals' (P1 beats P2)
- [ ] `test(FR1)` — SC1.8: isManager=true, pendingCount=0, paceBadge='behind' → 'deficit'

### FR2 — SmallWidget hero font

- [ ] `test(FR2)` — SC2.1: hero Text font.weight === 'heavy'
- [ ] `test(FR2)` — SC2.2: hero Text font.design === 'monospaced'
- [ ] `test(FR2)` — SC2.3: SmallWidget still renders hoursDisplay text
- [ ] `test(FR2)` — SC2.4: SmallWidget shows pace badge text when paceBadge is in PACE_LABELS
- [ ] `test(FR2)` — SC2.5: SmallWidget shows manager pending badge when isManager=true, pendingCount > 0

### FR3 — MediumWidget priority layouts

- [ ] `test(FR3)` — SC3.1: P1 renders pendingCount text
- [ ] `test(FR3)` — SC3.2: P1 renders up to 2 approvalItem names
- [ ] `test(FR3)` — SC3.3: P1 does NOT render props.earnings text
- [ ] `test(FR3)` — SC3.4: P1 does NOT render props.aiPct text
- [ ] `test(FR3)` — SC3.5: P2 renders props.hoursDisplay text
- [ ] `test(FR3)` — SC3.6: P2 renders props.hoursRemaining text
- [ ] `test(FR3)` — SC3.7: P2 does NOT render props.earnings text
- [ ] `test(FR3)` — SC3.8: P2 does NOT render props.aiPct text
- [ ] `test(FR3)` — SC3.9: P3 renders two RoundedRectangle glass cards
- [ ] `test(FR3)` — SC3.10: P3 today row contains todayDelta when non-empty
- [ ] `test(FR3)` — SC3.11: P3 today row falls back to props.today when todayDelta is ""

### FR4 — LargeWidget priority layouts + bottom padding

- [ ] `test(FR4)` — SC4.1: outer VStack bottom padding equals 28
- [ ] `test(FR4)` — SC4.2: P1 renders up to 3 approvalItem names
- [ ] `test(FR4)` — SC4.3: P1 does NOT render bar chart day labels
- [ ] `test(FR4)` — SC4.4: P2 renders props.hoursRemaining text
- [ ] `test(FR4)` — SC4.5: P2 does NOT render bar chart day labels
- [ ] `test(FR4)` — SC4.6: P3 renders bar chart with 7 day-label Text nodes
- [ ] `test(FR4)` — SC4.7: hero font in P2/P3 has weight 'heavy' and design 'monospaced'

### FR5 — Today row todayDelta fallback

- [ ] `test(FR5)` — SC5.1: MediumWidget P3 today row includes todayDelta when non-empty
- [ ] `test(FR5)` — SC5.2: MediumWidget P3 today row shows props.today when todayDelta is ""
- [ ] `test(FR5)` — SC5.3: LargeWidget P3 today row includes todayDelta when non-empty
- [ ] `test(FR5)` — SC5.4: LargeWidget P3 today row shows props.today when todayDelta is ""

---

## Phase 1.1 — Implementation

### FR1 — getPriority helper

- [ ] `feat(FR1)` — Add `getPriority(props: WidgetData)` pure function after colour constants in `HourglassWidget.tsx`
- [ ] `feat(FR1)` — Verify all 8 FR1 test cases pass

### FR2 — SmallWidget hero font

- [ ] `feat(FR2)` — Change hero Text `font` in SmallWidget from `{ size: 28, weight: 'bold' }` to `{ size: 28, weight: 'heavy', design: 'monospaced' }`
- [ ] `feat(FR2)` — Verify FR2 tests pass; existing FR3.1/FR3.2 SmallWidget tests still pass

### FR3 — MediumWidget priority layouts

- [ ] `feat(FR3)` — Add `const priority = getPriority(props)` at top of MediumWidget render
- [ ] `feat(FR3)` — Implement P1 layout block (PENDING APPROVALS header + items)
- [ ] `feat(FR3)` — Implement P2 layout block (deficit warning + hero + hoursRemaining)
- [ ] `feat(FR3)` — Implement P3 layout block (glass cards + todayDelta bottom row)
- [ ] `feat(FR3)` — Update P1 background tint to `#FF6B0020`
- [ ] `feat(FR3)` — Verify all FR3 tests pass

### FR4 — LargeWidget priority layouts + bottom padding

- [ ] `feat(FR4)` — Change outer VStack padding from `padding={16}` to `padding={{ top: 16, leading: 16, trailing: 16, bottom: 28 }}`
- [ ] `feat(FR4)` — Add `const priority = getPriority(props)` at top of LargeWidget render
- [ ] `feat(FR4)` — Implement P1 layout block (up to 3 approvalItems, no bar chart)
- [ ] `feat(FR4)` — Implement P2 layout block (deficit warning, no bar chart)
- [ ] `feat(FR4)` — Implement P3 layout block (glass cards + IosBarChart + todayDelta)
- [ ] `feat(FR4)` — Verify all FR4 tests pass

### FR5 — Today row todayDelta fallback

- [ ] `feat(FR5)` — Update MediumWidget P3 today text: `props.todayDelta || props.today`
- [ ] `feat(FR5)` — Update LargeWidget P3 today text: `props.todayDelta || props.today`
- [ ] `feat(FR5)` — Verify FR5 tests pass

---

## Phase 1.2 — Review

- [ ] Run `spec-implementation-alignment` to verify all FRs are implemented per spec
- [ ] Run `pr-review-toolkit:review-pr` for code review
- [ ] Address any review feedback
- [ ] Run `test-optimiser` to check for redundant/weak tests
- [ ] Run full test suite: `cd hourglassws && npx jest src/__tests__/widgets/widgetVisualIos.test.ts --no-coverage`
- [ ] Confirm all existing FR1–FR4 tests from `01-widget-visual-ios` still pass (no regressions)
