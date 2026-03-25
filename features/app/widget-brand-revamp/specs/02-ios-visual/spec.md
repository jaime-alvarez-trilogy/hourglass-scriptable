# 02-ios-visual: iOS Widget Visual Redesign

**Status:** Draft
**Created:** 2026-03-24
**Last Updated:** 2026-03-24
**Owner:** @trilogy

---

## Overview

### What Is Being Built

A full redesign of the `WIDGET_LAYOUT_JS` constant in `hourglassws/src/widgets/bridge.ts`. This is the JavaScript string that the iOS widget extension evaluates to render every widget size. The current implementation uses flat dark backgrounds and no depth hierarchy. The redesign brings the widget into full alignment with the Hourglass Liquid Glass design system.

### How It Works

`WIDGET_LAYOUT_JS` is a self-contained JavaScript function string evaluated inside the widget extension's JSContext (provided by `expo-widgets`). It has access to SwiftUI-like JS globals (`ZStack`, `VStack`, `HStack`, `Text`, `Rectangle`, `Circle`, `RoundedRectangle`, `Capsule`, `LinearGradient`, `Spacer`, `ContainerBackground`) and modifier functions (`foregroundStyle`, `font`, `frame`, `padding`, `background`, `opacity`, `cornerRadius`). No imports, no Skia, no animations.

The function receives `(props: WidgetData, env: { widgetFamily: string })` on each render cycle and returns a layout tree. This spec replaces the monolithic switch/if block with a set of named helper functions defined inside the JS string, then a router that calls the correct builder.

### Five New Visual Elements

1. **Simulated mesh background** — three overlapping `Circle()` shapes in violet, cyan, and urgency-state color at low opacity, layered over the base `#0D0C14` fill. Static approximation of the app's animated orbital mesh.

2. **Glass panel simulation** — `RoundedRectangle` with a two-stop `LinearGradient` fill (`#1A1928` → `#131220`) at 0.85 opacity, overlaid with a second `RoundedRectangle` stroke in a gradient border (`#3D3B54` → `#1A1928`). Simulates frosted glass without backdrop blur.

3. **Pace badge** — `Capsule` background in the badge's semantic color at low opacity with a text label on top. Shown in all sizes for hours mode; hidden when `paceBadge === 'none'`.

4. **Week delta text** — Unicode arrows `↑` or `↓` with delta value (`+2.1h`, `+$84`). Shown in medium and large sizes. Rendered as null when delta is empty string.

5. **BrainLift/AI progress bars** — existing mechanism updated to use `props.brainliftTarget` field from `01-data-extensions` rather than hardcoded `5`.

### Scope of Change

The single file `src/widgets/bridge.ts` is the only file modified. The `WIDGET_LAYOUT_JS` constant is replaced in its entirety. All surrounding TypeScript (`buildWidgetData`, `buildTimelineEntries`, `updateWidgetData`, `formatApprovalItems`, etc.) is unchanged. One test file is created.

### Rendered Sizes

| Family | Mode | Key new elements |
|--------|------|-----------------|
| `systemSmall` | hours only | mesh bg, pace badge capsule |
| `systemMedium` | hours mode | mesh bg, dual glass panels, weekDeltaHours, pace badge |
| `systemMedium` | action mode | mesh bg, glass item rows, badge |
| `systemLarge` | hours mode | mesh bg, glass panels, weekDeltaEarnings, weekDeltaHours, pace badge, brainliftTarget-driven progress bars |
| `systemLarge` | action mode | mesh bg, glass item rows |
| `accessoryRectangular` | — | urgency color on hours, gold on earnings |
| `accessoryCircular` | — | hours in urgency color |
| `accessoryInline` | — | compact text line |
| `systemSmall` manager urgency | — | pendingCount hero + countdown |

---

## Out of Scope

1. **Android widget visual redesign** — **Deferred to 03-android-visual.** This spec covers `src/widgets/android/HourglassWidget.tsx` brand alignment. Completely separate rendering stack (`react-native-android-widget` primitives).

2. **Interactive widget buttons (approve/reject from widget)** — **Descoped.** Deep-link or in-widget action requires WidgetKit intent handlers and a separate native layer. Not part of this brand revamp effort.

