# Checklist: 04-cockpit-hud

## Phase 4.0 — Tests (Red Phase)

### FR1 — Color token tests (iOS + Android)

- [x] `widgetLayoutJs.test.ts`: add describe block "FR1 — PACE_COLORS desaturated tokens"
  - [x] test: `WIDGET_LAYOUT_JS` contains `'#CEA435'` (crushed_it luxuryGold)
  - [x] test: `WIDGET_LAYOUT_JS` contains `'#4ADE80'` (on_track successGreen)
  - [x] test: `WIDGET_LAYOUT_JS` contains `'#FCD34D'` (behind warnAmber)
  - [x] test: `WIDGET_LAYOUT_JS` contains `'#F87171'` (critical desatCoral)
  - [x] test: `WIDGET_LAYOUT_JS` PACE_COLORS does NOT contain `'#FFDF89'` (old crushed_it)
  - [x] test: `WIDGET_LAYOUT_JS` PACE_COLORS does NOT contain `'#F59E0B'` (old behind)
  - [x] test: `WIDGET_LAYOUT_JS` PACE_COLORS does NOT contain `'#F43F5E'` (old critical)

- [x] `HourglassWidget.test.tsx`: add describe block "FR1 — badgeColor desaturated tokens"
  - [x] test: `badgeColor('crushed_it')` === `'#CEA435'`
  - [x] test: `badgeColor('on_track')` === `'#4ADE80'`
  - [x] test: `badgeColor('behind')` === `'#FCD34D'`
  - [x] test: `badgeColor('critical')` === `'#F87171'`
  - [x] test: `badgeColor('none')` === `''`

### FR2 — iOS P2 mode tests

- [x] `widgetLayoutJs.test.ts`: add describe block "FR2 — iOS P2 stripped deficit layout"
  - [x] test: `buildMedium` with `paceBadge='behind'`, `approvalItems=[]` → output contains `hoursDisplay` value
  - [x] test: `buildMedium` with `paceBadge='behind'`, `approvalItems=[]` → output contains `hoursRemaining` value
  - [x] test: `buildMedium` with `paceBadge='behind'`, `approvalItems=[]` → output does NOT contain `aiPct` value
  - [x] test: `buildMedium` with `paceBadge='behind'`, `approvalItems=[]` → output does NOT contain `brainlift` value
  - [x] test: `buildLarge` with `paceBadge='critical'`, `approvalItems=[]` → contains `hoursDisplay` + `hoursRemaining`
  - [x] test: `buildLarge` with `paceBadge='critical'`, `approvalItems=[]` → no `aiPct` or `brainlift`
  - [x] test: `buildSmall` with `paceBadge='critical'`, no approvals → shows `hoursDisplay` + `hoursRemaining`
  - [x] test (edge): `paceBadge='behind'` AND `approvalItems.length > 0` → P1 wins, action item rows (not P2)
  - [x] test (edge): `paceBadge='on_track'`, no approvals → P3 hours mode, `aiPct` IS shown
  - [x] test (edge): `paceBadge='none'`, no approvals → P3 hours mode, `aiPct` IS shown

### FR3 — Android P2 mode tests

- [x] `HourglassWidget.test.tsx`: add describe block "FR3 — Android P2 stripped deficit layout"
  - [x] test: `MediumWidget` with `paceBadge='behind'`, `approvalItems=[]`, `isManager=false` → renders `⚠` text
  - [x] test: same → renders `hoursDisplay` text
  - [x] test: same → renders `hoursRemaining` text
  - [x] test: same → does NOT render `aiPct` text
  - [x] test: same → does NOT render `brainlift` text
  - [x] test: `MediumWidget` with `paceBadge='critical'`, `approvalItems=[]` → badge color is `'#F87171'`
  - [x] test (edge): `paceBadge='behind'`, `isManager=true`, `urgency='critical'`, `pendingCount=3` → urgency mode, not P2
  - [x] test (edge): `paceBadge='behind'`, `approvalItems.length > 0` → action mode, not P2
  - [x] test (edge): `paceBadge='on_track'`, no approvals → P3 hours mode, `aiPct` rendered

### FR4 — iOS hero typography tests

- [x] `widgetLayoutJs.test.ts`: add describe block "FR4 — iOS hero typography"
  - [x] test: `WIDGET_LAYOUT_JS` string contains `weight: 'heavy'`
  - [x] test: `WIDGET_LAYOUT_JS` string contains `design: 'monospaced'`
  - [x] test: `buildSmall` output includes font modifier `weight: 'heavy'` on hero Text node

### FR5 — Priority ordering tests

- [x] `widgetLayoutJs.test.ts`: add describe block "FR5 — Priority ordering P1 > P2 > P3 (iOS)"
  - [x] test: `paceBadge='behind'`, `approvalItems.length > 0` → P1 action rows (not P2)
  - [x] test: `paceBadge='critical'`, `myRequests=[]`, `approvalItems=[]` → P2 stripped layout

