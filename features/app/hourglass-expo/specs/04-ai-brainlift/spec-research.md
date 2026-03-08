# Spec Research: 04-ai-brainlift

## Problem Context

Crossover tracks AI tool usage and BrainLift (second brain) sessions via work diary slot tags. This spec covers fetching the work diary, parsing tags, calculating AI% and BrainLift hours for the week, caching by date, and displaying results on a dedicated screen.

## Exploration Findings

### Work Diary API

`GET /api/timetracking/workdiaries?assignmentId={assignmentId}&date=YYYY-MM-DD`

**Uses `assignmentId` — NOT userId. Critical ID distinction.**

Returns flat array of slot objects:
```javascript
[{
  tags: string[],           // e.g. ["ai_usage", "second_brain"]
  autoTracker: boolean,     // false = manual time entry
  status: string,           // "PENDING" | "APPROVED" | "REJECTED"
  memo: string,             // manual entry description
  actions: [{
    actionType: string,     // "ADD_MANUAL_TIME" | "APPROVE_MANUAL_TIME"
    comment: string,
    actionMadeBy: number,
    createdDate: string
  }]
}]
```

Each slot = **10 minutes**. Typical day has ~31 slots (5h 10min tracked).

### Tag Definitions

| Tag string | Meaning | Target |
|-----------|---------|--------|
| `"ai_usage"` | Using AI tools | 75% of tagged slots |
| `"second_brain"` | BrainLift session | 5h/week (30 slots) |
| `"not_second_brain"` | Explicitly NOT BrainLift | — |
| (no tags) | Untagged slot | excluded from AI% denominator |

### AI% Formula (VALIDATED across 4 weeks, max error 1.3%)

```javascript
taggedSlots = totalSlots - noTagSlots
aiSlots = slots with "ai_usage" OR "second_brain"  // union, not OR-exclusive
aiPct = (aiSlots / taggedSlots) * 100

// Display as range to cover measurement error:
aiPctLow = Math.max(0, Math.round(aiPct - 2))
aiPctHigh = Math.min(100, Math.round(aiPct + 2))
```

**Critical:** `"not_second_brain"` must be exact string match — NOT substring of `"second_brain"`.

### BrainLift Formula

```javascript
brainliftSlots = slots with exact tag "second_brain"
brainliftHours = brainliftSlots * 10 / 60
// Target: 5h/week (30 slots)
```

### Cache Strategy (from hourglass.js)

- Fetch Mon–today, one API call per day
- Store by date: `{ 'YYYY-MM-DD': { total, aiUsage, secondBrain, noTags } }`
- Re-fetch: today + any day with 0 slots (stale endpoint recovery)
- Prune to current Mon–Sun on each access
- Refresh interval: 2 hours if real data exists

### Week Boundaries

Mon–Sun (NOT Mon–Fri, NOT Sun–Sat). `workdaysElapsed` = count of days with >0 slots.

## Key Decisions

### Decision 1: Per-day cache in AsyncStorage
- Key: `ai_cache` → `{ 'YYYY-MM-DD': TagData, _lastFetchedAt: ISO }`
- Prune to current week on load
- Re-fetch today always (tags change throughout the day)
- Rationale: direct port of Scriptable cache, prevents re-fetching historical days

### Decision 2: React Query with manual cache seeding
- `useAIData` hook reads from AsyncStorage first (instant display)
- Background fetch fills in stale/missing days
- Rationale: fast perceived performance, no loading spinner for cached days

### Decision 3: Separate AI screen tab
- AI% and BrainLift have their own tab — not crammed into hours dashboard
- Shows: weekly AI%, daily breakdown, BrainLift hours vs target
- Rationale: these are distinct metrics with enough data for their own screen

## Interface Contracts

### Types