3. **Lock screen complication full redesign** — **Descoped.** Accessory sizes (`accessoryRectangular`, `accessoryCircular`, `accessoryInline`) receive cosmetic color fixes only (urgency color on hours, gold on earnings). Full layout redesign for lock screen is out of scope.

4. **Widget configuration UI (size/role picker)** — **Descoped.** No widget settings intent or `IntentConfiguration` changes. Widget adapts fully automatically based on `props.isManager` and data state.

5. **Scriptable `hourglass.js`** — **Descoped.** Separate codebase (WS root), separate effort. Not part of the Expo app widget.

6. **Backdrop blur / real frosted glass** — **Descoped.** Not available in WidgetKit JSContext. The spec uses `RoundedRectangle` fill simulation as the glass approximation.

7. **`WIDGET_LAYOUT_JS` split into separate file** — **Descoped.** The JS string stays inline in `bridge.ts` as a single constant. Splitting to a `.js` file would require a build pipeline change out of scope for this revamp.

8. **`buildTimelineEntries` urgency display changes** — **Descoped.** The timeline entries system already recomputes `urgency` per entry correctly. No changes needed to `buildTimelineEntries` for the visual redesign.

9. **BrainLift target configurability** — **Descoped.** `brainliftTarget` is always `"5h"` per `01-data-extensions` contract. A user-configurable target is a separate feature.

---

## Functional Requirements

### FR1: Brand Color Constants and Helper Functions

Replace the color constant block in `WIDGET_LAYOUT_JS` and add the helper function suite. All downstream builders (FR2–FR6) depend on these helpers.

**Success Criteria:**

- SC1.1 — `TEXT_PRIMARY` is `#E0E0E0`, never `#FFFFFF`. No `#FFFFFF` string appears in any `foregroundStyle()` call in the new JS.
- SC1.2 — `TEXT_SECONDARY` is `#A0A0A0`; `TEXT_MUTED` is `#757575` (replaces legacy `#8B949E` and `#484F58`).
- SC1.3 — `buildMeshBg(urgency, paceBadge)` returns a `ZStack` with: base `Rectangle` fill `#0D0C14`, Node A `Circle` violet `#A78BFA` offset (-50, -40) opacity 0.12, Node B `Circle` cyan `#00C2FF` offset (+60, +30) opacity 0.10, Node C `Circle` state-color offset (0, +50) opacity 0.14 (critical → 0.20, high → 0.16, crushed_it → 0.14 with `#FFDF89`).
- SC1.4 — `buildGlassPanel(children)` returns a `ZStack` with a `RoundedRectangle` gradient fill (`#1A1928` → `#131220`) at 0.85 opacity and a separate `RoundedRectangle` stroke border gradient (`#3D3B54` → `#1A1928`).
- SC1.5 — `buildPaceBadge(badge)` returns `null` when `badge === 'none'` or `badge` is falsy; returns a `Capsule`-background + `Text` for the four named states with correct colors: `crushed_it` → `#FFDF89`, `on_track` → `#10B981`, `behind` → `#F59E0B`, `critical` → `#F43F5E`.
- SC1.6 — `buildDeltaText(delta, color)` returns `null` when `delta` is empty string or falsy; returns a `Text` with the delta string in the given color when non-empty.
- SC1.7 — `buildProgressBar(value, targetStr, color, barWidth)` parses `targetStr` as a float (e.g. `"5h"` → 5.0), computes `fillPct = Math.min(value / target, 1.0)`, and returns an `HStack` with a filled `RoundedRectangle` and a track `RoundedRectangle`.
- SC1.8 — The full JS string evaluates without syntax error: `(new Function('return ' + WIDGET_LAYOUT_JS))()` returns a function.

### FR2: systemSmall — Mesh Background + Pace Badge

Redesign the `systemSmall` branch. Small widget shows hours, earnings, remaining, and pace badge over the simulated mesh background.

**Success Criteria:**

