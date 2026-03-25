# Spec Research: 01-widget-polish

## Problem Context

The Hourglass home-screen widget has four visible problems when running on device:

1. **Small widget overcrowded** — both iOS and Android Small show: hours, earnings, pace badge, hours-remaining, stale indicator, manager badge. At ~150×150px that is far too much content. The user sees a wall of numbers with no clear hero.

2. **iOS Large clips bottom content** — LargeWidget uses `padding={14}`. When the OS reserves system chrome at the bottom edge, the `BrainLift` / `AI usage` row gets partially cut off.

3. **Android background "weird circles"** — `buildMeshSvg()` renders three `<ellipse>` elements with radial gradient fills at fixed positions (360×200 canvas). On some Android launchers the SVG radial gradients render with visible circular banding artefacts that look unpolished.

4. **"Today" row repeats remaining hours** — iOS LargeWidget line 214 shows `{props.hoursRemaining}` on the right side of the "Today" row. Since `hoursRemaining` already appears in MediumWidget too, the Large widget shows the same value in two visible locations. The intent should be to show how today compares to the daily average ("delta"), not the remaining target again.

Additionally:
5. **BrainLift progress bar too thin** — currently 6px height with the label "BL". On device the track is barely visible and "BL" is not self-explanatory.

---

## Exploration Findings

### iOS Widget (`src/widgets/ios/HourglassWidget.tsx`)

**SmallWidget (lines 52–104):**
- Renders: `hoursDisplay` (28pt bold), `earnings` (14pt), `Spacer`, `hoursRemaining` (12pt), stale indicator (10pt), manager pending badge (11pt)
- Background: solid `URGENCY_COLORS[urgency]` — no gradients, no circles ✓
- Fix: keep only `hoursDisplay` + `paceBadge` status text; remove `earnings` and `hoursRemaining`
- Note: `paceBadge` is in `WidgetData` but the iOS SmallWidget doesn't currently display it. Post-fix it should show the urgency accent color + paceBadge label as the status, replacing the explicit earnings/remaining fields.

**MediumWidget (lines 106–173):**
- No changes needed.

**LargeWidget (lines 175–250):**
- Padding: `padding={14}` (line 184)
- "Today" row (lines 208–217): shows `props.today` on left, `props.hoursRemaining` on right
- AI/BrainLift row (lines 219–228): already shows `AI usage: {props.aiPct}` and `BrainLift: {props.brainlift}` ✓
- Fix: change padding to `16`, replace right-side `hoursRemaining` with `todayDelta`

### Android Widget (`src/widgets/android/HourglassWidget.tsx`)

**`buildMeshSvg()` (lines 19–43):**
- Renders `<svg width="360" height="200">` with three `<ellipse>` elements filled by `<radialGradient>` definitions
- Ellipses: va (violet, cx=25%/cy=30%), cb (cyan, cx=75%/cy=60%), sc (state-driven, cx=50%/cy=80%)
- Problem: radial gradients inside positioned `<ellipse>` elements are the "circles" the user sees
- Fix: replace with a single `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">…</linearGradient></defs><rect fill="url(#bg)" width="100%" height="100%"/>`. Use a 3-stop gradient: base `#0D0C14` → state-colour at 15% opacity at midpoint → `#0D0C14`. The state colour source logic (`meshStateColor`) is reused.

**SmallWidget (lines 228–291):**
- Renders: `hoursDisplay` (28pt bold), `earnings` (14pt gold), `PaceBadge`, `hoursRemaining` (12pt), stale, manager pending badge
- Same overcrowding issue as iOS Small
- Fix: remove `earnings` (TextWidget at line 259) and `hoursRemaining` (TextWidget at line 268); keep hours + PaceBadge + stale + manager badge

**`blProgressBar()` (lines 94–107):**
- Returns SVG: `height="6"`, track `#2F2E41`, fill `#A78BFA`
- Label in MediumWidget Hours mode (line ~510): "BL" prefix TextWidget + SvgWidget
- Fix: height → 8, label → "BrainLift"

