# 01-ios-hud-layout

**Status:** Draft
**Created:** 2026-03-26
**Last Updated:** 2026-03-26
**Owner:** @trilogy

---

## Overview

### What Is Being Built

Five targeted rendering fixes to the iOS Hourglass widget (`src/widgets/ios/HourglassWidget.tsx`):

1. **Priority modes for Medium and Large widgets** — a `getPriority()` helper returns one of three modes based on live data:
   - **P1 (approvals):** manager has pending approvals → approval-focused layout
   - **P2 (deficit):** pace is `behind` or `critical` → hours-deficit layout, secondary metrics stripped
   - **P3 (default):** on track / default → existing glass-card layout with today delta

2. **SmallWidget font fix** — hero number uses `weight: 'heavy'` and `design: 'monospaced'` instead of the current `weight: 'bold'` with no design attribute.

3. **MediumWidget layout branching** — three conditional layouts (P1/P2/P3) replace the single static layout. P3 also fixes the Today row to display `todayDelta` (±X.Xh vs avg) with fallback to `props.today`.

4. **LargeWidget layout branching + padding fix** — same three conditional layouts. The outer VStack padding changes from `padding={16}` to `padding={{ top: 16, leading: 16, trailing: 16, bottom: 28 }}` to prevent OS clipping of the last row.

5. **Today row todayDelta fix** — both Medium P3 and Large P3 use `props.todayDelta || props.today` instead of just `props.today`.

### How It Works

All data is already in `WidgetData` (no bridge or type changes). The changes are rendering-only:

- A pure function `getPriority(props)` is added at the top of the file (after the existing colour maps).
- `SmallWidget` receives one font-attribute change; its layout structure is unchanged.
- `MediumWidget` and `LargeWidget` call `getPriority()` at the top of each render and branch on the returned mode.
- No new component files. All changes are confined to `src/widgets/ios/HourglassWidget.tsx`.
- Tests extend the existing `src/__tests__/widgets/widgetVisualIos.test.ts`.

---

## Out of Scope

1. **Android widget changes** — **Deferred to `02-android-hud-layout`:** Android `HourglassWidget.tsx` priority mode, font, and progress bar changes are owned by that spec. The two specs are independent (different files).

2. **Bridge / WidgetData type changes** — **Descoped:** All required fields (`todayDelta`, `pendingCount`, `approvalItems`, `paceBadge`, `weekDeltaEarnings`) already exist in `WidgetData`. No API, bridge, or type changes are needed.

3. **Lock screen accessories (accessoryRectangular/Circular/Inline)** — **Descoped:** Accessory widget sizes are separate from systemSmall/Medium/Large. This spec covers the three home-screen sizes only.

4. **Custom font file embedding** — **Descoped:** SF Mono / monospaced is a system font on iOS. `design: 'monospaced'` resolves to the system monospaced variant; no font file needs to be bundled.

5. **Progress bar SVG on iOS Large** — **Descoped:** iOS Large already uses plain `Text` rows for AI% and BrainLift (no progress-bar SVG). The minimum-8pt bar height and "AI Usage" / "Limit" label fixes apply to Android (spec 02). iOS keeps text rows.

6. **Android Large widget** — **Descoped:** Separate feature; no spec currently exists for it.

7. **StandBy mode / interactive widget actions** — **Descoped:** Out of scope for this feature.

---

## Functional Requirements

### FR1 — `getPriority` helper function

**Description:** Add a pure function `getPriority(props: WidgetData): 'approvals' | 'deficit' | 'default'` to `HourglassWidget.tsx`, placed after the colour-map constants and before the `SmallWidget` component.

**Success Criteria:**

- SC1.1 — Returns `'approvals'` when `props.isManager === true` AND `props.pendingCount > 0`.
- SC1.2 — Returns `'deficit'` when `props.paceBadge === 'critical'`.
- SC1.3 — Returns `'deficit'` when `props.paceBadge === 'behind'`.
- SC1.4 — Returns `'default'` when `props.paceBadge === 'on_track'` (regardless of manager status with pendingCount = 0).
- SC1.5 — Returns `'default'` when `props.paceBadge === 'crushed_it'`.
- SC1.6 — Returns `'default'` when `props.paceBadge === 'none'`.
- SC1.7 — P1 takes precedence over P2: `isManager=true, pendingCount=3, paceBadge='critical'` → `'approvals'`.
- SC1.8 — P1 does NOT trigger when `pendingCount === 0`: `isManager=true, pendingCount=0, paceBadge='behind'` → `'deficit'`.

