# 12-app-breakdown-ui

**Status:** Draft
**Created:** 2026-03-23
**Last Updated:** 2026-03-23

---

## Overview

This spec builds the UI layer for the App Breakdown feature, surfacing per-app AI vs non-AI slot data from the 12-week cache established in spec 11-app-data-layer.

### What is being built

Three new artifacts are created and wired into `ai.tsx`:

1. **`AppUsageBar` component** (`src/components/AppUsageBar.tsx`) — a static three-segment bar (violet for BrainLift, cyan for AI-only, grey for non-AI) that visualises AI credit ratio for a single app.

2. **`generateGuidance()` pure function** (`src/lib/appGuidance.ts`) — produces 0–3 `GuidanceChip` objects from aggregated and current-week `AppBreakdownEntry[]` data. Rules are evaluated in priority order; at most 3 chips are returned.

3. **`AppBreakdownCard` component** (`src/components/AppBreakdownCard.tsx`) — a `Card` wrapper that renders up to 8 app rows (app name + `AppUsageBar` + slot count), followed by guidance chips. Returns `null` when no entries are present.

### Integration into ai.tsx

`AppBreakdownCard` is inserted between the Daily Breakdown card (position 2) and the 12-Week Trajectory card (previously position 3). The `useStaggeredEntry` count is bumped from 6 to 7. The new card uses `getEntryStyle(3)`; Trajectory, Legend, and Timestamp shift to 4, 5, and 6 respectively.

### Data flow

```
useAppBreakdown() → { aggregated12w, currentWeek }
       │
       ├─ aggregated12w.slice(0, 8) → AppBreakdownCard entries prop
       └─ generateGuidance(aggregated12w, currentWeek) → AppBreakdownCard guidance prop
```

`useAppBreakdown` reads from AsyncStorage (`ai_app_history`) written by `useAIData` and `useHistoryBackfill` (spec 11). No additional API calls.

### Key design decisions

- **12-week aggregate as primary view** — current-week alone is too sparse early in the week.
- **Top 8 apps, ≥3 total slots** — keeps the card scannable and filters transient processes.
- **Guidance tone** — opportunity-focused ("try using AI tools there"), not instructional, because WorkSmart auto-classifies; the user cannot manually tag.
- **Static bar** — no animation on `AppUsageBar` (unlike `ProgressBar`) to keep rendering simple.

---

## Out of Scope

1. **Per-day app breakdown** — Weekly granularity only. Daily drill-down adds significant complexity (storage shape, UI) for limited value in v1.
   **Descoped:** Not part of this feature.

2. **Sorting/filtering controls in the UI** — Apps are sorted by total slots descending (highest-usage first). Interactive sort/filter controls are not needed for the initial version.
   **Descoped:** Not part of this feature.

3. **Push notifications for app breakdown** — No notifications when an app's AI ratio drops.
   **Descoped:** Not part of this feature.

4. **Tappable app rows / navigation** — Chips and rows are display-only; no tap targets or detail screens.
   **Descoped:** Not part of this feature.

5. **AppBreakdownCard test harness for useAppBreakdown data freshness** — Testing cache staleness and re-fetch triggers belongs to spec 11-app-data-layer (already tested there).
   **Deferred to 11-app-data-layer:** Already covered by spec 11 tests.

6. **Animated AppUsageBar** — The bar renders statically, unlike `ProgressBar` which uses Reanimated spring animations. Animation adds complexity without meaningful UX gain here.
   **Descoped:** Not part of this feature.

---

## Functional Requirements

### FR1 — AppUsageBar component

**Description:** Render a static three-segment horizontal bar showing BrainLift (violet), AI-only (cyan), and non-AI (grey) slot proportions for a single app.

**Interface:**
```typescript
interface AppUsageBarProps {
  aiSlots: number;          // total AI slots (includes brainliftSlots)
  brainliftSlots: number;   // second_brain slots (subset of aiSlots)
  nonAiSlots: number;
  height?: number;          // default: 4
  className?: string;
}
export default function AppUsageBar(props: AppUsageBarProps): JSX.Element
```