- SC2.1 — `buildSmall(props)` uses `buildMeshBg(props.urgency, props.paceBadge)` as the background layer in a `ZStack`.
- SC2.2 — Hours value is at 32pt bold in `HOURS_COLOR[props.urgency]`.
- SC2.3 — "this week" label is 11pt `TEXT_MUTED` (`#757575`).
- SC2.4 — Earnings value is at 20pt bold gold `#E8C97A`.
- SC2.5 — `hoursRemaining` is shown at 12pt in the urgency color.
- SC2.6 — `buildPaceBadge(props.paceBadge)` result is placed in the bottom-right area; nothing is rendered when badge is `'none'`.
- SC2.7 — Manager urgency mode: when `props.isManager && (props.urgency === 'high' || props.urgency === 'critical') && props.pendingCount > 0`, the hero shows `props.pendingCount` as a large number with "pending" label; earnings row is replaced by the urgency label text.
- SC2.8 — `buildSmall(props)` does not throw when called with minimal props (`hoursDisplay: '0.0h'`, `earnings: '$0'`, `urgency: 'none'`, `paceBadge: undefined`).

### FR3: systemMedium — Dual Glass Panels + Delta Text

Redesign the `systemMedium` hours-mode branch. Medium widget shows two glass panel cards (hours, earnings) side by side, plus a stats row.

**Success Criteria:**

- SC3.1 — Hours-mode layout: outer `ZStack` with `buildMeshBg` as background, `VStack` content on top.
- SC3.2 — Top row: two glass panels side by side (`HStack`): left panel shows hours hero + "this week" label; right panel shows earnings hero + "earned" label. Both wrapped in `buildGlassPanel`.
- SC3.3 — Hours hero: 32pt bold in urgency color. Earnings hero: 20pt bold gold.
- SC3.4 — Bottom row (stats): TODAY value, AI USAGE value, REMAINING value in a single `HStack`. Labels are 10pt `TEXT_MUTED`. Values use correct semantic colors (urgency color, `#00C2FF`, urgency color).
- SC3.5 — `buildDeltaText(props.weekDeltaHours, hoursColor)` appended below/near the hours panel; not rendered when `weekDeltaHours` is `""`.
- SC3.6 — `buildPaceBadge(props.paceBadge)` shown in the bottom-right; not rendered when `'none'`.
- SC3.7 — Action mode: each item row uses `buildGlassPanel` wrapper; mesh background applied; badge shown.
- SC3.8 — `buildMedium(props)` does not throw when called with `weekDeltaHours: ''`, `paceBadge: undefined`, `approvalItems: []`, `myRequests: []`.

### FR4: systemLarge — Full Dashboard + Trend Deltas + Progress Bars

Redesign the `systemLarge` hours-mode branch. Large widget shows the full dashboard: hero panels, stats row with badge, daily bar chart, AI + BrainLift progress bars, and trend deltas.

**Success Criteria:**

- SC4.1 — Outer `ZStack` with `buildMeshBg` as background layer.
- SC4.2 — Hero row: two glass panels (`buildGlassPanel`), hours left, earnings right. Earnings panel shows `buildDeltaText(props.weekDeltaEarnings, GOLD)` below the earnings value when non-empty.
- SC4.3 — Stats row: TODAY `props.today`, AI USAGE `props.aiPct`, REMAINING `props.hoursRemaining`. Below TODAY: `buildDeltaText(props.weekDeltaHours, hoursColor)` when non-empty.
- SC4.4 — `buildPaceBadge(props.paceBadge)` shown as its own row between stats and bar chart; not rendered when `'none'`.
- SC4.5 — Daily bar chart: active days only (hours > 0), `maxHours` normalization with floor of 8, today's bar uses `hoursColor`, past bars use `#3D3B54`. Bar widths normalized to 220pt max.
- SC4.6 — AI progress bar: fill computed from `avgAIPct` (midpoint of `props.aiPct` range), displayed via `buildProgressBar`; label shows `props.aiPct`.
- SC4.7 — BrainLift progress bar: `buildProgressBar(blHours, props.brainliftTarget, VIOLET, 190)` uses `props.brainliftTarget` (e.g. `"5h"`). Label shows `props.brainlift + ' / ' + props.brainliftTarget`.
- SC4.8 — Action mode: each item row uses `buildGlassPanel` wrapper; mesh background applied.
- SC4.9 — `buildLarge(props)` does not throw when called with `weekDeltaHours: ''`, `weekDeltaEarnings: ''`, `paceBadge: 'none'`, `brainliftTarget: '5h'`, `daily: []`.

