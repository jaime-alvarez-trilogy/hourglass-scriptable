# Checklist: 01-widget-polish

## Phase 1.0 — Tests (Red Phase)

### FR1: Small Widget Content Triage

- [ ] test(FR1): iOS SmallWidget — assert `$` earnings string absent from rendered output
- [ ] test(FR1): iOS SmallWidget — assert `h left` / `h OT` hoursRemaining absent from rendered output
- [ ] test(FR1): iOS SmallWidget — assert `hoursDisplay` value (e.g. `32.5h`) present in rendered output
- [ ] test(FR1): iOS SmallWidget paceBadge='on_track' — assert pace label text present
- [ ] test(FR1): iOS SmallWidget paceBadge='none' — assert no pace label text
- [ ] test(FR1): iOS SmallWidget isManager=true, pendingCount=2 — assert manager badge present
- [ ] test(FR1): iOS SmallWidget stale=true — assert stale indicator present
- [ ] test(FR1): Android SmallWidget — assert earnings string absent
- [ ] test(FR1): Android SmallWidget — assert hoursRemaining string absent
- [ ] test(FR1): Android SmallWidget — assert hoursDisplay present

### FR2: iOS Large Padding

- [ ] test(FR2): iOS LargeWidget — assert outer VStack padding prop equals 16 (not 14)

### FR3: Android SVG Background Replacement

- [ ] test(FR3): `buildMeshSvg()` — assert contains `<linearGradient`
- [ ] test(FR3): `buildMeshSvg()` — assert does NOT contain `<ellipse`
- [ ] test(FR3): `buildMeshSvg()` — assert does NOT contain `<radialGradient`
- [ ] test(FR3): `buildMeshSvg()` — assert state color hex present in output
- [ ] test(FR3): urgency='critical' — assert `#F43F5E` in output
- [ ] test(FR3): urgency='none', paceBadge='on_track' — assert `#10B981` in output
- [ ] test(FR3): urgency='none', paceBadge='none' — assert `#A78BFA` in output
- [ ] test(FR3): assert SVG dimensions 360×200 preserved

### FR4: `todayDelta` Data Field

- [ ] test(FR4): `computeTodayDelta(6.2, 5.0)` === `'+1.2h'`
- [ ] test(FR4): `computeTodayDelta(3.8, 5.0)` === `'-1.2h'`
- [ ] test(FR4): `computeTodayDelta(5.0, 5.0)` === `'+0.0h'`
- [ ] test(FR4): `computeTodayDelta(6.2, 0)` === `''`
- [ ] test(FR4): `computeTodayDelta(0, 0)` === `''`
- [ ] test(FR4): `buildWidgetData()` result includes `todayDelta` field
- [ ] test(FR4): today > average → todayDelta starts with `"+"`
- [ ] test(FR4): today < average → todayDelta starts with `"-"`
- [ ] test(FR4): null-guard return includes `todayDelta: ''`
- [ ] test(FR4): iOS LargeWidget source — hoursRemaining NOT used on Today row right side
- [ ] test(FR4): iOS LargeWidget — todayDelta rendered when non-empty
- [ ] test(FR4): iOS LargeWidget — right element absent when todayDelta === ''

### FR5: Progress Bar Height and Labels

- [ ] test(FR5): `blProgressBar(3, 5, 120)` SVG contains `height="8"`
- [ ] test(FR5): `blProgressBar(3, 5, 120)` SVG does NOT contain `height="6"`
- [ ] test(FR5): Android MediumWidget Hours mode — contains text `"BrainLift"`
- [ ] test(FR5): Android MediumWidget Hours mode — does NOT contain standalone label `"BL"`
- [ ] test(FR5): Android MediumWidget Hours mode — stats row contains `"AI Usage:"`

---

## Phase 1.1 — Implementation

### FR1: Small Widget Content Triage

- [ ] feat(FR1): `types.ts` — add `todayDelta: string` to `WidgetData` interface (prerequisite for FR4, but needed here to keep types consistent)
- [ ] feat(FR1): iOS `HourglassWidget.tsx` SmallWidget — remove earnings `<Text>` element
- [ ] feat(FR1): iOS `HourglassWidget.tsx` SmallWidget — remove hoursRemaining `<Text>` element
- [ ] feat(FR1): iOS `HourglassWidget.tsx` — add `PACE_LABELS` constant near `URGENCY_COLORS`
- [ ] feat(FR1): iOS `HourglassWidget.tsx` SmallWidget — add conditional pace status `<Text>` element
- [ ] feat(FR1): Android `HourglassWidget.tsx` SmallWidget — remove earnings `TextWidget`
- [ ] feat(FR1): Android `HourglassWidget.tsx` SmallWidget — remove hoursRemaining `TextWidget`

### FR2: iOS Large Padding

- [ ] feat(FR2): iOS `HourglassWidget.tsx` LargeWidget — change `padding={14}` to `padding={16}`

### FR3: Android SVG Background Replacement

- [ ] feat(FR3): Android `HourglassWidget.tsx` — replace `buildMeshSvg()` body with linearGradient + rect implementation

### FR4: `todayDelta` Data Field

- [ ] feat(FR4): `bridge.ts` — add exported `computeTodayDelta(today, average)` helper
- [ ] feat(FR4): `bridge.ts` — add `todayDelta: ''` to `buildWidgetData()` null-guard return
- [ ] feat(FR4): `bridge.ts` — add `todayDelta: computeTodayDelta(hoursData.today, hoursData.average)` to main return
- [ ] feat(FR4): iOS `HourglassWidget.tsx` LargeWidget — replace `hoursRemaining` with conditional `todayDelta` on Today row right side

### FR5: Progress Bar Height and Labels

- [ ] feat(FR5): Android `HourglassWidget.tsx` — update `blProgressBar()` SVG height from 6 to 8
- [ ] feat(FR5): Android `HourglassWidget.tsx` MediumWidget Hours mode — change `"BL"` label to `"BrainLift"`
- [ ] feat(FR5): Android `HourglassWidget.tsx` MediumWidget Hours mode — change `SvgWidget` height style from 6 to 8
- [ ] feat(FR5): Android `HourglassWidget.tsx` MediumWidget Hours mode — change `"AI:"` label to `"AI Usage:"`

---

## Phase 1.2 — Review

- [ ] Run full test suite: `cd hourglassws && npx jest --testPathPattern=widgets`
- [ ] spec-implementation-alignment: verify all FR success criteria are met by implementation
- [ ] pr-review-toolkit:review-pr: code review pass
- [ ] Address any review feedback
- [ ] test-optimiser: review test quality and coverage
- [ ] Final test suite pass: all tests green

---

## Session Notes

*(Added after execution)*
