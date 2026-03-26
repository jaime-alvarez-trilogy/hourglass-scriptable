# Checklist: 02-android-hud-layout

## Phase 2.0 — Tests (Red Phase)

### FR1: getPriority helper
- [ ] test: `isManager=true, pendingCount=2` → `'approvals'`
- [ ] test: `isManager=false, paceBadge='critical'` → `'deficit'`
- [ ] test: `isManager=false, paceBadge='behind'` → `'deficit'`
- [ ] test: `isManager=false, paceBadge='on_track'` → `'default'`
- [ ] test: `isManager=true, pendingCount=0, paceBadge='critical'` → `'deficit'`
- [ ] test: `isManager=true, urgency='critical', pendingCount=0` → `'deficit'`
- [ ] test: `paceBadge='crushed_it'` → `'default'`
- [ ] test: contributor `isManager=false` with myRequests → `'default'`

### FR2: MediumWidget P1 approvals layout
- [ ] test: renders `pendingCount` in header text
- [ ] test: renders `approvalItems[0].name` and `.hours`
- [ ] test: does NOT render earnings hero text
- [ ] test: background uses warning tint / actionBg

### FR3: MediumWidget P2 deficit layout
- [ ] test: renders `hoursDisplay` prominently
- [ ] test: renders `hoursRemaining`
- [ ] test: does NOT render AI usage text
- [ ] test: does NOT render bar chart SVG

### FR4: MediumWidget P3 label and today delta fixes
- [ ] test: footer contains `"AI Usage:"` (not `"AI:"`)
- [ ] test: footer contains `data.todayDelta` when non-empty
- [ ] test: falls back to `data.today` when `todayDelta` is `""`
- [ ] test: hero `TextWidget` elements have `fontWeight: '700'`

### FR5: blProgressBar height regression
- [ ] test: SVG contains `height="8"` on track rect
- [ ] test: SVG contains `height="8"` on fill rect
- [ ] test: fill width capped at `width - 4` at 100% brainlift

---

## Phase 2.1 — Implementation

### FR1: getPriority helper
- [ ] impl: add `export function getPriority(data: WidgetData)` before SmallWidget
- [ ] impl: P1 branch — `isManager && pendingCount > 0`
- [ ] impl: P2 branch — `paceBadge === 'behind' || paceBadge === 'critical'`
- [ ] impl: P3 fallback — return `'default'`

### FR2: MediumWidget P1 approvals layout
- [ ] impl: replace `isUrgencyMode` + `isActionMode` vars with `const priority = getPriority(data)`
- [ ] impl: P1 branch renders `"⚠ {pendingCount} PENDING"` header
- [ ] impl: P1 branch renders up to 2 approval item cards
- [ ] impl: P1 branch background uses `#1C1400` or actionBg tint

### FR3: MediumWidget P2 deficit layout
- [ ] impl: P2 branch renders Pace Mode content
- [ ] impl: remove `!isUrgencyMode && !isActionMode` guard condition

### FR4: MediumWidget P3 label and today delta fixes
- [ ] impl: change `"AI: ..."` → `"AI Usage: ..."` in Hours Mode footer
- [ ] impl: change `data.today` → `data.todayDelta || data.today` in Hours Mode footer
- [ ] impl: audit and add `fontWeight: '700'` on all metric TextWidget elements in P3

### FR5: blProgressBar (no code change)
- [ ] verify: no changes made to `blProgressBar` function body

---

## Phase 2.2 — Review

- [ ] Run `spec-implementation-alignment` agent on `features/app/widget-hud-layout/specs/02-android-hud-layout`
- [ ] Run `pr-review-toolkit:review-pr` skill
- [ ] Address any review feedback
- [ ] Run `test-optimiser` agent on test file
