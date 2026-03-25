# Checklist: 02-ios-visual

## Phase 2.0 — Tests (Red Phase)

### FR1: Brand Color Constants and Helper Functions
- [ ] test(FR1): JS string evaluates without syntax error (SC1.8) — `(new Function('return ' + WIDGET_LAYOUT_JS))()` returns a function
- [ ] test(FR1): No `#FFFFFF` in any foregroundStyle call in the new JS (SC1.1)
- [ ] test(FR1): `TEXT_PRIMARY` is `#E0E0E0`, `TEXT_MUTED` is `#757575` (SC1.1, SC1.2)
- [ ] test(FR1): `buildPaceBadge('none')` returns null (SC1.5)
- [ ] test(FR1): `buildPaceBadge('crushed_it')` returns non-null with color `#FFDF89` (SC1.5)
- [ ] test(FR1): `buildPaceBadge('on_track')` returns non-null with color `#10B981` (SC1.5)
- [ ] test(FR1): `buildPaceBadge('behind')` returns non-null with color `#F59E0B` (SC1.5)
- [ ] test(FR1): `buildPaceBadge('critical')` returns non-null with color `#F43F5E` (SC1.5)
- [ ] test(FR1): `buildPaceBadge(undefined)` returns null (SC1.5, SC6.1)
- [ ] test(FR1): `buildDeltaText('', '#10B981')` returns null (SC1.6, SC6.2)
- [ ] test(FR1): `buildDeltaText('+2.1h', '#10B981')` returns non-null object (SC1.6)
- [ ] test(FR1): `buildDeltaText(undefined, '#10B981')` returns null (SC6.2)
- [ ] test(FR1): `buildProgressBar(3.2, '5h', '#A78BFA', 190)` returns non-null (SC1.7)
- [ ] test(FR1): `buildProgressBar(5.0, '5h', '#A78BFA', 190)` fills to 100% (filled = barWidth) (SC1.7)
- [ ] test(FR1): `buildProgressBar(0, undefined, '#A78BFA', 190)` does not throw — fallback to 5 (SC6.4)

### FR2: systemSmall
- [ ] test(FR2): `buildSmall` called with minimal props does not throw (SC2.8)
- [ ] test(FR2): `buildSmall` result contains urgency color `#10B981` for `urgency: 'none'` (SC2.2)
- [ ] test(FR2): `buildSmall` result contains gold `#E8C97A` for earnings (SC2.4)
- [ ] test(FR2): `buildSmall` with `paceBadge: 'on_track'` includes badge color `#10B981` (SC2.6)
- [ ] test(FR2): `buildSmall` with `paceBadge: 'none'` does not include any PACE_COLORS hex (SC2.6)
- [ ] test(FR2): `buildSmall` manager urgency mode — `isManager: true`, `urgency: 'critical'`, `pendingCount: 3` — renders pendingCount rather than hours (SC2.7)

### FR3: systemMedium
- [ ] test(FR3): `buildMedium` called with `weekDeltaHours: ''` does not throw (SC3.8)
- [ ] test(FR3): `buildMedium` called with `paceBadge: undefined` does not throw (SC3.8)
- [ ] test(FR3): `buildMedium` result contains glass panel gradient color `#1A1928` (SC3.2)
- [ ] test(FR3): `buildMedium` with non-empty `weekDeltaHours: '+2.1h'` includes delta in result (SC3.5)
- [ ] test(FR3): `buildMedium` with `weekDeltaHours: ''` does NOT include `'+2.1h'` string (SC3.5)
- [ ] test(FR3): `buildMedium` hours mode result contains cyan `#00C2FF` for AI usage (SC3.4)

### FR4: systemLarge
- [ ] test(FR4): `buildLarge` called with all-empty delta fields does not throw (SC4.9)
- [ ] test(FR4): `buildLarge` called with `daily: []` does not throw (SC4.9, SC6.5)
- [ ] test(FR4): `buildLarge` with `weekDeltaEarnings: '+$84'` includes that string in result (SC4.2)
- [ ] test(FR4): `buildLarge` with `weekDeltaEarnings: ''` does NOT include `'+$84'` in result (SC4.2)
- [ ] test(FR4): `buildLarge` BrainLift bar uses `props.brainliftTarget` not hardcoded `5` (SC4.7)
- [ ] test(FR4): `buildLarge` with `brainliftTarget: '10h'` produces a different bar width than `'5h'` for the same brainlift value (SC4.7)
- [ ] test(FR4): `buildLarge` with `paceBadge: 'behind'` includes color `#F59E0B` (SC4.4)
- [ ] test(FR4): `buildLarge` with `paceBadge: 'none'` does NOT include any PACE_COLORS hex in badge context (SC4.4)

### FR5: Accessory sizes
- [ ] test(FR5): `buildAccessory` with `family: 'accessoryRectangular'` does not throw (SC5.5)
- [ ] test(FR5): `buildAccessory` with `family: 'accessoryCircular'` does not throw (SC5.5)
- [ ] test(FR5): `buildAccessory` with `family: 'accessoryInline'` does not throw (SC5.5)
- [ ] test(FR5): `accessoryRectangular` result contains `HOURS_COLOR` urgency color, not `#FFFFFF` (SC5.1, SC5.4)
- [ ] test(FR5): `accessoryInline` result contains hours, earnings, and AI text concatenated (SC5.3)