**MediumWidget Hours mode** (renders BrainLift bar + "AI%" text):
- Currently shows "BL" as label (need to find exact line)
- Need to change TextWidget text from "BL" to "BrainLift"
- Similar for "AI" label if present

### Data Bridge (`src/widgets/bridge.ts`)

**`buildWidgetData()` (lines 233–311):**
- `hoursData.today` → raw number (hours worked today)
- `hoursData.average` → average daily hours this week (from `HoursData.average`, sourced from `timesheetData.averageHoursPerDay` at line 204 of `hours.ts`)
- New field: `todayDelta` = `today - average`, formatted as `"+1.2h"` / `"-0.5h"` / `""` when average === 0
- Must be added to both the null-guard default return (line 264 area) and the main return (line 285 area)

### Types (`src/widgets/types.ts`)

**`WidgetData` interface (lines 41–92):**
- Add `todayDelta: string` — today's hours vs daily average delta, e.g. "+1.2h"
- Placed in the main body (not a spec extension comment) as it's a first-class display field

---

## Key Decisions

### Decision 1: iOS Small — what to keep?
Keep: `hoursDisplay` (hero, 28pt accent) + `paceBadge` status (replacing the separate hoursRemaining and earnings rows). The pace badge gives status at a glance; earnings and remaining are secondary data that don't fit in 150px.

**Rationale:** User's explicit instruction "Only show Total Hours and the On Track status. Remove the '$' earned."

### Decision 2: Android background replacement approach
Use a top-to-bottom linear gradient SVG (3 stops) instead of the three radial ellipses. The state colour (urgency/paceBadge-driven) is used at 15% opacity at the midpoint, keeping the dynamic theming. The SVG canvas stays 360×200 (matched to widget container fill).

**Rationale:** Linear gradients render cleanly across all Android launchers. Radial gradients on positioned ellipses are the source of the "circles" artefact. The `meshStateColor()` helper is unchanged — reused by the new implementation.

### Decision 3: `todayDelta` — show only when average > 0
If `hoursData.average === 0` (early in the week, no billable days yet), return `""`. The widget rendering code should suppress the delta display when the field is empty.

**Rationale:** A delta of "+6.0h" on Monday (0h average) is meaningless. Only show delta when there's meaningful average data.

### Decision 4: `blProgressBar` height and label
Height: 8px (up from 6px). Label: "BrainLift" (from "BL"). "AI Usage" label replacing "AI" in Android Medium Hours mode.

**Rationale:** User's explicit instruction. 6px is below recommended minimum for progress tracks.

---

## Interface Contracts

### New field in `WidgetData` (`types.ts`)

```typescript
/** Today's hours vs daily average: "+1.2h" | "-0.5h" | "" (no average yet) */
todayDelta: string;
```

Source: `bridge.ts buildWidgetData()` — computed as `hoursData.today - hoursData.average`

### Updated `buildMeshSvg` signature

**No change to signature** — internal implementation only. Existing tests that snapshot the SVG output will need updating.

### Updated `blProgressBar` signature

**No change to signature** — `width` param still accepted; height hardcoded to 8 internally.

### `computeTodayDelta` (new helper in bridge.ts)

```typescript
function computeTodayDelta(today: number, average: number): string
// Returns: "+1.2h" | "-0.5h" | "" (when average === 0)
// today:   HoursData.today (hours worked today, raw number)
// average: HoursData.average (average daily hours this week, raw number)
```

Sources:
- `today` ← `hoursData.today` (number) ← `hours.ts` line 290
- `average` ← `hoursData.average` (number) ← `hours.ts` line 248, sourced from `timesheetData.averageHoursPerDay`

---

## Test Plan

### FR1: iOS Small content triage

**Contract:** SmallWidget renders `hoursDisplay` and pace/urgency info only — no `earnings`, no `hoursRemaining`.

