# 01-widget-polish

**Status:** Draft
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Owner:** @trilogy

---

## Overview

### What Is Being Built

Five targeted fixes to the Hourglass home-screen widget across iOS and Android. Each fix corrects a specific visual or data problem verified during research:

1. **Small widget content triage** (iOS + Android) — Remove `earnings` and `hoursRemaining` from SmallWidget on both platforms. Keep `hoursDisplay` (hero) + `paceBadge` status only. Rationale: ~150×150px cannot legibly host 6+ data points.

2. **iOS Large padding** — Change `padding={14}` to `padding={16}` on the outer `VStack` in `LargeWidget`. The extra 2px prevents the AI/BrainLift row from being clipped by OS system chrome at the bottom edge.

3. **Android SVG background replacement** — Replace `buildMeshSvg()`'s three radial-gradient `<ellipse>` elements with a single top-to-bottom linear gradient `<rect>`. Linear gradients render cleanly on all Android launchers; radial gradients on positioned ellipses cause visible circular banding artefacts.

4. **`todayDelta` data field** — Add `todayDelta: string` to `WidgetData`. Bridge computes it as `today - average`, formatted as `"+1.2h"` / `"-0.5h"` or `""` when average is zero. iOS LargeWidget's "Today" row right side switches from repeating `hoursRemaining` to showing `todayDelta`.

5. **Progress bar polish** — `blProgressBar()` SVG height increases from 6px to 8px. Android MediumWidget Hours mode label changes from `"BL"` to `"BrainLift"` and `"AI:"` to `"AI Usage:"`.

### How It Works

All changes are internal to four existing files. No new modules, no new screens, no API changes. The changes are:

- `types.ts`: +1 field on `WidgetData`
- `bridge.ts`: +1 helper function `computeTodayDelta()`, wired into `buildWidgetData()` null-guard and main return
- `ios/HourglassWidget.tsx`: SmallWidget loses 2 JSX elements; LargeWidget padding +2, right-side delta field swap
- `android/HourglassWidget.tsx`: `buildMeshSvg()` body replaced; SmallWidget loses 2 `TextWidget` elements; `blProgressBar()` height 6→8; two label strings updated

Tests extend the existing `widgetLayoutJs.test.ts` patterns and add a new dedicated test file `widgetPolish.test.ts`.

---

## Out of Scope

1. **Android Large widget** — No Android Large size exists yet. **Descoped:** Separate feature, no spec owns it yet.

2. **Dynamic font scaling / accessibility sizing** — SwiftUI `dynamicTypeSize` modifiers and Android `sp` font units are not addressed here. **Descoped:** Explicitly excluded in FEATURE.md Non-Goals.

3. **Full design-system token unification** — Shared color constant files, brand-revamp token extraction across both platforms. **Descoped:** Brand Revamp feature, separate from this fix set.

4. **Weekly bar charts in widgets** — `WidgetDailyEntry[]` / `daily` field exists but rendering bar charts in Small/Medium/Large is a separate enhancement. **Descoped:** Explicitly excluded in FEATURE.md Non-Goals.

5. **iOS Medium widget changes** — Research found no changes needed. **Descoped:** No verified problems.

6. **Android action mode and urgency mode layouts** — The `actionMode` and `isUrgencyMode` branches are not modified. **Descoped:** Only Hours mode BrainLift bar label and SVG background are updated.

7. **`todayDelta` in Android MediumWidget** — FEATURE.md architecture lists iOS Large as display target. Android Medium delta display is **Descoped** pending UX decision.

8. **Push notification / ping server interaction** — Widget data refresh pipeline is not modified. **Descoped:** Covered by feature #7 ping-server.

---

## Functional Requirements

### FR1: Small Widget Content Triage (iOS + Android)

**What:** Remove `earnings` and `hoursRemaining` from both platform SmallWidgets.

