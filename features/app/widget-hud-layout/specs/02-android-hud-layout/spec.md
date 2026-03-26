# 02-android-hud-layout

**Status:** Draft
**Created:** 2026-03-26
**Last Updated:** 2026-03-26

---

## Overview

### What Is Being Built

This spec fixes four rendering issues in the Android widget (`src/widgets/android/HourglassWidget.tsx`):

1. **Priority mode unification**: Merges the existing `isUrgencyMode` (manager + high/critical urgency + pending > 0) and `isActionMode` (any approval/request items) into a single clean three-priority model using a `getPriority()` helper function.

2. **Label fixes**: Changes `"AI:"` → `"AI Usage:"` in the MediumWidget Hours Mode (P3) footer row.

3. **Today delta fix**: Changes the Today footer value from `data.today` → `data.todayDelta || data.today` to show delta vs average when available.

4. **Font weight audit**: Ensures all metric `TextWidget` elements in MediumWidget use `fontWeight: '700'` explicitly to prevent Android fallback to Roboto Regular.

### How It Works

A new `getPriority(data)` helper function encapsulates the priority logic:

```
P1 (approvals): isManager && pendingCount > 0
P2 (deficit):   paceBadge === 'behind' || paceBadge === 'critical'
P3 (default):   everything else
```

The `MediumWidget` component switches rendering based on this priority:
- **P1**: Approval-focused layout (merged from old urgency + action manager paths) — warning header, up to 2 approval item cards, deadline footer
- **P2**: Hours deficit layout (same as existing Pace Mode but without legacy guard conditions)
- **P3**: Full hours mode — dual glass panels, AI Usage label, todayDelta row, BrainLift bar, bar chart

The `blProgressBar` SVG function requires no changes — track height is already 8px.

The `buildMeshSvg` background function requires no changes — uses a single `<rect>` with linearGradient fill (no circles).

---

## Out of Scope

1. **Bridge / WidgetData changes** — **Descoped.** All required fields (`isManager`, `pendingCount`, `paceBadge`, `todayDelta`, `approvalItems`, `aiPct`, etc.) already exist in `WidgetData`. No data layer changes needed.

2. **Android Large widget** — **Deferred to a future Android Large widget spec.** Large widget layout is a separate concern not covered by this spec.

3. **iOS widget changes** — **Deferred to `01-ios-hud-layout`.** iOS changes are handled in a parallel spec for `src/widgets/ios/HourglassWidget.tsx`.

4. **Lock screen accessories** — **Descoped.** Android widgets do not have lock screen accessor variants.

5. **SmallWidget changes** — **Descoped.** `fontWeight: '700'` is already set on SmallWidget hero. No earnings or remaining hours shown. SmallWidget is already correct per spec-research.md verification.

6. **blProgressBar SVG function changes** — **Descoped.** Track height is already 8px internally. The function requires no modification; only tests to verify this regression guard.

7. **buildMeshSvg background changes** — **Descoped.** Already uses single `<rect fill="url(#linearGradient)"/>` — no circular shapes. No changes needed.

8. **Custom font embedding** — **Descoped.** Android `TextWidget` fontFamily cannot be customized beyond system default. Only `fontWeight: '700'` is applicable.

9. **Contributor myRequests special mode** — **Descoped.** Contributors with pending/rejected requests fall through to P3 default. The small badge in the footer handles visibility. No separate P1/P2 path for contributors.

---

## Functional Requirements

### FR1: `getPriority` Helper Function

**Description:** Extract priority logic into a standalone `getPriority(data)` function that returns one of three string literals.

**Interface:**
```typescript
export function getPriority(data: WidgetData): 'approvals' | 'deficit' | 'default'
```

**Logic:**
```
if data.isManager && data.pendingCount > 0 → 'approvals'   // P1
if data.paceBadge === 'behind' || data.paceBadge === 'critical' → 'deficit'  // P2
else → 'default'  // P3
```