- [x] `HourglassWidget.test.tsx`: add describe block "FR5 — Priority ordering P1 > P2 > P3 (Android)"
  - [x] test: `isManager=true`, `pendingCount=3`, `paceBadge='critical'`, `urgency='critical'` → P1 urgency mode (countdown hero)
  - [x] test: `isManager=false`, `paceBadge='critical'`, `myRequests=[]`, `approvalItems=[]` → P2 stripped layout
  - [x] test: `isManager=false`, `paceBadge='on_track'`, `myRequests=[]`, `approvalItems=[]` → P3 full hours mode

---

## Phase 4.1 — Implementation

### FR1 — Update color tokens

- [x] `bridge.ts`: update `PACE_COLORS` constant in `WIDGET_LAYOUT_JS` string
  - [x] `crushed_it: '#CEA435'` (was `'#FFDF89'`)
  - [x] `on_track: '#4ADE80'` (was `'#10B981'`)
  - [x] `behind: '#FCD34D'` (was `'#F59E0B'`)
  - [x] `critical: '#F87171'` (was `'#F43F5E'`)
- [x] `HourglassWidget.tsx`: update `badgeColor()` return values
  - [x] `crushed_it` → `'#CEA435'`
  - [x] `on_track` → `'#4ADE80'`
  - [x] `behind` → `'#FCD34D'`
  - [x] `critical` → `'#F87171'`

### FR2 — iOS P2 stripped deficit layout

- [x] `bridge.ts` `WIDGET_LAYOUT_JS` — `buildMedium` function:
  - [x] Add `var isPaceModeMed` derivation after existing `actionMode`
  - [x] Add `if (isPaceModeMed)` branch with P2 layout block (VStack: warning badge, hero hoursDisplay, hoursRemaining, spacer, footer row)
- [x] `bridge.ts` `WIDGET_LAYOUT_JS` — `buildLarge` function:
  - [x] Add `var isPaceModeLg` derivation after existing `actionMode`
  - [x] Add `if (isPaceModeLg)` branch with P2 layout block
- [x] `bridge.ts` `WIDGET_LAYOUT_JS` — `buildSmall` function:
  - [x] Add `var isPaceMode` derivation after existing `actionModeSmall`
  - [x] Add `if (isPaceMode)` branch with compact P2 layout (badge, hoursDisplay, hoursRemaining)
- [x] All P2 code uses ES5 only: `var`, `function()`, no arrow functions, no template literals

### FR3 — Android P2 stripped deficit layout

- [x] `HourglassWidget.tsx` `MediumWidget`:
  - [x] Add `isPaceMode` const after existing `actionMode`
  - [x] Add `if (isPaceMode)` branch returning P2 layout JSX
  - [x] P2 JSX: mesh bg + warning badge row + hero hoursDisplay + hoursRemaining + flex spacer + footer row
  - [x] Footer: `weekDeltaEarnings` (with `deltaColor`) + `today ${data.today}`

### FR4 — iOS hero typography

- [x] `bridge.ts` `WIDGET_LAYOUT_JS` — add `.font({ size: 32, weight: 'heavy', design: 'monospaced' })` to:
  - [x] `buildSmall` hours total hero Text
  - [x] `buildMedium` P3 hours glass panel hero Text
  - [x] `buildMedium` P2 `hoursDisplay` Text
  - [x] `buildLarge` P3 hours total hero Text
  - [x] `buildLarge` P2 `hoursDisplay` Text
  - [x] Action mode primary metric Text (pending count / hours)

### FR5 — Priority ordering (implicit via FR2 + FR3 structure)

- [x] Verify `bridge.ts`: `actionMode` check comes before `isPaceMode` check in all three builder functions
- [x] Verify `HourglassWidget.tsx`: `isUrgencyMode` → `actionMode` → `isPaceMode` → default order preserved

---

## Phase 4.2 — Review

- [x] Run full test suite: `cd hourglassws && npx jest`
- [x] All Phase 4.0 tests pass (168/168 green)
- [x] No regressions in existing widget tests (specs 01–03 tests still pass)
- [x] spec-implementation-alignment: all FR success criteria verified
- [ ] pr-review-toolkit: review-pr
- [ ] Address any feedback from review
- [ ] test-optimiser: review test quality, remove redundancy if flagged

## Session Notes

**2026-03-25**: Spec execution complete.
- Phase 4.0: 2 test commits (iOS widgetLayoutJs + Android HourglassWidget)
- Phase 4.1: 1 implementation commit (FR1-FR5 all platforms)
- Phase 4.2: Review in progress
- All 168 widget tests passing.
- Pre-existing failures in bridge.test.ts (actionBg null assertion) and unrelated suites confirmed not regressions.