### FR5: Accessory Sizes — Brand Color Updates

Update the `accessoryRectangular`, `accessoryCircular`, and `accessoryInline` branches to use correct brand semantic colors.

**Success Criteria:**

- SC5.1 — `accessoryRectangular`: hours value uses `HOURS_COLOR[props.urgency]`; earnings value uses `GOLD` (`#E8C97A`).
- SC5.2 — `accessoryCircular`: hours number uses `HOURS_COLOR[props.urgency]`; "h" suffix is `TEXT_MUTED`.
- SC5.3 — `accessoryInline`: renders `props.hoursDisplay + ' · ' + props.earnings + ' · AI ' + props.aiPct` as a single text string.
- SC5.4 — No `#FFFFFF` in any accessory branch.
- SC5.5 — `buildAccessory(props, family)` does not throw for any of the three family strings.

### FR6: JS String Integrity and Null Safety

Ensure the complete `WIDGET_LAYOUT_JS` string is safe in all edge-case scenarios from `01-data-extensions` data being undefined or missing.

**Success Criteria:**

- SC6.1 — `props.paceBadge` being `undefined` or absent: `buildPaceBadge` treats it as `'none'` and renders nothing.
- SC6.2 — `props.weekDeltaHours` being `undefined` or `""`: `buildDeltaText` renders nothing (no crash, no empty text element).
- SC6.3 — `props.weekDeltaEarnings` being `undefined` or `""`: same null-safe behavior.
- SC6.4 — `props.brainliftTarget` being `undefined`: `buildProgressBar` falls back to `5` so BrainLift bar does not crash.
- SC6.5 — `props.daily` being `undefined` or `[]`: bar chart section renders nothing; no crash from `Math.max.apply` on empty array.
- SC6.6 — Entire JS string evaluates without syntax error: `(new Function('return ' + WIDGET_LAYOUT_JS))()` returns a function.
- SC6.7 — Calling the returned function with minimal mock props and `env = { widgetFamily: 'systemMedium' }` returns a non-null value without throwing.

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/widgets/bridge.ts` | Contains `WIDGET_LAYOUT_JS` constant to replace |
| `hourglassws/src/widgets/types.ts` | `WidgetData` interface — all props available to the JS renderer |
| `hourglassws/BRAND_GUIDELINES.md` | Canonical hex values, typography scale, no-pure-white rule |
| `features/app/widget-brand-revamp/specs/02-ios-visual/spec-research.md` | Wireframes, mesh simulation spec, glass panel spec |

### Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/widgets/bridge.ts` | Replace `WIDGET_LAYOUT_JS` constant; add `export` keyword to it for testing |

### Files to Create

| File | Purpose |
|------|---------|
| `hourglassws/src/widgets/__tests__/widgetLayoutJs.test.ts` | Unit tests for JS string integrity, helper functions, and null safety |

### Data Flow

```
WidgetData (props) → WIDGET_LAYOUT_JS function → SwiftUI layout tree

props.urgency          → HOURS_COLOR lookup   → hoursColor variable
props.paceBadge        → buildPaceBadge()     → Capsule+Text or null
props.weekDeltaHours   → buildDeltaText()     → Text with arrow or null
props.weekDeltaEarnings→ buildDeltaText()     → Text with arrow or null
props.brainliftTarget  → buildProgressBar()  → parsed as float (strip suffix)
props.daily            → barRows array        → bar chart VStack
props.brainlift        → blHours float        → BL bar fill width
props.aiPct            → aiMatch regex        → AI bar fill width
```

### JS String Internal Structure