**Segment calculation:**
- `aiOnlySlots = Math.max(0, aiSlots - brainliftSlots)` — clamp to 0 defensively
- Violet segment: `flex = brainliftSlots`
- Cyan segment: `flex = aiOnlySlots`
- Grey segment: `flex = nonAiSlots`
- Omit violet segment entirely when `brainliftSlots === 0`
- When all values are zero: render a single full-width grey segment (flex=1)

**Success Criteria:**
- [ ] Given aiSlots=60, brainliftSlots=30, nonAiSlots=10 → three segments present with flex 30/30/10
- [ ] Given brainliftSlots=0 → violet segment absent; only cyan + grey rendered
- [ ] Given aiSlots=0, brainliftSlots=0 → single grey segment (flex=1)
- [ ] All-zero inputs → single grey full-width bar
- [ ] brainliftSlots > aiSlots → aiOnly clamped to 0; no negative flex values
- [ ] height prop overrides default 4

---

### FR2 — generateGuidance() pure function

**Description:** Produce 0–3 `GuidanceChip` objects from aggregated and current-week app breakdown data. Rules are evaluated in order; max 3 chips returned.

**Interface:**
```typescript
export interface GuidanceChip {
  text: string;   // max ~60 chars
  color: string;  // hex color for dot indicator
}

export function generateGuidance(
  aggregated: AppBreakdownEntry[],
  currentWeek: AppBreakdownEntry[],
): GuidanceChip[]
```

**Rules (in evaluation order):**

Rule 1 — Top opportunity:
- Condition: find app with highest `nonAiSlots` where `nonAiSlots / (aiSlots + nonAiSlots) > 0.5`
- Text: `"${appName} is your top untagged app — try using AI tools there"`
- Color: `colors.warning`

Rule 2 — AI leader app:
- Condition: find app with `aiSlots / (aiSlots + nonAiSlots) >= 0.8` AND `aiSlots >= 5`
- Text: `"${appName} is your strongest AI app — ${Math.round(pct)}% AI-credited"`
- Color: `colors.cyan`

Rule 3 — BrainLift app highlight:
- Condition: find app with highest `brainliftSlots` where `brainliftSlots >= 3`
- Text: `"${appName} drives most of your BrainLift time — keep it up"`
- Color: `colors.violet`

Rule 4 — AI progress this week:
- Condition: `currentWeek` has total AI slots > 0; compute current week AI% and 12w aggregate AI%
- If current week AI% > aggregate AI% + 5 → `"You're above your 12-week average this week"`, color: `colors.success`
- If current week AI% < aggregate AI% - 5 → `"Slower AI week — still time to close the gap"`, color: `colors.warning`

**Success Criteria:**
- [ ] App with >50% nonAi → opportunity chip names the app
- [ ] App with ≥80% AI and ≥5 slots → leader chip with correct percentage
- [ ] App with highest brainliftSlots ≥ 3 → BrainLift chip (violet)
- [ ] Current week AI% > 12w avg + 5 → progress chip (success color)
- [ ] Current week AI% < 12w avg - 5 → slower-week chip (warning color)
- [ ] Max 3 chips returned even if all 4 rules match
- [ ] Empty aggregated → returns []
- [ ] No qualifying app → returns []
- [ ] App at exactly 50.1% nonAi → rule 1 triggers
- [ ] currentWeek empty → rule 4 not evaluated

---

### FR3 — AppBreakdownCard component

**Description:** Card component that renders a list of app rows with usage bars and a guidance section below.

**Interface:**
```typescript
interface AppBreakdownCardProps {
  entries: AppBreakdownEntry[];   // max 8, already sorted
  guidance: GuidanceChip[];       // 0–3 chips
}
export default function AppBreakdownCard(props: AppBreakdownCardProps): JSX.Element | null
```