**iOS SmallWidget** (`ios/HourglassWidget.tsx` lines 52–104):
- Remove the `<Text>` element rendering `{props.earnings}` (line 70–74)
- Remove the `<Text>` element rendering `{props.hoursRemaining}` (lines 80–87)
- Keep: `hoursDisplay` hero text, `Spacer`, stale indicator (conditional), manager badge (conditional)
- Add: pace status text showing `PACE_LABELS[props.paceBadge]` at 12pt with urgency accent color (rendered only when `paceBadge !== 'none'` and label is non-empty)

**Android SmallWidget** (`android/HourglassWidget.tsx` lines 228–291):
- Remove the `<TextWidget>` rendering `data.earnings` (line ~259)
- Remove the `<TextWidget>` rendering `data.hoursRemaining` (line ~268)
- Keep: `hoursDisplay` TextWidget, `PaceBadge` component, stale indicator (conditional), manager pending badge (conditional)

**Success Criteria:**

- SC1.1: iOS SmallWidget rendered output does NOT contain any earnings string (e.g. `$1,300`, `$0`)
- SC1.2: iOS SmallWidget rendered output does NOT contain any hoursRemaining string (e.g. `7.5h left`, `0.0h left`)
- SC1.3: iOS SmallWidget rendered output DOES contain `hoursDisplay` (e.g. `32.5h`)
- SC1.4: iOS SmallWidget with `paceBadge = 'on_track'` renders the pace status text
- SC1.5: iOS SmallWidget with `paceBadge = 'none'` does NOT render pace status text
- SC1.6: iOS SmallWidget with `isManager=true, pendingCount=2` still renders manager badge
- SC1.7: iOS SmallWidget with `stale=true` still renders stale indicator
- SC1.8: Android SmallWidget rendered output does NOT contain earnings string
- SC1.9: Android SmallWidget rendered output does NOT contain hoursRemaining string
- SC1.10: Android SmallWidget rendered output DOES contain hoursDisplay

---

### FR2: iOS Large Widget Padding

**What:** Change outer `VStack` `padding` prop from `14` to `16` in `LargeWidget`.

**Location:** `ios/HourglassWidget.tsx` line 184 — `<VStack background={bg} padding={14}>`

**Success Criteria:**

- SC2.1: LargeWidget's outer VStack has `padding` prop equal to `16`
- SC2.2: LargeWidget content renders without clipping (verified by padding value in test)

---

### FR3: Android SVG Background Replacement

**What:** Replace `buildMeshSvg()` implementation. Remove three `<ellipse>` elements with `<radialGradient>` fills. Replace with a single `<linearGradient>` + `<rect>`.

**New SVG structure:**
```xml
<svg width="360" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D0C14" stop-opacity="1"/>
      <stop offset="50%" stop-color="{stateColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0D0C14" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>
```

The `meshStateColor()` helper is **unchanged** — its output is still used as the midpoint tint color.

**Success Criteria:**

- SC3.1: `buildMeshSvg()` return value contains `<linearGradient`
- SC3.2: `buildMeshSvg()` return value does NOT contain `<ellipse`
- SC3.3: `buildMeshSvg()` return value does NOT contain `<radialGradient`
- SC3.4: `buildMeshSvg()` return value contains the state color hex from `meshStateColor()`
- SC3.5: With `urgency='critical'`: state color `#F43F5E` appears in output
- SC3.6: With `urgency='none', paceBadge='on_track'`: state color `#10B981` appears in output
- SC3.7: With `urgency='none', paceBadge='none'`: state color `#A78BFA` appears in output
- SC3.8: SVG canvas dimensions remain 360×200

---

### FR4: `todayDelta` Data Field

**What:** Add `todayDelta: string` to `WidgetData`. Implement `computeTodayDelta()` in `bridge.ts`. Wire into `buildWidgetData()`. Display in iOS LargeWidget "Today" row.

**`computeTodayDelta(today: number, average: number): string`**:
- If `average === 0`: return `""`
- Otherwise: `delta = today - average`; format as `"+{delta.toFixed(1)}h"` if delta ≥ 0, `"-{|delta|.toFixed(1)}h"` if delta < 0

**`types.ts`**: Add field to `WidgetData` interface:
```typescript
/** Today's hours vs daily average: "+1.2h" | "-0.5h" | "" (no average yet) */
todayDelta: string;
```

