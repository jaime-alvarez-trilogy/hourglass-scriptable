# AI App Breakdown

## Overview

Surfaces which applications are earning AI credit and which are not, based on WorkSmart's automatic AI classification. Provides 12-week historical trends and actionable guidance so the user can shift more work into AI-credited apps.

**Key insight:** WorkSmart auto-assigns `ai_usage`/`second_brain` tags based on AI-generated text patterns and app-level heuristics. The user never manually tags. This feature answers: *"Which apps am I using that the system doesn't count as AI — so I can move more work there?"*

## Problem

The AI% metric is a single number. When it stagnates or drops, users have no visibility into which apps are dragging it down. Historical trends exist for the overall AI%, but there's no per-app breakdown or actionable diagnosis.

## Goal

Show a ranked breakdown of apps by AI-credited vs non-AI slots (current week + 12-week aggregate), plus 1–3 generated guidance chips pointing to the highest-leverage opportunities.

## Data Source

All app breakdown data is derived from `slot.events[].processName` in the work diary API response:

```
GET /api/timetracking/workdiaries?assignmentId={id}&date=YYYY-MM-DD
→ WorkDiarySlot[]
→ slot.events[]: { processName, idle, activity }
→ slot.tags[]: auto-assigned by WorkSmart (ai_usage | second_brain | not_second_brain)
```

**Zero additional API calls.** `useAIData` and `useHistoryBackfill` already fetch this data; `events[]` is currently discarded after tag counting. This feature captures it before discard.

## Scope

### In Scope
- Extend `WorkDiarySlot` type to include `events[]`
- New `extractAppBreakdown(slots)` pure function
- New `ai_app_history` AsyncStorage cache (12 weeks, keyed by Monday)
- `useAIData` writes current-week app breakdown on every fetch
- `useHistoryBackfill` writes past-week app breakdown during backfill
- New `useAppBreakdown` hook for reading the cache
- `AppBreakdownCard` component with per-app AI vs non-AI bars
- Guidance chip generation (pure function, rule-based)
- Integration into `ai.tsx` between Daily Breakdown and Trajectory cards

### Out of Scope
- Per-day app breakdown (weekly granularity only)
- Push notifications
- Sorting/filtering controls in the UI (initial version: sorted by total slots desc)

## Architecture

```
WorkDiarySlot[].events[].processName
        │
        ▼
extractAppBreakdown(slots) → AppBreakdownEntry[]
        │
        ├─ useAIData → ai_app_history[currentWeek] (updated each fetch)
        └─ useHistoryBackfill → ai_app_history[pastWeeks] (backfilled once/session)
                │
                ▼
         useAppBreakdown → { aggregated12w, currentWeek }
                │
                ▼
      AppBreakdownCard + generateGuidance()
                │
                ▼
            ai.tsx
```

## Files Touched

### 12-app-breakdown-ui (2026-03-23)
| File | Change |
|------|--------|
| `hourglassws/src/components/AppUsageBar.tsx` | NEW: Three-segment static bar (violet/cyan/grey) |
| `hourglassws/src/lib/appGuidance.ts` | NEW: `GuidanceChip` interface + `generateGuidance()` |
| `hourglassws/src/components/AppBreakdownCard.tsx` | NEW: App rows + guidance chips card |
| `hourglassws/app/(tabs)/ai.tsx` | Insert AppBreakdownCard at stagger index 3; bump count to 7 |
| `hourglassws/src/components/__tests__/AppUsageBar.test.tsx` | NEW: FR1 tests |
| `hourglassws/src/lib/__tests__/appGuidance.test.ts` | NEW: FR2 tests |
| `hourglassws/src/components/__tests__/AppBreakdownCard.test.tsx` | NEW: FR3 tests |

### 11-app-data-layer (2026-03-23)
| File | Change |
|------|--------|
| `hourglassws/src/types/api.ts` | Added `WorkDiaryEvent` interface; added `events?: WorkDiaryEvent[]` to `WorkDiarySlot` |
| `hourglassws/src/lib/aiAppBreakdown.ts` | NEW: `AppBreakdownEntry`, `extractAppBreakdown`, `mergeAppBreakdown`, `loadAppHistory`, `saveAppHistory`, constants |
| `hourglassws/src/hooks/useAppBreakdown.ts` | NEW: `AppBreakdownResult`, `useAppBreakdown` hook |
| `hourglassws/src/hooks/useAIData.ts` | FR5: retain slots in Promise.all, write app breakdown to `ai_app_history` |
| `hourglassws/src/hooks/useHistoryBackfill.ts` | FR6: maintain `slotsData`, write app breakdown per backfilled week |
| `hourglassws/src/lib/__tests__/aiAppBreakdown.test.ts` | NEW: 34 tests for FR1–FR4 |
| `hourglassws/src/hooks/__tests__/useAppBreakdown.test.ts` | NEW: 12 tests for FR7 |
| `hourglassws/src/hooks/__tests__/useAIDataAppBreakdown.test.ts` | NEW: 13 tests for FR5 |
| `hourglassws/src/hooks/__tests__/useHistoryBackfillAppBreakdown.test.ts` | NEW: 9 tests for FR6 |

## Changelog

### Specs
| Spec | Description | Status |
|------|-------------|--------|
| 11-app-data-layer | Types, extraction logic, AsyncStorage cache, hooks | complete |
| 12-app-breakdown-ui | AppBreakdownCard, guidance chips, ai.tsx wiring | spec-ready |
