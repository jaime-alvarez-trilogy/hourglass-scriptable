# Widget HUD Layout

## Overview

Fixes layout cropping, cramped Small widget, background artifacts, font fallback, and progress bar rendering across both iOS and Android widgets. Introduces a three-priority HUD mode — P1 (approvals), P2 (behind pace), P3 (on track/default) — that shows different layouts depending on the user's most urgent need. All data already exists in `WidgetData`; changes are rendering-only.

## Goals

- **Small widget**: Hero total hours + pace badge only. Remove earnings and remaining hours (too cramped at 150×150).
- **Priority mode (iOS + Android)**: Render different layouts based on urgency priority:
  - P1 Manager with pending approvals → approval-focused layout
  - P2 Behind/Critical pace → hours deficit view, strip secondary metrics
  - P3 On track / default → hours + earnings + todayDelta + chart
- **Background**: No circle artifacts. iOS uses two Rectangle layers (already correct). Android uses linearGradient SVG (already correct). Verify neither introduces circular shapes.
- **Card opacity**: 85–90% card backgrounds for more contrast (card BG #1C1B2C ~87% effective opacity).
- **Fonts**: Explicit `weight: 'heavy'` and `design: 'monospaced'` on iOS hero numbers. Explicit `fontWeight` on Android `TextWidget` hero.
- **Today row**: Show `todayDelta` ("±X.Xh vs avg") instead of repeating `hoursRemaining` under a different label.
- **Progress bars**: Minimum 8px track height. Labels: "AI Usage" (not "AI"), "Limit" (not "BL"). Large iOS +12px bottom padding to prevent clipping.

## Non-Goals

- Bridge / data changes — all required fields already exist in `WidgetData`
- Lock screen accessories / StandBy mode
- Android Large widget (separate feature)
- Custom font file embedding in the widget extension target

## Architecture

### Priority Logic (shared concept, platform-specific render)

```
function priorityMode(props: WidgetData): 'approvals' | 'deficit' | 'default'
  if isManager && pendingCount > 0 → 'approvals'          // P1
  else if paceBadge === 'behind' || 'critical' → 'deficit' // P2
  else → 'default'                                          // P3
```

iOS: computed inline using `var mode = ...` (ES5-safe helper function).
Android: existing FR7 urgency mode already covers P1 partially; refactor to match full spec.

### iOS Technical Constraints (critical)

- **ES5 syntax required**: expo-widgets JSX compiler evaluates the layout string in a strict context. Use `var` (not `const`/`let`) and `function(){}` declarations (not arrow functions `() =>`). Current codebase uses TypeScript which is compiled — verify compiled output. If tests already pass with current syntax, no change needed. Flag for verification.
- **No `<LinearGradient>` component**: causes ReferenceError / white screen. Use two-Rectangle ZStack (already implemented) or `.foregroundStyle({ type: 'linearGradient', ... })` modifier.
- **No Skia / Reanimated**: widgets use SwiftUI primitives via expo-widgets only.
- **Glass simulation**: ZStack with RoundedRectangle fill (already implemented) — no backdrop blur.

### iOS Background (verified correct)
```jsx
<ZStack>
  <Rectangle fill="#0D0C14" />          {/* base */}
  <Rectangle fill={tint} />             {/* urgency tint ~12% opacity via 8-char hex */}
  <VStack padding={12}>{content}</VStack>
</ZStack>
```
No circles or ellipses. Keep as-is.

### Android Background (verified correct)
`buildMeshSvg` returns `<rect fill="url(#linearGradient)"/>` — single rectangle, no circles. Keep as-is.

### Font Specification

iOS hero text:
```jsx
<Text font={{ size: 36, weight: 'heavy', design: 'monospaced' }}>
```
iOS secondary text: `font={{ size: 13, weight: 'semibold' }}`

Android TextWidget: `fontWeight: '700'` on all numeric/metric values. fontFamily cannot be customized (system default only).

### Progress Bar Fix

iOS Large `VStack` padding: change `padding={16}` to `padding={{ top: 16, leading: 16, trailing: 16, bottom: 28 }}` to prevent bottom clip.

Progress bar minimum height: 8pt (iOS) / 8dp (Android).

Labels: `"AI Usage"` replaces `"AI"` in all widget sizes. `"Limit"` replaces `"BL"` in Android progress bar label.

## Spec Units

| Spec | Description | Blocks | Blocked By | Complexity |
|------|-------------|--------|------------|------------|
| 01-ios-hud-layout | iOS priority modes, Small cleanup, fonts, progress bars | — | — | M |
| 02-android-hud-layout | Android priority mode alignment, Small cleanup, fonts, progress bars | — | — | M |

Both specs are independent (different files).

## Files Modified

| File | Spec | Change |
|------|------|--------|
| `src/widgets/ios/HourglassWidget.tsx` | 01 | Priority modes, Small cleanup, fonts, progress bar height/labels |
| `src/widgets/android/HourglassWidget.tsx` | 02 | Priority mode alignment, Small cleanup, fonts, progress bar height/labels |

No changes to `bridge.ts`, `types.ts`, or test fixtures.

## Success Criteria

- [ ] Small widget (iOS + Android): shows only total hours + pace badge; no earnings, no remaining hours
- [ ] iOS Medium/Large P1 (manager + pending): shows approval-focused layout with warning accent
- [ ] iOS Medium/Large P2 (behind/critical): shows hours deficit prominently; strips AI%, BrainLift, bar chart
- [ ] iOS Medium/Large P3 (default): shows hours + earnings cards + todayDelta row + (Large) bar chart
- [ ] Android MediumWidget: P1/P2/P3 logic matches spec; no conflicting urgency/action/pace modes
- [ ] No "weird circles" in any background — only rectangular/gradient fills
- [ ] Hero numbers use `weight: 'heavy', design: 'monospaced'` (iOS) or `fontWeight: '700'` (Android)
- [ ] "Today" row shows `todayDelta` (±X.Xh vs avg) not a duplicate of hoursRemaining
- [ ] Progress bar tracks ≥ 8pt/dp tall; labels are "AI Usage" and "Limit"
- [ ] Large iOS bottom padding prevents BL bar clipping
- [ ] All existing widget tests pass; new priority-mode tests added for iOS

## Changelog

| Date | Spec | Description |
|------|------|-------------|
| 2026-03-26 | [01-ios-hud-layout](specs/01-ios-hud-layout/spec.md) | iOS priority modes (P1/P2/P3), SmallWidget font fix, todayDelta row, Large bottom padding |
| 2026-03-26 | [02-android-hud-layout](specs/02-android-hud-layout/spec.md) | Android priority mode unification, AI Usage label fix, todayDelta footer, fontWeight audit |
