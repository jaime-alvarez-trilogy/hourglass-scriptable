# Checklist: 12-app-breakdown-ui

## Phase 12.0 — Tests (Red Phase)

### FR1 — AppUsageBar tests
- [ ] `test(FR1)`: Create `hourglassws/src/components/__tests__/AppUsageBar.test.tsx`
- [ ] Happy path: aiSlots=60, brainliftSlots=30, nonAiSlots=10 → three segments with flex 30/30/10
- [ ] Happy path: brainliftSlots=0 → violet segment absent, only cyan + grey
- [ ] Happy path: aiSlots=0, brainliftSlots=0 → single grey segment
- [ ] Edge case: all-zero inputs → single full-width grey bar
- [ ] Edge case: brainliftSlots > aiSlots → aiOnly clamped to 0
- [ ] Edge case: height prop overrides default 4

### FR2 — generateGuidance tests
- [ ] `test(FR2)`: Create `hourglassws/src/lib/__tests__/appGuidance.test.ts`
- [ ] Happy path: app with >50% nonAi → opportunity chip naming the app (warning color)
- [ ] Happy path: app with ≥80% AI and ≥5 slots → leader chip with percentage (cyan color)
- [ ] Happy path: app with highest brainliftSlots ≥ 3 → BrainLift chip (violet color)
- [ ] Happy path: current week AI% > 12w avg + 5 → progress chip (success color)
- [ ] Happy path: current week AI% < 12w avg - 5 → slower-week chip (warning color)
- [ ] Happy path: max 3 chips returned when all 4 rules match
- [ ] Edge case: empty aggregated → returns []
- [ ] Edge case: no qualifying app → returns []
- [ ] Edge case: app at exactly 50.1% nonAi → rule 1 triggers
- [ ] Edge case: currentWeek empty → rule 4 not evaluated

### FR3 — AppBreakdownCard tests
- [ ] `test(FR3)`: Create `hourglassws/src/components/__tests__/AppBreakdownCard.test.tsx`
- [ ] Happy path: renders section label "APP BREAKDOWN"
- [ ] Happy path: renders correct number of app rows
- [ ] Happy path: each row shows appName and slot count
- [ ] Happy path: guidance chips render below list when guidance.length > 0
- [ ] Happy path: returns null when entries=[]
- [ ] Edge case: guidance=[] → no guidance section rendered
- [ ] Edge case: card uses borderAccentColor violet

### FR4 — ai.tsx integration tests
- [ ] `test(FR4)`: Add integration tests for ai.tsx AppBreakdownCard wiring
- [ ] AppBreakdownCard renders when aggregated12w.length > 0
- [ ] AppBreakdownCard absent when aggregated12w is empty
- [ ] useStaggeredEntry count is 7

---

## Phase 12.1 — Implementation

### FR1 — AppUsageBar component
- [ ] `feat(FR1)`: Create `hourglassws/src/components/AppUsageBar.tsx`
  - Three-segment View (violet | cyan | grey) using flex proportions
  - Inline backgroundColor (not NativeWind className) for segment colors
  - Omit violet segment when brainliftSlots=0
  - All-zero inputs: single grey segment with flex=1
  - clamp aiOnlySlots = Math.max(0, aiSlots - brainliftSlots)
  - Default height=4; rounded container with overflow hidden

### FR2 — generateGuidance pure function
- [ ] `feat(FR2)`: Create `hourglassws/src/lib/appGuidance.ts`
  - Export `GuidanceChip` interface
  - Export `generateGuidance(aggregated, currentWeek): GuidanceChip[]`
  - Rule 1: top nonAi app (>50% nonAi) → warning chip
  - Rule 2: AI leader (≥80% AI, ≥5 aiSlots) → cyan chip
  - Rule 3: top BrainLift app (≥3 brainliftSlots) → violet chip
  - Rule 4: weekly AI% vs aggregate comparison → success/warning chip
  - Max 3 chips; guard division by zero

### FR3 — AppBreakdownCard component
- [ ] `feat(FR3)`: Create `hourglassws/src/components/AppBreakdownCard.tsx`
  - Return null when entries.length === 0
  - Card with borderAccentColor={colors.violet}
  - SectionLabel "APP BREAKDOWN"
  - App row: appName left, AppUsageBar middle, slot count right
  - Guidance section: colored dot + text per chip; omit when guidance=[]

### FR4 — ai.tsx integration
- [ ] `feat(FR4)`: Update `hourglassws/app/(tabs)/ai.tsx`
  - Add imports: useAppBreakdown, AppBreakdownCard, generateGuidance
  - Add const { aggregated12w, currentWeek } = useAppBreakdown()
  - Bump useStaggeredEntry count from 6 → 7
  - Insert AppBreakdownCard block at getEntryStyle(3), guarded by aggregated12w.length > 0
  - Shift Trajectory → getEntryStyle(4), Legend → getEntryStyle(5), Timestamp → getEntryStyle(6)

---

## Phase 12.2 — Review

- [ ] Run spec-implementation-alignment: validate all FR success criteria are met
- [ ] Run pr-review-toolkit:review-pr: review for code quality, patterns, consistency
- [ ] Address any review feedback
- [ ] Run test-optimiser: check for redundant or missing tests
- [ ] All tests passing: `cd hourglassws && npx jest --testPathPattern="AppUsageBar|appGuidance|AppBreakdownCard" --no-coverage`