Happy path:
- [ ] SmallWidget snapshot: does NOT contain earnings string (e.g. "$1,300")
- [ ] SmallWidget snapshot: does NOT contain hoursRemaining string (e.g. "7.5h left")
- [ ] SmallWidget snapshot: DOES contain hoursDisplay (e.g. "32.5h")
- [ ] SmallWidget renders pace badge when paceBadge !== 'none'

Edge cases:
- [ ] paceBadge = 'none': badge row absent, hours still shows
- [ ] isManager=true, pendingCount=2: manager badge still shows (it fits)
- [ ] stale=true: stale indicator still shows

### FR2: iOS Large padding

**Contract:** LargeWidget outer VStack uses `padding={16}`.

- [ ] Snapshot: VStack padding prop equals 16 (not 14)

### FR3: Android background replacement

**Contract:** `buildMeshSvg()` returns SVG with a linear gradient `<rect>` — no `<ellipse>` elements.

Happy path:
- [ ] Returned SVG contains `<linearGradient`
- [ ] Returned SVG does NOT contain `<ellipse`
- [ ] Returned SVG does NOT contain `<radialGradient`
- [ ] State color from `meshStateColor()` appears in the SVG output

Edge cases:
- [ ] urgency='critical': state color = '#F43F5E' appears in gradient
- [ ] urgency='none', paceBadge='on_track': state color = '#10B981'
- [ ] urgency='none', paceBadge='none': state color = '#A78BFA' (violet default)

### FR4: `todayDelta` data field

**Contract:** `computeTodayDelta(today, average)` returns correctly signed string.

```typescript
computeTodayDelta(6.2, 5.0) === '+1.2h'
computeTodayDelta(3.8, 5.0) === '-1.2h'
computeTodayDelta(5.0, 5.0) === '+0.0h'
computeTodayDelta(6.2, 0)   === ''
computeTodayDelta(0, 0)     === ''
```

Contract: `buildWidgetData()` sets `todayDelta` from `hoursData.today` and `hoursData.average`.

Happy path:
- [ ] `buildWidgetData()` result includes `todayDelta` field
- [ ] When hoursData.today > hoursData.average → `todayDelta` starts with "+"
- [ ] When hoursData.today < hoursData.average → `todayDelta` starts with "-"
- [ ] Null guard default includes `todayDelta: ''`

Mocks needed:
- `hoursData` partial mock with `today` and `average` fields

### FR5: Progress bar height and labels

**Contract:** `blProgressBar()` SVG uses `height="8"`. Android MediumWidget Hours mode labels read "BrainLift" and "AI Usage".

- [ ] `blProgressBar(3, 5, 120)` SVG contains `height="8"` (not `height="6"`)
- [ ] MediumWidget Hours mode snapshot contains "BrainLift" label text
- [ ] MediumWidget Hours mode snapshot does NOT contain standalone "BL" label
- [ ] If AI% label exists in Hours mode: contains "AI Usage" not just "AI"

---

## Files to Reference

### Primary Implementation Files
- `src/widgets/ios/HourglassWidget.tsx` — iOS SmallWidget (lines 52–104), LargeWidget (lines 175–250)
- `src/widgets/android/HourglassWidget.tsx` — buildMeshSvg (lines 19–43), SmallWidget (lines 228–291), blProgressBar (lines 94–107), MediumWidget Hours mode (~lines 480–560)
- `src/widgets/bridge.ts` — buildWidgetData (lines 233–311), null-guard return (lines 248–272)
- `src/widgets/types.ts` — WidgetData interface (lines 41–92)

### Supporting References
- `src/lib/hours.ts` — HoursData.average sourced from timesheetData.averageHoursPerDay (line 204)
- `src/widgets/__tests__/widgetLayoutJs.test.ts` — existing test patterns to extend

### Design System
- `src/lib/colors.ts` — brand colour tokens (reference for gradient stops)
- `BRAND_GUIDELINES.md` — visual identity constraints