```
(function(props, env) {
  // 1. Color constants — brand palette
  //    TEXT_PRIMARY='#E0E0E0', TEXT_SECONDARY='#A0A0A0', TEXT_MUTED='#757575'
  //    GOLD_BRIGHT='#FFDF89' (crushed_it only)
  //    HOURS_COLOR, BADGE_COLORS, PACE_COLORS, PACE_LABELS maps

  // 2. Derived state variables
  //    hoursColor, actionMode, actionItems, family

  // 3. buildMeshBg(urgency, paceBadge)
  // 4. buildGlassPanel(children)
  // 5. buildPaceBadge(badge)
  // 6. buildDeltaText(delta, color)
  // 7. buildProgressBar(value, targetStr, color, barWidth)
  // 8. buildItemRow(item)
  // 9. buildSmall(p)
  // 10. buildMedium(p)
  // 11. buildLarge(p)
  // 12. buildAccessory(p, fam)
  // 13. Router: switch on family
})
```

### Mesh Background Specification

Node C color and opacity is urgency-driven:
- `critical` urgency: `#F43F5E`, opacity 0.20
- `high` urgency: `#F59E0B`, opacity 0.16
- `paceBadge === 'crushed_it'`: `#FFDF89`, opacity 0.14
- Default (on-track/none): `#10B981`, opacity 0.14

### Glass Panel Specification

`RoundedRectangle` cornerRadius 12, gradient fill `#1A1928` → `#131220` at 0.85 opacity. Second `RoundedRectangle` stroke-only with gradient border `#3D3B54` → `#1A1928` at lineWidth 1. Content VStack inside with padding 10.

Exact modifier API must follow the same pattern as existing working `bridge.ts` code (uses `foregroundStyle(color)`, `font({ size, weight })`, `frame({ width, height })`).

### Progress Bar Specification

```javascript
function buildProgressBar(value, targetStr, color, barWidth) {
  var target = parseFloat(targetStr) || 5;
  var fillPct = Math.min(value / target, 1.0);
  var filled = Math.max(4, Math.round(fillPct * barWidth));
  var track = Math.max(4, barWidth - filled);
  return HStack({ spacing: 3, children: [
    RoundedRectangle({ cornerRadius: 2,
      modifiers: [foregroundStyle(color), frame({ width: filled, height: 5 })] }),
    RoundedRectangle({ cornerRadius: 2,
      modifiers: [foregroundStyle(TRACK_COLOR), frame({ width: track, height: 5 })] })
  ]});
}
```

### ES5 Constraint

The JS string must use only ES5 syntax (no `const`/`let`, no arrow functions, no template literals, no destructuring, no spread). The widget JSContext may not support ES6+.

### Test File Structure

```typescript
// src/widgets/__tests__/widgetLayoutJs.test.ts
import { WIDGET_LAYOUT_JS } from '../bridge';

// Mock all bridge.ts dependencies before import
jest.mock('@react-native-async-storage/async-storage', ...);
jest.mock('react-native', ...);
jest.mock('expo-modules-core', ...);

// Evaluate the JS string in a stub environment
function evalWidget(props, family) {
  // Provide SwiftUI global stubs: VStack, HStack, ZStack, Text, etc.
  // Call the function with props + { widgetFamily: family }
}
```

SwiftUI global stubs return plain JS objects. Tests verify the returned tree structure (presence of expected color strings, non-null returns, no throws).

### Edge Cases

| Case | Handling |
|------|---------|
| `props.paceBadge` is `undefined` | `!badge \|\| badge === 'none'` check → null |
| `props.weekDeltaHours` is `""` | `!delta` check → null |
| `props.daily` is `[]` or undefined | `activeDays.length > 0` guard before `Math.max.apply` |
| `props.brainliftTarget` is `undefined` | `parseFloat(undefined) || 5` → fallback 5 |
| `env` is null/undefined | `(env && env.widgetFamily) || 'systemMedium'` → safe default |
| Manager urgency but no pending items | urgency mode not triggered (requires `pendingCount > 0`) |

### Dependencies

| Dependency | Status |
|-----------|--------|
| `01-data-extensions` | Complete — `paceBadge`, `weekDeltaHours`, `weekDeltaEarnings`, `brainliftTarget` all in WidgetData |
| `expo-widgets` JS globals | Available at widget runtime; test environment stubs them |
| `export WIDGET_LAYOUT_JS` from bridge.ts | Must add export keyword — minimal change, no functional impact |