**`buildWidgetData()` null-guard return** (line ~249–272): Add `todayDelta: ''`

**`buildWidgetData()` main return** (line ~285–310): Add `todayDelta: computeTodayDelta(hoursData.today, hoursData.average)`

**iOS LargeWidget** (lines 208–217): Replace `{props.hoursRemaining}` on the right side of the "Today" row with a conditional render of `{props.todayDelta}` (only when non-empty).

**Success Criteria:**

- SC4.1: `computeTodayDelta(6.2, 5.0)` returns `'+1.2h'`
- SC4.2: `computeTodayDelta(3.8, 5.0)` returns `'-1.2h'`
- SC4.3: `computeTodayDelta(5.0, 5.0)` returns `'+0.0h'`
- SC4.4: `computeTodayDelta(6.2, 0)` returns `''`
- SC4.5: `computeTodayDelta(0, 0)` returns `''`
- SC4.6: `buildWidgetData()` result includes `todayDelta` field
- SC4.7: When `hoursData.today > hoursData.average`, `todayDelta` starts with `"+"`
- SC4.8: When `hoursData.today < hoursData.average`, `todayDelta` starts with `"-"`
- SC4.9: Null-guard return includes `todayDelta: ''`
- SC4.10: iOS LargeWidget "Today" row does NOT render `hoursRemaining` on the right
- SC4.11: iOS LargeWidget "Today" row renders `todayDelta` text when non-empty
- SC4.12: iOS LargeWidget "Today" row right element is absent when `todayDelta === ''`

---

### FR5: Progress Bar Height and Labels

**What:** Three sub-changes in `android/HourglassWidget.tsx`:
1. `blProgressBar()`: change SVG height from `6` to `8` (both `<rect>` elements and `<svg>` height attribute)
2. MediumWidget Hours mode BrainLift label: `"BL"` → `"BrainLift"` (TextWidget at line ~609)
3. MediumWidget Hours mode AI label: `"AI:"` → `"AI Usage:"` (stats row at line ~595)

Also update the `SvgWidget` height style from `{ width: 120, height: 6 }` to `{ width: 120, height: 8 }` to match.

**Success Criteria:**

- SC5.1: `blProgressBar(3, 5, 120)` SVG contains `height="8"` (not `height="6"`)
- SC5.2: `blProgressBar(3, 5, 120)` SVG does NOT contain `height="6"`
- SC5.3: Android MediumWidget Hours mode rendered output contains the text `"BrainLift"`
- SC5.4: Android MediumWidget Hours mode rendered output does NOT contain standalone label `"BL"` as label prefix
- SC5.5: Android MediumWidget Hours mode stats row contains `"AI Usage:"` (not bare `"AI:"`)

---

## Technical Design

### Files to Modify

| File | Change Summary |
|------|----------------|
| `hourglassws/src/widgets/types.ts` | Add `todayDelta: string` field to `WidgetData` interface |
| `hourglassws/src/widgets/bridge.ts` | Add `computeTodayDelta()` helper; add `todayDelta` to `buildWidgetData()` null-guard and main return |
| `hourglassws/src/widgets/ios/HourglassWidget.tsx` | SmallWidget: remove earnings + hoursRemaining; add paceBadge status text. LargeWidget: padding 14→16; Today row right side shows todayDelta |
| `hourglassws/src/widgets/android/HourglassWidget.tsx` | `buildMeshSvg()`: replace ellipse+radialGradient with rect+linearGradient. SmallWidget: remove earnings + hoursRemaining TextWidgets. `blProgressBar()`: height 6→8. MediumWidget Hours mode: "BL"→"BrainLift", "AI:"→"AI Usage:" |

### Files to Create

| File | Purpose |
|------|---------|
| `hourglassws/src/widgets/__tests__/widgetPolish.test.ts` | New test file for FR1–FR5 |

### Files to Reference

