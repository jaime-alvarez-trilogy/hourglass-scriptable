# Spec Research: 04-cockpit-hud

## Problem Context

The widget brand revamp (specs 01–03) delivered a fully working design system with mesh backgrounds, glass panels, pace badges, and 3-mode switching (hours / action / urgency). However three gaps remain:

1. **PACE_COLORS use the original saturated palette** — `#FFDF89`, `#10B981`, `#F59E0B`, `#F43F5E` — which clash against the dark mesh background. The `colors.ts` already defines softer "desaturated dark glass" tokens (`desatCoral`, `warnAmber`, `successGreen`, `luxuryGold`) that weren't applied to widgets.

2. **No distinct "deficit" layout** — when `paceBadge === 'behind' | 'critical'` and the user is NOT in action mode, the widget shows the full hours-mode layout (AI%, BrainLift bar, daily chart). A focused deficit view — hoursDisplay + hoursRemaining, secondary metrics stripped — would create genuine urgency without visual noise.

3. **Hero metric typography is unstyled** — iOS hero Text elements (hours, pending count) use whatever the default SwiftUI font is. Adding `.font({ weight: 'heavy', design: 'monospaced' })` aligns with the app's technical aesthetic.

## Exploration Findings

### Current mode-switch logic (both platforms)

```
P1 (action): actionMode = hasApprovals || hasRequests
  → shows approval/request item rows

non-P1 → hours mode (all metrics shown)
```

Special sub-case inside P1: `isUrgentMgr = isManager && urgency in ['high','critical'] && pendingCount > 0` — shows countdown hero in small widget.

The requested 3-priority system formalises P2 as an explicit rendering fork:

```
P1: actionMode (approvalItems.length > 0 || myRequests.length > 0)
P2: !actionMode && (paceBadge === 'behind' || paceBadge === 'critical')
P3: else (on_track / crushed_it / none)
```

P1 already exists. P3 is the current hours-mode default. Only **P2 is new code**.

### Existing color tokens in `colors.ts`

```typescript
// Already defined, not yet used in widgets:
desatCoral:    '#F87171'   // softer critical
warnAmber:     '#FCD34D'   // softer behind
successGreen:  '#4ADE80'   // softer on_track
luxuryGold:    '#CEA435'   // richer crushed_it
champagneGold: '#C89F5D'   // (not used here)
```

### iOS WIDGET_LAYOUT_JS constraints (from spec 02)

- ES5 only: `var` + `function`, no arrow functions, no `const/let` ✓ (already done)
- Gradients via object literal: `{ type: 'linearGradient', colors: [...] }` ✓ (already done)
- Font modifiers via: `.font({ size: N, weight: 'heavy', design: 'monospaced' })`
  — appended as chained modifier on Text elements
- No `<LinearGradient>` component ✓ (already done)

### Android constraints (from spec 03)

- FlexWidget + TextWidget + SvgWidget only ✓ (already done)
- All graphics via inline SVG strings in `SvgWidget` ✓ (already done)
- `badgeColor()` function drives pace badge fill — update its return values

### Data model (from spec 01)

All required fields already exist in `WidgetData`:
- `paceBadge: 'crushed_it' | 'on_track' | 'behind' | 'critical' | 'none'`
- `hoursDisplay: string` — "32.5h"
- `hoursRemaining: string` — "7.5h left" | "2.5h OT"
- `weekDeltaEarnings: string` — "+$84" | ""
- `today: string` — "6.2h"
- `pendingCount: number`
- `approvalItems: WidgetApprovalItem[]`
- `myRequests: WidgetMyRequest[]`

**No new data fields needed.** This spec is purely rendering-layer changes.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| P2 scope | Medium + Large + Small (compact) | Small shows hoursDisplay + hoursRemaining only; medium/large use full stripped layout |
| P2 activation | `!actionMode && paceBadge in ['behind','critical']` | P1 (approvals) always wins; on_track/crushed_it get full P3 layout |
| Color source | `colors.ts` desaturated tokens | Already defined and brand-approved; avoids new values |
| iOS font | `weight: 'heavy', design: 'monospaced'` on hero Text | Matches app's technical aesthetic without loading custom fonts |
| Android font | No change (TextWidget has no font design param) | Android TextWidget only supports fontFamily/fontSize/fontWeight; 'monospaced' design not available |
| P2 layout content | hoursDisplay hero + hoursRemaining + footer(weekDeltaEarnings, today) | Strips aiPct, brainlift, daily chart, weekDeltaHours — focus on deficit only |

## Interface Contracts

### Color constants (updated)

