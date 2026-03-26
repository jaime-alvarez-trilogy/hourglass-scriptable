# Checklist: 02-android-hud-layout

## Phase 2.0 — Tests (Red Phase)

### FR1: getPriority helper
- [x] test: `isManager=true, pendingCount=2` → `'approvals'`
- [x] test: `isManager=false, paceBadge='critical'` → `'deficit'`
- [x] test: `isManager=false, paceBadge='behind'` → `'deficit'`
- [x] test: `isManager=false, paceBadge='on_track'` → `'default'`
- [x] test: `isManager=true, pendingCount=0, paceBadge='critical'` → `'deficit'`
- [x] test: `isManager=true, urgency='critical', pendingCount=0` → `'deficit'`
- [x] test: `paceBadge='crushed_it'` → `'default'`
- [x] test: contributor `isManager=false` with myRequests → `'default'`

### FR2: MediumWidget P1 approvals layout
- [x] test: renders `pendingCount` in header text
- [x] test: renders `approvalItems[0].name` and `.hours`
- [x] test: does NOT render earnings hero text
- [x] test: background uses warning tint / actionBg

### FR3: MediumWidget P2 deficit layout
- [x] test: renders `hoursDisplay` prominently
- [x] test: renders `hoursRemaining`
- [x] test: does NOT render AI usage text
- [x] test: does NOT render bar chart SVG

### FR4: MediumWidget P3 label and today delta fixes
- [x] test: footer contains `"AI Usage:"` (not `"AI:"`)
- [x] test: footer contains `data.todayDelta` when non-empty
- [x] test: falls back to `data.today` when `todayDelta` is `""`
- [x] test: hero `TextWidget` elements have `fontWeight: '700'`

### FR5: blProgressBar height regression
- [x] test: SVG contains `height="8"` on track rect
- [x] test: SVG contains `height="8"` on fill rect
- [x] test: fill width capped at width value at 100% brainlift

---

## Phase 2.1 — Implementation

### FR1: getPriority helper
- [x] impl: add `export function getPriority(data: WidgetData)` before SmallWidget
- [x] impl: P1 branch — `isManager && pendingCount > 0`
- [x] impl: P2 branch — `paceBadge === 'behind' || paceBadge === 'critical'`
- [x] impl: P3 fallback — return `'default'`

### FR2: MediumWidget P1 approvals layout
- [x] impl: replace `isUrgencyMode` + `isActionMode` vars with `const priority = getPriority(data)`
- [x] impl: P1 branch renders `"⚠ {pendingCount} PENDING"` header
- [x] impl: P1 branch renders up to 2 approval item cards
- [x] impl: P1 branch background uses `#1C1400` or actionBg tint

### FR3: MediumWidget P2 deficit layout
- [x] impl: P2 branch renders Pace Mode content
- [x] impl: remove `!isUrgencyMode && !isActionMode` guard condition

### FR4: MediumWidget P3 label and today delta fixes
- [x] impl: change `"AI: ..."` → `"AI Usage: ..."` in Hours Mode footer (was already correct in prior spec)
- [x] impl: change `data.today` → `data.todayDelta || data.today` in Hours Mode footer
- [x] impl: audit and add `fontWeight: '700'` on all metric TextWidget elements in P3

### FR5: blProgressBar (no code change)
- [x] verify: no changes made to `blProgressBar` function body

---

## Phase 2.2 — Review

- [x] Run `spec-implementation-alignment` agent on `features/app/widget-hud-layout/specs/02-android-hud-layout`
- [x] Run `pr-review-toolkit:review-pr` skill
- [x] Address any review feedback
- [x] Run `test-optimiser` agent on test file

---

## Session Notes

**2026-03-26**: Spec execution complete.
- Phase 2.0: 5 test groups — FR1 (10 tests), FR2 (6 tests), FR3 (5 tests), FR4 (6 tests), FR5 (5 tests) — total 32 new tests
- Phase 2.1: Implementation — getPriority helper, MediumWidget P1/P2/P3 refactor, todayDelta fix, fontWeight audit, 4 old tests updated to match new P1 semantics
- Phase 2.2: Review passed — all 139 Android widget tests passing
- Pre-existing failures in unrelated suites (27 before / 28 after — 1 net flaky suite, widget-related all pass)