- `hourglassws/src/widgets/__tests__/widgetLayoutJs.test.ts` — existing test patterns
- `hourglassws/src/widgets/bridge.ts` — `computePaceBadge`, `computeWeekDeltas` patterns
- `hourglassws/src/lib/colors.ts` — brand color tokens
- `hourglassws/BRAND_GUIDELINES.md` — visual identity constraints

### Data Flow for `todayDelta`

```
HoursData.today      (number: hours worked today, e.g. 6.2)
HoursData.average    (number: avg daily hours this week)
          │
          ▼
computeTodayDelta(today, average)
  if average === 0 → ""
  else delta = today - average
       → "+{delta.toFixed(1)}h"  (delta ≥ 0)
       → "-{|delta|.toFixed(1)}h" (delta < 0)
          │
          ▼
buildWidgetData() → WidgetData.todayDelta
          │
          └── iOS LargeWidget: Today row right side (when non-empty)
```

### Key Implementation Details

#### `types.ts` — Field placement

Add after `weekDeltaEarnings`, before closing brace of `WidgetData`:

```typescript
/** Today's hours vs daily average: "+1.2h" | "-0.5h" | "" (no average yet) */
todayDelta: string;
```

#### `bridge.ts` — `computeTodayDelta`

Export the function for direct unit testing:

```typescript
export function computeTodayDelta(today: number, average: number): string {
  if (average === 0) return '';
  const delta = today - average;
  const abs = Math.abs(delta).toFixed(1);
  return delta >= 0 ? `+${abs}h` : `-${abs}h`;
}
```

Place near other compute-helpers (`computePaceBadge`, `computeWeekDeltas`).

#### `ios/HourglassWidget.tsx` — paceBadge label map

Add a `PACE_LABELS` constant near `URGENCY_COLORS`/`URGENCY_ACCENT`:

```typescript
const PACE_LABELS: Record<string, string> = {
  crushed_it: 'CRUSHED IT',
  on_track:   'ON TRACK',
  behind:     'BEHIND PACE',
  critical:   'CRITICAL',
};
```

SmallWidget status text: `PACE_LABELS[props.paceBadge] ?? ''` — render only when non-empty.

#### `android/HourglassWidget.tsx` — `buildMeshSvg()` replacement

Replace lines 22–41 (the SVG string body). `meshStateColor()` (lines 45–51) is **not touched**. The linearGradient uses `x1="0" y1="0" x2="0" y2="1"` for top-to-bottom fill.

#### MediumWidget Hours mode — label and height changes

- Line ~609: `text="BL"` → `text="BrainLift"`
- Line ~614: `style={{ width: 120, height: 6 }}` → `style={{ width: 120, height: 8 }}`
- Line ~595: `` `AI: ${data.aiPct}` `` → `` `AI Usage: ${data.aiPct}` ``

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `average === 0` (Monday morning) | `todayDelta = ''`; iOS Large Today row right side not rendered |
| `today === average` exactly | `todayDelta = '+0.0h'` (zero delta, positive sign) |
| `hoursData === null` (bridge null guard) | `todayDelta: ''` in default return |
| `paceBadge === 'none'` in iOS Small | No status text rendered (no crash) |
| `paceBadge === undefined` in iOS Small | Treated as `'none'`; no status text |
| NaN brainliftHours in `blProgressBar()` | Already handled by `safeHours`; height change unaffected |
| `urgency='expired'` in `buildMeshSvg()` | Falls through to `#A78BFA` violet default — correct |

### Test Architecture

**New file:** `src/widgets/__tests__/widgetPolish.test.ts`

Strategy:
- Import `computeTodayDelta` directly from `bridge.ts` (exported)
- Import `buildMeshSvg`, `blProgressBar` directly from `android/HourglassWidget.tsx` (already exported)
- For iOS widget checks: read `ios/HourglassWidget.tsx` source as a string and assert on JSX content (presence/absence of specific prop values and text content)
- For Android widget rendering: use `@testing-library/react-native` with existing mock setup

**Mock data helper** (`makeWidgetData`): produces a complete `WidgetData` object with sensible defaults; accepts partial overrides for targeted test cases.
