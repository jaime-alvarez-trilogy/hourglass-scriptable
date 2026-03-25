# Spec Research: 02-widget-visual-android

## Problem Context

Three remaining visual gaps on Android after `widget-layout-polish`:

1. **GlassPanel inner opacity too low** — Current inner card background `#16151F` blends into the `#0D0C14` base too much; the card panels are barely distinguishable from the background. Guidance: increase to ~85–90% opacity (i.e. increase contrast).
2. **No daily bar chart** — Android Medium Hours mode has no chart. The guidance called for bar charts on the Large widget; since Android has no Large widget, the bar chart belongs in the Medium Hours mode (below the existing rows, replacing nothing — added as new bottom section).
3. **`isFuture` field** — Spec 01 adds this to `WidgetDailyEntry`; this spec consumes it for muted future-bar rendering. Blocked by Spec 01.

---

## Exploration Findings

### Android GlassPanel (`src/widgets/android/HourglassWidget.tsx` lines 144–172)

```typescript
function GlassPanel({ flex, children }: GlassPanelProps) {
  return (
    <FlexWidget style={{ backgroundColor: '#2F2E41', borderRadius: 13, padding: 1, ... }}>
      <FlexWidget style={{ backgroundColor: '#16151F', borderRadius: 12, padding: 12 }}>
        {children}
      </FlexWidget>
    </FlexWidget>
  );
}
```