```typescript
// iOS WIDGET_LAYOUT_JS — ES5 var
var PACE_COLORS = {
  crushed_it: '#CEA435',  // luxuryGold   (was #FFDF89)
  on_track:   '#4ADE80',  // successGreen (was #10B981)
  behind:     '#FCD34D',  // warnAmber    (was #F59E0B)
  critical:   '#F87171',  // desatCoral   (was #F43F5E)
};

// Android — TypeScript
export function badgeColor(paceBadge: string): string {
  switch (paceBadge) {
    case 'crushed_it': return '#CEA435';
    case 'on_track':   return '#4ADE80';
    case 'behind':     return '#FCD34D';
    case 'critical':   return '#F87171';
    default:           return '';
  }
}
```

### iOS P2 mode detection (inside buildMedium / buildLarge / buildSmall)

```javascript
// ES5 — added alongside existing actionMode derivation
var isPaceMode = !actionMode && (p.paceBadge === 'behind' || p.paceBadge === 'critical');
```

### iOS P2 layout structure (medium)

```
ZStack (fillFrame, ContainerBackground #0D0C14)
  buildMeshBg(urgency, paceBadge)          // existing — state color drives amber/coral node
  VStack (alignment: 'leading', spacing: 8)
    // Warning badge row
    HStack
      Text("⚠ " + badgeLabel)             // .font({size:11, weight:'semibold'})
                                           // .foregroundStyle(paceColor)
    // Hero hours
    Text(p.hoursDisplay)                   // .font({size:32, weight:'heavy', design:'monospaced'})
                                           // .foregroundStyle(hoursColor)
    // Remaining
    Text(p.hoursRemaining)                 // .font({size:13, weight:'medium'})
                                           // .foregroundStyle('#A0A0A0')
    Spacer()
    // Footer row
    HStack
      Text(p.weekDeltaEarnings || "")      // .foregroundStyle(deltaColor)
      Spacer()
      Text("today " + p.today)            // .foregroundStyle('#A0A0A0')
```

No aiPct, no brainlift, no daily chart, no BrainLift progress bar.

### Android P2 mode detection (in MediumWidget)

```typescript
const isPaceMode = !actionMode && !isUrgencyMode &&
  (data.paceBadge === 'behind' || data.paceBadge === 'critical');
```

### Android P2 layout structure (MediumWidget)

```tsx
// Warning badge row
<FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
  <TextWidget text={`⚠ ${badgeLabel(data.paceBadge)}`}
    style={{ color: badgeColor(data.paceBadge), fontSize: 11, fontWeight: '600' }} />
</FlexWidget>

// Hero hours
<TextWidget text={data.hoursDisplay}
  style={{ color: hoursColor, fontSize: 32, fontWeight: '700' }} />

// Hours remaining
<TextWidget text={data.hoursRemaining}
  style={{ color: '#A0A0A0', fontSize: 13 }} />

// Spacer fills remaining height via flex: 1 FlexWidget

// Footer
<FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <TextWidget text={data.weekDeltaEarnings || ''}
    style={{ color: deltaColor(data.weekDeltaEarnings), fontSize: 12 }} />
  <TextWidget text={`today ${data.today}`}
    style={{ color: '#A0A0A0', fontSize: 12 }} />
</FlexWidget>
```

### iOS hero typography (applied everywhere a metric hero appears)

```javascript
// Hero: hours total, pending count, earnings (primary metric per layout)
.font({ size: 32, weight: 'heavy', design: 'monospaced' })

// Secondary metrics: today, remaining, AI%, BrainLift
.font({ size: 13, weight: 'medium', design: 'monospaced' })
```

Applied in: `buildSmall` hero Text, `buildMedium` glass panel hero Text, `buildLarge` hero Text, `buildMedium`/`buildLarge` P2 hero Text.

## Sources

| Field | Source |
|-------|--------|
| `paceBadge` | `WidgetData.paceBadge` — already in data model (spec 01) |
| `hoursDisplay` | `WidgetData.hoursDisplay` — already in data model |
| `hoursRemaining` | `WidgetData.hoursRemaining` — already in data model |
| `weekDeltaEarnings` | `WidgetData.weekDeltaEarnings` — already in data model (spec 01) |
| `today` | `WidgetData.today` — already in data model |
| Color tokens | `colors.ts` mesh tokens (desatCoral, warnAmber, successGreen, luxuryGold) |

## Test Plan

### FR1 — Color token update

**Signature:** `PACE_COLORS` constant (iOS) and `badgeColor()` function (Android)