### FR6: Full-string null safety
- [ ] test(FR6): JS function called with `env = { widgetFamily: 'systemMedium' }` and minimal props returns non-null (SC6.7)
- [ ] test(FR6): JS function called with `env = null` returns non-null (defaults to systemMedium) (SC6.7)
- [ ] test(FR6): `props.daily: undefined` — systemLarge does not throw (SC6.5)

## Phase 2.1 — Implementation

### FR1: Brand Color Constants and Helper Functions
- [ ] feat(FR1): Replace color constants block — remove `WHITE='#FFFFFF'`, add `TEXT_PRIMARY='#E0E0E0'`, `TEXT_SECONDARY='#A0A0A0'`, `TEXT_MUTED='#757575'`, `GOLD_BRIGHT='#FFDF89'`, `TRACK_COLOR`, `SURFACE_FILL_TOP`, `SURFACE_FILL_BTM`, `BORDER_TOP`
- [ ] feat(FR1): Add `buildMeshBg(urgency, paceBadge)` function with 3-node Circle ZStack
- [ ] feat(FR1): Add `buildGlassPanel(children)` function with gradient fill + border RoundedRectangle
- [ ] feat(FR1): Add `buildPaceBadge(badge)` function — null guard + Capsule+Text for 4 states
- [ ] feat(FR1): Add `buildDeltaText(delta, color)` function — null guard + Text
- [ ] feat(FR1): Add `buildProgressBar(value, targetStr, color, barWidth)` function
- [ ] feat(FR1): Add `export` keyword to `WIDGET_LAYOUT_JS` constant for test access

### FR2: systemSmall
- [ ] feat(FR2): Rewrite `buildSmall(p)` — `ZStack` with `buildMeshBg` base + `VStack` content
- [ ] feat(FR2): `buildSmall` uses `buildPaceBadge` bottom-right
- [ ] feat(FR2): `buildSmall` manager urgency mode: pendingCount hero when `isManager && urgency >= high && pendingCount > 0`

### FR3: systemMedium
- [ ] feat(FR3): Rewrite `buildMedium(p)` hours mode — `ZStack` mesh + dual `buildGlassPanel` hero row
- [ ] feat(FR3): `buildMedium` hours mode: stats row with today, AI%, remaining in correct semantic colors
- [ ] feat(FR3): `buildMedium` hours mode: `buildDeltaText` for `weekDeltaHours` near hours panel
- [ ] feat(FR3): `buildMedium` hours mode: `buildPaceBadge` bottom-right
- [ ] feat(FR3): `buildMedium` action mode: `buildGlassPanel` on each item row + mesh background

### FR4: systemLarge
- [ ] feat(FR4): Rewrite `buildLarge(p)` hours mode — `ZStack` mesh + glass hero panels
- [ ] feat(FR4): `buildLarge` hero row: `buildDeltaText(weekDeltaEarnings, GOLD)` in earnings panel
- [ ] feat(FR4): `buildLarge` stats row: `buildDeltaText(weekDeltaHours, hoursColor)` below TODAY
- [ ] feat(FR4): `buildLarge`: `buildPaceBadge` between stats and bar chart
- [ ] feat(FR4): `buildLarge` daily bar chart: preserve existing logic, update colors to brand tokens
- [ ] feat(FR4): `buildLarge` AI progress bar: use `buildProgressBar`
- [ ] feat(FR4): `buildLarge` BrainLift progress bar: use `buildProgressBar` with `props.brainliftTarget`
- [ ] feat(FR4): `buildLarge` action mode: `buildGlassPanel` on item rows + mesh background

### FR5: Accessory sizes
- [ ] feat(FR5): Add `buildAccessory(p, fam)` function with `accessoryRectangular`, `accessoryCircular`, `accessoryInline` branches
- [ ] feat(FR5): All accessory branches use semantic colors (urgency color for hours, gold for earnings, no `#FFFFFF`)

### FR6: Null safety (woven into FR1–FR5 implementation)
- [ ] feat(FR6): All null guards in place — verify `props.daily`, `props.paceBadge`, `props.weekDeltaHours`, `props.weekDeltaEarnings`, `props.brainliftTarget` undefined cases handled
- [ ] feat(FR6): Router default: `return buildMedium(props)` when family not matched

## Phase 2.2 — Review

- [ ] Run `spec-implementation-alignment` — verify all FR success criteria are met by the implementation
- [ ] Run `pr-review-toolkit:review-pr` — review diff for code quality, ES5 compliance, no `#FFFFFF`
- [ ] Address any feedback from PR review
- [ ] Run `test-optimiser` — check test coverage quality and redundancy
- [ ] Run full test suite: `cd hourglassws && npx jest src/widgets/__tests__/widgetLayoutJs.test.ts` — all tests pass
- [ ] Visual inspection: confirm no `#FFFFFF` in the final `WIDGET_LAYOUT_JS` string