**Success Criteria:**
- [ ] `isManager=true, pendingCount=2` → `'approvals'`
- [ ] `isManager=false, paceBadge='critical'` → `'deficit'`
- [ ] `isManager=false, paceBadge='behind'` → `'deficit'`
- [ ] `isManager=false, paceBadge='on_track'` → `'default'`
- [ ] `isManager=true, pendingCount=0, paceBadge='critical'` → `'deficit'` (P1 requires pending > 0)
- [ ] `isManager=true, urgency='critical', pendingCount=0` → `'deficit'` (urgency alone no longer triggers P1)
- [ ] `paceBadge='crushed_it'` → `'default'`
- [ ] Contributor (`isManager=false`) with `myRequests` → `'default'` (not P1)

---

### FR2: MediumWidget P1 — Approvals Layout

**Description:** When `getPriority` returns `'approvals'`, MediumWidget renders an approval-focused layout. This merges the old `isUrgencyMode` (high/critical urgency path) and `isActionMode` (manager approval path) into a single layout.

**Layout:**
```
Background: actionBg tint (#1C1400)
Header:     "⚠ {pendingCount} PENDING" in warning/critical accent color
Items:      Up to 2 WidgetApprovalItem cards showing {name}, {hours}, [{MANUAL|OT} badge]
Footer:     Today's hours + deadline
```

**Success Criteria:**
- [ ] Renders `pendingCount` in the header text
- [ ] Renders `approvalItems[0].name` and `approvalItems[0].hours` when items exist
- [ ] Does NOT render earnings hero text
- [ ] Background uses actionBg / warning tint (`#1C1400` or similar)
- [ ] Activates for any manager with `pendingCount > 0`, regardless of urgency level

---

### FR3: MediumWidget P2 — Deficit Layout

**Description:** When `getPriority` returns `'deficit'`, MediumWidget renders the hours-deficit view. This is the existing Pace Mode logic, cleaned up by removing the legacy `!isUrgencyMode && !isActionMode` guard conditions.

**Layout:**
```
Header:  ⚠ pace label
Hero:    hoursDisplay prominently
Sub:     hoursRemaining
Footer:  (no AI%, no bar chart)
```

**Success Criteria:**
- [ ] Renders `hoursDisplay` prominently
- [ ] Renders `hoursRemaining`
- [ ] Does NOT render AI usage percentage text
- [ ] Does NOT render bar chart SVG
- [ ] Does NOT require `!isUrgencyMode && !isActionMode` guard (unified priority removes this)

---

### FR4: MediumWidget P3 — Label and Today Delta Fixes

**Description:** When `getPriority` returns `'default'`, MediumWidget renders the full Hours Mode. Two label fixes apply in this mode only.

**Fixes:**
1. `"AI:"` → `"AI Usage:"` in the footer metric row
2. Today value: `data.todayDelta || data.today` (delta when available, raw hours as fallback)

**Success Criteria:**
- [ ] Footer contains text `"AI Usage:"` (not `"AI:"`)
- [ ] Footer contains `data.todayDelta` when `data.todayDelta` is non-empty string
- [ ] Footer falls back to `data.today` when `data.todayDelta` is `""`
- [ ] All hero/metric `TextWidget` elements have `fontWeight: '700'`

---

### FR5: `blProgressBar` Height Regression Guard

**Description:** No code changes to `blProgressBar`. Add tests to verify the SVG output contains 8px track and fill heights — a regression guard so future changes don't reduce the track below 8px.

**Success Criteria:**
- [ ] `blProgressBar` SVG string contains `height="8"` on the track rect
- [ ] `blProgressBar` SVG string contains `height="8"` on the fill rect
- [ ] Fill rect width is capped at `width - 4` when `brainliftHours >= targetHours` (100% fill)

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `src/widgets/android/HourglassWidget.tsx` | Primary file to modify |
| `src/widgets/types.ts` | `WidgetData`, `WidgetApprovalItem` type definitions |
| `src/__tests__/widgets/android/HourglassWidget.test.tsx` | Existing Android widget test file to extend |
| `src/widgets/ios/HourglassWidget.tsx` | Reference: iOS P1/P2/P3 priority logic (spec 01) |
| `src/widgets/bridge.ts` | Reference: `deriveActionBg()` for P1 background tint |