**Layout:**
- Returns `null` when `entries.length === 0`
- Wraps in `<Card borderAccentColor={colors.violet}>`
- `<SectionLabel>APP BREAKDOWN</SectionLabel>`
- For each entry: row with `appName` label left, `AppUsageBar` middle, `"${aiSlots + nonAiSlots} slots"` muted text right
- Guidance section: each chip as a row with a colored dot (6×6 rounded) + text; section omitted when `guidance.length === 0`

**Success Criteria:**
- [ ] Returns null when entries=[]
- [ ] Section label text is "APP BREAKDOWN"
- [ ] Renders correct number of rows for entries.length ≤ 8
- [ ] Each row contains app name and slot count
- [ ] Guidance chips render below list when guidance.length > 0
- [ ] No guidance section rendered when guidance=[]
- [ ] Card uses borderAccentColor={colors.violet}

---

### FR4 — ai.tsx integration

**Description:** Wire `AppBreakdownCard` into the AI tab screen between Daily Breakdown and 12-Week Trajectory cards.

**Changes:**
- Import `useAppBreakdown` from `@/src/hooks/useAppBreakdown`
- Import `AppBreakdownCard` from `@/src/components/AppBreakdownCard`
- Import `generateGuidance` from `@/src/lib/appGuidance`
- Call `const { aggregated12w, currentWeek } = useAppBreakdown()` at screen level
- Bump `useStaggeredEntry({ count: 7 })`
- Insert between Daily Breakdown (getEntryStyle(2)) and Trajectory (now getEntryStyle(4)):
  ```tsx
  {aggregated12w.length > 0 && (
    <Animated.View style={getEntryStyle(3)}>
      <AppBreakdownCard
        entries={aggregated12w.slice(0, 8)}
        guidance={generateGuidance(aggregated12w, currentWeek)}
      />
    </Animated.View>
  )}
  ```
- Shift Trajectory → getEntryStyle(4), Legend → getEntryStyle(5), Timestamp → getEntryStyle(6)

**Success Criteria:**
- [ ] AppBreakdownCard renders between Daily Breakdown and Trajectory when aggregated12w.length > 0
- [ ] Card is absent when aggregated12w is empty
- [ ] useStaggeredEntry count is 7
- [ ] Trajectory, Legend, Timestamp use stagger indices 4, 5, 6 respectively

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/ProgressBar.tsx` | Single-segment bar pattern; AppUsageBar is structurally similar but static and three-segment |
| `hourglassws/src/components/Card.tsx` | Card wrapper — use `borderAccentColor={colors.violet}` for AppBreakdownCard |
| `hourglassws/src/components/DailyAIRow.tsx` | Row layout pattern (app name left, metric right) |
| `hourglassws/src/components/SectionLabel.tsx` | Section header component |
| `hourglassws/app/(tabs)/ai.tsx` | Integration point — insert at stagger index 3 |
| `hourglassws/src/hooks/useAppBreakdown.ts` | Data source (spec 11); returns `{ aggregated12w, currentWeek, isReady }` |
| `hourglassws/src/lib/aiAppBreakdown.ts` | `AppBreakdownEntry` type definition |
| `hourglassws/src/lib/colors.ts` | Color tokens (`colors.violet`, `colors.cyan`, `colors.warning`, `colors.success`, `colors.border`, `colors.textMuted`) |

### Files to Create

| File | FR | Description |
|------|----|-------------|
| `hourglassws/src/components/AppUsageBar.tsx` | FR1 | Three-segment static bar component |
| `hourglassws/src/lib/appGuidance.ts` | FR2 | `GuidanceChip` interface + `generateGuidance()` pure function |
| `hourglassws/src/components/AppBreakdownCard.tsx` | FR3 | Card with app rows + guidance chips |
| `hourglassws/src/components/__tests__/AppUsageBar.test.tsx` | FR1 | Tests for AppUsageBar |
| `hourglassws/src/lib/__tests__/appGuidance.test.ts` | FR2 | Tests for generateGuidance |
| `hourglassws/src/components/__tests__/AppBreakdownCard.test.tsx` | FR3 | Tests for AppBreakdownCard |

### Files to Modify

| File | FR | Change |
|------|----|--------|
| `hourglassws/app/(tabs)/ai.tsx` | FR4 | Add imports, `useAppBreakdown()` call, insert card, bump stagger to 7, shift indices |

### Data Flow

```
AsyncStorage (ai_app_history)
        │
        ▼