---

### FR2 — SmallWidget hero font

**Description:** Update the hero `Text` in `SmallWidget` to use `font={{ size: 28, weight: 'heavy', design: 'monospaced' }}`.

**Success Criteria:**

- SC2.1 — The hero `Text` node rendering `props.hoursDisplay` has `font.weight === 'heavy'`.
- SC2.2 — The hero `Text` node has `font.design === 'monospaced'`.
- SC2.3 — SmallWidget still renders `hoursDisplay` text (no content regression).
- SC2.4 — SmallWidget still shows pace badge text when `paceBadge` is in `PACE_LABELS`.
- SC2.5 — SmallWidget still shows manager pending badge when `isManager=true` and `pendingCount > 0`.

---

### FR3 — MediumWidget priority layouts

**Description:** MediumWidget calls `getPriority(props)` at the top of its render and branches into three layouts.

**P1 (approvals) layout:**
- Header: "PENDING APPROVALS" in accent colour
- Sub-header: "{pendingCount} items requiring action"
- Up to 2 `approvalItems` shown: `{item.name}    {item.hours}   [{item.type}]`
- Background tint: `#FF6B0020` (high urgency)
- No earnings card, no AI%, no hoursRemaining row

**P2 (deficit) layout:**
- Pace warning header using `PACE_LABELS[props.paceBadge]` in critical/warning colour
- Hero: `props.hoursDisplay` with `weight: 'heavy', design: 'monospaced'`
- Sub-line: `props.hoursRemaining`
- Bottom row: `props.today` and `props.weekDeltaEarnings`
- No earnings card, no AI%, no bar chart

**P3 (default) layout:**
- Two glass cards: hours (`hoursDisplay`) + earnings (`earnings`) side by side
- Bottom row: `"Today: " + (props.todayDelta || props.today)` and `"AI: " + props.aiPct`
- Hero font: `weight: 'heavy', design: 'monospaced'`

**Success Criteria:**

- SC3.1 — P1: renders pendingCount text.
- SC3.2 — P1: renders up to 2 approvalItem names.
- SC3.3 — P1: does NOT render `props.earnings` text.
- SC3.4 — P1: does NOT render `props.aiPct` text.
- SC3.5 — P2: renders `props.hoursDisplay` text.
- SC3.6 — P2: renders `props.hoursRemaining` text.
- SC3.7 — P2: does NOT render `props.earnings` text.
- SC3.8 — P2: does NOT render `props.aiPct` text.
- SC3.9 — P3: renders two `RoundedRectangle` glass cards.
- SC3.10 — P3: today row contains `todayDelta` text when `todayDelta` is non-empty.
- SC3.11 — P3: today row falls back to `props.today` when `todayDelta` is `""`.

---

### FR4 — LargeWidget priority layouts + bottom padding

**Description:** LargeWidget calls `getPriority(props)` and branches into three layouts. Outer VStack padding changes to `{ top: 16, leading: 16, trailing: 16, bottom: 28 }`.

**P1 (approvals) layout:**
- Same structure as Medium P1 but shows up to 3 approvalItems
- No bar chart, no AI%/BrainLift rows

**P2 (deficit) layout:**
- Pace warning header + hoursDisplay hero + hoursRemaining
- No bar chart, no AI%/BrainLift rows, no earnings card

**P3 (default) layout:**
- Two glass cards + bar chart (`IosBarChart`) + stats rows
- Today row: `props.todayDelta || props.today`
- AI% and BrainLift text rows unchanged

**Success Criteria:**

- SC4.1 — Outer VStack bottom padding equals 28 (either as object `{ bottom: 28 }` or inspected via props).
- SC4.2 — P1: renders up to 3 approvalItem names.
- SC4.3 — P1: does NOT render bar chart day labels (Mon/Tue/Wed/etc.).
- SC4.4 — P2: renders `props.hoursRemaining` text.
- SC4.5 — P2: does NOT render bar chart day labels.
- SC4.6 — P3: renders bar chart (contains 7 day-label Text nodes).
- SC4.7 — Hero font in P2/P3 has `weight: 'heavy'` and `design: 'monospaced'`.