### Files to Modify

| File | Change |
|------|--------|
| `src/widgets/android/HourglassWidget.tsx` | Add `getPriority()`, refactor `MediumWidget` modes, fix label/todayDelta, audit fontWeight |
| `src/__tests__/widgets/android/HourglassWidget.test.tsx` | Add FR1–FR5 test cases |

No new files are created. No bridge, types, or iOS files are modified.

### Data Flow

```
WidgetData (from bridge, already populated)
    │
    ▼
getPriority(data)
    ├─ 'approvals' → MediumWidget P1 branch
    ├─ 'deficit'   → MediumWidget P2 branch
    └─ 'default'   → MediumWidget P3 branch (with label + todayDelta fixes)
```

### Implementation Notes

#### `getPriority` Placement

Add `getPriority` as a module-level function (before `SmallWidget`). Export it for testability:

```typescript
export function getPriority(data: WidgetData): 'approvals' | 'deficit' | 'default' {
  if (data.isManager && data.pendingCount > 0) return 'approvals';
  if (data.paceBadge === 'behind' || data.paceBadge === 'critical') return 'deficit';
  return 'default';
}
```

#### MediumWidget Refactor

Replace the four mode variables (`isUrgencyMode`, `isActionMode`, and implicit pace/hours checks) with a single `priority` constant:

```typescript
const priority = getPriority(data);
```

Then use a switch/ternary render based on `priority`.

**P1 layout** consolidates the old urgency mode (deadline countdown hero) and action mode (approval items list) into a single approvals layout:
- Old: urgency mode = deadline hero + items; action mode = compact hours + items
- New: P1 = approvals header (`"⚠ {N} PENDING"`) + up to 2 items + today/deadline footer

**P2 layout** is the existing Pace Mode content. Remove the `!isUrgencyMode && !isActionMode` guard — it is now implicit in the priority switch.

**P3 layout** is the existing Hours Mode with two targeted fixes:
- `"AI: ..."` → `"AI Usage: ..."`
- `data.today` → `data.todayDelta || data.today` in the Today footer slot

#### Font Weight Audit

In the P3 (Hours Mode) layout, verify all metric-value `TextWidget` elements have `fontWeight: '700'`. In particular:
- Hours hero (`data.hoursDisplay`)
- Earnings hero (`data.earnings` or `data.weeklyEarnings`)
- Today value in footer
- AI Usage value in footer

If any are missing `fontWeight: '700'`, add it.

#### Android Widget Constraints

- Use `FlexWidget`, `TextWidget`, `SvgWidget`, `ImageWidget` only — no React Native `<View>/<Text>`
- Style objects use camelCase field names
- No CSS grid, no gaps — use explicit `margin`/`padding` on children
- SVG content via `SvgWidget` passing SVG string

### Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `isManager=true`, `pendingCount=0`, `paceBadge='critical'` | P2 deficit (not P1 — pendingCount must be > 0) |
| `isManager=false`, has `myRequests` | P3 default (contributors never hit P1) |
| `todayDelta=""` | Falls back to `data.today` in P3 footer |
| `todayDelta` is undefined/null | Falls back to `data.today` via `||` operator |
| `approvalItems` is empty but `pendingCount > 0` | P1 layout renders header; items section shows empty state |
| `brainliftHours >= targetHours` in `blProgressBar` | Fill capped at `width - 4` (100%) |
| `brainliftHours = 0` in `blProgressBar` | Fill width = 0px, track still shows at 8px height |

### Test Strategy

Tests extend `src/__tests__/widgets/android/HourglassWidget.test.tsx`.

- **FR1 tests**: Call `getPriority()` directly with varied `WidgetData` shapes. No rendering needed.
- **FR2–FR4 tests**: Use the existing render helper pattern (mock `WidgetData`, call render or snapshot). Assert text content presence/absence.
- **FR5 tests**: Call `blProgressBar(hours, target, width)` directly, assert SVG string contains expected height attributes.

No new test files needed — extend the existing file.
