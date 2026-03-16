# 03-overview-hero

**Status:** Draft
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
**Owner:** @trilogy

---

## Overview

### What Is Being Built

The Overview tab currently opens directly into four chart cards with a standalone 4W/12W toggle row. There is no primary signal — every chart has equal visual weight. This spec adds:

1. **`OverviewHeroCard`** — A new full-width glass hero card at the top of the screen displaying:
   - Period total earnings (`$X,XXX` format)
   - Period total hours (`XXXh` format) with an optional overtime badge (`+Xh OT` in `overtimeWhiteGold`)
   - The 4W/12W window toggle, moved from the standalone header row into the hero card itself
   - A "LAST N WEEKS" period label

2. **`computeEarningsPace`** — A pure utility function in `src/lib/overviewUtils.ts` that computes the earnings pace ratio (last week in the window vs. prior weeks' average). This ratio drives the ambient color signal.

3. **Ambient wiring** — `AmbientBackground` (from 01-ambient-layer) placed outside the ScrollView, driven by `getAmbientColor({ type: 'earningsPace', ratio })`. The overview screen's glass cards now frost over a colored field that reflects earnings health (gold = strong, warning = behind, critical = critical).

4. **Toggle migration** — The existing standalone header toggle row is removed. The toggle lives inside `OverviewHeroCard`.

### How It Works

The screen computes:
- `totalEarnings = sum(overviewData.earnings)` — total for the selected window
- `totalHours = sum(overviewData.hours)` — total for the selected window
- `overtimeHours = Math.max(0, hoursData?.total - config.weeklyLimit)` — current week only
- `earningsPace = computeEarningsPace(overviewData.earnings)` — ratio → ambient color

`AmbientBackground` sits absolute inside `SafeAreaView`, outside `ScrollView`, so it covers the full screen as a static colored field. As users scroll, glass cards pass over the gradient and pick up tinted frost via BlurView.

The hero card uses `Card` with `elevated` prop as its base (the glass card from 02-dark-glass).

---

## Out Of Scope

1. **AI tab hero redesign** — Deferred to [04-ai-hero-arc](../04-ai-hero-arc/spec.md). The AI screen gets its own bold arc hero in a separate spec.

2. **Home screen ambient wiring** — Deferred to [02-home-hero-ambient](../02-home-hero-ambient/spec.md). The Home screen's PanelGradient ambient wiring is a separate spec.

3. **Requests tab hero** — **Descoped:** No hero redesign for the Requests tab. Light-touch glass card updates only (from 01-ambient-layer).

4. **Per-week overtime history** — **Descoped:** Historical overtime per week is not in `useWeeklyHistory()` snapshots. The overtime badge on the hero card reflects current-week overtime only (`Math.max(0, hoursData.total - weeklyLimit)`). This is intentional and sufficient.

5. **Skeleton/loading state for OverviewHeroCard** — **Descoped:** Loading state shows placeholder dashes (`—`), consistent with the rest of the screen. A dedicated skeleton loader is out of scope.

6. **Scrub interaction on hero card** — **Descoped:** The hero card shows period totals, not a per-week scrub value. It does not respond to `scrubWeekIndex`. The existing scrub panel (week snapshot) already handles per-week context during scrub.

7. **Navigation changes** — **Descoped:** No tab bar or routing changes.

8. **Auth screen changes** — **Descoped:** Auth screens are out of scope for the entire hero-glass-system feature.

---

## Functional Requirements

---

### FR1 — `OverviewHeroCard` component: dual metrics with period window

**Description:** New component at `src/components/OverviewHeroCard.tsx` that displays total earnings and total hours for the selected time window, with a period label and embedded 4W/12W toggle.

**Props:**
```typescript
interface OverviewHeroCardProps {
  totalEarnings: number;      // sum of earnings[] for window
  totalHours: number;         // sum of hours[] for window
  overtimeHours: number;      // current week overtime (may be 0)
  window: 4 | 12;
  onWindowChange: (w: 4 | 12) => void;
}
```

**Success Criteria:**

- SC1.1 — Renders `$` + `Math.round(totalEarnings).toLocaleString()` (e.g. `$12,450`) in `colors.gold`
- SC1.2 — Renders `Math.round(totalHours)` + `h` suffix (e.g. `164h`) in `colors.textPrimary`
- SC1.3 — Uses `Card` with `elevated` prop as the outer glass container
- SC1.4 — Displays period label: `"LAST 4 WEEKS"` when `window === 4`, `"LAST 12 WEEKS"` when `window === 12`
- SC1.5 — Renders a 4W/12W toggle with `TouchableOpacity` (or `Pressable`) buttons inside the card
- SC1.6 — Calls `onWindowChange(4)` when 4W button pressed
- SC1.7 — Calls `onWindowChange(12)` when 12W button pressed
- SC1.8 — Active toggle button is visually distinct (filled pill background using `colors.surface`)
- SC1.9 — Earnings and hours are displayed side by side in a row

---

### FR2 — Overtime badge on hours metric

**Description:** When `overtimeHours > 0`, display an inline badge next to the hours value: `+Xh OT` in `colors.overtimeWhiteGold`. When `overtimeHours === 0`, the badge is absent.

**Success Criteria:**

- SC2.1 — When `overtimeHours > 0`, renders text matching `+{N}h OT` adjacent to the hours value
- SC2.2 — Overtime badge text uses `colors.overtimeWhiteGold` color token (`#FFF8E7`)
- SC2.3 — When `overtimeHours === 0`, overtime badge is NOT rendered (null or absent)
- SC2.4 — Overtime value displayed as integer: `Math.round(overtimeHours)` + `h OT` (e.g. `+3h OT`)

---

### FR3 — `computeEarningsPace` pure function

**Description:** New pure function in `src/lib/overviewUtils.ts`. Computes the earnings pace ratio: the last entry of `earnings[]` divided by the average of all prior entries.

**Signature:**
```typescript
export function computeEarningsPace(earnings: number[]): number
```

**Success Criteria:**

- SC3.1 — `[100, 100, 100, 100]` → `1.0` (current equals prior average)
- SC3.2 — `[80, 80, 80, 120]` → `1.5` (strong — current 120 vs prior avg 80)
- SC3.3 — `[100, 100, 100, 60]` → `0.6` (behind — current 60 vs prior avg 100)
- SC3.4 — `[100, 100, 100, 0]` → `0.0` (critical — no earnings this period)
- SC3.5 — `[100]` (length 1) → `1.0` (no prior data, assume strong)
- SC3.6 — `[]` (empty) → `1.0` (no data, assume strong)
- SC3.7 — Prior average uses ALL entries except the last (`earnings.slice(0, -1)`)
- SC3.8 — Division by zero guard: if prior average is 0, return `1.0`

---

### FR4 — Wire `AmbientBackground` to overview screen using earnings pace color

**Description:** Modify `app/(tabs)/overview.tsx` to render `AmbientBackground` driven by the earnings pace signal.

**Success Criteria:**

- SC4.1 — `AmbientBackground` is imported in `overview.tsx`
- SC4.2 — `AmbientBackground` is rendered outside `ScrollView` (sibling, not inside)
- SC4.3 — `getAmbientColor` is imported from `AmbientBackground`
- SC4.4 — `computeEarningsPace` is called with `overviewData.earnings`
- SC4.5 — The color prop passed to `AmbientBackground` uses `{ type: 'earningsPace', ratio }` signal
- SC4.6 — When `overviewData` is not yet available, `AmbientBackground` receives `null` (no crash)

---

### FR5 — Move 4W/12W toggle into hero card; remove standalone header toggle

**Description:** The existing standalone header row (`<View>` with title + toggle) in `overview.tsx` is replaced. `OverviewHeroCard` becomes the first content item and contains the toggle.

**Success Criteria:**

- SC5.1 — Standalone header toggle row removed from `overview.tsx` JSX
- SC5.2 — `OverviewHeroCard` rendered as the first item in `ScrollView` content (before the scrub panel)
- SC5.3 — `OverviewHeroCard` receives `window` prop bound to existing `window` state
- SC5.4 — `OverviewHeroCard` receives `onWindowChange={handleWindowChange}` (preserves scrub reset)
- SC5.5 — `totalEarnings` passed as `sum(overviewData.earnings)` (or `0` when data unavailable)
- SC5.6 — `totalHours` passed as `sum(overviewData.hours)` (or `0` when data unavailable)
- SC5.7 — `overtimeHours` passed as `Math.max(0, (hoursData?.total ?? 0) - (config?.weeklyLimit ?? 0))`

---

## Technical Design

### Files to Reference

| File | Purpose |
|------|---------|
| `hourglassws/src/components/AmbientBackground.tsx` | Import `AmbientBackground`, `getAmbientColor` |
| `hourglassws/src/components/Card.tsx` | Base component for `OverviewHeroCard` (use `elevated` prop) |
| `hourglassws/src/lib/colors.ts` | `colors.gold`, `colors.overtimeWhiteGold`, `colors.textPrimary`, `colors.surface`, `colors.textMuted` |
| `hourglassws/src/hooks/useOverviewData.ts` | `OverviewData` shape: `{ earnings, hours, aiPct, brainliftHours, weekLabels }` |
| `hourglassws/src/hooks/useHoursData.ts` | `hoursData.total` for overtimeHours computation |
| `hourglassws/src/hooks/useConfig.ts` | `config.weeklyLimit` for overtimeHours computation |
| `hourglassws/app/(tabs)/overview.tsx` | Screen to modify: add hero, ambient, remove standalone toggle |
| `hourglassws/app/(tabs)/__tests__/overview.test.tsx` | Existing test file to extend with FR4/FR5 assertions |

### Files to Create/Modify

| File | Action | FR |
|------|--------|----|
| `hourglassws/src/components/OverviewHeroCard.tsx` | **Create** | FR1, FR2 |
| `hourglassws/src/components/__tests__/OverviewHeroCard.test.tsx` | **Create** | FR1, FR2 |
| `hourglassws/src/lib/overviewUtils.ts` | **Create** | FR3 |
| `hourglassws/src/lib/__tests__/overviewUtils.test.ts` | **Create** | FR3 |
| `hourglassws/app/(tabs)/overview.tsx` | **Modify** — add hero card + ambient, remove standalone toggle | FR4, FR5 |
| `hourglassws/app/(tabs)/__tests__/overview.test.tsx` | **Modify** — add FR4/FR5 ambient + hero wiring assertions | FR4, FR5 |

### Data Flow

```
useConfig()          → config.weeklyLimit
useHoursData()       → hoursData.total
useOverviewData()    → overviewData.earnings[], overviewData.hours[]

// Hero card props
totalEarnings = sum(overviewData.earnings)   // sum all N weeks
totalHours    = sum(overviewData.hours)
overtimeHours = max(0, (hoursData?.total ?? 0) - (config?.weeklyLimit ?? 0))

// Ambient color
earningsPace = computeEarningsPace(overviewData.earnings)
ambientColor = getAmbientColor({ type: 'earningsPace', ratio: earningsPace })

// Renders
AmbientBackground(color=ambientColor)            [outside ScrollView, absolute]
OverviewHeroCard(totalEarnings, totalHours, overtimeHours, window, onWindowChange)
  → Card(elevated)
      → period label: "LAST N WEEKS"
      → toggle: [4W] [12W]
      → metrics row: [$X,XXX earnings] [XXXh (+Xh OT) hours]
```

### `computeEarningsPace` Implementation Pattern

```typescript
export function computeEarningsPace(earnings: number[]): number {
  if (earnings.length < 2) return 1.0;
  const prior = earnings.slice(0, -1);
  const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;
  if (priorAvg === 0) return 1.0;
  return earnings[earnings.length - 1] / priorAvg;
}
```

### `OverviewHeroCard` Layout Pattern

```
Card (elevated)
  ├── Row: SectionLabel "LAST N WEEKS"    [spacer]    [4W pill] [12W pill]
  └── Row: [earnings column]              [hours column]
       ├── earnings: "$X,XXX" (gold, 28sp bold)
       └── hours: "XXXh" (textPrimary, 28sp bold) + "+Xh OT" (overtimeWhiteGold, 13sp)
```

### AmbientBackground Placement in overview.tsx

```tsx
<SafeAreaView className="flex-1 bg-background">
  {/* Layer 1: ambient field — absolute, behind all content */}
  <AmbientBackground color={ambientColor} />

  <ScrollView ...>
    {/* Hero card — first item, absorbs standalone toggle */}
    <OverviewHeroCard
      totalEarnings={totalEarnings}
      totalHours={totalHours}
      overtimeHours={overtimeHours}
      window={window}
      onWindowChange={handleWindowChange}
    />

    {/* Scrub panel (existing) */}
    {/* Chart sections (existing) */}
  </ScrollView>
</SafeAreaView>
```

Note: `SafeAreaView` from `react-native-safe-area-context` renders as a `View` with position context. `AmbientBackground` uses `StyleSheet.absoluteFill` which fills the nearest positioned ancestor. This is the same pattern used in the Home screen (02-home-hero-ambient).

### Edge Cases

| Scenario | Handling |
|----------|---------|
| `overviewData.earnings` empty or length 1 | `computeEarningsPace` returns `1.0` → gold ambient |
| `hoursData` is null (loading) | `overtimeHours = 0` → no overtime badge |
| `config` is null (loading) | `config?.weeklyLimit ?? 0` → `overtimeHours = 0` |
| Prior earnings average is 0 | `computeEarningsPace` returns `1.0` |
| `totalEarnings = 0` | Renders `$0` — valid loading/empty state |
| `window` state changes | `handleWindowChange` resets `scrubWeekIndex` to null — existing behavior preserved |

### Test Strategy

All tests use source-level static analysis (same pattern as existing `overview.test.tsx`):
- Read file as string, assert `toMatch(regex)` patterns
- No React render needed — avoids complex native module mocking
- Unit tests for pure functions (`computeEarningsPace`) use direct JS calls
- `OverviewHeroCard` tests: source analysis of the component file

### FR Dependency Order

FR3 (`computeEarningsPace`) has no dependencies — implement first.
FR1/FR2 (`OverviewHeroCard`) depend only on `Card` and `colors` — can be parallel with FR3.
FR4/FR5 (`overview.tsx` wiring) depend on FR1+FR3 existing — implement last.