---

### FR5 — Today row uses `todayDelta` with fallback

**Description:** Both Medium P3 and Large P3 display `props.todayDelta || props.today` in the Today row. When `todayDelta` is non-empty it takes precedence; when empty the raw `today` value is shown.

**Success Criteria:**

- SC5.1 — MediumWidget P3: today row text includes `todayDelta` value when `todayDelta !== ""`.
- SC5.2 — MediumWidget P3: today row text includes `props.today` value when `todayDelta === ""`.
- SC5.3 — LargeWidget P3: today row text includes `todayDelta` value when `todayDelta !== ""`.
- SC5.4 — LargeWidget P3: today row text includes `props.today` value when `todayDelta === ""`.

---

## Technical Design

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/widgets/ios/HourglassWidget.tsx` | Add `getPriority`, update all three widget components |
| `hourglassws/src/__tests__/widgets/widgetVisualIos.test.ts` | Add FR1–FR5 test cases |

No new files created. No changes to `bridge.ts`, `types.ts`, `android/HourglassWidget.tsx`, or any other file.

---

### Data Flow

```
WidgetData (from bridge.ts updateTimeline)
    │
    ▼
HourglassWidget entry point
    │ reads props.widgetFamily
    ├── 'systemSmall'  → SmallWidget  (font fix only)
    ├── 'systemMedium' → MediumWidget
    │                       │
    │                       └── getPriority(props)
    │                             ├── 'approvals' → P1 layout
    │                             ├── 'deficit'   → P2 layout
    │                             └── 'default'   → P3 layout (todayDelta fix)
    └── 'systemLarge'  → LargeWidget
                            │
                            └── getPriority(props)
                                  ├── 'approvals' → P1 layout (3 items)
                                  ├── 'deficit'   → P2 layout
                                  └── 'default'   → P3 layout (bar chart + todayDelta fix)
```

---

### Implementation Plan

#### 1. Add `getPriority` after colour constants (~line 45)

```typescript
function getPriority(props: WidgetData): 'approvals' | 'deficit' | 'default' {
  if (props.isManager && props.pendingCount > 0) return 'approvals';
  if (props.paceBadge === 'critical' || props.paceBadge === 'behind') return 'deficit';
  return 'default';
}
```

#### 2. SmallWidget font change (~line 128)

```typescript
// Before:
font={{ size: 28, weight: 'bold' }}

// After:
font={{ size: 28, weight: 'heavy', design: 'monospaced' }}
```

#### 3. MediumWidget — replace body with priority branching

Three conditional blocks keyed on `priority === 'approvals'`, `priority === 'deficit'`, `priority === 'default'`. P1 background tint overrides urgency tint with `#FF6B0020`. Hero fonts in P2/P3 use `weight: 'heavy', design: 'monospaced'`. P3 today row uses `props.todayDelta || props.today`.

#### 4. LargeWidget — replace body with priority branching + bottom padding

Same three-block pattern. Outer `<VStack padding={{ top: 16, leading: 16, trailing: 16, bottom: 28 }}>`. P1 shows up to 3 items. P3 includes `IosBarChart`.

---

### Edge Cases

| Case | Handling |
|------|----------|
| `todayDelta` is `""` (Monday, no average yet) | Falls back to `props.today` via `\|\|` operator |
| `approvalItems` is empty in P1 layout | `.slice(0, 2)` returns `[]` — renders only header, no crash |
| `paceBadge` is `'none'` or unrecognised | `getPriority` returns `'default'` (explicit fallthrough) |
| Manager with `pendingCount > 0` AND `paceBadge === 'critical'` | P1 wins (approvals are more actionable than deficit warning) |

---

### Files to Reference

- `hourglassws/src/widgets/ios/HourglassWidget.tsx` — primary file to modify
- `hourglassws/src/widgets/types.ts` — `WidgetData`, `WidgetApprovalItem` types
- `hourglassws/src/__tests__/widgets/widgetVisualIos.test.ts` — existing test patterns to extend
- `hourglassws/src/widgets/android/HourglassWidget.tsx` — reference for P1/P2/P3 conditional render structure
- `hourglassws/src/widgets/bridge.ts` — `computeTodayDelta()` logic for understanding todayDelta field