**Happy path:**
- [ ] iOS `WIDGET_LAYOUT_JS` string contains `'#CEA435'` (crushed_it)
- [ ] iOS `WIDGET_LAYOUT_JS` string contains `'#4ADE80'` (on_track)
- [ ] iOS `WIDGET_LAYOUT_JS` string contains `'#FCD34D'` (behind)
- [ ] iOS `WIDGET_LAYOUT_JS` string contains `'#F87171'` (critical)
- [ ] Android `badgeColor('crushed_it')` === `'#CEA435'`
- [ ] Android `badgeColor('on_track')` === `'#4ADE80'`
- [ ] Android `badgeColor('behind')` === `'#FCD34D'`
- [ ] Android `badgeColor('critical')` === `'#F87171'`

**Regression:**
- [ ] Old values `#FFDF89`, `#10B981`, `#F59E0B`, `#F43F5E` do NOT appear in PACE_COLORS or badgeColor
  - Note: `#10B981` may still appear in HOURS_COLOR for urgency-driven coloring — only remove from pace badge context

### FR2 — iOS P2 mode

**Happy path:**
- [ ] `buildMedium` with `paceBadge='behind'`, `approvalItems=[]` → output contains `hoursDisplay` and `hoursRemaining`
- [ ] Same → output does NOT contain `aiPct` value
- [ ] Same → output does NOT contain `brainlift` value
- [ ] `buildLarge` with `paceBadge='critical'`, `approvalItems=[]` → stripped layout, contains hoursDisplay/hoursRemaining, no aiPct/brainlift/daily chart

**Edge cases:**
- [ ] `paceBadge='behind'` AND `approvalItems.length > 0` → P1 wins, renders action item rows (not P2)
- [ ] `paceBadge='on_track'` AND no approvals → P3 hours mode (NOT P2) — aiPct IS shown
- [ ] `paceBadge='none'` AND no approvals → P3 hours mode — aiPct IS shown
- [ ] `buildSmall` with `paceBadge='critical'`, no approvals → shows hoursDisplay + hoursRemaining

**Mocks needed:** SwiftUI stubs (already present in `widgetLayoutJs.test.ts`)

### FR3 — Android P2 mode

**Happy path:**
- [ ] `MediumWidget` with `paceBadge='behind'`, `approvalItems=[]` → renders `⚠` + hoursDisplay + hoursRemaining
- [ ] Same → does NOT render aiPct TextWidget
- [ ] Same → does NOT render brainlift TextWidget
- [ ] `MediumWidget` with `paceBadge='critical'`, `approvalItems=[]` → P2 layout with desatCoral badge color

**Edge cases:**
- [ ] `paceBadge='behind'` AND `isManager && urgency='critical' && pendingCount>0` → urgency mode wins (P1), not P2
- [ ] `paceBadge='behind'` AND `approvalItems.length > 0` → action mode wins (P1), not P2
- [ ] `paceBadge='on_track'` AND no approvals → P3 hours mode, aiPct shown

### FR4 — iOS hero typography

**Happy path:**
- [ ] `WIDGET_LAYOUT_JS` contains `weight: 'heavy'` (hero font modifier present)
- [ ] `WIDGET_LAYOUT_JS` contains `design: 'monospaced'` (monospaced design present)
- [ ] `buildSmall` output includes font modifier on the hero Text node

### FR5 — Priority ordering

**Happy path:**
- [ ] `isManager=true, pendingCount=3, paceBadge='critical'` → P1 wins (action/urgency mode), not P2
- [ ] `isManager=false, paceBadge='critical', myRequests=[]` → P2 wins (stripped layout)
- [ ] `isManager=false, paceBadge='on_track', myRequests=[]` → P3 wins (full hours mode)

## Files to Modify

| File | Change |
|------|--------|
| `hourglassws/src/widgets/bridge.ts` | 1) Update `PACE_COLORS` constant 2) Add `isPaceMode` derivation 3) Add P2 layout block in `buildMedium` + `buildLarge` + `buildSmall` 4) Add `.font({weight:'heavy',design:'monospaced'})` to hero Text nodes |
| `hourglassws/src/widgets/android/HourglassWidget.tsx` | 1) Update `badgeColor()` return values 2) Add `isPaceMode` detection in `MediumWidget` 3) Add P2 layout JSX block |
| `hourglassws/src/widgets/__tests__/widgetLayoutJs.test.ts` | Add FR1–FR5 test cases (new describe blocks) |
| `hourglassws/src/__tests__/widgets/android/HourglassWidget.test.tsx` | Add FR1, FR3, FR5 test cases |

## Out of Scope

- `colors.ts` modification — tokens are already there; we read from them but the widget files inline the hex values directly (no import chain into widget JS/JSX)
- Android typography — TextWidget has no `design` parameter; monospaced is iOS-only here
- iOS lock screen accessories — no P2 mode for complications (data too sparse)
- Android SmallWidget P2 mode — small widget only shows hero + badge + remaining; the existing urgency-color change is sufficient
- New WidgetData fields — all required data already exists