- Outer border: `#2F2E41` (border token) — fine as-is
- Inner card: `#16151F` (surface token, the design system's `colors.surface`)
- Background base: `#0D0C14` (background token)

The delta: `#16151F` vs `#0D0C14` = only 9/9/11 RGB steps — very subtle. Increasing inner to `#1F1E2C` raises the delta to 18/18/24 steps, making cards visually distinct while remaining dark and brand-consistent.

**Fix**: `backgroundColor: '#16151F'` → `'#1F1E2C'` on the inner FlexWidget.

### Android Medium Hours mode layout (lines 498–617)

Current layout (bottom-to-top reading order from code):
1. Glass hero panels: hours card + earnings card (flex: 1 each)
2. Spacer (8pt)
3. Pace badge
4. Spacer (6pt)
5. Stats row: "Today: X.Xh" + "AI Usage: X%"
6. Hours remaining text
7. **BrainLift progress bar row** ← last content row before stale/manager badge
8. Stale indicator (conditional)
9. Manager pending badge (conditional)

Bar chart will be inserted **after** the BrainLift row, before stale indicator. The Medium widget is approximately 320×160pt. After existing content (~120pt), there's ~40pt available — enough for a compact 5-bar or 7-bar sparkline-style chart (32px tall, day labels at 10pt).

**Sizing constraints:**
- Medium widget height: ~160pt → available after content: ~36–40pt
- Bar chart: 7 bars, 32pt tall, 10pt day labels — total ~42pt with label
- Tradeoff: either reduce stats row spacing or use a compact 5-bar chart (Mon–Fri only) at 28pt
- Decision: **7-bar chart, 28pt bars + 10pt labels = 38pt** — fits with 1pt breathing room; reduce spacers slightly

### `buildBarChartSvg` design (new function in android/HourglassWidget.tsx)

Pattern mirrors `blProgressBar` and `buildMeshSvg`:

```typescript
export function buildBarChartSvg(
  daily: WidgetDailyEntry[],
  width: number,
  barAreaHeight: number,
  accentColor: string,
): string
// Returns inline SVG string with 7 <rect> bars + 7 <text> day labels
// Bar colour: accentColor (isToday), '#4A4A6A' (past, hours > 0), '#2F2E41' (zero or isFuture)
// Bar heights: proportional to hours / maxHours * barAreaHeight; minimum 2px for non-zero
// Day labels: 'Mon', 'Tue', etc. centered under each bar, fontSize=9, fill='#777777'
// Zero/future bars: 2px tall, muted colour (not 0 height — shows grid reference)
```

SVG structure:
```svg
<svg width="{width}" height="{barAreaHeight+12}" xmlns="...">
  <!-- for each day i in 0..6 -->
  <rect x="{i*colW + gap}" y="{barAreaHeight - barH}" width="{barW}" height="{barH}" rx="2" fill="{color}"/>
  <text x="{i*colW + colW/2}" y="{barAreaHeight+10}" text-anchor="middle" font-size="9" fill="#777777">{day[0..2]}</text>
</svg>
```

Column width = `width / 7`. Bar width = `colW * 0.6`. Gap on each side = `colW * 0.2`.

---

## Key Decisions

### Decision 1: Bar chart position in Medium widget
Insert after BrainLift row, before stale indicator. The Medium widget is compact; the chart is a secondary data layer (the hero numbers are primary). Keeping it at the bottom means it degrades gracefully — if it's cut off on very small Android widgets it doesn't hide critical data.

**Rationale:** Hours, earnings, pace badge, and AI% are more important than the chart. Chart at bottom = safe degradation.

### Decision 2: 7 bars vs 5 bars (Mon–Fri)
Use 7 bars (Mon–Sun). The data is already 7-day and the user's contract is "Mon–Sun." With 10pt day labels abbreviated to 1 char ("M", "T", "W", "T", "F", "S", "S") there's enough room. Alternative 3-char labels ("Mon") are used if width > 280px.

**Rationale:** Consistency with the data model and with iOS.

### Decision 3: GlassPanel opacity — hex adjustment only
Change only the inner `backgroundColor` from `#16151F` to `#1F1E2C`. No structural change to `GlassPanel`. This is the minimal delta that achieves the visual separation.

**Rationale:** Any component structural change risks breaking the border-trick layout (outer 1px padding creates the border effect). Colour swap only.

### Decision 4: Minimum bar height for zero/future bars
Use `height: 2` for zero-hour and future bars (not `height: 0`). This creates a subtle floor line that shows the chart structure even when no data exists, which is more readable than invisible bars.

**Rationale:** Pure zero-height bars make the chart look broken on days with no hours.

---

## Interface Contracts

### `buildBarChartSvg` (new export in android/HourglassWidget.tsx)

```typescript
export function buildBarChartSvg(
  daily: WidgetDailyEntry[],
  width: number,
  barAreaHeight: number,
  accentColor: string,
): string
// daily: 7 entries Mon[0]–Sun[6]; isFuture field required (from Spec 01)
// width: SVG canvas width in px (typically 280–320 for Android Medium)
// barAreaHeight: height of bar area excluding labels (typically 28)
// accentColor: hex string for today's bar (from URGENCY_ACCENT[urgency])
// Returns: inline SVG string
```

Sources:
- `daily` ← `WidgetData.daily` (existing, populated by bridge.ts)
- `daily[].isFuture` ← **new from Spec 01** — this spec is blocked by Spec 01
- `width`, `barAreaHeight` ← caller constants in MediumWidget
- `accentColor` ← `URGENCY_ACCENT[data.urgency]` (existing local variable in MediumWidget)

### `GlassPanel` inner colour change

```typescript
// Before
backgroundColor: '#16151F'
// After
backgroundColor: '#1F1E2C'
```

No type changes. No new exports.

---

## Test Plan

### FR1: GlassPanel opacity

- [ ] `GlassPanel` inner FlexWidget `backgroundColor` = `'#1F1E2C'` (not `'#16151F'`)
- [ ] `GlassPanel` outer FlexWidget `backgroundColor` = `'#2F2E41'` (unchanged)

### FR2: `buildBarChartSvg` function

**Signature:** `buildBarChartSvg(daily, width, barAreaHeight, accentColor)`

Happy path:
- [ ] Returns a string starting with `<svg`
- [ ] Contains exactly 7 `<rect` bar elements
- [ ] Contains exactly 7 `<text` label elements
- [ ] Today bar has `fill="{accentColor}"`
- [ ] Past bar with hours > 0 has `fill="#4A4A6A"`
- [ ] Future bar has `fill="#2F2E41"` (muted)
- [ ] Past bar with hours = 0 has `fill="#2F2E41"` (muted)
- [ ] Today bar height > past bar height when today.hours > past.hours (proportional)

Edge cases:
- [ ] All hours = 0: all bars use minimum height (2px); no division by zero
- [ ] Today hours = max: today bar at full barAreaHeight
- [ ] daily has exactly 7 entries: exactly 7 bars rendered
- [ ] accentColor = '#FF2D55' (critical urgency): today bar is red

### FR3: MediumWidget Hours mode bar chart integration

- [ ] MediumWidget Hours mode renders a SvgWidget after the BrainLift row
- [ ] SvgWidget `svg` prop starts with `<svg`
- [ ] SvgWidget height = 40 (28 bars + 12 labels)

---

## Files to Reference

### Primary
- `src/widgets/android/HourglassWidget.tsx` — `GlassPanel` (lines 144–172), MediumWidget Hours mode (lines 498–617), `blProgressBar` (lines 94–107)

### Blocked by Spec 01
- `src/widgets/types.ts` — `WidgetDailyEntry.isFuture` (Spec 01 adds this)
- `src/widgets/bridge.ts` — `buildDailyEntries()` (Spec 01 populates `isFuture`)

### Patterns
- `src/widgets/android/HourglassWidget.tsx` — `buildMeshSvg` (lines 19–43) for SVG string pattern; `blProgressBar` (lines 94–107) for bar SVG pattern

### Tests
- `src/__tests__/widgets/android/HourglassWidget.test.tsx` — existing test patterns for MediumWidget Hours mode
- `src/__tests__/widgets/__tests__/widgetPolish.test.ts` — string assertion patterns for SVG output