useAppBreakdown()
        │
        ├── aggregated12w → AppBreakdownCard entries (slice 0–8)
        │                 → generateGuidance(aggregated12w, currentWeek) → guidance chips
        └── currentWeek  → generateGuidance(aggregated12w, currentWeek)
```

`AppBreakdownEntry` fields used:
- `appName: string` — display label in row
- `aiSlots: number` — passed to AppUsageBar.aiSlots
- `brainliftSlots: number` — passed to AppUsageBar.brainliftSlots
- `nonAiSlots: number` — passed to AppUsageBar.nonAiSlots
- `aiSlots + nonAiSlots` — displayed as slot count

### AppUsageBar implementation notes

```
┌─────────────────────────────────────────────┐  height=4
│ violet (brainlift) │ cyan (AI-only) │ grey  │
└─────────────────────────────────────────────┘
     flex=brainlift      flex=aiOnly    flex=nonAi
```

- All three segments inside a `flexDirection: 'row'` outer `View`
- Segment color via inline `backgroundColor` (NativeWind className not reliable on plain View for color-only props in this codebase)
- `borderRadius` on outer container for pill shape; overflow hidden
- When `brainliftSlots === 0`: render only cyan + grey (no violet `View` at all)
- When all zero: render single `View` with full flex=1, `backgroundColor: colors.border`

### generateGuidance implementation notes

- Pure function — no hooks, no side effects
- Rule evaluation: iterate all 4 rules in order; push to result array if condition met; stop when `result.length === 3`
- Rule 1 search: `aggregated.filter(e => e.nonAiSlots / (e.aiSlots + e.nonAiSlots) > 0.5)`, sort by nonAiSlots desc, take first
- Rule 2 search: `aggregated.find(e => e.aiSlots / (e.aiSlots + e.nonAiSlots) >= 0.8 && e.aiSlots >= 5)`; pick highest aiSlots if multiple qualify
- Rule 3 search: `aggregated.filter(e => e.brainliftSlots >= 3)`, sort by brainliftSlots desc, take first
- Rule 4 computation: sum all `currentWeek` aiSlots/nonAiSlots → compute currentPct; sum all `aggregated` → compute aggPct; compare
- Guard against division by zero in all percentage calculations

### Edge Cases

| Case | Handling |
|------|---------|
| `aggregated12w.length === 0` | `AppBreakdownCard` returns `null`; `generateGuidance` returns `[]` |
| App with `brainliftSlots > aiSlots` | `AppUsageBar` clamps `aiOnlySlots = Math.max(0, aiSlots - brainliftSlots)` |
| All slots are AI (nonAiSlots=0) | Grey segment has flex=0; not visible. Rule 1 not triggered. |
| Multiple apps qualify Rule 2 | Pick app with highest `aiSlots` |
| currentWeek has 0 total AI slots | Rule 4 guard: skip evaluation |
| Entry with aiSlots=0 and nonAiSlots=0 | Should not appear in cache; defensive: bar renders empty grey |

### ai.tsx stagger index mapping (after change)

| Index | Card |
|-------|------|
| 0 | AIArcHero |
| 1 | Prime Radiant |
| 2 | Daily Breakdown |
| 3 | App Breakdown (NEW) |
| 4 | 12-Week Trajectory (was 3) |
| 5 | Legend (was 4) |
| 6 | Last fetched timestamp (was 5) |