```typescript
interface TagData {
  total: number        // ← count of all slots that day
  aiUsage: number      // ← count of slots with ai_usage OR second_brain
  secondBrain: number  // ← count of slots with exact "second_brain"
  noTags: number       // ← count of slots with empty tags array
}

interface AIWeekData {
  aiPctLow: number          // ← Math.max(0, round(aiPct - 2))
  aiPctHigh: number         // ← Math.min(100, round(aiPct + 2))
  brainliftHours: number    // ← totalSecondBrain * 10 / 60
  totalSlots: number        // ← sum of all daily totals
  taggedSlots: number       // ← totalSlots - totalNoTags
  workdaysElapsed: number   // ← days with total > 0
  dailyBreakdown: DailyTagData[]
}

interface DailyTagData {
  date: string              // ← YYYY-MM-DD
  total: number             // ← TagData.total
  aiUsage: number           // ← TagData.aiUsage
  secondBrain: number       // ← TagData.secondBrain
  noTags: number            // ← TagData.noTags
  isToday: boolean          // ← computed
}
```

### Business Logic

```typescript
// src/lib/ai.ts

function countDiaryTags(slots: WorkDiarySlot[]): TagData
// Counts tags for a single day's slots
// ai_usage OR second_brain → aiUsage
// exact "second_brain" → secondBrain
// empty tags → noTags

function aggregateAICache(cache: Record<string, TagData>): AIWeekData
// Aggregates Mon–today cache entries
// Applies AI% formula
// Returns weekly summary + daily breakdown

function shouldRefetchDay(date: string, cached: TagData | undefined, isToday: boolean): boolean
// Returns true if: not cached, OR total===0, OR isToday
```

### Hooks

```typescript
// src/hooks/useAIData.ts

function useAIData(): {
  data: AIWeekData | null
  isLoading: boolean
  lastFetchedAt: string | null
  error: string | null
  refetch: () => void
}
```

### Screen

```
app/(tabs)/ai.tsx — AI & BrainLift screen

Sections:
1. Header — "AI & BrainLift"
2. AI% card — "XX%–YY%" range, progress bar toward 75% target
3. BrainLift card — "X.Xh / 5h" with progress bar
4. Daily breakdown — list of Mon–today with per-day AI% and BL slots
5. Legend — explains what each tag means
6. Pull-to-refresh
```

## Test Plan

### countDiaryTags

**Happy Path:**
- [ ] Counts `ai_usage` slots correctly
- [ ] Counts `second_brain` slots correctly
- [ ] Counts union (ai_usage OR second_brain) in aiUsage field
- [ ] Counts empty tags array in noTags
- [ ] Returns zero for all fields on empty array

**Critical Cases:**
- [ ] Slot with BOTH `ai_usage` AND `second_brain` counted once in aiUsage
- [ ] `"not_second_brain"` does NOT increment secondBrain
- [ ] `"not_second_brain"` does NOT increment aiUsage
- [ ] Case sensitivity: `"AI_USAGE"` does not match (exact lowercase)

### aggregateAICache

- [ ] Only processes Mon–today (skips future dates and pre-Monday dates)
- [ ] AI% = aiSlots / taggedSlots * 100
- [ ] taggedSlots = totalSlots - noTagSlots
- [ ] brainliftHours = totalSecondBrain * 10 / 60
- [ ] workdaysElapsed = count of days with total > 0
- [ ] aiPctLow clamped at 0, aiPctHigh clamped at 100
- [ ] Empty cache → returns zeros (no division by zero)

### shouldRefetchDay

- [ ] Returns true when date not in cache
- [ ] Returns true when cached total === 0
- [ ] Returns true when isToday (always re-fetch today)
- [ ] Returns false for past days with total > 0

## Files to Create

```
src/
  hooks/
    useAIData.ts
  lib/
    ai.ts               — countDiaryTags, aggregateAICache, shouldRefetchDay
  api/
    workDiary.ts        — fetchWorkDiary(assignmentId, date)
  components/
    AIProgressBar.tsx   — percentage bar with target marker
    DailyAIRow.tsx      — per-day breakdown row

app/(tabs)/
  ai.tsx                — AI & BrainLift screen
```

## Files to Reference

- `WS/hourglass.js` — `countDiaryTags()`, `aggregateAICache()`, AI cache logic (search "ai-cache")
- `WS/memory/MEMORY.md` — Work Diary Slot Tags section, AI% Formula section
- `WS/docs/AI_VALIDATION.md` (if exists) — formula validation results
